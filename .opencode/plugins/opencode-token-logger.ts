// @ts-ignore
import type { Plugin } from "@opencode-ai/plugin";
// @ts-ignore
import { appendFileSync, readFileSync, existsSync } from "fs";
// @ts-ignore
import { join } from "path";
// @ts-ignore
import { homedir } from "os";

interface TokenLoggerConfig {
  enabled?: boolean;
  fetchTimeoutMs?: number;
  fetchTimeoutEnabled?: boolean;
  logLevel?: "debug" | "info" | "warn" | "error";
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

function loadConfig(directory: string, worktree: string): TokenLoggerConfig {
  const candidates = [
    join(worktree, ".opencode", "config", "token-logger.json"),
    join(directory, ".opencode", "config", "token-logger.json"),
    join(homedir(), ".opencode", "config", "token-logger.json"),
    join(homedir(), ".config", "opencode", "config", "token-logger.json"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      try {
        const raw = readFileSync(candidate, "utf-8");
        return JSON.parse(raw) as TokenLoggerConfig;
      } catch { }
    }
  }
  return {};
}

/**
 * opencode-token-logger
 *
 * Plugin para interceptar, registrar e aplicar timeout em chamadas de IA.
 * Log levels: debug > info > warn > error
 */
export const TokenLoggerPlugin: Plugin = async ({ client, directory, worktree }: any) => {

  const config = loadConfig(directory, worktree);

  if (config.enabled === false) {
    return {};
  }

  const LOG_LEVEL = LEVELS[config.logLevel ?? "info"];

  let activeSessionID = "global";
  let activeAgent = "unknown";

  function log(level: "debug" | "info" | "warn" | "error", tag: string, data: any) {
    if (LEVELS[level] < LOG_LEVEL) return;
    try {
      const ts = getTimestamp();
      const payload = typeof data === "string" ? data : JSON.stringify(data, null, 2);
      const line = `[${ts}] [${level.toUpperCase()}] [AGENT: ${activeAgent}] [${tag}] ${payload}\n\n`;
      const fileName = `/tmp/opencode-token-logger-${activeSessionID.replace(/[^a-zA-Z0-9_-]/g, "")}.log`;
      appendFileSync(fileName, line);
    } catch { }
  }

  log("info", "PLUGIN_INIT", "Token Logger + Fetch Timeout Plugin inicializado");
  log("info", "PLUGIN_CONFIG", config);

  const FETCH_TIMEOUT_MS = config.fetchTimeoutMs ?? 600000;
  const STREAM_CHUNK_TIMEOUT_MS = (config as any).streamChunkTimeoutMs ?? 30000; // 30s sem chunk = stall
  const TIMEOUT_ENABLED = config.fetchTimeoutEnabled !== false;
  log("info", "TIMEOUT_CONFIG", { fetchTimeoutMs: FETCH_TIMEOUT_MS, streamChunkTimeoutMs: STREAM_CHUNK_TIMEOUT_MS, enabled: TIMEOUT_ENABLED });

  // --- Interceptação de globalThis.fetch ---
  // @ts-ignore
  const originalFetch = globalThis.fetch;
  if (originalFetch) {
    // @ts-ignore
    globalThis.fetch = async function (...args) {
      const requestInput = args[0];
      const requestInit = args[1];

      let url = "";
      if (typeof requestInput === "string") {
        url = requestInput;
      } else if (requestInput instanceof URL) {
        url = requestInput.toString();
      } else if (requestInput && typeof requestInput === "object" && "url" in requestInput) {
        url = (requestInput as any).url;
      }

      const isProvider = url && (url.includes("api") || url.includes("openai") || url.includes("openrouter") || url.includes("anthropic") || url.includes("ollama"));

      if (isProvider) {
        // Log em debug: body completo. Info: apenas url + method.
        let bodyToLog = requestInit?.body;
        if (typeof bodyToLog === "string") {
          try { bodyToLog = JSON.parse(bodyToLog); } catch { }
        }
        log("info", "HTTP_FETCH_REQUEST", { url, method: requestInit?.method || "GET" });
        log("debug", "HTTP_FETCH_REQUEST_BODY", bodyToLog);

        if (TIMEOUT_ENABLED) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            log("warn", "HTTP_FETCH_TIMEOUT", { url, timeoutMs: FETCH_TIMEOUT_MS, message: `Abortado após ${FETCH_TIMEOUT_MS}ms` });
            controller.abort();
          }, FETCH_TIMEOUT_MS);

          try {
            const response = await originalFetch.call(this, requestInput, {
              ...(requestInit || {}),
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            log("info", "HTTP_FETCH_RESPONSE", { url, status: response.status, ok: response.ok });
            log("debug", "HTTP_FETCH_RESPONSE_HEADERS", Object.fromEntries(response.headers.entries()));
            return response;
          } catch (err: any) {
            clearTimeout(timeoutId);
            if (err.name === "AbortError" || err.code === "ABORT_ERR") {
              log("error", "HTTP_FETCH_ABORTED", { url, timeoutMs: FETCH_TIMEOUT_MS });
              const error = new Error(`[FetchTimeout] Provedor não respondeu em ${FETCH_TIMEOUT_MS}ms. URL: ${url}`);
              // @ts-ignore
              error.code = "ETIMEDOUT";
              throw error;
            }
            log("error", "HTTP_FETCH_ERROR", { url, error: err.message, stack: err.stack });
            throw err;
          }
        } else {
          return originalFetch.apply(this, args);
        }
      }

      return originalFetch.apply(this, args);
    };
  }

  return {
    "chat.message": async (ctx: any, message: any) => {
      if (ctx?.sessionID) activeSessionID = ctx.sessionID;
      log("info", "CHAT_MESSAGE", { sessionID: activeSessionID, role: message?.role });
      log("debug", "CHAT_MESSAGE_BODY", message);
      return message;
    },

    event: async ({ event }: any) => {
      const e = event as { type: string; properties: Record<string, any> };
      const info = e.properties?.info;
      if (info?.sessionID) activeSessionID = info.sessionID;
      else if (e.properties?.sessionID) activeSessionID = e.properties.sessionID;
      if (info?.agent) activeAgent = info.agent;
      else if (info?.mode) activeAgent = info.mode;

      if (
        e.type.startsWith("message") ||
        e.type.startsWith("session") ||
        e.type.includes("provider") ||
        e.type.includes("model")
      ) {
        log("debug", `EVENT:${e.type}`, { sessionID: activeSessionID, agent: activeAgent, ...e.properties });
      }
    },

    "tool.execute.before": async (ctx: any, toolName: string, params: any) => {
      let actualToolName: string;
      if (typeof toolName === 'string') {
        actualToolName = toolName;
      } else if (toolName && typeof toolName === 'object') {
        actualToolName = toolName.tool || toolName.name || toolName.command || JSON.stringify(toolName).slice(0, 40);
      } else {
        actualToolName = String(toolName);
      }
      // Info: agente + tool + arquivo (se houver filePath no params)
      const fileHint = params?.filePath || params?.path || params?.file || '';
      log("info", `TOOL_BEFORE:${actualToolName}`, { agent: activeAgent, file: fileHint });
      log("debug", `TOOL_BEFORE:${actualToolName}:PARAMS`, params);
      return params;
    },

    "tool.execute.after": async (ctx: any, toolName: string, result: any) => {
      let actualToolName: string;
      if (typeof toolName === 'string') {
        actualToolName = toolName;
      } else if (toolName && typeof toolName === 'object') {
        actualToolName = toolName.tool || toolName.name || toolName.command || JSON.stringify(toolName).slice(0, 40);
      } else {
        actualToolName = String(toolName);
      }
      // Info: apenas agente + tool + tipo de resultado (não o conteúdo)
      const resultType = Array.isArray(result) ? `array[${result.length}]` : (result && typeof result === 'object' ? 'object' : typeof result);
      log("info", `TOOL_AFTER:${actualToolName}`, { agent: activeAgent, resultType });
      log("debug", `TOOL_AFTER:${actualToolName}:RESULT`, result);
    },
  };
};

export default TokenLoggerPlugin;
