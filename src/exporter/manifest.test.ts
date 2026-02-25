import { describe, it, expect, beforeEach } from "vitest";
import { generateManifest } from "./manifest.js";
import { makeToolSpec, resetIdCounter } from "../__fixtures__/index.js";

beforeEach(() => {
  resetIdCounter();
});

describe("generateManifest", () => {
  it("output is valid JSON", () => {
    const tools = [makeToolSpec()];
    const result = generateManifest(tools, { domain: "example.com" });
    const file = result.files[0];
    expect(() => JSON.parse(file.content)).not.toThrow();
  });

  it("contains version 1.0.0", () => {
    const tools = [makeToolSpec()];
    const result = generateManifest(tools, { domain: "example.com" });
    const parsed = JSON.parse(result.files[0].content);
    expect(parsed.version).toBe("1.0.0");
  });

  it("contains domain matching input", () => {
    const tools = [makeToolSpec()];
    const result = generateManifest(tools, { domain: "mysite.com" });
    const parsed = JSON.parse(result.files[0].content);
    expect(parsed.domain).toBe("mysite.com");
  });

  it("contains correct toolCount", () => {
    const tools = [makeToolSpec(), makeToolSpec(), makeToolSpec()];
    const result = generateManifest(tools, { domain: "example.com" });
    const parsed = JSON.parse(result.files[0].content);
    expect(parsed.toolCount).toBe(3);
  });

  it("contains all tool names", () => {
    const tool1 = makeToolSpec({ name: "example_search_products" });
    const tool2 = makeToolSpec({ name: "example_get_cart" });
    const result = generateManifest([tool1, tool2], { domain: "example.com" });
    const parsed = JSON.parse(result.files[0].content);
    const names = parsed.tools.map((t: { name: string }) => t.name);
    expect(names).toContain("example_search_products");
    expect(names).toContain("example_get_cart");
  });

  it("file is named webmcp.manifest.json", () => {
    const result = generateManifest([makeToolSpec()], { domain: "example.com" });
    expect(result.files[0].name).toBe("webmcp.manifest.json");
  });

  it("language is json", () => {
    const result = generateManifest([makeToolSpec()], { domain: "example.com" });
    expect(result.files[0].language).toBe("json");
  });
});
