import { describe, it, expect, beforeEach } from "vitest";
import { generateSnippet } from "./snippet.js";
import { makeToolSpec, resetIdCounter } from "../__fixtures__/index.js";

beforeEach(() => {
  resetIdCounter();
});

describe("generateSnippet", () => {
  it("contains registerTool", () => {
    const result = generateSnippet([makeToolSpec()], {
      lang: "ts",
      domain: "example.com",
    });
    expect(result.files[0].content).toContain("registerTool");
  });

  it("contains navigator.modelContext", () => {
    const result = generateSnippet([makeToolSpec()], {
      lang: "ts",
      domain: "example.com",
    });
    expect(result.files[0].content).toContain("navigator.modelContext");
  });

  it("contains tool names", () => {
    const tool1 = makeToolSpec({ name: "example_search_products" });
    const tool2 = makeToolSpec({ name: "example_get_cart" });
    const result = generateSnippet([tool1, tool2], {
      lang: "ts",
      domain: "example.com",
    });
    const content = result.files[0].content;
    expect(content).toContain("example_search_products");
    expect(content).toContain("example_get_cart");
  });

  it("uses .ts extension when lang is ts", () => {
    const result = generateSnippet([makeToolSpec()], {
      lang: "ts",
      domain: "example.com",
    });
    expect(result.files[0].name).toMatch(/\.ts$/);
  });

  it("uses .js extension when lang is js", () => {
    const result = generateSnippet([makeToolSpec()], {
      lang: "js",
      domain: "example.com",
    });
    expect(result.files[0].name).toMatch(/\.js$/);
  });

  it("contains initWebMCPTools function", () => {
    const result = generateSnippet([makeToolSpec()], {
      lang: "ts",
      domain: "example.com",
    });
    expect(result.files[0].content).toContain("initWebMCPTools");
  });

  it("target is snippet", () => {
    const result = generateSnippet([makeToolSpec()], {
      lang: "ts",
      domain: "example.com",
    });
    expect(result.target).toBe("snippet");
  });

  it("typescript output includes Navigator type declaration", () => {
    const result = generateSnippet([makeToolSpec()], {
      lang: "ts",
      domain: "example.com",
    });
    expect(result.files[0].content).toContain("declare global");
  });

  it("javascript output does not include declare global", () => {
    const result = generateSnippet([makeToolSpec()], {
      lang: "js",
      domain: "example.com",
    });
    expect(result.files[0].content).not.toContain("declare global");
  });
});
