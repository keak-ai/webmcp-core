import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { DetectedFramework } from "./detect.js";
import type { OutputTarget, OutputLang } from "../../types.js";

export interface WebMCPConfig {
  baseUrl: string;
  framework: DetectedFramework;
  output: {
    format: OutputTarget;
    lang: OutputLang;
    outDir: string;
  };
  scan: {
    depth: number;
    timeout: number;
    headless: boolean;
    ignore: string[];
  };
  ai?: {
    provider: "openai" | "anthropic";
    model?: string;
  };
  auth: {
    method: "none" | "cookie" | "browser-login";
    cookie?: string;
  };
}

const CONFIG_FILENAME = "webmcp.config.json";

export function writeConfig(config: WebMCPConfig, cwd: string = process.cwd()): string {
  const filepath = join(cwd, CONFIG_FILENAME);
  writeFileSync(filepath, JSON.stringify(config, null, 2) + "\n", "utf-8");
  return filepath;
}

export function loadConfig(cwd: string = process.cwd()): WebMCPConfig | null {
  const filepath = join(cwd, CONFIG_FILENAME);
  if (!existsSync(filepath)) return null;

  try {
    return JSON.parse(readFileSync(filepath, "utf-8")) as WebMCPConfig;
  } catch {
    return null;
  }
}

export function configExists(cwd: string = process.cwd()): boolean {
  return existsSync(join(cwd, CONFIG_FILENAME));
}

export function addNpmScript(
  scriptName: string,
  scriptValue: string,
  cwd: string = process.cwd()
): boolean {
  const pkgPath = join(cwd, "package.json");
  if (!existsSync(pkgPath)) return false;

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    if (!pkg.scripts) pkg.scripts = {};
    pkg.scripts[scriptName] = scriptValue;
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
    return true;
  } catch {
    return false;
  }
}
