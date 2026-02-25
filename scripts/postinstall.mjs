#!/usr/bin/env node

/**
 * Postinstall banner for @keak/webmcp-core
 * Shows ASCII art + quick-start commands after npm install.
 * Wrapped in try/catch so it never blocks installation.
 */

try {
  const { readFileSync } = await import("node:fs");
  const { dirname, join } = await import("node:path");
  const { fileURLToPath } = await import("node:url");

  // Read version from package.json
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf8"));
  const version = pkg.version;

  // Try to use chalk for colors, fall back to plain text
  let chalk;
  try {
    chalk = (await import("chalk")).default;
  } catch {
    chalk = null;
  }

  const c = (color, text) => {
    if (!chalk) return text;
    switch (color) {
      case "cyan":    return chalk.cyan(text);
      case "green":   return chalk.green(text);
      case "yellow":  return chalk.yellow(text);
      case "dim":     return chalk.dim(text);
      case "bold":    return chalk.bold(text);
      case "magenta": return chalk.magenta(text);
      default:        return text;
    }
  };

  const logo = [
    "",
    c("cyan", "  ██╗  ██╗███████╗ █████╗ ██╗  ██╗"),
    c("cyan", "  ██║ ██╔╝██╔════╝██╔══██╗██║ ██╔╝"),
    c("cyan", "  █████╔╝ █████╗  ███████║█████╔╝ "),
    c("cyan", "  ██╔═██╗ ██╔══╝  ██╔══██║██╔═██╗ "),
    c("cyan", "  ██║  ██╗███████╗██║  ██║██║  ██╗"),
    c("cyan", "  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝"),
    "",
    `  ${c("bold", "WebMCP")} ${c("dim", `v${version}`)}  ${c("dim", "— Auto-generate MCP tools from any website")}`,
    "",
    c("dim", "  ─────────────────────────────────────"),
    "",
    `  ${c("green", "Get started:")}`,
    "",
    `    ${c("yellow", "$")} ${c("bold", "npx webmcp init")}          ${c("dim", "Set up config for your project")}`,
    `    ${c("yellow", "$")} ${c("bold", "npx webmcp generate <url>")} ${c("dim", "Scan a site & generate tools")}`,
    `    ${c("yellow", "$")} ${c("bold", "npx webmcp scan <url>")}     ${c("dim", "Quick scan without saving")}`,
    `    ${c("yellow", "$")} ${c("bold", "npx webmcp export")}         ${c("dim", "Export tools to JSON, MCP, etc.")}`,
    "",
    `  ${c("dim", "Docs:")}  ${c("magenta", "https://github.com/keak-resources/webmcp-core")}`,
    "",
  ];

  console.log(logo.join("\n"));
} catch {
  // Never block installation
}
