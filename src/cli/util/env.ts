import type { LlmProvider } from "../../synthesizer/llm-client.js";

/** Ordered list of env vars to check for an API key. */
const API_KEY_ENV_VARS = [
  "WEBMCP_API_KEY",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GOOGLE_API_KEY",
  "GEMINI_API_KEY",
  "MISTRAL_API_KEY",
  "GROQ_API_KEY",
  "XAI_API_KEY",
  "DEEPSEEK_API_KEY",
] as const;

export function resolveApiKey(flags: Record<string, unknown>): string | undefined {
  if (typeof flags["api-key"] === "string") return flags["api-key"];
  for (const key of API_KEY_ENV_VARS) {
    if (process.env[key]) return process.env[key];
  }
  return undefined;
}

/** Known --provider flag values. */
const VALID_PROVIDERS: LlmProvider[] = [
  "openai",
  "anthropic",
  "google",
  "mistral",
  "groq",
  "xai",
  "deepseek",
];

export function resolveProvider(
  apiKey: string,
  flags?: Record<string, unknown>
): LlmProvider {
  // Explicit --provider flag takes priority
  if (typeof flags?.provider === "string") {
    const p = flags.provider as string;
    if (VALID_PROVIDERS.includes(p as LlmProvider)) return p as LlmProvider;
  }

  // Auto-detect from API key prefix
  if (apiKey.startsWith("sk-ant-")) return "anthropic";
  if (apiKey.startsWith("AIza")) return "google";
  if (apiKey.startsWith("gsk_")) return "groq";
  if (apiKey.startsWith("xai-")) return "xai";

  // Auto-detect from which env var provided the key
  if (!flags?.["api-key"]) {
    if (process.env.ANTHROPIC_API_KEY === apiKey) return "anthropic";
    if (process.env.GOOGLE_API_KEY === apiKey || process.env.GEMINI_API_KEY === apiKey) return "google";
    if (process.env.MISTRAL_API_KEY === apiKey) return "mistral";
    if (process.env.GROQ_API_KEY === apiKey) return "groq";
    if (process.env.XAI_API_KEY === apiKey) return "xai";
    if (process.env.DEEPSEEK_API_KEY === apiKey) return "deepseek";
  }

  return "openai";
}
