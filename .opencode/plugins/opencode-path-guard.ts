// @ts-ignore
import type { Plugin } from "@opencode-ai/plugin";
// @ts-ignore
import { appendFileSync, readFileSync, existsSync } from "fs";
// @ts-ignore
import { join } from "path";
// @ts-ignore
import { homedir } from "os";

interface PathGuardConfig {
  enabled?: boolean;
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

function loadConfig(directory: string, worktree: string): PathGuardConfig {
  const candidates = [
    join(worktree, ".opencode", "config", "path-guard.json"),
    join(directory, ".opencode", "config", "path-guard.json"),
    join(homedir(), ".opencode", "config", "path-guard.json"),
    join(homedir(), ".config", "opencode", "config", "path-guard.json"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      try {
        return JSON.parse(readFileSync(candidate, "utf-8")) as PathGuardConfig;
      } catch { }
    }
  }
  return {};
}

const HOME = homedir();

export const PathGuardPlugin: Plugin = async ({ client, directory, worktree }: any) => {
  const config = loadConfig(directory, worktree);
  if (config.enabled === false) return {};

  const LOG_LEVEL = LEVELS[config.logLevel ?? "warn"];

  function log(level: "debug" | "info" | "warn" | "error", tag: string, data: any) {
    if (LEVELS[level] < LOG_LEVEL) return;
    try {
      const ts = getTimestamp();
      const payload = typeof data === "string" ? data : JSON.stringify(data);
      appendFileSync("/tmp/opencode-path-guard.log", `[${ts}] [${level.toUpperCase()}] [${tag}] ${payload}\n\n`);
    } catch { }
  }

  log("info", "PLUGIN_INIT", "Path Guard iniciado");

  return {
    "tool.execute.before": async (ctx: any, toolName: string, params: any) => {
      const filePath: string = params?.filePath || params?.path || '';
      if (!filePath || typeof filePath !== 'string') return params;

      let corrected = filePath;

      // Fix doubled separators
      corrected = corrected.replace(/\/\/+/g, '/');

      // Fix /home/home/ → /home/
      corrected = corrected.replace(/\/home\/home\//g, '/home/');

      // Fix wrong username in /home/<user>/...
      if (corrected.startsWith('/home/') && !existsSync(corrected)) {
        const slash = corrected.indexOf('/', 6);
        if (slash > 0 && !corrected.startsWith(HOME)) {
          const relPart = corrected.substring(slash);
          const candidate = HOME + relPart;
          if (existsSync(candidate)) {
            log("warn", "PATH_WRONG_USER_FIXED", { original: filePath, corrected: candidate });
            corrected = candidate;
          }
        }
      }

      if (corrected !== filePath) {
        log("info", "PATH_FIXED", { original: filePath, corrected });
        if (params.filePath) params.filePath = corrected;
        else if (params.path) params.path = corrected;
      }

      return params;
    },
  };
};

export default PathGuardPlugin;
