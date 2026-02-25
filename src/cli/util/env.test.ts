import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveApiKey, resolveProvider } from "./env.js";

describe("resolveApiKey", () => {
  const savedEnv: Record<string, string | undefined> = {};
  const envVars = [
    "WEBMCP_API_KEY",
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "GOOGLE_API_KEY",
    "GEMINI_API_KEY",
    "MISTRAL_API_KEY",
    "GROQ_API_KEY",
    "XAI_API_KEY",
    "DEEPSEEK_API_KEY",
  ];

  beforeEach(() => {
    for (const v of envVars) {
      savedEnv[v] = process.env[v];
      delete process.env[v];
    }
  });

  afterEach(() => {
    for (const v of envVars) {
      if (savedEnv[v] !== undefined) {
        process.env[v] = savedEnv[v];
      } else {
        delete process.env[v];
      }
    }
  });

  it("returns --api-key flag value when provided", () => {
    expect(resolveApiKey({ "api-key": "sk-from-flag" })).toBe("sk-from-flag");
  });

  it("prefers --api-key flag over env vars", () => {
    process.env.OPENAI_API_KEY = "sk-from-env";
    expect(resolveApiKey({ "api-key": "sk-from-flag" })).toBe("sk-from-flag");
  });

  it("falls back to WEBMCP_API_KEY env var", () => {
    process.env.WEBMCP_API_KEY = "sk-webmcp";
    expect(resolveApiKey({})).toBe("sk-webmcp");
  });

  it("falls back to OPENAI_API_KEY env var", () => {
    process.env.OPENAI_API_KEY = "sk-openai";
    expect(resolveApiKey({})).toBe("sk-openai");
  });

  it("falls back to ANTHROPIC_API_KEY env var", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    expect(resolveApiKey({})).toBe("sk-ant-test");
  });

  it("returns undefined when no key is available", () => {
    expect(resolveApiKey({})).toBeUndefined();
  });

  it("checks env vars in priority order (WEBMCP first)", () => {
    process.env.WEBMCP_API_KEY = "sk-webmcp";
    process.env.OPENAI_API_KEY = "sk-openai";
    expect(resolveApiKey({})).toBe("sk-webmcp");
  });
});

describe("resolveProvider", () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const v of ["ANTHROPIC_API_KEY", "GOOGLE_API_KEY", "GEMINI_API_KEY", "MISTRAL_API_KEY", "GROQ_API_KEY", "XAI_API_KEY", "DEEPSEEK_API_KEY"]) {
      savedEnv[v] = process.env[v];
      delete process.env[v];
    }
  });

  afterEach(() => {
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v !== undefined) process.env[k] = v;
      else delete process.env[k];
    }
  });

  it("uses explicit --provider flag", () => {
    expect(resolveProvider("sk-test", { provider: "anthropic" })).toBe("anthropic");
  });

  it("ignores invalid --provider flag", () => {
    expect(resolveProvider("sk-test", { provider: "invalid" })).toBe("openai");
  });

  it("detects anthropic from sk-ant- prefix", () => {
    expect(resolveProvider("sk-ant-abc123", {})).toBe("anthropic");
  });

  it("detects google from AIza prefix", () => {
    expect(resolveProvider("AIzaSyAbc123", {})).toBe("google");
  });

  it("detects groq from gsk_ prefix", () => {
    expect(resolveProvider("gsk_abc123", {})).toBe("groq");
  });

  it("detects xai from xai- prefix", () => {
    expect(resolveProvider("xai-abc123", {})).toBe("xai");
  });

  it("defaults to openai for unknown prefix", () => {
    expect(resolveProvider("sk-abc123", {})).toBe("openai");
  });

  it("detects provider from ANTHROPIC_API_KEY env var match", () => {
    process.env.ANTHROPIC_API_KEY = "my-key";
    expect(resolveProvider("my-key")).toBe("anthropic");
  });

  it("detects provider from GROQ_API_KEY env var match", () => {
    process.env.GROQ_API_KEY = "my-groq-key";
    expect(resolveProvider("my-groq-key")).toBe("groq");
  });

  it("prefers --provider flag over prefix detection", () => {
    expect(resolveProvider("sk-ant-abc", { provider: "google" })).toBe("google");
  });
});
