import chalk from "chalk";
import type { ToolSpec, LintResult } from "../../types.js";

const SAFETY_COLORS: Record<string, (s: string) => string> = {
  read:   chalk.green,
  write:  chalk.yellow,
  danger: chalk.red,
};

export function printToolsTable(tools: ToolSpec[]): void {
  if (tools.length === 0) {
    log("  No tools generated.\n");
    return;
  }

  const cols = process.stdout.columns || 80;
  const nameWidth = 30;
  const safetyWidth = 8;
  const confWidth = 6;
  const descWidth = Math.max(20, cols - nameWidth - safetyWidth - confWidth - 12);

  log("");
  log(chalk.bold("  Generated Tools:\n"));

  const header =
    "  " +
    pad("Name", nameWidth) +
    pad("Safety", safetyWidth) +
    pad("Conf.", confWidth) +
    "Description";
  log(header);
  log("  " + chalk.dim("─".repeat(Math.min(cols - 4, 80))));

  for (const tool of tools) {
    const colorFn = SAFETY_COLORS[tool.safety.level] ?? chalk.white;
    const safety = colorFn(tool.safety.level.toUpperCase());
    const conf = Math.round(tool.provenance.confidence * 100) + "%";
    const desc = truncate(tool.description, descWidth);

    log(
      "  " +
      pad(tool.name, nameWidth) +
      pad(safety, safetyWidth + (safety.length - tool.safety.level.length)) +
      pad(conf, confWidth) +
      desc
    );
  }

  log("");
}

export function printLintSummary(results: LintResult[]): void {
  let errors = 0;
  let warnings = 0;

  for (const r of results) {
    for (const w of r.warnings) {
      if (w.severity === "error") errors++;
      else if (w.severity === "warning") warnings++;
    }
  }

  const parts: string[] = [];
  if (errors > 0) parts.push(chalk.red(`${errors} error${errors > 1 ? "s" : ""}`));
  if (warnings > 0) parts.push(chalk.yellow(`${warnings} warning${warnings > 1 ? "s" : ""}`));

  if (parts.length > 0) {
    log(`  Lint: ${parts.join(", ")}`);
  } else {
    log(chalk.dim("  Lint: all checks passed"));
  }
  log("");
}

function pad(str: string, width: number): string {
  const visible = stripAnsi(str);
  if (visible.length >= width) return str + " ";
  return str + " ".repeat(width - visible.length);
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + "…";
}

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

function log(msg: string): void {
  console.log(msg);
}
