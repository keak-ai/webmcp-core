import { describe, it, expect, beforeEach } from "vitest";
import { buildInputSchema } from "./schema-builder.js";
import {
  makeFormSubmitAction,
  makeApiCallAction,
  makeClickFlowAction,
  makeRouteChangeAction,
  makeFieldSpec,
  resetIdCounter,
} from "../__fixtures__/index.js";

beforeEach(() => {
  resetIdCounter();
});

describe("buildInputSchema", () => {
  it("form with fields → schema contains those fields", () => {
    const action = makeFormSubmitAction({
      fields: [
        makeFieldSpec({ name: "query", type: "string", label: "Search query" }),
        makeFieldSpec({ name: "category", type: "string", label: "Category" }),
      ],
    });
    const schema = buildInputSchema([action]);
    expect(schema.type).toBe("object");
    expect(schema.properties).toHaveProperty("query");
    expect(schema.properties).toHaveProperty("category");
  });

  it("form with required fields → required array is populated", () => {
    const action = makeFormSubmitAction({
      fields: [
        makeFieldSpec({ name: "email", type: "email", required: true }),
        makeFieldSpec({ name: "password", type: "string", required: true }),
        makeFieldSpec({ name: "remember", type: "boolean", required: false }),
      ],
    });
    const schema = buildInputSchema([action]);
    expect(schema.required).toContain("email");
    expect(schema.required).toContain("password");
    expect(schema.required).not.toContain("remember");
  });

  it("form with no required fields → no required array", () => {
    const action = makeFormSubmitAction({
      fields: [
        makeFieldSpec({ name: "query", type: "string", required: false }),
      ],
    });
    const schema = buildInputSchema([action]);
    expect(schema.required).toBeUndefined();
  });

  it("form field labels become property descriptions", () => {
    const action = makeFormSubmitAction({
      fields: [
        makeFieldSpec({ name: "q", type: "string", label: "Search term" }),
      ],
    });
    const schema = buildInputSchema([action]);
    expect(schema.properties?.q?.description).toBe("Search term");
  });

  it("form email field → schema type string with format email", () => {
    const action = makeFormSubmitAction({
      fields: [makeFieldSpec({ name: "email", type: "email" })],
    });
    const schema = buildInputSchema([action]);
    expect(schema.properties?.email?.type).toBe("string");
    expect(schema.properties?.email?.format).toBe("email");
  });

  it("form enum field → schema includes enum values", () => {
    const action = makeFormSubmitAction({
      fields: [
        makeFieldSpec({ name: "size", type: "enum", options: ["S", "M", "L", "XL"] }),
      ],
    });
    const schema = buildInputSchema([action]);
    expect(schema.properties?.size?.enum).toEqual(["S", "M", "L", "XL"]);
  });

  it("API POST with body sample → schema inferred from sample", () => {
    const action = makeApiCallAction({
      request: {
        method: "POST",
        url: "https://example.com/api/orders",
        status: 201,
        requestBodySample: { productId: "abc123", quantity: 2 },
      },
    });
    const schema = buildInputSchema([action]);
    expect(schema.type).toBe("object");
    expect(schema.properties).toHaveProperty("productId");
    expect(schema.properties).toHaveProperty("quantity");
    expect(schema.properties?.quantity?.type).toBe("integer");
  });

  it("API PUT with body sample → schema inferred from sample", () => {
    const action = makeApiCallAction({
      request: {
        method: "PUT",
        url: "https://example.com/api/users/1",
        status: 200,
        requestBodySample: { name: "Alice", active: true },
      },
    });
    const schema = buildInputSchema([action]);
    expect(schema.properties).toHaveProperty("name");
    expect(schema.properties?.active?.type).toBe("boolean");
  });

  it("API GET with no body and no query params → reasonable empty schema", () => {
    const action = makeApiCallAction({
      request: { method: "GET", url: "https://example.com/api/products", status: 200 },
    });
    const schema = buildInputSchema([action]);
    expect(schema.type).toBe("object");
    expect(schema.properties).toBeDefined();
  });

  it("API GET with query params → schema properties from params", () => {
    const action = makeApiCallAction({
      request: {
        method: "GET",
        url: "https://example.com/api/products?page=1&limit=20&active=true",
        status: 200,
      },
    });
    const schema = buildInputSchema([action]);
    expect(schema.properties).toHaveProperty("page");
    expect(schema.properties).toHaveProperty("limit");
    expect(schema.properties).toHaveProperty("active");
    expect(schema.properties?.page?.type).toBe("integer");
    expect(schema.properties?.active?.type).toBe("boolean");
  });

  it("API with pre-built requestBodySchema → uses it directly", () => {
    const predefined = {
      type: "object" as const,
      properties: {
        name: { type: "string" as const },
      },
      required: ["name"],
    };
    const action = makeApiCallAction({
      request: {
        method: "POST",
        url: "https://example.com/api/items",
        status: 200,
        requestBodySchema: predefined,
      },
    });
    const schema = buildInputSchema([action]);
    expect(schema).toEqual(predefined);
  });

  it("click action → empty object schema", () => {
    const action = makeClickFlowAction({ labels: ["Add to Cart"] });
    const schema = buildInputSchema([action]);
    expect(schema.type).toBe("object");
    expect(schema.properties).toEqual({});
  });

  it("route change action → empty object schema", () => {
    const action = makeRouteChangeAction();
    const schema = buildInputSchema([action]);
    expect(schema.type).toBe("object");
    expect(schema.properties).toEqual({});
  });

  it("empty actions → empty object schema", () => {
    const schema = buildInputSchema([]);
    expect(schema.type).toBe("object");
    expect(schema.properties).toEqual({});
  });

  it("multiple form actions → merged schema with all fields", () => {
    const action1 = makeFormSubmitAction({
      fields: [makeFieldSpec({ name: "query", type: "string", required: true })],
      labels: ["Search"],
    });
    const action2 = makeFormSubmitAction({
      fields: [makeFieldSpec({ name: "category", type: "string", required: false })],
      labels: ["Filter"],
    });
    const schema = buildInputSchema([action1, action2]);
    expect(schema.properties).toHaveProperty("query");
    expect(schema.properties).toHaveProperty("category");
  });

  it("multiple actions merge required arrays correctly", () => {
    const action1 = makeFormSubmitAction({
      fields: [makeFieldSpec({ name: "email", type: "email", required: true })],
    });
    const action2 = makeFormSubmitAction({
      fields: [makeFieldSpec({ name: "name", type: "string", required: true })],
    });
    const schema = buildInputSchema([action1, action2]);
    expect(schema.required).toContain("email");
    expect(schema.required).toContain("name");
  });

  it("duplicate field name across actions → first schema's definition wins", () => {
    const action1 = makeFormSubmitAction({
      fields: [makeFieldSpec({ name: "q", type: "string", label: "From action 1" })],
    });
    const action2 = makeFormSubmitAction({
      fields: [makeFieldSpec({ name: "q", type: "string", label: "From action 2" })],
    });
    const schema = buildInputSchema([action1, action2]);
    expect(schema.properties?.q?.description).toBe("From action 1");
  });

  it("form with number field with min/max → schema has minimum and maximum", () => {
    const action = makeFormSubmitAction({
      fields: [makeFieldSpec({ name: "age", type: "number", min: 18, max: 120 })],
    });
    const schema = buildInputSchema([action]);
    expect(schema.properties?.age?.minimum).toBe(18);
    expect(schema.properties?.age?.maximum).toBe(120);
  });
});
