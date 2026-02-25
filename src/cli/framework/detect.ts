import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export type DetectedFramework =
  | "next"
  | "react-vite"
  | "react-cra"
  | "vue"
  | "nuxt"
  | "svelte"
  | "vite"
  | "shopify"
  | "astro"
  | "html";

export interface DetectionResult {
  framework: DetectedFramework;
  hasTypeScript: boolean;
  packageManager: "npm" | "yarn" | "pnpm" | "bun";
}

export function detectFramework(cwd: string = process.cwd()): DetectionResult {
  const pkgPath = join(cwd, "package.json");
  let deps: Record<string, string> = {};
  let devDeps: Record<string, string> = {};

  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      deps = pkg.dependencies ?? {};
      devDeps = pkg.devDependencies ?? {};
    } catch {
      /* malformed package.json */
    }
  }

  const all = { ...deps, ...devDeps };

  const framework = identifyFramework(all);
  const hasTypeScript = "typescript" in all || existsSync(join(cwd, "tsconfig.json"));
  const packageManager = detectPackageManager(cwd);

  return { framework, hasTypeScript, packageManager };
}

function identifyFramework(all: Record<string, string>): DetectedFramework {
  if ("next" in all) return "next";
  if ("nuxt" in all) return "nuxt";
  if ("@sveltejs/kit" in all || "svelte" in all) return "svelte";
  if ("@shopify/hydrogen" in all || "@shopify/cli" in all) return "shopify";
  if ("astro" in all) return "astro";
  if ("react" in all && "vite" in all) return "react-vite";
  if ("react-scripts" in all) return "react-cra";
  if ("vue" in all || "@vue/cli-service" in all) return "vue";
  if ("vite" in all) return "vite";
  return "html";
}

function detectPackageManager(cwd: string): "npm" | "yarn" | "pnpm" | "bun" {
  if (existsSync(join(cwd, "bun.lockb")) || existsSync(join(cwd, "bun.lock"))) return "bun";
  if (existsSync(join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(cwd, "yarn.lock"))) return "yarn";
  return "npm";
}
