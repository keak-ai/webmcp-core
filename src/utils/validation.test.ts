import { describe, it, expect } from "vitest";
import {
  FieldSpecSchema,
  NetworkCallSchema,
  FormSubmitActionSchema,
  ApiCallActionSchema,
  ToolSpecSchema,
} from "./validation.js";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("FieldSpecSchema", () => {
  it("accepts a minimal valid FieldSpec", () => {
    const result = FieldSpecSchema.safeParse({
      name: "email",
      type: "email",
      required: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a fully-populated FieldSpec", () => {
    const result = FieldSpecSchema.safeParse({
      name: "size",
      type: "enum",
      required: false,
      label: "Size",
      placeholder: "Choose size",
      options: ["S", "M", "L"],
      pattern: "^[SML]$",
      min: 0,
      max: 100,
      defaultValue: "M",
    });
    expect(result.success).toBe(true);
  });

  it("rejects when name is missing", () => {
    const result = FieldSpecSchema.safeParse({ type: "string", required: false });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown type value", () => {
    const result = FieldSpecSchema.safeParse({ name: "x", type: "file", required: false });
    expect(result.success).toBe(false);
  });

  it("rejects when required is missing", () => {
    const result = FieldSpecSchema.safeParse({ name: "x", type: "string" });
    expect(result.success).toBe(false);
  });

  it("accepts all valid type values", () => {
    const validTypes = ["string", "number", "boolean", "enum", "date", "email", "tel", "url"] as const;
    for (const type of validTypes) {
      const result = FieldSpecSchema.safeParse({ name: "f", type, required: false });
      expect(result.success, `type "${type}" should be valid`).toBe(true);
    }
  });
});

describe("NetworkCallSchema", () => {
  it("accepts a minimal valid NetworkCall", () => {
    const result = NetworkCallSchema.safeParse({
      method: "GET",
      url: "https://example.com/api/products",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a POST call with optional fields", () => {
    const result = NetworkCallSchema.safeParse({
      method: "POST",
      url: "https://example.com/api/login",
      status: 200,
      requestHeaders: { "Content-Type": "application/json" },
      requestBodySample: { email: "a@b.com", password: "x" },
      responseBodySample: { token: "abc" },
      operationName: "LoginUser",
      operationType: "mutation",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid HTTP method", () => {
    const result = NetworkCallSchema.safeParse({ method: "CONNECT", url: "https://example.com" });
    expect(result.success).toBe(false);
  });

  it("rejects when url is missing", () => {
    const result = NetworkCallSchema.safeParse({ method: "GET" });
    expect(result.success).toBe(false);
  });

  it("accepts all valid HTTP methods", () => {
    const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
    for (const method of methods) {
      const result = NetworkCallSchema.safeParse({ method, url: "https://example.com/api" });
      expect(result.success, `method "${method}" should be valid`).toBe(true);
    }
  });

  it("rejects an invalid operationType", () => {
    const result = NetworkCallSchema.safeParse({
      method: "POST",
      url: "https://example.com/graphql",
      operationType: "read",
    });
    expect(result.success).toBe(false);
  });
});

describe("FormSubmitActionSchema", () => {
  const validFormSubmitAction = {
    kind: "form_submit" as const,
    id: VALID_UUID,
    pageUrl: "https://example.com/search",
    formSelector: "form#search",
    fields: [{ name: "query", type: "string", required: false }],
    submitSelector: "button[type=submit]",
    labels: ["Search"],
    networkCalls: [],
  };

  it("accepts a valid FormSubmitAction", () => {
    const result = FormSubmitActionSchema.safeParse(validFormSubmitAction);
    expect(result.success).toBe(true);
  });

  it("accepts with optional method and action fields", () => {
    const result = FormSubmitActionSchema.safeParse({
      ...validFormSubmitAction,
      method: "POST",
      action: "/search",
    });
    expect(result.success).toBe(true);
  });

  it("rejects wrong kind value", () => {
    const result = FormSubmitActionSchema.safeParse({
      ...validFormSubmitAction,
      kind: "api_call",
    });
    expect(result.success).toBe(false);
  });

  it("rejects when id is not a UUID", () => {
    const result = FormSubmitActionSchema.safeParse({
      ...validFormSubmitAction,
      id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects when fields is missing", () => {
    const { fields: _fields, ...rest } = validFormSubmitAction;
    const result = FormSubmitActionSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects an invalid method value", () => {
    const result = FormSubmitActionSchema.safeParse({
      ...validFormSubmitAction,
      method: "PUT",
    });
    expect(result.success).toBe(false);
  });
});

describe("ApiCallActionSchema", () => {
  const validApiCallAction = {
    kind: "api_call" as const,
    id: VALID_UUID,
    pageUrl: "https://example.com",
    request: {
      method: "GET",
      url: "https://example.com/api/products",
      status: 200,
    },
    labels: ["Fetch products"],
  };

  it("accepts a valid ApiCallAction", () => {
    const result = ApiCallActionSchema.safeParse(validApiCallAction);
    expect(result.success).toBe(true);
  });

  it("accepts with optional triggerSelector", () => {
    const result = ApiCallActionSchema.safeParse({
      ...validApiCallAction,
      triggerSelector: "button#load-more",
    });
    expect(result.success).toBe(true);
  });

  it("rejects wrong kind value", () => {
    const result = ApiCallActionSchema.safeParse({
      ...validApiCallAction,
      kind: "form_submit",
    });
    expect(result.success).toBe(false);
  });

  it("rejects when request is missing", () => {
    const { request: _request, ...rest } = validApiCallAction;
    const result = ApiCallActionSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects when id is not a UUID", () => {
    const result = ApiCallActionSchema.safeParse({
      ...validApiCallAction,
      id: "test-id-1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects when labels is missing", () => {
    const { labels: _labels, ...rest } = validApiCallAction;
    const result = ApiCallActionSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

describe("ToolSpecSchema", () => {
  const validToolSpec = {
    id: VALID_UUID,
    name: "search_products",
    description: "Search products by keyword.",
    inputSchema: {
      type: "object",
      properties: { keyword: { type: "string" } },
      required: ["keyword"],
    },
    safety: {
      level: "read",
      requiresConfirm: false,
    },
    availability: {
      urlPatterns: ["https://example.com/*"],
      requiresAuth: false,
    },
    implementation: {
      kind: "js_handler",
    },
    provenance: {
      actions: ["action-1"],
      createdFrom: "autogen-v1",
      confidence: 0.8,
      pageUrl: "https://example.com",
    },
  };

  it("accepts a valid ToolSpec", () => {
    const result = ToolSpecSchema.safeParse(validToolSpec);
    expect(result.success).toBe(true);
  });

  it("accepts a form_declarative implementation", () => {
    const result = ToolSpecSchema.safeParse({
      ...validToolSpec,
      implementation: {
        kind: "form_declarative",
        form: {
          toolname: "search_products",
          tooldescription: "Search products.",
          toolautosubmit: false,
          formSelector: "form#search",
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects when id is not a UUID", () => {
    const result = ToolSpecSchema.safeParse({ ...validToolSpec, id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects when name is empty string", () => {
    const result = ToolSpecSchema.safeParse({ ...validToolSpec, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects when description is empty string", () => {
    const result = ToolSpecSchema.safeParse({ ...validToolSpec, description: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid safety level", () => {
    const result = ToolSpecSchema.safeParse({
      ...validToolSpec,
      safety: { level: "unknown", requiresConfirm: false },
    });
    expect(result.success).toBe(false);
  });

  it("rejects when confidence is out of range (> 1)", () => {
    const result = ToolSpecSchema.safeParse({
      ...validToolSpec,
      provenance: { ...validToolSpec.provenance, confidence: 1.5 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects when confidence is out of range (< 0)", () => {
    const result = ToolSpecSchema.safeParse({
      ...validToolSpec,
      provenance: { ...validToolSpec.provenance, confidence: -0.1 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects when createdFrom is not 'autogen-v1'", () => {
    const result = ToolSpecSchema.safeParse({
      ...validToolSpec,
      provenance: { ...validToolSpec.provenance, createdFrom: "manual" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects when implementation kind is invalid", () => {
    const result = ToolSpecSchema.safeParse({
      ...validToolSpec,
      implementation: { kind: "python_handler" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects when required top-level fields are missing", () => {
    const { name: _name, ...rest } = validToolSpec;
    const result = ToolSpecSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("accepts all valid safety levels", () => {
    const levels = ["read", "write", "danger"] as const;
    for (const level of levels) {
      const result = ToolSpecSchema.safeParse({
        ...validToolSpec,
        safety: { level, requiresConfirm: false },
      });
      expect(result.success, `safety level "${level}" should be valid`).toBe(true);
    }
  });
});
