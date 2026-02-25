import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import chalk from "chalk";
import { parseCommandArgs } from "../util/args.js";
import { resolveApiKey, resolveProvider } from "../util/env.js";
import { getVersion } from "../util/version.js";
import { printBanner } from "../ui/banner.js";
import { createSpinner } from "../ui/spinner.js";
import { log } from "../ui/logger.js";
import { printToolsTable, printLintSummary } from "../ui/table.js";
import { loadConfig } from "../framework/config-writer.js";
import { ensurePlaywright } from "../util/playwright-setup.js";
import type { OutputTarget, OutputLang } from "../../types.js";

export async function generateCommand(args: string[]): Promise<void> {
  const { values, positionals } = parseCommandArgs(args);

  if (values.help) {
    console.log(`
  ${chalk.bold("webmcp generate")} <url> — Scan a URL and generate tool definitions

  ${chalk.dim("Usage:")}
    webmcp generate <url> [options]

  If no URL is given, reads from webmcp.config.json.
`);
    return;
  }

  printBanner(getVersion());

  const config = loadConfig();
  const url = positionals[0] ?? config?.baseUrl;

  if (!url) {
    log.error("No URL provided. Usage: webmcp generate <url>");
    log.info('Or run "webmcp init" to create a config file.');
    process.exit(1);
  }

  const format = (values.format as OutputTarget) ?? config?.output.format ?? "snippet";
  const lang = (values.lang as OutputLang) ?? config?.output.lang ?? "ts";
  const depth = values.depth ? parseInt(values.depth as string, 10) : config?.scan.depth ?? 2;
  const headless = (values.headless === true) || (config?.scan.headless ?? true);
  const timeout = values.timeout ? parseInt(values.timeout as string, 10) : config?.scan.timeout ?? 30000;
  const outDir = (values.output as string) ?? config?.output.outDir ?? "./webmcp-output";
  const apiKey = resolveApiKey(values as Record<string, unknown>);

  // Step 1: Ensure Playwright + Scan
  const ready = await ensurePlaywright();
  if (!ready) {
    process.exit(1);
  }

  const scanSpinner = createSpinner(`Scanning ${chalk.cyan(url)}...`);
  scanSpinner.start();

  const { scanUrl } = await import("../../index.js");

  let scanResult;
  try {
    scanResult = await scanUrl({
      url,
      depth,
      headless,
      timeout,
      onProgress: (event) => {
        if (event.type === "page_visited") {
          scanSpinner.text = `Scanned ${event.url} (${event.formsFound} forms, ${event.buttonsFound} buttons)`;
        }
      },
    });
  } catch (err) {
    scanSpinner.fail("Scan failed");
    log.blank();
    log.error(err instanceof Error ? err.message : "An unexpected error occurred during scanning.");
    log.blank();
    process.exit(1);
  }
  scanSpinner.succeed(`Scanned ${scanResult.metadata.pagesVisited} page${scanResult.metadata.pagesVisited !== 1 ? "s" : ""}`);

  // Step 2: Propose tools
  const proposeSpinner = createSpinner("Proposing tool definitions...");
  proposeSpinner.start();

  const { proposeTools } = await import("../../index.js");
  const minConfidence = values["min-confidence"]
    ? parseFloat(values["min-confidence"] as string)
    : 0.5;
  let tools = proposeTools(scanResult, { minConfidence });
  proposeSpinner.succeed(`Proposed ${tools.length} tool${tools.length !== 1 ? "s" : ""}`);

  if (tools.length === 0) {
    log.warn("No tools found. Try scanning a different URL or lowering --min-confidence.");
    return;
  }

  // Step 3: AI Enrichment
  if (apiKey) {
    const provider = resolveProvider(apiKey, values as Record<string, unknown>);
    const aiSpinner = createSpinner(`Enriching with AI (${provider})...`);
    aiSpinner.start();

    const { enhanceWithLlm } = await import("../../synthesizer/llm-client.js");
    const model = (values.model as string) ?? config?.ai?.model;

    tools = await enhanceWithLlm(tools, scanResult.actions, {
      apiKey,
      provider,
      model,
    });
    aiSpinner.succeed("AI enrichment complete");
  }

  // Step 4: Lint
  const { lintTools } = await import("../../index.js");
  const lintResults = lintTools(tools);

  // Step 5: Export
  const exportSpinner = createSpinner(`Exporting as ${chalk.cyan(format)}...`);
  exportSpinner.start();

  const { exportTools } = await import("../../index.js");
  let domain: string;
  try {
    domain = new URL(url).hostname;
  } catch {
    domain = "unknown";
  }

  const result = exportTools(tools, format, { lang, domain });

  mkdirSync(outDir, { recursive: true });
  for (const file of result.files) {
    const filepath = join(outDir, file.name);
    writeFileSync(filepath, file.content, "utf-8");
  }
  exportSpinner.succeed(`Exported to ${chalk.cyan(outDir + "/")}`);

  // Step 6: Summary
  printToolsTable(tools);
  printLintSummary(lintResults);

  for (const file of result.files) {
    log.info(`  ${chalk.dim("→")} ${join(outDir, file.name)}`);
  }
  log.blank();
}
