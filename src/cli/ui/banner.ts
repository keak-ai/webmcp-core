import chalk from "chalk";

export function printBanner(version: string): void {
  console.log();
  console.log(chalk.bold("  webmcp") + chalk.dim(` v${version}`));
  console.log(chalk.dim("  Auto-generate WebMCP tool definitions from any website"));
  console.log();
}
