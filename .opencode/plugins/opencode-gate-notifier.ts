// @ts-ignore
import type { Plugin } from "@opencode-ai/plugin";
// @ts-ignore
import { appendFileSync, readFileSync, existsSync } from "fs";
// @ts-ignore
import { join } from "path";
// @ts-ignore
import { homedir } from "os";
// @ts-ignore
import { exec } from "child_process";

interface GateNotifierConfig {
  enabled?: boolean;
  logLevel?: "debug" | "info" | "warn" | "error";
  /** Notificação desktop: "auto" (detecta), "notify-send", "osascript", "powershell", "none" */
  desktopNotifier?: "auto" | "notify-send" | "osascript" | "powershell" | "none";
  /** Emite bell (\x07) no terminal quando um gate é detectado */
  terminalBell?: boolean;
  /** Mostra toast TUI via client.tui.showToast */
  tuiToast?: boolean;
  /** Duração do toast em ms (default: 15000) */
  toastDurationMs?: number;
  /** Tempo de inatividade (ms) após uma tool call para considerar stall e notificar */
  stallTimeoutMs?: number;
  /** Notificar quando bash/write/edit forem interceptados e a sessão possa travar esperando permissão */
  notifyOnDangerousTools?: boolean;
}

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

function getTimestamp(): string {
  const d = new Date();
  const offset = -d.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const hours = Math.abs(Math.floor(offset / 60)).toString().padStart(2, '0');
  const minutes = Math.abs(offset % 60).toString().padStart(2, '0');
  const tz = `${sign}${hours}:${minutes}`;
  const iso = d.toLocaleString('sv-SE', { timeZone: 'UTC' }).replace(' ', 'T');
  return `${iso}.${d.getMilliseconds().toString().padStart(3, '0')}${tz}`;
}

function loadConfig(directory: string, worktree: string): GateNotifierConfig {
  const candidates = [
    join(worktree, ".opencode", "config", "gate-notifier.json"),
    join(directory, ".opencode", "config", "gate-notifier.json"),
    join(homedir(), ".opencode", "config", "gate-notifier.json"),
    join(homedir(), ".config", "opencode", "config", "gate-notifier.json"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      try {
        const raw = readFileSync(candidate, "utf-8");
        return JSON.parse(raw) as GateNotifierConfig;
      } catch { }
    }
  }
  return {};
}

function logToFile(level: string, tag: string, data: any) {
  try {
    const ts = getTimestamp();
    const payload = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    const line = `[${ts}] [${level.toUpperCase()}] [${tag}] ${payload}\n\n`;
    appendFileSync("/tmp/opencode-gate-notifier.log", line);
  } catch { }
}

function detectDesktopNotifier(): "notify-send" | "osascript" | "powershell" | "none" {
  const platform = process.platform;
  if (platform === "linux") {
    try {
      // @ts-ignore
      const { execSync } = require("child_process");
      execSync("which notify-send", { stdio: "ignore" });
      return "notify-send";
    } catch {
      return "none";
    }
  }
  if (platform === "darwin") return "osascript";
  if (platform === "win32") return "powershell";
  return "none";
}

function sendDesktopNotification(
  notifier: "notify-send" | "osascript" | "powershell" | "none",
  title: string,
  message: string,
) {
  if (notifier === "none") return;

  let cmd = "";
  if (notifier === "notify-send") {
    // Escape simples para shell
    const safeTitle = title.replace(/"/g, '\\"');
    const safeMessage = message.replace(/"/g, '\\"');
    cmd = `notify-send "${safeTitle}" "${safeMessage}" --urgency=critical`;
  } else if (notifier === "osascript") {
    const safeTitle = title.replace(/"/g, '\\"');
    const safeMessage = message.replace(/"/g, '\\"');
    cmd = `osascript -e 'display notification "${safeMessage}" with title "${safeTitle}"'`;
  } else if (notifier === "powershell") {
    const safeTitle = title.replace(/'/g, "''");
    const safeMessage = message.replace(/'/g, "''");
    cmd = `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('${safeMessage}', '${safeTitle}')"`;
  }

  if (cmd) {
    exec(cmd, { timeout: 5000 }, (err) => {
      if (err) logToFile("debug", "DESKTOP_NOTIFY_FAIL", { error: err.message, cmd });
    });
  }
}

function terminalBell() {
  try {
    // @ts-ignore
    process.stdout.write('\x07');
  } catch { }
}

const DANGEROUS_TOOLS = ["bash", "shell", "write", "edit", "patch", "task", "rm"];

export const GateNotifierPlugin: Plugin = async ({ client, directory, worktree }: any) => {
  const config = loadConfig(directory, worktree);

  if (config.enabled === false) {
    return {};
  }

  const LOG_LEVEL = LEVELS[config.logLevel ?? "info"];
  const TUI_TOAST = config.tuiToast !== false;
  const BELL = config.terminalBell !== false;
  const DURATION = config.toastDurationMs ?? 15000;
  const STALL_MS = config.stallTimeoutMs ?? 45000;
  const NOTIFY_DANGEROUS = config.notifyOnDangerousTools !== false;

  let notifier = config.desktopNotifier ?? "auto";
  if (notifier === "auto") {
    notifier = detectDesktopNotifier();
  }

  function log(level: "debug" | "info" | "warn" | "error", tag: string, data: any) {
    if (LEVELS[level] < LOG_LEVEL) return;
    logToFile(level, tag, data);
  }

  log("info", "PLUGIN_INIT", {
    desktopNotifier: notifier,
    tuiToast: TUI_TOAST,
    terminalBell: BELL,
    stallTimeoutMs: STALL_MS,
    notifyOnDangerousTools: NOTIFY_DANGEROUS,
  });

  // Rastreamento de sessões e stalls
  const pendingSessions = new Map<string, { lastActivity: number; notified: boolean; toolsPending: Set<string> }>();
  const stallTimers = new Map<string, ReturnType<typeof setTimeout>>();

  function getSessionState(sessionID: string) {
    if (!pendingSessions.has(sessionID)) {
      pendingSessions.set(sessionID, { lastActivity: Date.now(), notified: false, toolsPending: new Set() });
    }
    return pendingSessions.get(sessionID)!;
  }

  function clearStallTimer(sessionID: string) {
    const t = stallTimers.get(sessionID);
    if (t) {
      clearTimeout(t);
      stallTimers.delete(sessionID);
    }
  }

  function setStallTimer(sessionID: string) {
    clearStallTimer(sessionID);
    const timer = setTimeout(() => {
      const state = pendingSessions.get(sessionID);
      if (!state) return;
      if (state.toolsPending.size > 0 && !state.notified) {
        state.notified = true;
        const msg = `⏳ Sessão ${sessionID} parada com ${state.toolsPending.size} ferramenta(s) pendente(s). Aprovação pode ser necessária.`;
        log("warn", "STALL_DETECTED", { sessionID, pending: [...state.toolsPending] });
        if (TUI_TOAST) {
          client.tui.showToast({ body: { message: msg, variant: "warning", title: "Gate / Interação Requerida", duration: DURATION } }).catch(() => {});
        }
        if (BELL) terminalBell();
        sendDesktopNotification(notifier as any, "OpenCode - Gate Requerido", msg);
      }
    }, STALL_MS);
    stallTimers.set(sessionID, timer);
  }

  function notifyGate(sessionID: string | null, title: string, message: string, variant: "info" | "warning" | "error" = "warning") {
    log("warn", "GATE_NOTIFY", { sessionID, title, message });
    if (TUI_TOAST) {
      client.tui.showToast({
        body: {
          message,
          variant,
          title: title || "Interação Requerida",
          duration: DURATION,
        },
      }).catch(() => {});
    }
    if (BELL) terminalBell();
    sendDesktopNotification(notifier as any, title || "OpenCode Gate", message);
  }

  return {
    "tool.execute.before": async (ctx: any, toolName: string, params: any) => {
      const actualToolName = typeof toolName === "string" ? toolName : (toolName?.tool || toolName?.name || "");
      const sid = ctx?.sessionID ?? "global";
      const state = getSessionState(sid);
      state.lastActivity = Date.now();
      state.notified = false;

      if (ctx?.callID) {
        state.toolsPending.add(ctx.callID);
      }

      // Se for tool perigosa e estamos em modo que pode pedir permissão, notifica
      if (NOTIFY_DANGEROUS && DANGEROUS_TOOLS.some((t) => actualToolName.toLowerCase().includes(t))) {
        const fileHint = params?.filePath || params?.path || params?.file || "";
        const msg = `🔒 ${actualToolName}${fileHint ? ` em ${fileHint}` : ""} requer atenção. Verifique permissões pendentes.`;
        notifyGate(sid, "Gate Detectado", msg, "warning");
      }

      setStallTimer(sid);
      return params;
    },

    "tool.execute.after": async (ctx: any, toolName: string, result: any) => {
      const sid = ctx?.sessionID ?? "global";
      const state = pendingSessions.get(sid);
      if (state && ctx?.callID) {
        state.toolsPending.delete(ctx.callID);
        state.lastActivity = Date.now();
        if (state.toolsPending.size === 0) {
          state.notified = false;
          clearStallTimer(sid);
        } else {
          setStallTimer(sid);
        }
      }
    },

    event: async ({ event }: any) => {
      const e = event as { type: string; properties: Record<string, any> };
      const props = e.properties || {};
      const sessionID = props.sessionID || props.info?.sessionID || null;

      if (sessionID) {
        const state = getSessionState(sessionID);
        state.lastActivity = Date.now();
      }

      // Detecta eventos de permissão (heurística ampla)
      const typeLower = e.type.toLowerCase();
      const isPermissionEvent =
        typeLower.includes("permission") ||
        typeLower.includes("gate") ||
        typeLower.includes("ask") ||
        typeLower.includes("prompt");

      if (isPermissionEvent) {
        const msg = `🚧 Evento de permissão: ${e.type}. Aprovação pode ser necessária.`;
        notifyGate(sessionID, "Permissão Requerida", msg, "warning");
      }

      // Detecta sessão idle com possível stall
      if (e.type === "session.idle" && sessionID) {
        const state = pendingSessions.get(sessionID);
        if (state && state.toolsPending.size > 0 && !state.notified) {
          setStallTimer(sessionID);
        }
      }

      // Detecta erro / retry que pode indicar que o usuário precisa intervir
      if (e.type === "session.error" || e.type === "session.status") {
        const status = props.status || {};
        if (status.type === "retry" || status.type === "error" || props.error) {
          const msg = `⚠️ Erro/retry na sessão: ${status.message || props.error?.message || e.type}. Verifique o terminal.`;
          notifyGate(sessionID, "Erro na Sessão", msg, "error");
        }
      }

      // Log debug de todos os eventos (ajuda calibrar heurística)
      if (LOG_LEVEL <= LEVELS.debug) {
        log("debug", "EVENT", { type: e.type, sessionID, keys: Object.keys(props) });
      }
    },

    cleanup: () => {
      for (const [, timer] of stallTimers) clearTimeout(timer);
      stallTimers.clear();
      pendingSessions.clear();
    },
  };
};

export default GateNotifierPlugin;
