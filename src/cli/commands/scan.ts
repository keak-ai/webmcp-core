import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import chalk from "chalk";
import { parseCommandArgs } from "../util/args.js";
import { getVersion } from "../util/version.js";
import { printBanner } from "../ui/banner.js";
import { createSpinner } from "../ui/spinner.js";
import { log } from "../ui/logger.js";
import { loadConfig } from "../framework/config-writer.js";
import { ensurePlaywright } from "../util/playwright-setup.js";

const WEBMCP_DIR = ".webmcp";

export async function scanCommand(args: string[]): Promise<void> {
  const { values, positionals } = parseCommandArgs(args);

  if (values.help) {
    console.log(`
  ${chalk.bold("webmcp scan")} <url> — Scan a URL and save raw results

  ${chalk.dim("Usage:")}
    webmcp scan <url> [options]

  Results are saved to .webmcp/scan.json for later use with "webmcp export".
`);
    return;
  }

  printBanner(getVersion());

  const config = loadConfig();
  const url = positionals[0] ?? config?.baseUrl;

  if (!url) {
    log.error("No URL provided. Usage: webmcp scan <url>");
    process.exit(1);
  }

  const depth = values.depth ? parseInt(values.depth as string, 10) : config?.scan.depth ?? 2;
  const headless = (values.headless === true) || (config?.scan.headless ?? true);
  const timeout = values.timeout ? parseInt(values.timeout as string, 10) : config?.scan.timeout ?? 30000;

  // Ensure Playwright is installed (interactive prompt if missing)
  const ready = await ensurePlaywright();
  if (!ready) {
    process.exit(1);
  }

  const spinner = createSpinner(`Scanning ${chalk.cyan(url)}...`);
  spinner.start();

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
          spinner.text = `Scanned ${event.url} (${event.formsFound} forms, ${event.buttonsFound} buttons)`;
        }
      },
    });
  } catch (err) {
    spinner.fail("Scan failed");
    log.blank();
    log.error(err instanceof Error ? err.message : "An unexpected error occurred during scanning.");
    log.blank();
    process.exit(1);
  }

  spinner.succeed(`Scanned ${scanResult.metadata.pagesVisited} page${scanResult.metadata.pagesVisited !== 1 ? "s" : ""}`);

  mkdirSync(WEBMCP_DIR, { recursive: true });
  const outPath = join(WEBMCP_DIR, "scan.json");
  writeFileSync(outPath, JSON.stringify(scanResult, null, 2), "utf-8");

  log.success(`Saved scan results to ${chalk.cyan(outPath)}`);
  log.info(`Found ${scanResult.pages.reduce((n, p) => n + p.forms.length, 0)} forms, ${scanResult.networkCalls.length} network calls`);
  log.blank();
  log.info(`Next: ${chalk.cyan("webmcp export")} to generate tool definitions from this scan.`);
  log.blank();
}
