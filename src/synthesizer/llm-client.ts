import type { Action, ToolSpec } from "../types.js";

export type LlmProvider =
  | "openai"
  | "anthropic"
  | "google"
  | "mistral"
  | "groq"
  | "xai"
  | "deepseek";

export interface LlmClientOptions {
  apiKey?: string;
  model?: string;
  provider?: LlmProvider;
}

export async function enhanceWithLlm(
  tools: ToolSpec[],
  actions: Action[],
  options?: LlmClientOptions
): Promise<ToolSpec[]> {
  if (!options?.apiKey) return tools;

  const provider = options.provider ?? detectProvider(options.apiKey);
  const model = options.model ?? getDefaultModel(provider);

  const enhanced: ToolSpec[] = [];
  for (const tool of tools) {
    try {
      const related = actions.filter((a) => tool.provenance.actions.includes(a.id));
      const enriched = await enrichTool(tool, related, {
        apiKey: options.apiKey,
        model,
        provider,
      });
      enhanced.push(enriched);
    } catch {
      enhanced.push(tool);
    }
  }
  return enhanced;
}

export function detectProvider(apiKey: string): LlmProvider {
  if (apiKey.startsWith("sk-ant-")) return "anthropic";
  if (apiKey.startsWith("AIza")) return "google";
  if (apiKey.startsWith("gsk_")) return "groq";
  if (apiKey.startsWith("xai-")) return "xai";
  return "openai";
}

export function getDefaultModel(provider: LlmProvider): string {
  switch (provider) {
    case "anthropic":
      return "claude-sonnet-4-20250514";
    case "google":
      return "gemini-2.0-flash";
    case "mistral":
      return "mistral-small-latest";
    case "groq":
      return "llama-3.3-70b-versatile";
    case "xai":
      return "grok-3-mini-fast";
    case "deepseek":
      return "deepseek-chat";
    case "openai":
    default:
      return "gpt-4o-mini";
  }
}

interface CallOptions {
  apiKey: string;
  model: string;
  provider: LlmProvider;
}

async function enrichTool(
  tool: ToolSpec,
  relatedActions: Action[],
  opts: CallOptions
): Promise<ToolSpec> {
  const prompt = buildEnrichmentPrompt(tool, relatedActions);
  const raw = await callLlm(prompt, undefined, opts);

  try {
    const result = JSON.parse(raw) as {
      name?: string;
      description?: string;
      fieldDescriptions?: Record<string, string>;
    };

    const enriched = { ...tool };

    if (result.name && /^[a-z][a-z0-9_]*$/.test(result.name)) {
      enriched.name = result.name;
    }

    if (result.description && result.description.length >= 10) {
      enriched.description = result.description;
    }

    if (result.fieldDescriptions && enriched.inputSchema.properties) {
      const props = { ...enriched.inputSchema.properties };
      for (const [field, desc] of Object.entries(result.fieldDescriptions)) {
        if (props[field]) {
          props[field] = { ...props[field], description: desc };
        }
      }
      enriched.inputSchema = { ...enriched.inputSchema, properties: props };
    }

    return enriched;
  } catch {
    return tool;
  }
}

function buildEnrichmentPrompt(tool: ToolSpec, actions: Action[]): string {
  const actionSummary = actions
    .map((a) => {
      switch (a.kind) {
        case "form_submit":
          return `Form: ${a.labels.join(", ")} (${a.fields.length} fields)`;
        case "api_call":
          return `API: ${a.request.method} ${a.request.url}`;
        case "click_flow":
          return `Click: ${a.labels.join(", ")}`;
        case "route_change":
          return `Route: ${a.from} → ${a.to}`;
      }
    })
    .filter(Boolean);

  const fields = tool.inputSchema.properties
    ? Object.keys(tool.inputSchema.properties).join(", ")
    : "none";

  return `You are improving a WebMCP tool definition. Respond with JSON only.

Current tool:
- Name: ${tool.name}
- Description: ${tool.description}
- Safety: ${tool.safety.level}
- Input fields: ${fields}
- Page: ${tool.provenance.pageUrl}

Related actions:
${actionSummary.map((s) => `- ${s}`).join("\n")}

Improve the tool by returning JSON with these optional fields:
- "name": A better snake_case tool name (format: domain_verb_noun)
- "description": A clear description starting with an action verb (10-200 chars)
- "fieldDescriptions": An object mapping field names to helpful descriptions

Only include fields you want to change. Keep the same domain prefix. Respond with valid JSON only, no markdown.`;
}

// ── Provider configurations ──────────────────────────────────────────────

interface ProviderConfig {
  baseUrl: string;
  authHeader: (apiKey: string) => Record<string, string>;
  /** Whether to include response_format: json_object (not all providers support it) */
  supportsJsonMode: boolean;
}

const OPENAI_COMPAT_AUTH = (apiKey: string) => ({
  Authorization: `Bearer ${apiKey}`,
});

const PROVIDER_CONFIGS: Record<LlmProvider, ProviderConfig> = {
  openai: {
    baseUrl: "https://api.openai.com/v1/chat/completions",
    authHeader: OPENAI_COMPAT_AUTH,
    supportsJsonMode: true,
  },
  groq: {
    baseUrl: "https://api.groq.com/openai/v1/chat/completions",
    authHeader: OPENAI_COMPAT_AUTH,
    supportsJsonMode: true,
  },
  mistral: {
    baseUrl: "https://api.mistral.ai/v1/chat/completions",
    authHeader: OPENAI_COMPAT_AUTH,
    supportsJsonMode: true,
  },
  xai: {
    baseUrl: "https://api.x.ai/v1/chat/completions",
    authHeader: OPENAI_COMPAT_AUTH,
    supportsJsonMode: true,
  },
  deepseek: {
    baseUrl: "https://api.deepseek.com/chat/completions",
    authHeader: OPENAI_COMPAT_AUTH,
    supportsJsonMode: true,
  },
  // Anthropic and Google have their own formats — handled separately
  anthropic: {
    baseUrl: "https://api.anthropic.com/v1/messages",
    authHeader: (apiKey) => ({
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    }),
    supportsJsonMode: false,
  },
  google: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/models",
    authHeader: () => ({}), // Google uses query param for key
    supportsJsonMode: false,
  },
};

// ── Unified caller ───────────────────────────────────────────────────────

export async function callLlm(
  prompt: string,
  system: string | undefined,
  opts: CallOptions
): Promise<string> {
  switch (opts.provider) {
    case "anthropic":
      return callAnthropic(prompt, system, opts);
    case "google":
      return callGoogle(prompt, system, opts);
    default:
      return callOpenAICompat(prompt, system, opts);
  }
}

// ── OpenAI-compatible (OpenAI, Groq, Mistral, xAI, DeepSeek) ────────────

async function callOpenAICompat(
  prompt: string,
  system: string | undefined,
  opts: CallOptions
): Promise<string> {
  const config = PROVIDER_CONFIGS[opts.provider];
  const messages: Array<{ role: string; content: string }> = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });

  const body: Record<string, unknown> = {
    model: opts.model,
    messages,
    temperature: 0.3,
  };
  if (config.supportsJsonMode) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(config.baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...config.authHeader(opts.apiKey),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `${opts.provider} API error ${res.status}: ${text.slice(0, 200)}`
    );
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices[0].message.content;
}

// ── Anthropic ────────────────────────────────────────────────────────────

async function callAnthropic(
  prompt: string,
  system: string | undefined,
  opts: CallOptions
): Promise<string> {
  const config = PROVIDER_CONFIGS.anthropic;
  const body: Record<string, unknown> = {
    model: opts.model,
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  };
  if (system) body.system = system;

  const res = await fetch(config.baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...config.authHeader(opts.apiKey),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Anthropic API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    content: Array<{ text: string }>;
  };
  return data.content[0].text;
}

// ── Google Gemini ────────────────────────────────────────────────────────

async function callGoogle(
  prompt: string,
  system: string | undefined,
  opts: CallOptions
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${opts.model}:generateContent?key=${opts.apiKey}`;

  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
  if (system) {
    contents.push({ role: "user", parts: [{ text: system }] });
    contents.push({ role: "model", parts: [{ text: "Understood." }] });
  }
  contents.push({ role: "user", parts: [{ text: prompt }] });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: { temperature: 0.3 },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
  };
  return data.candidates[0].content.parts[0].text;
}
