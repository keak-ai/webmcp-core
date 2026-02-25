import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { detectFramework } from "./detect.js";

describe("detectFramework", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `webmcp-detect-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  function writePkg(deps: Record<string, string> = {}, devDeps: Record<string, string> = {}) {
    writeFileSync(
      join(tempDir, "package.json"),
      JSON.stringify({ dependencies: deps, devDependencies: devDeps }),
      "utf-8"
    );
  }

  it("detects Next.js", () => {
    writePkg({ next: "^14.0.0", react: "^18.0.0" });
    const result = detectFramework(tempDir);
    expect(result.framework).toBe("next");
  });

  it("detects Nuxt", () => {
    writePkg({ nuxt: "^3.0.0" });
    expect(detectFramework(tempDir).framework).toBe("nuxt");
  });

  it("detects SvelteKit via @sveltejs/kit", () => {
    writePkg({}, { "@sveltejs/kit": "^2.0.0" });
    expect(detectFramework(tempDir).framework).toBe("svelte");
  });

  it("detects Svelte directly", () => {
    writePkg({}, { svelte: "^4.0.0" });
    expect(detectFramework(tempDir).framework).toBe("svelte");
  });

  it("detects Shopify via @shopify/hydrogen", () => {
    writePkg({ "@shopify/hydrogen": "^1.0.0" });
    expect(detectFramework(tempDir).framework).toBe("shopify");
  });

  it("detects Astro", () => {
    writePkg({ astro: "^4.0.0" });
    expect(detectFramework(tempDir).framework).toBe("astro");
  });

  it("detects React + Vite", () => {
    writePkg({ react: "^18.0.0", vite: "^5.0.0" });
    expect(detectFramework(tempDir).framework).toBe("react-vite");
  });

  it("detects Create React App", () => {
    writePkg({ "react-scripts": "^5.0.0" });
    expect(detectFramework(tempDir).framework).toBe("react-cra");
  });

  it("detects Vue", () => {
    writePkg({ vue: "^3.0.0" });
    expect(detectFramework(tempDir).framework).toBe("vue");
  });

  it("detects plain Vite", () => {
    writePkg({}, { vite: "^5.0.0" });
    expect(detectFramework(tempDir).framework).toBe("vite");
  });

  it("falls back to html when no framework detected", () => {
    writePkg({});
    expect(detectFramework(tempDir).framework).toBe("html");
  });

  it("falls back to html when no package.json exists", () => {
    expect(detectFramework(tempDir).framework).toBe("html");
  });

  it("detects TypeScript from dependencies", () => {
    writePkg({}, { typescript: "^5.0.0" });
    expect(detectFramework(tempDir).hasTypeScript).toBe(true);
  });

  it("detects TypeScript from tsconfig.json", () => {
    writePkg({});
    writeFileSync(join(tempDir, "tsconfig.json"), "{}", "utf-8");
    expect(detectFramework(tempDir).hasTypeScript).toBe(true);
  });

  it("reports no TypeScript when absent", () => {
    writePkg({});
    expect(detectFramework(tempDir).hasTypeScript).toBe(false);
  });

  it("detects npm as default package manager", () => {
    writePkg({});
    expect(detectFramework(tempDir).packageManager).toBe("npm");
  });

  it("detects yarn from yarn.lock", () => {
    writePkg({});
    writeFileSync(join(tempDir, "yarn.lock"), "", "utf-8");
    expect(detectFramework(tempDir).packageManager).toBe("yarn");
  });

  it("detects pnpm from pnpm-lock.yaml", () => {
    writePkg({});
    writeFileSync(join(tempDir, "pnpm-lock.yaml"), "", "utf-8");
    expect(detectFramework(tempDir).packageManager).toBe("pnpm");
  });

  it("detects bun from bun.lockb", () => {
    writePkg({});
    writeFileSync(join(tempDir, "bun.lockb"), "", "utf-8");
    expect(detectFramework(tempDir).packageManager).toBe("bun");
  });

  it("Next.js takes priority over react-vite", () => {
    writePkg({ next: "^14.0.0", react: "^18.0.0", vite: "^5.0.0" });
    expect(detectFramework(tempDir).framework).toBe("next");
  });
});
