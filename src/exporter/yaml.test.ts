import { describe, it, expect, beforeEach } from "vitest";
import { generateYaml } from "./yaml.js";
import { makeToolSpec, resetIdCounter } from "../__fixtures__/index.js";

beforeEach(() => {
  resetIdCounter();
});

describe("generateYaml", () => {
  it("output contains tool names", () => {
    const tool1 = makeToolSpec({ name: "example_search_products" });
    const tool2 = makeToolSpec({ name: "example_get_cart" });
    const result = generateYaml([tool1, tool2], { domain: "example.com" });
    const content = result.files[0].content;
    expect(content).toContain("example_search_products");
    expect(content).toContain("example_get_cart");
  });

  it("output contains version:", () => {
    const result = generateYaml([makeToolSpec()], { domain: "example.com" });
    const content = result.files[0].content;
    expect(content).toContain("version:");
  });

  it("file is named webmcp.tools.yaml", () => {
    const result = generateYaml([makeToolSpec()], { domain: "example.com" });
    expect(result.files[0].name).toBe("webmcp.tools.yaml");
  });

  it("output contains domain", () => {
    const result = generateYaml([makeToolSpec()], { domain: "mystore.com" });
    const content = result.files[0].content;
    expect(content).toContain("mystore.com");
  });

  it("output contains tools: section header", () => {
    const result = generateYaml([makeToolSpec()], { domain: "example.com" });
    expect(result.files[0].content).toContain("tools:");
  });

  it("language is yaml", () => {
    const result = generateYaml([makeToolSpec()], { domain: "example.com" });
    expect(result.files[0].language).toBe("yaml");
  });

  it("target is yaml", () => {
    const result = generateYaml([makeToolSpec()], { domain: "example.com" });
    expect(result.target).toBe("yaml");
  });
});
