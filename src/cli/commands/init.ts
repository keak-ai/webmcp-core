import { input, select, confirm, password } from "@inquirer/prompts";
import chalk from "chalk";
import { printBanner } from "../ui/banner.js";
import { log } from "../ui/logger.js";
import { getVersion } from "../util/version.js";
import { detectFramework, type DetectedFramework } from "../framework/detect.js";
import { getPreset } from "../framework/presets.js";
import { writeConfig, addNpmScript, configExists } from "../framework/config-writer.js";
import type { OutputTarget, OutputLang } from "../../types.js";

export async function initCommand(_args: string[]): Promise<void> {
  printBanner(getVersion());

  if (configExists()) {
    const overwrite = await confirm({
      message: "webmcp.config.json already exists. Overwrite?",
      default: false,
    });
    if (!overwrite) {
      log.info("Init cancelled.");
      return;
    }
  }

  const detection = detectFramework();
  const preset = getPreset(detection.framework);

  log.info(`Detected framework: ${chalk.cyan(preset.label)}`);
  if (detection.hasTypeScript) log.info("TypeScript: " + chalk.green("yes"));
  log.blank();

  const frameworkChoices: Array<{ value: DetectedFramework; name: string }> = [
    { value: detection.framework, name: `${preset.label} (detected)` },
    { value: "next" as const, name: "Next.js" },
    { value: "react-vite" as const, name: "React + Vite" },
    { value: "vue" as const, name: "Vue.js" },
    { value: "svelte" as const, name: "SvelteKit" },
    { value: "vite" as const, name: "Vite" },
    { value: "shopify" as const, name: "Shopify" },
    { value: "astro" as const, name: "Astro" },
    { value: "html" as const, name: "Plain HTML" },
  ];

  const framework = await select<DetectedFramework>({
    message: "Confirm your framework:",
    default: detection.framework,
    choices: frameworkChoices.filter(
      (c, i, arr) => i === 0 || c.value !== arr[0].value
    ),
  });

  const selectedPreset = getPreset(framework);

  const baseUrl = await input({
    message: "Base URL to scan:",
    validate: (val) => {
      try {
        new URL(val);
        return true;
      } catch {
        return "Enter a valid URL (e.g., https://example.com)";
      }
    },
  });

  const format = await select<OutputTarget>({
    message: "Output format:",
    default: selectedPreset.defaultFormat,
    choices: [
      { value: "snippet", name: "snippet — JavaScript/TypeScript file" },
      { value: "react-hook", name: "react-hook — React useWebMCPTools() hook" },
      { value: "html-embed", name: "html-embed — <script> tag for any HTML page" },
      { value: "manifest", name: "manifest — JSON manifest" },
      { value: "userscript", name: "userscript — Tampermonkey/Greasemonkey" },
      { value: "yaml", name: "yaml — YAML config" },
    ],
  });

  const lang: OutputLang = detection.hasTypeScript ? "ts" : "js";
  const outDir = selectedPreset.defaultOutDir;

  let aiProvider: "openai" | "anthropic" | undefined;
  let aiModel: string | undefined;

  const useAi = await confirm({
    message: "Enable AI enrichment? (requires an OpenAI or Anthropic API key)",
    default: false,
  });

  if (useAi) {
    aiProvider = await select<"openai" | "anthropic">({
      message: "AI provider:",
      choices: [
        { value: "openai", name: "OpenAI" },
        { value: "anthropic", name: "Anthropic" },
      ],
    });

    const key = await password({
      message: `${aiProvider === "openai" ? "OpenAI" : "Anthropic"} API key:`,
    });

    if (key) {
      const envVar = aiProvider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY";
      log.info(`Set ${chalk.cyan(envVar)}=${chalk.dim("sk-...")} in your environment.`);
      log.info("API keys are not stored in the config file.");
    }

    aiModel = aiProvider === "openai" ? "gpt-4o-mini" : "claude-sonnet-4-20250514";
  }

  writeConfig({
    baseUrl,
    framework,
    output: { format, lang, outDir },
    scan: { depth: 2, timeout: 30000, headless: true, ignore: [] },
    ai: aiProvider ? { provider: aiProvider, model: aiModel } : undefined,
    auth: { method: "none" },
  });

  log.success("Created " + chalk.cyan("webmcp.config.json"));

  const addScript = await confirm({
    message: 'Add "webmcp:generate" script to package.json?',
    default: true,
  });

  if (addScript) {
    const added = addNpmScript("webmcp:generate", "webmcp generate");
    if (added) {
      log.success('Added "webmcp:generate" to package.json scripts');
    } else {
      log.warn("Could not add script — no package.json found");
    }
  }

  log.blank();
  log.success("WebMCP is ready!");
  log.blank();
  console.log(chalk.dim("  Next steps:"));
  console.log(`    ${chalk.cyan("npx @keak/webmcp-core generate")}  — Generate tool definitions`);
  console.log(`    ${chalk.cyan("npm run webmcp:generate")}         — Or use the npm script`);
  log.blank();
}
