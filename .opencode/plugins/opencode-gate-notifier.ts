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

export const GateNotifierPlugin: Plugin = async ({ client, directory, worktree }: any) => {
  const config = loadConfig(directory, worktree);

  if (config.enabled === false) {
    return {};
  }

  const LOG_LEVEL = LEVELS[config.logLevel ?? "info"];
  const TUI_TOAST = config.tuiToast !== false;
  const BELL = config.terminalBell !== false;
  const DURATION = config.toastDurationMs ?? 15000;

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
    mode: "stdout_interception"
  });

  let lastNotificationTime = 0;

  function notifyGate(sessionID: string | null, title: string, message: string, variant: "info" | "warning" | "error" = "warning") {
    // Evita spam de notificações: só notifica 1x a cada 10 segundos
    if (Date.now() - lastNotificationTime < 10000) return;
    lastNotificationTime = Date.now();

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

  // Intercepta o stdout para capturar exatamente o momento em que o OpenCode
  // exibe um prompt (y/n) ou aguarda permissão, acabando com falsos positivos de timeout.
  const originalWrite = process.stdout.write;
  // @ts-ignore
  process.stdout.write = function (chunk: any, encoding?: any, cb?: any) {
    if (chunk) {
      const str = chunk.toString().toLowerCase();
      // Heurística precisa para identificar os prompts de permissão do OpenCode
      if (
        (str.includes("allow") && str.includes("?")) ||
        str.includes("(y/n)") || 
        str.includes("(y/n/a)") ||
        str.includes("permissão requerida") ||
        (str.includes("execute") && str.includes("permission"))
      ) {
        notifyGate(null, "Permissão Requerida", "O OpenCode travou aguardando sua autorização no terminal.", "warning");
      }
    }
    // @ts-ignore
    return originalWrite.apply(process.stdout, arguments);
  };

  return {
    event: async ({ event }: any) => {
      const e = event as { type: string; properties: Record<string, any> };
      const props = e.properties || {};
      const sessionID = props.sessionID || props.info?.sessionID || null;

      // Removemos a notificação automática de session.idle pois ela gera muitos
      // falsos positivos em workflows multi-agentes ou quando a tarefa simplesmente conclui.
      // if (e.type === "session.idle") {
      //    notifyGate(sessionID, "Agente Aguardando", "A sessão ficou ociosa. O agente aguarda seu input.", "info");
      // }

      // Detecta erro / retry que pode indicar que o usuário precisa intervir
      if (e.type === "session.error" || e.type === "session.status") {
        const status = props.status || {};
        if (status.type === "retry" || status.type === "error" || props.error) {
          const msg = `⚠️ Erro/retry na sessão: ${status.message || props.error?.message || e.type}. Verifique o terminal.`;
          notifyGate(sessionID, "Erro na Sessão", msg, "error");
        }
      }

      if (LOG_LEVEL <= LEVELS.debug) {
        log("debug", "EVENT", { type: e.type, sessionID, keys: Object.keys(props) });
      }
    },

    cleanup: () => {
      // Restaura o stdout original no cleanup
      process.stdout.write = originalWrite;
    },
  };
};

export default GateNotifierPlugin;
