import { describe, it, expect } from "vitest";
import { detectProvider, getDefaultModel } from "./llm-client.js";
import type { LlmProvider } from "./llm-client.js";

describe("detectProvider", () => {
  it("sk-ant-xxx → anthropic", () => {
    expect(detectProvider("sk-ant-api03-abc123")).toBe("anthropic");
  });

  it("sk-ant- prefix variations → anthropic", () => {
    expect(detectProvider("sk-ant-xxxxxxxxxxxxxxxxxxxx")).toBe("anthropic");
  });

  it("AIzaXxx → google", () => {
    expect(detectProvider("AIzaSyD-abc123XYZ")).toBe("google");
  });

  it("AIza prefix exactly → google", () => {
    expect(detectProvider("AIzaxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")).toBe("google");
  });

  it("gsk_xxx → groq", () => {
    expect(detectProvider("gsk_abc123xyz")).toBe("groq");
  });

  it("gsk_ prefix exactly → groq", () => {
    expect(detectProvider("gsk_test_key_here")).toBe("groq");
  });

  it("xai-xxx → xai", () => {
    expect(detectProvider("xai-abc123xyz")).toBe("xai");
  });

  it("xai- prefix exactly → xai", () => {
    expect(detectProvider("xai-xxxxxxxxxxxxxxxxxxxxxxxx")).toBe("xai");
  });

  it("sk-xxx (non-ant) → openai (default)", () => {
    expect(detectProvider("sk-proj-abc123")).toBe("openai");
  });

  it("plain sk- key → openai", () => {
    expect(detectProvider("sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")).toBe("openai");
  });

  it("random string → openai (fallback)", () => {
    expect(detectProvider("random-api-key-string")).toBe("openai");
  });

  it("empty string → openai (fallback)", () => {
    expect(detectProvider("")).toBe("openai");
  });

  it("deepseek key (no known prefix) → openai (fallback)", () => {
    // deepseek keys have no unique prefix detectable, so fall through to openai
    expect(detectProvider("dsk-abc123")).toBe("openai");
  });
});

describe("getDefaultModel", () => {
  it("all 7 providers return non-empty string", () => {
    const providers: LlmProvider[] = [
      "openai",
      "anthropic",
      "google",
      "mistral",
      "groq",
      "xai",
      "deepseek",
    ];
    for (const provider of providers) {
      const model = getDefaultModel(provider);
      expect(typeof model).toBe("string");
      expect(model.length).toBeGreaterThan(0);
    }
  });

  it("anthropic → claude-sonnet-4-20250514", () => {
    expect(getDefaultModel("anthropic")).toBe("claude-sonnet-4-20250514");
  });

  it("openai → gpt-4o-mini", () => {
    expect(getDefaultModel("openai")).toBe("gpt-4o-mini");
  });

  it("groq → llama-3.3-70b-versatile", () => {
    expect(getDefaultModel("groq")).toBe("llama-3.3-70b-versatile");
  });

  it("google → gemini-2.0-flash", () => {
    expect(getDefaultModel("google")).toBe("gemini-2.0-flash");
  });

  it("mistral → mistral-small-latest", () => {
    expect(getDefaultModel("mistral")).toBe("mistral-small-latest");
  });

  it("xai → grok-3-mini-fast", () => {
    expect(getDefaultModel("xai")).toBe("grok-3-mini-fast");
  });

  it("deepseek → deepseek-chat", () => {
    expect(getDefaultModel("deepseek")).toBe("deepseek-chat");
  });

  it("each provider's model is a valid non-whitespace string", () => {
    const providers: LlmProvider[] = [
      "openai",
      "anthropic",
      "google",
      "mistral",
      "groq",
      "xai",
      "deepseek",
    ];
    for (const provider of providers) {
      const model = getDefaultModel(provider);
      expect(model.trim()).toBe(model);
      expect(model).not.toMatch(/^\s*$/);
    }
  });

  it("provider models are all unique (no two providers share a default model)", () => {
    const providers: LlmProvider[] = [
      "openai",
      "anthropic",
      "google",
      "mistral",
      "groq",
      "xai",
      "deepseek",
    ];
    const models = providers.map((p) => getDefaultModel(p));
    const unique = new Set(models);
    expect(unique.size).toBe(providers.length);
  });
});

describe("detectProvider + getDefaultModel integration", () => {
  it("anthropic key → anthropic model", () => {
    const provider = detectProvider("sk-ant-api03-xxx");
    const model = getDefaultModel(provider);
    expect(model).toContain("claude");
  });

  it("google key → gemini model", () => {
    const provider = detectProvider("AIzaSyD-xxx");
    const model = getDefaultModel(provider);
    expect(model).toContain("gemini");
  });

  it("groq key → llama model", () => {
    const provider = detectProvider("gsk_xxx");
    const model = getDefaultModel(provider);
    expect(model).toContain("llama");
  });

  it("xai key → grok model", () => {
    const provider = detectProvider("xai-xxx");
    const model = getDefaultModel(provider);
    expect(model).toContain("grok");
  });

  it("openai key → gpt model", () => {
    const provider = detectProvider("sk-proj-xxx");
    const model = getDefaultModel(provider);
    expect(model).toContain("gpt");
  });
});
