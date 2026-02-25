export type {
  JsonSchema,
  FieldSpec,
  NetworkCall,
  Action,
  FormSubmitAction,
  ClickFlowAction,
  ApiCallAction,
  RouteChangeAction,
  HandlerStep,
  HandlerTemplate,
  SafetyLevel,
  Safety,
  ToolSpec,
  AuthMethod,
  OutputTarget,
  OutputLang,
  Framework,
  AutogenConfig,
  DomSnapshot,
  DomForm,
  DomButton,
  DomLink,
  ScanResult,
  ScanProgressEvent,
  LintSeverity,
  LintWarning,
  LintResult,
  ExportResult,
  ExportFile,
} from "./types.js";

export {
  FieldSpecSchema,
  NetworkCallSchema,
  FormSubmitActionSchema,
  ClickFlowActionSchema,
  ApiCallActionSchema,
  RouteChangeActionSchema,
  ActionSchema,
  SafetySchema,
  ToolSpecSchema,
} from "./utils/validation.js";

export { lintTools, lintSummary } from "./linter/linter.js";
export { redact, isSensitiveFieldName } from "./utils/redact.js";
export { enhanceWithLlm, detectProvider, getDefaultModel, callLlm } from "./synthesizer/llm-client.js";
export type { LlmClientOptions, LlmProvider } from "./synthesizer/llm-client.js";

import type {
  ScanResult,
  DomSnapshot,
  NetworkCall,
  Action,
  ToolSpec,
  OutputTarget,
  ExportResult,
  ScanProgressEvent,
} from "./types.js";

import { extractForms } from "./extractor/form-extractor.js";
import { extractApiCalls } from "./extractor/api-extractor.js";
import { extractClickFlows } from "./extractor/click-extractor.js";
import { extractRouteChanges } from "./extractor/route-extractor.js";
import { clusterActions } from "./synthesizer/clusterer.js";
import { generateSnippet } from "./exporter/snippet.js";
import { generateManifest } from "./exporter/manifest.js";
import { generateUserscript } from "./exporter/userscript.js";
import { generateYaml } from "./exporter/yaml.js";
import { generateReactHook } from "./exporter/react-hook.js";
import { generateHtmlEmbed } from "./exporter/html-embed.js";

export interface ScanOptions {
  /** URL to scan. */
  url: string;
  /** Max crawl depth (default: 2). */
  depth?: number;
  /** Page load timeout in ms (default: 30000). */
  timeout?: number;
  /** Run browser in headless mode (default: true). */
  headless?: boolean;
  /** Playwright browser executable path. */
  executablePath?: string;
  /** Extra CLI args for the browser process (e.g., serverless-optimized args). */
  args?: string[];
  /** CDP WebSocket URL to connect to an already-running browser (e.g., launched by Puppeteer). */
  cdpUrl?: string;
  /** CSS selectors to ignore during crawling. */
  ignoreSelectors?: string[];
  /** Session cookie string for authenticated scanning. */
  cookie?: string;
  /** Progress callback fired for each page visited. */
  onProgress?: (event: ScanProgressEvent) => void;
}

export interface ProposeOptions {
  /** Minimum confidence threshold (default: 0.5). */
  minConfidence?: number;
  /** Use LLM for naming/descriptions (default: false). */
  useLlm?: boolean;
  /** LLM model identifier. */
  llmModel?: string;
}

export interface ExportOptions {
  /** Output language for snippet format. */
  lang?: "ts" | "js";
  /** Domain for output metadata. */
  domain?: string;
}

/**
 * Scan a website using Playwright, capturing DOM snapshots and network calls.
 * Requires `playwright` as a peer dependency.
 *
 * @example
 * ```ts
 * const result = await scanUrl({ url: "https://example.com", depth: 2 });
 * console.log(`Scanned ${result.metadata.pagesVisited} pages`);
 * ```
 */
export async function scanUrl(options: ScanOptions): Promise<ScanResult> {
  const {
    url,
    depth = 2,
    timeout = 30000,
    headless = true,
    executablePath,
    args,
    cdpUrl,
    ignoreSelectors = [],
    cookie,
    onProgress,
  } = options;

  // Playwright is lazily imported so it stays an optional peer dep
  const { launchBrowser } = await import("./scanner/browser.js");
  const { crawlSite } = await import("./scanner/crawler.js");
  const { captureDom } = await import("./scanner/dom-capture.js");
  const { createNetworkRecorder } = await import("./scanner/network-capture.js");

  const { browser, context, page } = await launchBrowser({
    executablePath,
    headless,
    cookie,
    args,
    cdpUrl,
  });

  const allPages: DomSnapshot[] = [];
  const allNetworkCalls: NetworkCall[] = [];
  let pageCount = 0;
  const startedAt = new Date().toISOString();

  try {
    const networkRecorder = createNetworkRecorder(page, url);

    for await (const visit of crawlSite(page, url, {
      depth,
      timeout,
      ignoreSelectors,
    })) {
      pageCount++;

      onProgress?.({
        type: "page_visiting",
        url: visit.url,
        depth: visit.depth,
      });

      const domSnapshot = await captureDom(page);
      allPages.push(domSnapshot);

      onProgress?.({
        type: "page_visited",
        url: visit.url,
        formsFound: domSnapshot.forms.length,
        buttonsFound: domSnapshot.buttons.length,
      });
    }

    allNetworkCalls.push(...networkRecorder.getCalls());
    networkRecorder.stop();
  } finally {
    await browser.close();
  }

  const scanResult: ScanResult = {
    pages: allPages,
    networkCalls: allNetworkCalls,
    actions: [],
    metadata: {
      baseUrl: url,
      startedAt,
      completedAt: new Date().toISOString(),
      pagesVisited: pageCount,
      depth,
    },
  };

  onProgress?.({ type: "complete", summary: scanResult.metadata });

  return scanResult;
}

/**
 * Extract actions from scan data and cluster them into tool definitions.
 *
 * @example
 * ```ts
 * const result = await scanUrl({ url: "https://example.com" });
 * const tools = proposeTools(result, { minConfidence: 0.6 });
 * ```
 */
export function proposeTools(
  scanResult: ScanResult,
  options: ProposeOptions = {}
): ToolSpec[] {
  const { minConfidence = 0.5 } = options;

  const actions: Action[] = [
    ...extractForms(scanResult.pages),
    ...extractApiCalls(
      scanResult.networkCalls,
      scanResult.pages,
      scanResult.metadata.baseUrl
    ),
    ...extractClickFlows(scanResult.pages),
    ...extractRouteChanges(scanResult.pages),
  ];

  if (actions.length === 0) return [];

  return clusterActions(actions, { minConfidence });
}

/**
 * Export tool definitions to a specific format.
 *
 * @example
 * ```ts
 * const result = exportTools(tools, "manifest", { domain: "example.com" });
 * console.log(result.files[0].content);
 * ```
 */
export function exportTools(
  tools: ToolSpec[],
  format: OutputTarget,
  options: ExportOptions = {}
): ExportResult {
  const { lang = "ts", domain = "unknown-domain" } = options;

  switch (format) {
    case "snippet":
      return generateSnippet(tools, { lang, domain });
    case "manifest":
      return generateManifest(tools, { domain });
    case "userscript":
      return generateUserscript(tools, { domain });
    case "yaml":
      return generateYaml(tools, { domain });
    case "react-hook":
      return generateReactHook(tools, { domain });
    case "html-embed":
      return generateHtmlEmbed(tools, { domain });
    default:
      throw new Error(`Unknown export format: ${format}`);
  }
}

/**
 * Scan a URL and generate tool definitions in a single call.
 *
 * @example
 * ```ts
 * import { generateToolDefinitions } from "@keak/webmcp-core";
 *
 * const tools = await generateToolDefinitions("https://example.com", {
 *   depth: 2,
 *   headless: true,
 *   minConfidence: 0.5,
 * });
 *
 * for (const tool of tools) {
 *   console.log(`${tool.name}: ${tool.description}`);
 * }
 * ```
 */
export async function generateToolDefinitions(
  url: string,
  options: Omit<ScanOptions, "url"> & ProposeOptions = {}
): Promise<ToolSpec[]> {
  const { minConfidence, useLlm, llmModel, ...scanOptions } = options;
  const scanResult = await scanUrl({ url, ...scanOptions });
  return proposeTools(scanResult, { minConfidence, useLlm, llmModel });
}
