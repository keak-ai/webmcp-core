import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import chalk from "chalk";
import { parseCommandArgs } from "../util/args.js";
import { getVersion } from "../util/version.js";
import { printBanner } from "../ui/banner.js";
import { createSpinner } from "../ui/spinner.js";
import { log } from "../ui/logger.js";
import { printToolsTable, printLintSummary } from "../ui/table.js";
import { loadConfig } from "../framework/config-writer.js";
import type { ScanResult, OutputTarget, OutputLang } from "../../types.js";

const SCAN_PATH = join(".webmcp", "scan.json");

export async function exportCommand(args: string[]): Promise<void> {
  const { values, positionals } = parseCommandArgs(args);

  if (values.help) {
    console.log(`
  ${chalk.bold("webmcp export")} — Export tool definitions from saved scan data

  ${chalk.dim("Usage:")}
    webmcp export [scan-file] [options]

  If no file is given, reads from .webmcp/scan.json (created by "webmcp scan").
`);
    return;
  }

  printBanner(getVersion());

  const config = loadConfig();
  const scanFile = positionals[0] ?? SCAN_PATH;

  if (!existsSync(scanFile)) {
    log.error(`Scan data not found at ${chalk.cyan(scanFile)}`);
    log.info('Run "webmcp scan <url>" first to create scan data.');
    process.exit(1);
  }

  const spinner = createSpinner("Loading scan data...");
  spinner.start();

  let scanResult: ScanResult;
  try {
    scanResult = JSON.parse(readFileSync(scanFile, "utf-8")) as ScanResult;
  } catch {
    spinner.fail("Failed to parse scan data");
    process.exit(1);
  }

  spinner.succeed(`Loaded scan from ${chalk.cyan(scanResult.metadata.baseUrl)}`);

  const proposeSpinner = createSpinner("Proposing tool definitions...");
  proposeSpinner.start();

  const { proposeTools, exportTools, lintTools } = await import("../../index.js");
  const minConfidence = values["min-confidence"]
    ? parseFloat(values["min-confidence"] as string)
    : 0.5;
  const tools = proposeTools(scanResult, { minConfidence });
  proposeSpinner.succeed(`Proposed ${tools.length} tool${tools.length !== 1 ? "s" : ""}`);

  if (tools.length === 0) {
    log.warn("No tools found in scan data.");
    return;
  }

  const format = (values.format as OutputTarget) ?? config?.output.format ?? "snippet";
  const lang = (values.lang as OutputLang) ?? config?.output.lang ?? "ts";
  const outDir = (values.output as string) ?? config?.output.outDir ?? "./webmcp-output";

  let domain: string;
  try {
    domain = new URL(scanResult.metadata.baseUrl).hostname;
  } catch {
    domain = "unknown";
  }

  const exportSpinner = createSpinner(`Exporting as ${chalk.cyan(format)}...`);
  exportSpinner.start();

  const result = exportTools(tools, format, { lang, domain });

  mkdirSync(outDir, { recursive: true });
  for (const file of result.files) {
    writeFileSync(join(outDir, file.name), file.content, "utf-8");
  }
  exportSpinner.succeed(`Exported to ${chalk.cyan(outDir + "/")}`);

  const lintResults = lintTools(tools);
  printToolsTable(tools);
  printLintSummary(lintResults);

  for (const file of result.files) {
    log.info(`  ${chalk.dim("→")} ${join(outDir, file.name)}`);
  }
  log.blank();
}
