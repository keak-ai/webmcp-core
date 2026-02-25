import { z } from "zod";
import type { AutogenConfig } from "./types.js";

export const AutogenConfigSchema = z.object({
  baseUrl: z.string().url(),
  auth: z.object({
    method: z.enum(["none", "cookie", "browser-login"]),
    profilePath: z.string().nullable().optional(),
    cookie: z.string().nullable().optional(),
  }),
  output: z.object({
    target: z.enum(["snippet", "userscript", "manifest", "yaml", "react-hook", "html-embed"]),
    lang: z.enum(["ts", "js"]),
    outDir: z.string(),
    framework: z.enum(["vanilla", "react", "vue", "next", "nuxt", "svelte", "vite", "shopify", "astro", "html"]),
  }),
  browser: z.object({
    executablePath: z.string().nullable().optional(),
    headless: z.boolean(),
  }),
  scan: z.object({
    depth: z.number().int().min(1).max(10),
    ignore: z.array(z.string()),
    timeout: z.number().int().min(1000),
  }),
});

export function getDefaultConfig(baseUrl: string = "https://example.com"): AutogenConfig {
  return {
    baseUrl,
    auth: {
      method: "none",
      profilePath: null,
      cookie: null,
    },
    output: {
      target: "snippet",
      lang: "ts",
      outDir: "./webmcp-output",
      framework: "vanilla",
    },
    browser: {
      executablePath: null,
      headless: true,
    },
    scan: {
      depth: 2,
      ignore: [],
      timeout: 30000,
    },
  };
}
