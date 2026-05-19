// @ts-ignore
import type { Plugin } from "@opencode-ai/plugin";
// @ts-ignore
import { appendFileSync, readFileSync, existsSync } from "fs";
// @ts-ignore
import { join } from "path";
// @ts-ignore
import { homedir } from "os";

interface SessionGuardConfig {
  enabled?: boolean;
  logLevel?: "debug" | "info" | "warn" | "error";
  writeGuard?: {
    enabled?: boolean;
    allowNewFiles?: boolean;
  };
  firstPromptWatchdogMs?: number;
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

function loadConfig(directory: string, worktree: string): SessionGuardConfig {
  const candidates = [
    join(worktree, ".opencode", "config", "session-guard.json"),
    join(directory, ".opencode", "config", "session-guard.json"),
    join(homedir(), ".opencode", "config", "session-guard.json"),
    join(homedir(), ".config", "opencode", "config", "session-guard.json"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      try {
        const raw = readFileSync(candidate, "utf-8");
        return JSON.parse(raw) as SessionGuardConfig;
      } catch { }
    }
  }
  return {};
}

const WATCHDOG_DEFAULT_MS = 90000;

export const SessionGuardPlugin: Plugin = async ({ client, directory, worktree }: any) => {

  const config = loadConfig(directory, worktree);

  if (config.enabled === false) {
    return {};
  }

  const LOG_LEVEL = LEVELS[config.logLevel ?? "info"];
  const FIRST_PROMPT_TIMEOUT_MS = config.firstPromptWatchdogMs ?? WATCHDOG_DEFAULT_MS;

  let activeAgent = "unknown";
  const readFiles = new Map<string, Set<string>>();
  const pendingToolCalls = new Map<string, Set<string>>();
  const subagentWatchdogs = new Map<string, ReturnType<typeof setTimeout>>();
  const todoStates = new Map<string, Map<string, { status: string; title: string }>>();

  function log(level: "debug" | "info" | "warn" | "error", tag: string, data: any) {
    if (LEVELS[level] < LOG_LEVEL) return;
    try {
      const ts = getTimestamp();
      const payload = typeof data === "string" ? data : JSON.stringify(data, null, 2);
      const line = `[${ts}] [${level.toUpperCase()}] [${tag}] ${payload}\n\n`;
      appendFileSync("/tmp/opencode-session-guard.log", line);
    } catch { }
  }

  log("info", "PLUGIN_INIT", "Session Guard Plugin inicializado");
  log("info", "PLUGIN_CONFIG", { ...config, firstPromptWatchdogMs: FIRST_PROMPT_TIMEOUT_MS });

  function extractToolName(toolName: any): string {
    if (typeof toolName === 'string') return toolName;
    if (toolName && typeof toolName === 'object') {
      return toolName.tool || toolName.name || toolName.command || '';
    }
    return '';
  }

  function getSessionID(ctxOrEvent: any): string | null {
    return ctxOrEvent?.sessionID ?? null;
  }

  function clearSubagentWatchdog(sessionID: string) {
    const timer = subagentWatchdogs.get(sessionID);
    if (timer) {
      clearTimeout(timer);
      subagentWatchdogs.delete(sessionID);
      log("debug", "WATCHDOG_CLEARED", { sessionID, reason: "subagent activity detected" });
    }
  }

  function registerPendingTool(sessionID: string, callID: string) {
    if (!pendingToolCalls.has(sessionID)) {
      pendingToolCalls.set(sessionID, new Set());
    }
    pendingToolCalls.get(sessionID)!.add(callID);
  }

  function clearPendingTool(sessionID: string, callID: string) {
    const set = pendingToolCalls.get(sessionID);
    if (set) {
      set.delete(callID);
      if (set.size === 0) pendingToolCalls.delete(sessionID);
    }
  }

  return {
    "tool.execute.before": async (ctx: any, toolName: string, params: any) => {
      const actualToolName = extractToolName(toolName);
      const sid = getSessionID(ctx);

      if (sid && ctx?.callID) {
        registerPendingTool(sid, ctx.callID);
        clearSubagentWatchdog(sid);
      }

      // --- Path auto-correction (fixes /home/home/ → /home/, // → /) ---
      const filePath = params?.filePath || params?.path || '';
      if (filePath && typeof filePath === 'string') {
        let corrected = filePath.replace(/\/\/+/g, '/');
        corrected = corrected.replace(/\/home\/home\//g, '/home/');

        if (corrected !== filePath) {
          const correctedExists = existsSync(corrected);
          log("warn", "PATH_AUTO_CORRECTED_FALLBACK", {
            tool: actualToolName,
            original: filePath,
            corrected,
            correctedExists,
            sessionID: sid,
            agent: activeAgent,
          });

          if (correctedExists || filePath.includes('/home/home/')) {
            if (params.filePath) params.filePath = corrected;
            else if (params.path) params.path = corrected;
          }
        }

        if (filePath.startsWith('/home/') && !existsSync(filePath)) {
          const homeDir = homedir();
          const slashAfterUser = filePath.indexOf('/', 6);
          if (slashAfterUser > 0 && !filePath.startsWith(homeDir)) {
            const relativePart = filePath.substring(slashAfterUser);
            const correctedPath = homeDir + relativePart;
            if (existsSync(correctedPath)) {
              log("warn", "PATH_WRONG_USER_CORRECTED", {
                tool: actualToolName,
                original: filePath,
                corrected: correctedPath,
                sessionID: sid,
                agent: activeAgent,
              });
              if (params.filePath) params.filePath = correctedPath;
              else if (params.path) params.path = correctedPath;
            } else {
              log("warn", "PATH_NOT_FOUND_HOME", {
                tool: actualToolName,
                path: filePath,
                sessionID: sid,
                agent: activeAgent,
              });
            }
          } else {
            log("warn", "PATH_NOT_FOUND_HOME", {
              tool: actualToolName,
              path: filePath,
              sessionID: sid,
              agent: activeAgent,
            });
          }
        }
      }

      if (actualToolName === "todowrite" && params?.items && sid) {
        if (!todoStates.has(sid)) todoStates.set(sid, new Map());
        const todos = params.items;
        if (Array.isArray(todos)) {
          for (const item of todos) {
            const key = item.id || item.title || item.content || String(Math.random());
            todoStates.get(sid)!.set(key, {
              status: item.status || 'pending',
              title: item.title || item.content || key,
            });
          }
        }
      }

      if (actualToolName === "write" && config.writeGuard?.enabled !== false) {
        const filePath = params?.filePath;
        if (!filePath) {
          log("debug", "WRITE_GUARD_SKIP", { reason: "no filePath", sessionID: sid });
          return params;
        }

        const tracked = readFiles.get(sid || "global");
        const isTracked = tracked?.has(filePath);

        if (isTracked) {
          log("debug", "WRITE_GUARD_ALLOW", { file: filePath, reason: "previously read", sessionID: sid });
          return params;
        }

        const fileExists = existsSync(filePath);

        if (!fileExists && config.writeGuard?.allowNewFiles !== false) {
          log("debug", "WRITE_GUARD_ALLOW", { file: filePath, reason: "new file creation", sessionID: sid });
          return params;
        }

        log("warn", "WRITE_GUARD_BLOCK", { file: filePath, reason: "exists but never read", sessionID: sid });

        const err = new Error(
          `Write blocked by session-guard: "${filePath}" exists but has not been read yet.\n` +
          `Call 'read' on this file first, then retry the write.\n` +
          `New files (that don't exist yet) are always allowed.`
        );
        (err as any).code = "WRITE_GUARD_BLOCKED";
        throw err;
      }

      return params;
    },

    "tool.execute.after": async (ctx: any, toolName: string, result: any) => {
      const actualToolName = extractToolName(toolName);
      const sid = getSessionID(ctx);

      if (sid && ctx?.callID) {
        clearPendingTool(sid, ctx.callID);
      }

      if (actualToolName === "read" && ctx?.params?.filePath) {
        const filePath = ctx.params.filePath;
        if (!readFiles.has(sid || "global")) {
          readFiles.set(sid || "global", new Set());
        }
        readFiles.get(sid || "global")!.add(filePath);
        log("debug", "WRITE_GUARD_TRACK", { file: filePath, sessionID: sid });
      }
    },

    event: async ({ event }: any) => {
      const e = event as { type: string; properties: Record<string, any> };
      const props = e.properties || {};
      const info = props.info || {};
      const sessionID = info.sessionID || props.sessionID;
      if (info?.agent) activeAgent = info.agent;
      else if (info?.mode) activeAgent = info.mode;

      if (e.type === "session.idle" && sessionID) {
        const pending = pendingToolCalls.get(sessionID);
        if (pending && pending.size > 0) {
          log("warn", "STALE_TOOL_HANG", {
            sessionID,
            pendingCount: pending.size,
            callIDs: [...pending],
            message: "Engine marcou idle mas há ferramentas pendentes — possível bug upstream #27879"
          });
        }

        const todos = todoStates.get(sessionID);
        if (todos) {
          const incomplete = [...todos.values()].filter(t => t.status !== 'completed');
          if (incomplete.length > 0) {
            log("warn", "IDLE_WITH_INCOMPLETE_TODOS", {
              sessionID,
              incompleteCount: incomplete.length,
              todos: incomplete.map(t => t.title)
            });
          }
        }
      }

      if ((e.type === "session.created" || e.type === "session.updated") && sessionID) {
        const parentID = info.parentID;
        if (parentID && !subagentWatchdogs.has(sessionID)) {
          const timer = setTimeout(() => {
            const stillPending = pendingToolCalls.get(sessionID);
            if (!stillPending || stillPending.size === 0) {
              log("debug", "WATCHDOG_EXPIRED_NO_STALL", { sessionID, elapsedMs: FIRST_PROMPT_TIMEOUT_MS });
              subagentWatchdogs.delete(sessionID);
              return;
            }
            log("warn", "FIRST_PROMPT_WATCHDOG", {
              sessionID,
              parentID,
              elapsedMs: FIRST_PROMPT_TIMEOUT_MS,
              pendingTools: [...stillPending],
              message: "Subagente não produziu output — possível stall"
            });
          }, FIRST_PROMPT_TIMEOUT_MS);
          subagentWatchdogs.set(sessionID, timer);
          log("debug", "WATCHDOG_STARTED", { sessionID, parentID, timeoutMs: FIRST_PROMPT_TIMEOUT_MS });
        }
      }
    },
  };
};

export default SessionGuardPlugin;
