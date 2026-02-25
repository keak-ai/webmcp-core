import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import chalk from "chalk";
import { parseCommandArgs } from "../util/args.js";
import { resolveApiKey, resolveProvider } from "../util/env.js";
import { createSpinner } from "../ui/spinner.js";
import { log } from "../ui/logger.js";
import { callLlm, getDefaultModel } from "../../synthesizer/llm-client.js";
import type { ToolSpec } from "../../types.js";

export async function simulateCommand(args: string[]): Promise<void> {
  const { values, positionals } = parseCommandArgs(args);

  if (values.help) {
    console.log(`
  ${chalk.bold("webmcp simulate")} <prompt> — Simulate which tools an agent would call

  ${chalk.dim("Usage:")}
    webmcp simulate "search for red dress" [options]

  ${chalk.dim("Options:")}
    --api-key <key>       API key (required, or set via env var)
    --provider <name>     openai, anthropic, google, mistral, groq, xai, deepseek
    --model <model>       LLM model (default: auto per provider)
    --manifest <path>     Path to manifest file (default: auto-detected)
    --help, -h            Show help

  ${chalk.dim("Environment variables (auto-detected):")}
    OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY,
    MISTRAL_API_KEY, GROQ_API_KEY, XAI_API_KEY, DEEPSEEK_API_KEY
`);
    return;
  }

  const prompt = positionals[0];
  if (!prompt) {
    log.error('No prompt provided. Usage: webmcp simulate "your prompt here"');
    process.exit(1);
  }

  const apiKey = resolveApiKey(values as Record<string, unknown>);
  if (!apiKey) {
    log.error(
      "API key required. Use --api-key or set a provider env var (e.g. OPENAI_API_KEY)."
    );
    process.exit(1);
  }

  // Find manifest
  const manifestPath = findManifest(values.manifest as string | undefined);
  if (!manifestPath) {
    log.error("No manifest found. Run 'webmcp generate <url>' first.");
    log.info(
      "Looked in: ./webmcp-output/webmcp.manifest.json, ./.webmcp/scan.json"
    );
    process.exit(1);
  }

  // Load tools from manifest
  const loadSpinner = createSpinner("Loading tool definitions...");
  loadSpinner.start();

  let tools: ToolSpec[];
  try {
    const raw = readFileSync(manifestPath, "utf-8");
    const parsed = JSON.parse(raw);
    tools = Array.isArray(parsed) ? parsed : parsed.tools || [];
  } catch (e) {
    loadSpinner.fail("Failed to load manifest");
    log.error(`Could not parse ${manifestPath}`);
    process.exit(1);
  }

  if (tools.length === 0) {
    loadSpinner.fail("No tools found in manifest");
    process.exit(1);
  }

  loadSpinner.succeed(`Loaded ${tools.length} tool(s) from ${chalk.dim(manifestPath)}`);

  // Build tool descriptions for the LLM
  const toolDescriptions = tools
    .map((t) => {
      const fields = t.inputSchema?.properties
        ? Object.entries(t.inputSchema.properties)
            .map(
              ([k, v]: [string, any]) =>
                `    - ${k}: ${v.type || "string"}${v.description ? ` (${v.description})` : ""}`
            )
            .join("\n")
        : "    (no parameters)";
      return `  ${t.name} [${t.safety?.level || "read"}]\n    ${t.description}\n    Parameters:\n${fields}`;
    })
    .join("\n\n");

  const systemPrompt = `You are an AI agent planning which tools to call.
Available tools:

${toolDescriptions}

Given the user's request, respond with a JSON object:
{
  "reasoning": "Brief explanation of your approach",
  "toolCalls": [
    {
      "name": "tool_name",
      "arguments": { "param": "value" },
      "order": 1,
      "explanation": "Why this tool is called"
    }
  ]
}

Use realistic argument values. Respond with JSON only, no markdown.`;

  // Resolve provider and model
  const provider = resolveProvider(apiKey, values as Record<string, unknown>);
  const model =
    (values.model as string) || getDefaultModel(provider);

  const simulateSpinner = createSpinner(
    `Simulating with ${chalk.cyan(model)} (${provider})...`
  );
  simulateSpinner.start();

  let response: string;
  try {
    response = await callLlm(prompt, systemPrompt, {
      apiKey,
      model,
      provider,
    });
  } catch (e) {
    simulateSpinner.fail("LLM call failed");
    log.error(e instanceof Error ? e.message : "Unknown error");
    process.exit(1);
  }

  simulateSpinner.succeed("Simulation complete");
  log.blank();

  // Parse and display results
  try {
    // Strip markdown fencing if the model wraps JSON in ```json ... ```
    let cleaned = response.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    const result = JSON.parse(cleaned) as {
      reasoning: string;
      toolCalls: Array<{
        name: string;
        arguments: Record<string, unknown>;
        order: number;
        explanation: string;
      }>;
    };

    // Reasoning
    console.log(chalk.bold("  Reasoning:"));
    console.log(chalk.dim(`  ${result.reasoning}`));
    log.blank();

    // Tool calls
    if (result.toolCalls.length === 0) {
      log.warn("No tool calls generated for this prompt.");
    } else {
      console.log(
        chalk.bold(
          `  Tool Calls (${result.toolCalls.length}):`
        )
      );
      log.blank();

      for (const tc of result.toolCalls) {
        const safetyLevel = tools.find(
          (t) => t.name === tc.name
        )?.safety?.level;
        const safetyColor =
          safetyLevel === "danger"
            ? chalk.red
            : safetyLevel === "write"
            ? chalk.yellow
            : chalk.green;

        console.log(
          `  ${chalk.bold.blue(`${tc.order}.`)} ${chalk.bold(tc.name)} ${safetyColor(`[${safetyLevel || "read"}]`)}`
        );

        if (Object.keys(tc.arguments).length > 0) {
          for (const [key, value] of Object.entries(tc.arguments)) {
            console.log(
              `     ${chalk.dim(key + ":")} ${chalk.cyan(String(value))}`
            );
          }
        }

        console.log(`     ${chalk.dim(tc.explanation)}`);
        log.blank();
      }
    }
  } catch {
    log.warn("Could not parse structured response. Raw output:");
    console.log(response);
  }
}

function findManifest(explicitPath?: string): string | null {
  if (explicitPath) {
    return existsSync(explicitPath) ? explicitPath : null;
  }

  const candidates = [
    join(process.cwd(), "webmcp-output", "webmcp.manifest.json"),
    join(process.cwd(), ".webmcp", "scan.json"),
  ];

  for (const p of candidates) {
    if (existsSync(p)) return p;
  }

  return null;
}
