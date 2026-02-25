import type { DetectedFramework } from "./detect.js";
import type { OutputTarget, OutputLang } from "../../types.js";

export interface FrameworkPreset {
  label: string;
  defaultFormat: OutputTarget;
  defaultOutDir: string;
  defaultLang: OutputLang;
}

const PRESETS: Record<DetectedFramework, FrameworkPreset> = {
  next: {
    label: "Next.js",
    defaultFormat: "snippet",
    defaultOutDir: "public",
    defaultLang: "ts",
  },
  "react-vite": {
    label: "React + Vite",
    defaultFormat: "snippet",
    defaultOutDir: "public",
    defaultLang: "ts",
  },
  "react-cra": {
    label: "Create React App",
    defaultFormat: "snippet",
    defaultOutDir: "public",
    defaultLang: "ts",
  },
  vue: {
    label: "Vue.js",
    defaultFormat: "snippet",
    defaultOutDir: "public",
    defaultLang: "ts",
  },
  nuxt: {
    label: "Nuxt",
    defaultFormat: "snippet",
    defaultOutDir: "public",
    defaultLang: "ts",
  },
  svelte: {
    label: "SvelteKit",
    defaultFormat: "snippet",
    defaultOutDir: "static",
    defaultLang: "ts",
  },
  shopify: {
    label: "Shopify",
    defaultFormat: "snippet",
    defaultOutDir: "extensions/webmcp/assets",
    defaultLang: "js",
  },
  vite: {
    label: "Vite",
    defaultFormat: "snippet",
    defaultOutDir: "public",
    defaultLang: "ts",
  },
  astro: {
    label: "Astro",
    defaultFormat: "snippet",
    defaultOutDir: "public",
    defaultLang: "ts",
  },
  html: {
    label: "Plain HTML",
    defaultFormat: "html-embed",
    defaultOutDir: ".",
    defaultLang: "js",
  },
};

export function getPreset(framework: DetectedFramework): FrameworkPreset {
  return PRESETS[framework];
}

export function getAllPresets(): Record<DetectedFramework, FrameworkPreset> {
  return PRESETS;
}
