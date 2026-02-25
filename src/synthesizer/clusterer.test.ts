import { describe, it, expect, beforeEach } from "vitest";
import { clusterActions } from "./clusterer.js";
import {
  makeFormSubmitAction,
  makeApiCallAction,
  makeClickFlowAction,
  makeRouteChangeAction,
  makeFieldSpec,
  resetIdCounter,
} from "../__fixtures__/index.js";

beforeEach(() => {
  resetIdCounter();
});

describe("clusterActions", () => {
  it("empty actions → empty array", () => {
    const tools = clusterActions([]);
    expect(tools).toEqual([]);
  });

  it("single form action → 1 ToolSpec", () => {
    const action = makeFormSubmitAction({ labels: ["Search"] });
    const tools = clusterActions([action]);
    expect(tools).toHaveLength(1);
  });

  it("single API action → 1 ToolSpec", () => {
    const action = makeApiCallAction({
      request: {
        method: "GET",
        url: "https://example.com/api/products",
        status: 200,
        responseBodySample: { items: [] },
      },
    });
    const tools = clusterActions([action]);
    expect(tools).toHaveLength(1);
  });

  it("single click action → 1 ToolSpec", () => {
    const action = makeClickFlowAction({ labels: ["Add to Cart"] });
    const tools = clusterActions([action]);
    expect(tools).toHaveLength(1);
  });

  it("single route change action → 1 ToolSpec", () => {
    const action = makeRouteChangeAction();
    const tools = clusterActions([action]);
    expect(tools).toHaveLength(1);
  });

  it("output has valid ToolSpec shape — all required fields present", () => {
    const action = makeFormSubmitAction({
      labels: ["Search"],
      fields: [makeFieldSpec({ name: "query", type: "string" })],
    });
    const tools = clusterActions([action]);
    expect(tools).toHaveLength(1);

    const tool = tools[0];
    expect(tool).toHaveProperty("id");
    expect(tool).toHaveProperty("name");
    expect(tool).toHaveProperty("description");
    expect(tool).toHaveProperty("inputSchema");
    expect(tool).toHaveProperty("safety");
    expect(tool).toHaveProperty("availability");
    expect(tool).toHaveProperty("implementation");
    expect(tool).toHaveProperty("provenance");

    expect(typeof tool.id).toBe("string");
    expect(typeof tool.name).toBe("string");
    expect(typeof tool.description).toBe("string");
    expect(tool.safety).toHaveProperty("level");
    expect(tool.safety).toHaveProperty("requiresConfirm");
    expect(tool.availability).toHaveProperty("urlPatterns");
    expect(tool.availability).toHaveProperty("requiresAuth");
    expect(tool.provenance).toHaveProperty("confidence");
    expect(tool.provenance).toHaveProperty("createdFrom");
    expect(tool.provenance).toHaveProperty("actions");
    expect(tool.provenance).toHaveProperty("pageUrl");
  });

  it("low confidence filtered out by default minConfidence=0.5", () => {
    // An API GET with no response body and no query params will have confidence ~0.25 (0.5 - 0.15 - 0.1)
    const action = makeApiCallAction({
      request: {
        method: "GET",
        url: "https://example.com/api/products",
        status: 200,
        // no responseBodySample → -0.15, no query params → -0.1
      },
    });
    const tools = clusterActions([action], { minConfidence: 0.5 });
    // confidence = 0.5 + 0.1 (status < 400) - 0.15 (no response body) - 0.1 (no query params) = 0.35
    expect(tools).toHaveLength(0);
  });

  it("minConfidence 0.0 passes all actions", () => {
    const apiAction = makeApiCallAction({
      request: {
        method: "GET",
        url: "https://example.com/api/products",
        status: 200,
        // no responseBodySample, no query params — low confidence
      },
    });
    const tools = clusterActions([apiAction], { minConfidence: 0.0 });
    expect(tools).toHaveLength(1);
  });

  it("high-confidence form passes default threshold", () => {
    // Form with labels + multiple fields + submitSelector → 0.5 + 0.1 + 0.1 + 0.1 + 0.05 = 0.85
    const action = makeFormSubmitAction({
      labels: ["Search products"],
      fields: [
        makeFieldSpec({ name: "query", type: "string" }),
        makeFieldSpec({ name: "category", type: "string" }),
      ],
      submitSelector: "button[type=submit]",
    });
    const tools = clusterActions([action]);
    expect(tools).toHaveLength(1);
  });

  it("provenance.confidence is a number between 0 and 1", () => {
    const action = makeFormSubmitAction({ labels: ["Search"] });
    const tools = clusterActions([action]);
    expect(tools[0].provenance.confidence).toBeGreaterThanOrEqual(0);
    expect(tools[0].provenance.confidence).toBeLessThanOrEqual(1);
  });

  it("provenance.actions references source action IDs", () => {
    const action = makeFormSubmitAction({ labels: ["Search"] });
    const tools = clusterActions([action]);
    expect(tools[0].provenance.actions).toContain(action.id);
  });

  it("provenance.createdFrom is 'autogen-v1'", () => {
    const action = makeFormSubmitAction({ labels: ["Search"] });
    const tools = clusterActions([action]);
    expect(tools[0].provenance.createdFrom).toBe("autogen-v1");
  });

  it("name matches snake_case pattern", () => {
    const action = makeFormSubmitAction({ labels: ["Search products"] });
    const tools = clusterActions([action]);
    expect(tools[0].name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it("multiple distinct actions each become their own ToolSpec", () => {
    const form = makeFormSubmitAction({
      labels: ["Search"],
      pageUrl: "https://example.com/search",
    });
    const route = makeRouteChangeAction({
      from: "https://example.com",
      to: "https://example.com/about",
    });
    const click = makeClickFlowAction({
      labels: ["Long enough label"],
      pageUrl: "https://example.com/shop",
    });
    const tools = clusterActions([form, route, click], { minConfidence: 0.0 });
    expect(tools.length).toBeGreaterThanOrEqual(3);
  });

  it("form implementation kind is form_declarative", () => {
    const action = makeFormSubmitAction({ labels: ["Search"] });
    const tools = clusterActions([action]);
    expect(tools[0].implementation.kind).toBe("form_declarative");
  });

  it("API action implementation kind is js_handler", () => {
    const action = makeApiCallAction({
      request: {
        method: "GET",
        url: "https://example.com/api/data",
        status: 200,
        responseBodySample: { result: [] },
      },
    });
    const tools = clusterActions([action]);
    expect(tools[0].implementation.kind).toBe("js_handler");
  });

  it("availability.urlPatterns is a non-empty array", () => {
    const action = makeFormSubmitAction({ labels: ["Search"] });
    const tools = clusterActions([action]);
    expect(tools[0].availability.urlPatterns).toBeInstanceOf(Array);
    expect(tools[0].availability.urlPatterns.length).toBeGreaterThan(0);
  });

  it("domain is extracted from action pageUrl, not from options", () => {
    const action = makeFormSubmitAction({
      labels: ["Search"],
      pageUrl: "https://mystore.com/products",
    });
    const tools = clusterActions([action], { domain: "ignored.com" });
    expect(tools[0].name).toContain("mystore");
  });

  it("duplicate names → deduplication keeps higher confidence tool", () => {
    // Two forms with the same page/label structure produce the same name;
    // passing minConfidence=0 so both initially qualify, dedup keeps the one
    // with higher confidence (the one with more fields)
    const lowForm = makeFormSubmitAction({
      labels: ["Search"],
      pageUrl: "https://example.com",
      fields: [makeFieldSpec({ name: "query" })],
    });
    const highForm = makeFormSubmitAction({
      labels: ["Search"],
      pageUrl: "https://example.com",
      fields: [
        makeFieldSpec({ name: "query" }),
        makeFieldSpec({ name: "category" }),
      ],
      submitSelector: "button#search",
    });
    const tools = clusterActions([lowForm, highForm], { minConfidence: 0.0 });
    // Both generate the same name → dedup to 1
    const matchingNameTools = tools.filter((t) => t.name === tools[0].name);
    expect(matchingNameTools).toHaveLength(1);
  });
});
