import { parseArgs } from "node:util";
import chalk from "chalk";

export async function run(argv: string[]): Promise<void> {
  const { values } = parseArgs({
    args: argv,
    options: {
      help:    { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
    allowPositionals: true,
    strict: false,
  });

  if (values.version) {
    const { getVersion } = await import("./util/version.js");
    console.log(getVersion());
    return;
  }

  const command = argv[0];
  const commandArgs = argv.slice(1);

  switch (command) {
    case "init":
      return (await import("./commands/init.js")).initCommand(commandArgs);
    case "generate":
      return (await import("./commands/generate.js")).generateCommand(commandArgs);
    case "scan":
      return (await import("./commands/scan.js")).scanCommand(commandArgs);
    case "export":
      return (await import("./commands/export.js")).exportCommand(commandArgs);
    case "simulate":
      return (await import("./commands/simulate.js")).simulateCommand(commandArgs);
    case "help":
    case "--help":
    case "-h":
    case undefined:
      printUsage();
      return;
    default:
      console.error(chalk.red(`  Unknown command: ${command}\n`));
      printUsage();
      process.exit(1);
  }
}

function printUsage(): void {
  console.log(`
  ${chalk.bold("webmcp")} — Auto-generate WebMCP tool definitions from any website

  ${chalk.dim("Usage:")}
    webmcp <command> [options]

  ${chalk.dim("Commands:")}
    ${chalk.cyan("init")}                  Set up WebMCP for your project
    ${chalk.cyan("generate")} <url>        Scan a URL and generate tool definitions
    ${chalk.cyan("scan")} <url>            Scan a URL and save raw results
    ${chalk.cyan("export")}                Export tool definitions from saved data
    ${chalk.cyan("simulate")} <prompt>     Simulate which tools an agent would call

  ${chalk.dim("Options:")}
    --format <format>     Output: snippet, manifest, userscript, yaml, react-hook, html-embed
    --output <dir>        Output directory
    --api-key <key>       API key for AI enrichment
    --provider <name>     LLM provider: openai, anthropic, google, mistral, groq, xai, deepseek
    --model <model>       LLM model (default: auto per provider)
    --depth <n>           Crawl depth (default: 2)
    --lang <lang>         Output language: ts, js
    --headless            Run browser in headless mode
    --help, -h            Show help
    --version, -v         Show version

  ${chalk.dim("Environment variables (auto-detected):")}
    OPENAI_API_KEY        OpenAI
    ANTHROPIC_API_KEY     Anthropic
    GOOGLE_API_KEY        Google Gemini
    MISTRAL_API_KEY       Mistral
    GROQ_API_KEY          Groq
    XAI_API_KEY           xAI (Grok)
    DEEPSEEK_API_KEY      DeepSeek

  ${chalk.dim("Examples:")}
    npx @keak/webmcp-core init
    npx @keak/webmcp-core generate https://shop.example.com
    npx @keak/webmcp-core generate https://app.example.com --format=react-hook
    npx @keak/webmcp-core generate https://site.com --api-key=sk-...
    npx @keak/webmcp-core simulate "search for red dress" --api-key=sk-...
    npx @keak/webmcp-core simulate "add to cart" --provider=groq --api-key=gsk_...
`);
}
