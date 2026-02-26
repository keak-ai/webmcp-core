<p align="center">
  <img src="https://cxetbzggx9by1aaf.public.blob.vercel-storage.com/media-assets/icon_1.png" alt="Keak" width="80" />
  <br>
  <h1>WebMCP Core</h1>
  <br>
  Auto-generate <a href="https://developer.chrome.com/docs/ai/webmcp">WebMCP</a> tool definitions from any website.
  <br><br>
  <a href="https://www.npmjs.com/package/@keak/webmcp-core"><img src="https://img.shields.io/npm/v/@keak/webmcp-core?color=blue" alt="npm" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="MIT" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.7+-3178c6.svg" alt="TS" /></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-%3E%3D18-339933.svg" alt="Node" /></a>
  <br>
  <a href="https://agents.keak.com/">agents.keak.com</a>
  <br><br>
  <img src="https://github.com/keak-ai/webmcp-core/blob/main/assets/cli_gif.gif?raw=true" alt="Keak Agent Demo" width="600" />
</p>

```bash
npm install @keak/webmcp-core
```

---

Point this at a URL. It crawls the site, finds every form, API call, and interactive element, then outputs structured tool definitions that work with Chrome's `navigator.modelContext` API. Supports the **Imperative API** (`registerTool()`) and the **Declarative API** (HTML form annotations). Works with Next.js, React, Vue, Svelte, Vite, Shopify, Astro, and plain HTML.

## What is WebMCP?

[WebMCP](https://developer.chrome.com/docs/ai/webmcp) is a web standard (Chrome 146+) that gives AI agents structured tool contracts on existing websites. Instead of screen-scraping, an agent calls explicit tools registered by the page. The [W3C Web Machine Learning Community Group](https://www.w3.org/community/webmachinelearning/) is developing the specification.

Chrome exposes two APIs:

- **Imperative** — `navigator.modelContext.registerTool()` with an `execute` callback
- **Declarative** — `<form>` elements annotated with `toolname`, `tooldescription`, and `toolparamdescription` attributes; Chrome auto-converts them to tools

This package generates output compatible with both.

## Quick Start

```bash
npx @keak/webmcp-core generate https://example.com
```

```
✔ Scanning https://example.com (depth 2)…
  Found 14 actions across 5 pages
✔ Proposed 6 tools
✔ Wrote webmcp.tools.ts (snippet)

  site_search_products   — Search products by keyword            [read]
  site_add_to_cart       — Add a product to the shopping cart    [write]
  site_submit_contact    — Submit the contact form               [write]
  site_toggle_theme      — Toggle dark/light theme               [read]
  site_navigate_category — Navigate to a product category        [read]
  site_checkout          — Complete the checkout flow            [danger]
```

## Setting Up Chrome for WebMCP

WebMCP requires Chrome 146 or later with an experimental flag enabled.

1. Update Chrome to version **146+** (check `chrome://version`)
2. Open `chrome://flags/#enable-webmcp-testing`
3. Set the flag to **Enabled**
4. Relaunch Chrome

After that, `navigator.modelContext` is available on any page. Your generated tool files call `registerTool()` on this object.

> Edge support is expected mid-to-late 2026. Firefox and Safari have not announced timelines.

## How It Works

1. **Scan** — Crawl the site with Playwright via BFS. At each page, capture a DOM snapshot (forms, buttons, links, `toolname`/`tooldescription` attributes) and record network calls.
2. **Extract** — Identify actionable elements: form submissions, first-party API calls, click flows, and route changes.
3. **Synthesize** — Cluster related actions into named tool definitions. Assign JSON Schema inputs, safety levels (`read`/`write`/`danger`), and optionally enrich descriptions with an LLM.
4. **Export** — Output in the format your stack needs: TypeScript snippets, React hooks, HTML embeds, JSON manifests, userscripts, or YAML.

## Install

```bash
npm install @keak/webmcp-core
```

Playwright is optional — only needed for scanning:

```bash
npm install playwright
npx playwright install chromium
```

## CLI Reference

| Command | Description |
|---------|-------------|
| `webmcp init` | Interactive setup — detects framework, creates `webmcp.config.json` |
| `webmcp generate <url>` | Scan + generate in one step |
| `webmcp scan <url>` | Scan only, saves to `.webmcp/scan.json` |
| `webmcp export` | Export from a previous scan |
| `webmcp simulate <prompt>` | Test which tools an agent would pick for a prompt |

### generate options

```
--format <format>       snippet, react-hook, html-embed, manifest, userscript, yaml
--output <dir>          Output directory (default: auto-detected)
--lang <js|ts>          Output language (default: ts if tsconfig.json exists)
--depth <n>             Crawl depth (default: 2)
--headless              Headless browser mode
--timeout <ms>          Page timeout (default: 30000)
--cookie <string>       Cookie string for authenticated pages
--api-key <key>         API key for AI enrichment
--provider <name>       openai, anthropic, google, mistral, groq, xai, deepseek
--model <model>         Model override (defaults per provider below)
--min-confidence <n>    Minimum confidence for tool proposals
```

### simulate example

```bash
npx @keak/webmcp-core simulate "search for red dress" --api-key=sk-...
```

```
Reasoning: The user wants to search for a product, so I'll use the search tool.

  1. site_search_products                                          [read]
     keyword: "red dress"
     → Search the product catalog for "red dress"
```

## Programmatic API

### One-liner

```ts
import { generateToolDefinitions } from "@keak/webmcp-core";

const tools = await generateToolDefinitions("https://example.com", {
  depth: 2,
  headless: true,
  minConfidence: 0.5,
});
```

### Full pipeline

```ts
import { scanUrl, proposeTools, enhanceWithLlm, exportTools } from "@keak/webmcp-core";

const scan = await scanUrl({ url: "https://example.com", depth: 2 });
const tools = proposeTools(scan, { minConfidence: 0.5 });

const enriched = await enhanceWithLlm(tools, scan.actions, {
  apiKey: process.env.OPENAI_API_KEY,
});

const output = exportTools(enriched, "snippet", { domain: "example.com" });
```

### Other exports

```ts
// LLM utilities
import { callLlm, detectProvider, getDefaultModel } from "@keak/webmcp-core";

detectProvider("sk-ant-abc123"); // → "anthropic"
getDefaultModel("groq");        // → "llama-3.3-70b-versatile"

// Linting
import { lintTools, lintSummary } from "@keak/webmcp-core";

const results = lintTools(tools);
const summary = lintSummary(results);
// { totalTools: 6, errors: 0, warnings: 2, info: 1 }
```

## Export Formats

| Format | Output File | Use Case |
|--------|------------|----------|
| `snippet` | `webmcp.tools.ts` | Drop-in `registerTool()` code |
| `react-hook` | `webmcp.hooks.tsx` | `useWebMCPTools()` hook with cleanup |
| `html-embed` | `webmcp.embed.html` | `<script>` tag for any HTML page |
| `manifest` | `webmcp.manifest.json` | Platform upload / API integration |
| `userscript` | `webmcp.*.user.js` | Tampermonkey / Greasemonkey |
| `yaml` | `webmcp.tools.yaml` | Human-readable config |

## Chrome Compatibility

### Imperative API

The `snippet`, `react-hook`, and `html-embed` formats generate code like this:

```ts
navigator.modelContext.registerTool({
  name: "site_search_products",
  description: "Search products by keyword on example.com.",
  inputSchema: {
    type: "object",
    properties: {
      keyword: { type: "string", description: "Search term" }
    },
    required: ["keyword"]
  },
  annotations: { readOnlyHint: "true" },
  execute: (params) => {
    const form = document.querySelector("#search-form");
    // fills form fields and submits
    return { content: [{ type: "text", text: "Done" }] };
  },
});
```

### Declarative API

The scanner detects Chrome's declarative attributes on HTML forms:

```html
<form toolname="search_products"
      tooldescription="Search the product catalog by keyword">
  <input name="keyword" toolparamdescription="The search term to look for">
  <button type="submit">Search</button>
</form>
```

When the scanner finds forms with `toolname`/`tooldescription`, it uses them as the primary tool name and description — preserving round-trip fidelity between what you author and what gets generated.

### Declarative Attributes

| Attribute | Element | Purpose |
|-----------|---------|---------|
| `toolname` | `<form>` | Tool name (e.g., `search_products`) |
| `tooldescription` | `<form>` | What the tool does |
| `toolautosubmit` | `<form>` | Auto-submit without user clicking Submit |
| `toolparamtitle` | `<input>`, `<select>`, `<textarea>` | Override the JSON Schema property key |
| `toolparamdescription` | `<input>`, `<select>`, `<textarea>` | Field description for the agent |

Forms without these attributes are still discovered via `aria-label`, `<label>`, `<legend>`, and heading elements.

## AI Enrichment

Pass any supported API key to improve tool names, descriptions, and field docs. The provider is auto-detected from the key prefix.

| Provider | Env Variable | Default Model | Auto-Detect |
|----------|-------------|---------------|-------------|
| OpenAI | `OPENAI_API_KEY` | `gpt-4o-mini` | Default fallback |
| Anthropic | `ANTHROPIC_API_KEY` | `claude-sonnet-4-20250514` | `sk-ant-*` |
| Google Gemini | `GOOGLE_API_KEY` / `GEMINI_API_KEY` | `gemini-2.0-flash` | `AIza*` |
| Mistral | `MISTRAL_API_KEY` | `mistral-small-latest` | `--provider mistral` |
| Groq | `GROQ_API_KEY` | `llama-3.3-70b-versatile` | `gsk_*` |
| xAI (Grok) | `XAI_API_KEY` | `grok-3-mini-fast` | `xai-*` |
| DeepSeek | `DEEPSEEK_API_KEY` | `deepseek-chat` | `--provider deepseek` |

```bash
# Auto-detected from key prefix
npx @keak/webmcp-core generate https://example.com --api-key=sk-ant-...

# Or via env var
export GROQ_API_KEY=gsk_...
npx @keak/webmcp-core generate https://example.com
```

API keys are never stored in config files.

## Lint Rules

| Rule | Severity | What It Checks |
|------|----------|----------------|
| `naming/snake-case` | error | Name must be lowercase `snake_case` |
| `naming/segments` | warning | Should follow `domain_verb_noun` pattern |
| `naming/length` | warning | Max 64 characters |
| `description/length` | error/warning | Min 10 chars, max 500 |
| `description/verb` | info | Should start with an action verb |
| `schema/empty` | warning | Tools without parameters are rare |
| `schema/type-missing` | warning | All properties need explicit types |
| `schema/description-missing` | info | Field descriptions help the agent |
| `schema/no-required` | info | Consider marking essential fields |
| `safety/confirm-danger` | error | Danger-level tools must require confirmation |
| `safety/possible-write` | warning | Name suggests writes but marked `read` |
| `design/too-many-params` | warning | >10 parameters — consider splitting |
| `design/large-enum` | info | Enums with 20+ options — consider free text |

## FAQ

**Why does the scanner block analytics and tracking domains?**

The API extractor maintains a blocklist of 100+ third-party domains (Google Analytics, Hotjar, Segment, Sentry, Facebook Pixel, etc.). These are tracking and telemetry services that would generate noise tools with no useful site functionality. The scanner only keeps first-party API calls that represent actual features of the target site.

**Do I need Playwright installed?**

Only for scanning. If you're exporting from a saved scan (`webmcp export`), or using the library purely for linting/exporting pre-built tool specs, Playwright is not required.

**Does this work on single-page apps?**

Yes. Playwright renders the page fully before capturing the DOM, so dynamic content from React, Vue, Angular, etc. is included. The crawler follows internal links via BFS up to the configured depth.

**What Chrome version do I need?**

Chrome 146 or later, with `chrome://flags/#enable-webmcp-testing` enabled. The generated code calls `navigator.modelContext.registerTool()`, which is gated behind this flag.

**Can I use this without Chrome?**

The tool generation pipeline (scan, extract, synthesize, export) runs anywhere Node.js runs. Chrome is only needed at runtime to expose the generated tools to AI agents via the `navigator.modelContext` API.

**How does safety classification work?**

The synthesizer classifies tools based on HTTP method and action semantics. GET requests and queries are `read`. POST/PUT forms and mutations are `write`. DELETE operations, payment flows, and checkout are `danger`. The linter warns if a tool's name suggests side effects (e.g., "delete", "remove") but its safety level is marked `read`.

## Architecture

```
src/
├── cli/            CLI commands, framework detection, UI utilities
├── scanner/        Playwright-based page crawling and DOM capture
├── extractor/      Action extraction (forms, APIs, clicks, routes)
├── synthesizer/    Clustering, naming, description, safety, schemas, LLM enrichment
├── exporter/       Output format generators (Chrome WebMCP compatible)
├── linter/         Lint rules for tool quality
└── utils/          Validation schemas and PII redaction
```

Pipeline: `scanUrl` → extractors → `clusterActions` → `enhanceWithLlm` → `ToolSpec[]` → `exportTools`

## Contributing

The test suite is the highest-priority gap right now. If you're looking for a high-impact first contribution, writing tests for the extractors or synthesizer would be a great place to start.

### Development setup

```bash
git clone https://github.com/keak-resources/webmcp-core.git
cd webmcp-core
npm install
npm run build
npm run lint    # tsc --noEmit
```

### Good first contributions

- **Tests** — Zero test coverage currently. Extractors, synthesizer, and linter are all pure-function heavy and straightforward to test.
- **Chrome Declarative API export** — Generate `<form toolname="...">` HTML output
- **`respondWith()` support** — Generate `SubmitEvent.respondWith()` handlers for declarative forms
- **New export formats** — VS Code extension manifests, browser-extension output
- **New extractors** — WebSocket actions, better GraphQL detection
- **Lint rules** — Additional checks aligned with Chrome's WebMCP guidance

### How to contribute

1. Check [open issues](https://github.com/keak-resources/webmcp-core/issues) or open one to discuss your idea
2. Fork and branch: `git checkout -b my-feature`
3. Run `npm run lint` before submitting
4. Open a pull request

### Code style

- TypeScript strict mode
- Pure functions preferred
- No runtime deps beyond what's in `package.json`
- Tests live next to source files (`*.test.ts`)

## License

[MIT](LICENSE)
