import { describe, it, expect } from "vitest";
import { getPreset, getAllPresets } from "./presets.js";

describe("getPreset", () => {
  it("returns Next.js preset", () => {
    const preset = getPreset("next");
    expect(preset.label).toBe("Next.js");
    expect(preset.defaultFormat).toBe("snippet");
    expect(preset.defaultLang).toBe("ts");
  });

  it("returns Shopify preset with js default", () => {
    const preset = getPreset("shopify");
    expect(preset.label).toBe("Shopify");
    expect(preset.defaultLang).toBe("js");
    expect(preset.defaultOutDir).toBe("extensions/webmcp/assets");
  });

  it("returns plain HTML preset with html-embed format", () => {
    const preset = getPreset("html");
    expect(preset.label).toBe("Plain HTML");
    expect(preset.defaultFormat).toBe("html-embed");
    expect(preset.defaultLang).toBe("js");
    expect(preset.defaultOutDir).toBe(".");
  });

  it("returns SvelteKit with static output dir", () => {
    const preset = getPreset("svelte");
    expect(preset.defaultOutDir).toBe("static");
  });

  it("returns React + Vite preset", () => {
    const preset = getPreset("react-vite");
    expect(preset.label).toBe("React + Vite");
    expect(preset.defaultOutDir).toBe("public");
  });
});

describe("getAllPresets", () => {
  it("returns all framework presets", () => {
    const all = getAllPresets();
    const keys = Object.keys(all);
    expect(keys).toContain("next");
    expect(keys).toContain("react-vite");
    expect(keys).toContain("react-cra");
    expect(keys).toContain("vue");
    expect(keys).toContain("nuxt");
    expect(keys).toContain("svelte");
    expect(keys).toContain("shopify");
    expect(keys).toContain("vite");
    expect(keys).toContain("astro");
    expect(keys).toContain("html");
    expect(keys.length).toBe(10);
  });

  it("every preset has required fields", () => {
    const all = getAllPresets();
    for (const [, preset] of Object.entries(all)) {
      expect(preset.label).toBeTruthy();
      expect(preset.defaultFormat).toBeTruthy();
      expect(typeof preset.defaultOutDir).toBe("string");
      expect(["ts", "js"]).toContain(preset.defaultLang);
    }
  });
});
