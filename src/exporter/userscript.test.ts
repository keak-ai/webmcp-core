import { describe, it, expect, beforeEach } from "vitest";
import { generateUserscript } from "./userscript.js";
import { makeToolSpec, resetIdCounter } from "../__fixtures__/index.js";

beforeEach(() => {
  resetIdCounter();
});

describe("generateUserscript", () => {
  it("contains ==UserScript== header", () => {
    const result = generateUserscript([makeToolSpec()], {
      domain: "example.com",
    });
    const content = result.files[0].content;
    expect(content).toContain("// ==UserScript==");
    expect(content).toContain("// ==/UserScript==");
  });

  it("contains @match pattern for the domain", () => {
    const result = generateUserscript([makeToolSpec()], {
      domain: "example.com",
    });
    const content = result.files[0].content;
    expect(content).toContain("@match");
    expect(content).toContain("example.com");
  });

  it("contains tool names", () => {
    const tool1 = makeToolSpec({ name: "example_search_products" });
    const tool2 = makeToolSpec({ name: "example_get_cart" });
    const result = generateUserscript([tool1, tool2], {
      domain: "example.com",
    });
    const content = result.files[0].content;
    expect(content).toContain("example_search_products");
    expect(content).toContain("example_get_cart");
  });

  it("contains registerTool", () => {
    const result = generateUserscript([makeToolSpec()], {
      domain: "example.com",
    });
    expect(result.files[0].content).toContain("registerTool");
  });

  it("file name includes sanitized domain", () => {
    const result = generateUserscript([makeToolSpec()], {
      domain: "example.com",
    });
    expect(result.files[0].name).toContain("example.com");
    expect(result.files[0].name).toMatch(/\.user\.js$/);
  });

  it("contains @name metadata with domain", () => {
    const result = generateUserscript([makeToolSpec()], {
      domain: "mystore.com",
    });
    const content = result.files[0].content;
    expect(content).toContain("@name");
    expect(content).toContain("mystore.com");
  });

  it("contains @version metadata", () => {
    const result = generateUserscript([makeToolSpec()], {
      domain: "example.com",
    });
    expect(result.files[0].content).toContain("@version");
  });

  it("language is javascript", () => {
    const result = generateUserscript([makeToolSpec()], {
      domain: "example.com",
    });
    expect(result.files[0].language).toBe("javascript");
  });

  it("target is userscript", () => {
    const result = generateUserscript([makeToolSpec()], {
      domain: "example.com",
    });
    expect(result.target).toBe("userscript");
  });

  it("includes www subdomain @match pattern", () => {
    const result = generateUserscript([makeToolSpec()], {
      domain: "example.com",
    });
    const content = result.files[0].content;
    expect(content).toContain("www.example.com");
  });
});
