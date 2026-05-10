// @ts-ignore
import type { Plugin } from "@opencode-ai/plugin";
// @ts-ignore
import { appendFileSync, readFileSync, existsSync } from "fs";
// @ts-ignore
import https from "https";
// @ts-ignore
import { join } from "path";
// @ts-ignore
import { homedir } from "os";

interface TokenLoggerConfig {
  enabled?: boolean;
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
 * Plugin para interceptar e registrar prompts, mensagens e eventos
 * para depurar o uso excessivo de tokens.
 */
export const TokenLoggerPlugin: Plugin = async ({ client, directory, worktree }: any) => {

  const config = loadConfig(directory, worktree);

  if (config.enabled === false) {
    return {};
  }

  let activeSessionID = "global";
  let activeAgent = "unknown";

  function fileLog(tag: string, data: any) {
    try {
      const logLine = `[${new Date().toISOString()}] [AGENT: ${activeAgent}] [${tag}] ${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}\n\n`;
      const fileName = `/tmp/opencode-token-logger-${activeSessionID.replace(/[^a-zA-Z0-9_-]/g, '')}.log`;
      appendFileSync(fileName, logLine);
    } catch (err) { }
  }

  fileLog("PLUGIN_INIT", "Token Logger Plugin Inicializado com Interceptador HTTP");

  // --- Interceptação de globalThis.fetch ---
  // A maioria dos SDKs modernos (incluindo o do OpenRouter/OpenAI/Anthropic) usa fetch por debaixo dos panos
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

      // Intercepta requisições de provedores de IA (filtro simples para evitar ruído)
      if (url && (url.includes("api") || url.includes("openai") || url.includes("openrouter") || url.includes("anthropic"))) {
        let bodyToLog = requestInit?.body;

        // Se for string, tentamos parsear para logar bonito, senão loga como string
        if (typeof bodyToLog === "string") {
          try {
            bodyToLog = JSON.parse(bodyToLog);
          } catch { }
        }

        fileLog("HTTP_FETCH_REQUEST", {
          url,
          method: requestInit?.method || "GET",
          body: bodyToLog
        });
      }

      return originalFetch.apply(this, args);
    };
  }

  return {
    // Intercepta mensagens do chat antes de serem processadas/enviadas
    "chat.message": async (ctx: any, message: any) => {
      if (ctx?.sessionID) activeSessionID = ctx.sessionID;
      fileLog("CHAT_MESSAGE", message);
      return message; // Retorna a mensagem original para não bloquear o fluxo
    },

    // Escuta todos os eventos do sistema
    event: async ({ event }: any) => {
      const e = event as { type: string; properties: Record<string, any> };
      
      // Captura a sessão e o agente ativos
      const info = e.properties?.info;
      if (info?.sessionID) activeSessionID = info.sessionID;
      else if (e.properties?.sessionID) activeSessionID = e.properties.sessionID;

      if (info?.agent) activeAgent = info.agent;
      else if (info?.mode) activeAgent = info.mode;

      // Filtra eventos irrelevantes se houver muito ruído, 
      // mas por enquanto logamos todos os eventos de sessão e mensagem
      if (
        e.type.startsWith("message") ||
        e.type.startsWith("session") ||
        e.type.includes("provider") ||
        e.type.includes("model")
      ) {
        fileLog(`EVENT:${e.type}`, e.properties);
      }
    },

    // Middlewares para tools, caso o gasto seja nelas
    "tool.execute.before": async (ctx: any, toolName: string, params: any) => {
      fileLog(`TOOL_BEFORE:${toolName}`, params);
      return params;
    }
  };
};

export default TokenLoggerPlugin;
