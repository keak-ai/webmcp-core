import { describe, it, expect, beforeEach } from "vitest";
import { generateReactHook } from "./react-hook.js";
import { makeToolSpec, resetIdCounter } from "../__fixtures__/index.js";

beforeEach(() => {
  resetIdCounter();
});

describe("generateReactHook", () => {
  it("contains useWebMCPTools", () => {
    const result = generateReactHook([makeToolSpec()], {
      domain: "example.com",
    });
    expect(result.files[0].content).toContain("useWebMCPTools");
  });

  it("contains useEffect", () => {
    const result = generateReactHook([makeToolSpec()], {
      domain: "example.com",
    });
    expect(result.files[0].content).toContain("useEffect");
  });

  it("file is named webmcp.hooks.tsx", () => {
    const result = generateReactHook([makeToolSpec()], {
      domain: "example.com",
    });
    expect(result.files[0].name).toBe("webmcp.hooks.tsx");
  });

  it("contains registerTool", () => {
    const result = generateReactHook([makeToolSpec()], {
      domain: "example.com",
    });
    expect(result.files[0].content).toContain("registerTool");
  });

  it("contains tool names", () => {
    const tool1 = makeToolSpec({ name: "example_search_products" });
    const tool2 = makeToolSpec({ name: "example_get_cart" });
    const result = generateReactHook([tool1, tool2], { domain: "example.com" });
    const content = result.files[0].content;
    expect(content).toContain("example_search_products");
    expect(content).toContain("example_get_cart");
  });

  it("contains unregisterTool for cleanup", () => {
    const result = generateReactHook([makeToolSpec()], {
      domain: "example.com",
    });
    expect(result.files[0].content).toContain("unregisterTool");
  });

  it("imports useEffect from react", () => {
    const result = generateReactHook([makeToolSpec()], {
      domain: "example.com",
    });
    expect(result.files[0].content).toContain('from "react"');
  });

  it("language is typescriptreact", () => {
    const result = generateReactHook([makeToolSpec()], {
      domain: "example.com",
    });
    expect(result.files[0].language).toBe("typescriptreact");
  });

  it("target is react-hook", () => {
    const result = generateReactHook([makeToolSpec()], {
      domain: "example.com",
    });
    expect(result.target).toBe("react-hook");
  });
});
