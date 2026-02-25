import { describe, it, expect, beforeEach } from "vitest";
import { generateHtmlEmbed } from "./html-embed.js";
import { makeToolSpec, resetIdCounter } from "../__fixtures__/index.js";

beforeEach(() => {
  resetIdCounter();
});

describe("generateHtmlEmbed", () => {
  it("contains a script tag", () => {
    const result = generateHtmlEmbed([makeToolSpec()], {
      domain: "example.com",
    });
    const content = result.files[0].content;
    expect(content).toContain("<script>");
    expect(content).toContain("</script>");
  });

  it("contains registerTool", () => {
    const result = generateHtmlEmbed([makeToolSpec()], {
      domain: "example.com",
    });
    expect(result.files[0].content).toContain("registerTool");
  });

  it("file is named webmcp.embed.html", () => {
    const result = generateHtmlEmbed([makeToolSpec()], {
      domain: "example.com",
    });
    expect(result.files[0].name).toBe("webmcp.embed.html");
  });

  it("contains tool names", () => {
    const tool1 = makeToolSpec({ name: "example_search_products" });
    const tool2 = makeToolSpec({ name: "example_get_cart" });
    const result = generateHtmlEmbed([tool1, tool2], { domain: "example.com" });
    const content = result.files[0].content;
    expect(content).toContain("example_search_products");
    expect(content).toContain("example_get_cart");
  });

  it("contains navigator.modelContext guard", () => {
    const result = generateHtmlEmbed([makeToolSpec()], {
      domain: "example.com",
    });
    expect(result.files[0].content).toContain("navigator.modelContext");
  });

  it("contains domain in log output", () => {
    const result = generateHtmlEmbed([makeToolSpec()], {
      domain: "mystore.com",
    });
    expect(result.files[0].content).toContain("mystore.com");
  });

  it("language is html", () => {
    const result = generateHtmlEmbed([makeToolSpec()], {
      domain: "example.com",
    });
    expect(result.files[0].language).toBe("html");
  });

  it("target is html-embed", () => {
    const result = generateHtmlEmbed([makeToolSpec()], {
      domain: "example.com",
    });
    expect(result.target).toBe("html-embed");
  });
});
