import { describe, it, expect, beforeEach } from "vitest";
import { proposeTools, exportTools } from "./index.js";
import {
  makeScanResult,
  makeDomSnapshot,
  makeDomForm,
  makeFieldSpec,
  makeNetworkCall,
  resetIdCounter,
} from "./__fixtures__/index.js";
import type { ScanResult, ToolSpec } from "./types.js";

beforeEach(() => {
  resetIdCounter();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a ScanResult with one page containing a search form.
 * buttons and links are empty to prevent click_flow / route_change actions
 * whose relative hrefs would cause URL parse errors in the snippet generator. */
function scanWithForm(): ScanResult {
  return makeScanResult({
    pages: [
      makeDomSnapshot({
        url: "https://example.com/search",
        forms: [
          makeDomForm({
            selector: "form#search",
            fields: [makeFieldSpec({ name: "query", type: "string", required: false })],
            labels: ["Search"],
            submitSelector: "button[type=submit]",
          }),
        ],
        buttons: [],
        links: [],
      }),
    ],
    networkCalls: [],
    metadata: {
      baseUrl: "https://example.com",
      startedAt: "2025-01-01T00:00:00.000Z",
      completedAt: "2025-01-01T00:01:00.000Z",
      pagesVisited: 1,
      depth: 2,
    },
  });
}

/** Build a ScanResult with a POST API call on the same domain (high confidence). */
function scanWithApiCall(): ScanResult {
  return makeScanResult({
    pages: [
      makeDomSnapshot({
        url: "https://example.com",
        forms: [],
        buttons: [],
        links: [],
      }),
    ],
    networkCalls: [
      makeNetworkCall({
        method: "POST",
        url: "https://example.com/api/cart",
        status: 200,
        responseBodySample: { cartId: "abc", total: 42 },
      }),
    ],
    metadata: {
      baseUrl: "https://example.com",
      startedAt: "2025-01-01T00:00:00.000Z",
      completedAt: "2025-01-01T00:01:00.000Z",
      pagesVisited: 1,
      depth: 2,
    },
  });
}

/** Build a ScanResult with a GET API call that has no params and no response sample
 * (confidence = 0.5 - 0.15 - 0.1 = 0.25, below default 0.5 threshold). */
function scanWithLowConfidenceApiCall(): ScanResult {
  return makeScanResult({
    pages: [
      makeDomSnapshot({
        url: "https://example.com/about",
        forms: [],
        buttons: [],
        links: [],
      }),
    ],
    networkCalls: [
      makeNetworkCall({
        method: "GET",
        // Different path from the page so it is not filtered as page navigation
        url: "https://example.com/api/ping",
        status: 200,
        // no responseBodySample → -0.15 penalty; GET with no params → -0.1 penalty
      }),
    ],
    metadata: {
      baseUrl: "https://example.com",
      startedAt: "2025-01-01T00:00:00.000Z",
      completedAt: "2025-01-01T00:01:00.000Z",
      pagesVisited: 1,
      depth: 2,
    },
  });
}

// ---------------------------------------------------------------------------
// proposeTools
// ---------------------------------------------------------------------------

describe("proposeTools()", () => {
  it("returns an empty array for an empty scan result", () => {
    const empty = makeScanResult({ pages: [], networkCalls: [] });
    const tools = proposeTools(empty);
    expect(tools).toEqual([]);
  });

  it("returns an empty array when pages have no forms or API calls", () => {
    const noActions = makeScanResult({
      pages: [
        makeDomSnapshot({
          forms: [],
          buttons: [],
          links: [],
        }),
      ],
      networkCalls: [],
    });
    const tools = proposeTools(noActions);
    expect(tools).toEqual([]);
  });

  it("returns ToolSpec[] when the scan contains a form", () => {
    const tools = proposeTools(scanWithForm());
    expect(tools.length).toBeGreaterThan(0);
  });

  it("returns tools with required ToolSpec fields for a form scan", () => {
    const tools = proposeTools(scanWithForm());
    expect(tools.length).toBeGreaterThan(0);

    const tool = tools[0];
    expect(tool).toHaveProperty("id");
    expect(tool).toHaveProperty("name");
    expect(tool).toHaveProperty("description");
    expect(tool).toHaveProperty("inputSchema");
    expect(tool).toHaveProperty("safety");
    expect(tool).toHaveProperty("availability");
    expect(tool).toHaveProperty("implementation");
    expect(tool).toHaveProperty("provenance");
  });

  it("form-derived tool has form_declarative implementation kind", () => {
    const tools = proposeTools(scanWithForm());
    expect(tools.length).toBeGreaterThan(0);
    const formTool = tools[0];
    expect(formTool.implementation.kind).toBe("form_declarative");
  });

  it("form-derived tool provenance references autogen-v1 and has confidence >= 0.5", () => {
    const tools = proposeTools(scanWithForm());
    const tool = tools[0];
    expect(tool.provenance.createdFrom).toBe("autogen-v1");
    expect(tool.provenance.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it("form-derived tool availability urlPatterns includes the page origin", () => {
    const tools = proposeTools(scanWithForm());
    const tool = tools[0];
    const patterns = tool.availability.urlPatterns.join(" ");
    expect(patterns).toContain("example.com");
  });

  it("returns tools when scan contains a high-confidence POST API call", () => {
    const tools = proposeTools(scanWithApiCall());
    expect(tools.length).toBeGreaterThan(0);
  });

  it("API call tool has js_handler implementation kind", () => {
    const tools = proposeTools(scanWithApiCall());
    expect(tools.length).toBeGreaterThan(0);
    const apiTool = tools[0];
    expect(apiTool.implementation.kind).toBe("js_handler");
  });

  it("filters out tools below the default minConfidence (0.5)", () => {
    // Low-confidence GET call with no params and no response sample (score ~0.25)
    const tools = proposeTools(scanWithLowConfidenceApiCall());
    expect(tools).toEqual([]);
  });

  it("respects a custom minConfidence — high threshold filters out form tool", () => {
    // A single-field form with labels+submitSelector scores ~0.75; threshold 0.9 must exclude it
    const tools = proposeTools(scanWithForm(), { minConfidence: 0.9 });
    expect(tools).toEqual([]);
  });

  it("respects a custom minConfidence — low threshold keeps the form tool", () => {
    const tools = proposeTools(scanWithForm(), { minConfidence: 0.1 });
    expect(tools.length).toBeGreaterThan(0);
  });

  it("returns a stable array (not undefined or null)", () => {
    const tools = proposeTools(scanWithForm());
    expect(Array.isArray(tools)).toBe(true);
  });

  it("filters out API calls from third-party domains", () => {
    const crossOriginScan = makeScanResult({
      pages: [makeDomSnapshot({ url: "https://example.com", forms: [], buttons: [], links: [] })],
      networkCalls: [
        makeNetworkCall({
          method: "POST",
          url: "https://analytics.google.com/collect",
          status: 200,
        }),
      ],
      metadata: {
        baseUrl: "https://example.com",
        startedAt: "2025-01-01T00:00:00.000Z",
        completedAt: "2025-01-01T00:01:00.000Z",
        pagesVisited: 1,
        depth: 2,
      },
    });
    const tools = proposeTools(crossOriginScan);
    expect(tools).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// exportTools
// ---------------------------------------------------------------------------

describe("exportTools()", () => {
  let tools: ToolSpec[];

  beforeEach(() => {
    resetIdCounter();
    tools = proposeTools(scanWithForm());
    // Guard: ensure we have at least one tool to export
    expect(tools.length).toBeGreaterThan(0);
  });

  // snippet --------------------------------------------------------------------

  it("snippet format returns an ExportResult with target 'snippet'", () => {
    const result = exportTools(tools, "snippet");
    expect(result.target).toBe("snippet");
  });

  it("snippet format returns at least one file", () => {
    const result = exportTools(tools, "snippet");
    expect(result.files.length).toBeGreaterThan(0);
  });

  it("snippet format default lang is TypeScript (.ts extension)", () => {
    const result = exportTools(tools, "snippet");
    const mainFile = result.files.find((f) => f.name.endsWith(".ts"));
    expect(mainFile).toBeDefined();
    expect(mainFile!.language).toBe("typescript");
  });

  it("snippet format with lang 'js' produces a .js file", () => {
    const result = exportTools(tools, "snippet", { lang: "js" });
    const mainFile = result.files.find((f) => f.name.endsWith(".js"));
    expect(mainFile).toBeDefined();
    expect(mainFile!.language).toBe("javascript");
  });

  it("snippet file content registers tools via navigator.modelContext", () => {
    const result = exportTools(tools, "snippet");
    const content = result.files[0].content;
    expect(content).toContain("navigator.modelContext");
    expect(content).toContain("registerTool");
  });

  it("snippet file content includes the tool name", () => {
    const result = exportTools(tools, "snippet");
    const content = result.files[0].content;
    expect(content).toContain(tools[0].name);
  });

  // manifest -------------------------------------------------------------------

  it("manifest format returns an ExportResult with target 'manifest'", () => {
    const result = exportTools(tools, "manifest");
    expect(result.target).toBe("manifest");
  });

  it("manifest format produces a webmcp.manifest.json file", () => {
    const result = exportTools(tools, "manifest");
    const manifestFile = result.files.find((f) => f.name === "webmcp.manifest.json");
    expect(manifestFile).toBeDefined();
  });

  it("manifest file content is valid JSON", () => {
    const result = exportTools(tools, "manifest");
    const manifestFile = result.files.find((f) => f.name === "webmcp.manifest.json")!;
    expect(() => JSON.parse(manifestFile.content)).not.toThrow();
  });

  it("manifest JSON contains expected top-level fields", () => {
    const result = exportTools(tools, "manifest");
    const manifestFile = result.files.find((f) => f.name === "webmcp.manifest.json")!;
    const parsed = JSON.parse(manifestFile.content);
    expect(parsed).toHaveProperty("version");
    expect(parsed).toHaveProperty("tools");
    expect(parsed).toHaveProperty("toolCount");
    expect(Array.isArray(parsed.tools)).toBe(true);
  });

  it("manifest JSON toolCount matches the number of tools", () => {
    const result = exportTools(tools, "manifest");
    const parsed = JSON.parse(
      result.files.find((f) => f.name === "webmcp.manifest.json")!.content
    );
    expect(parsed.toolCount).toBe(tools.length);
    expect(parsed.tools.length).toBe(tools.length);
  });

  it("manifest domain option is included in the JSON", () => {
    const result = exportTools(tools, "manifest", { domain: "example.com" });
    const parsed = JSON.parse(
      result.files.find((f) => f.name === "webmcp.manifest.json")!.content
    );
    expect(parsed.domain).toBe("example.com");
  });

  // yaml -----------------------------------------------------------------------

  it("yaml format returns an ExportResult with target 'yaml'", () => {
    const result = exportTools(tools, "yaml");
    expect(result.target).toBe("yaml");
  });

  it("yaml format produces a webmcp.tools.yaml file", () => {
    const result = exportTools(tools, "yaml");
    const yamlFile = result.files.find((f) => f.name === "webmcp.tools.yaml");
    expect(yamlFile).toBeDefined();
  });

  it("yaml file has language 'yaml'", () => {
    const result = exportTools(tools, "yaml");
    const yamlFile = result.files.find((f) => f.name === "webmcp.tools.yaml")!;
    expect(yamlFile.language).toBe("yaml");
  });

  it("yaml content contains the tool name", () => {
    const result = exportTools(tools, "yaml");
    const yamlFile = result.files.find((f) => f.name === "webmcp.tools.yaml")!;
    expect(yamlFile.content).toContain(tools[0].name);
  });

  it("yaml content starts with the WebMCP header comment", () => {
    const result = exportTools(tools, "yaml");
    const content = result.files[0].content;
    expect(content).toContain("# WebMCP Tool Definitions");
  });

  // unknown format -------------------------------------------------------------

  it("throws an error for an unknown export format", () => {
    expect(() =>
      // Cast to any to bypass TypeScript's type check — testing the runtime guard
      exportTools(tools, "unknown-format" as any)
    ).toThrow(/Unknown export format/);
  });

  // empty tools list -----------------------------------------------------------

  it("handles an empty tools array for manifest export", () => {
    const result = exportTools([], "manifest");
    const parsed = JSON.parse(
      result.files.find((f) => f.name === "webmcp.manifest.json")!.content
    );
    expect(parsed.toolCount).toBe(0);
    expect(parsed.tools).toEqual([]);
  });

  it("handles an empty tools array for snippet export", () => {
    const result = exportTools([], "snippet");
    expect(result.files.length).toBeGreaterThan(0);
    // Content should still be a valid script even with zero tools
    expect(result.files[0].content).toContain("initWebMCPTools");
  });
});
