import { describe, it, expect } from "vitest";
import { schemaFromFields, schemaFromSample } from "./schema-inferrer.js";
import { makeFieldSpec } from "../__fixtures__/index.js";

describe("schemaFromFields", () => {
  it("string field produces {type: 'string'}", () => {
    const fields = [makeFieldSpec({ name: "username", type: "string", required: false })];
    const schema = schemaFromFields(fields);

    expect(schema.type).toBe("object");
    expect(schema.properties?.username).toMatchObject({ type: "string" });
  });

  it("number field produces {type: 'number'} with minimum and maximum", () => {
    const fields = [
      makeFieldSpec({ name: "age", type: "number", required: false, min: 18, max: 120 }),
    ];
    const schema = schemaFromFields(fields);

    expect(schema.properties?.age).toMatchObject({
      type: "number",
      minimum: 18,
      maximum: 120,
    });
  });

  it("number field without min/max has no minimum or maximum properties", () => {
    const fields = [makeFieldSpec({ name: "qty", type: "number", required: false })];
    const schema = schemaFromFields(fields);

    expect(schema.properties?.qty.minimum).toBeUndefined();
    expect(schema.properties?.qty.maximum).toBeUndefined();
  });

  it("boolean field produces {type: 'boolean'}", () => {
    const fields = [makeFieldSpec({ name: "subscribe", type: "boolean", required: false })];
    const schema = schemaFromFields(fields);

    expect(schema.properties?.subscribe).toMatchObject({ type: "boolean" });
  });

  it("enum field produces {type: 'string', enum: [...options]}", () => {
    const fields = [
      makeFieldSpec({
        name: "color",
        type: "enum",
        required: false,
        options: ["red", "green", "blue"],
      }),
    ];
    const schema = schemaFromFields(fields);

    expect(schema.properties?.color).toMatchObject({
      type: "string",
      enum: ["red", "green", "blue"],
    });
  });

  it("enum field with no options omits the enum property", () => {
    const fields = [makeFieldSpec({ name: "size", type: "enum", required: false, options: [] })];
    const schema = schemaFromFields(fields);

    expect(schema.properties?.size.type).toBe("string");
    expect(schema.properties?.size.enum).toBeUndefined();
  });

  it("email field produces {type: 'string', format: 'email'}", () => {
    const fields = [makeFieldSpec({ name: "email", type: "email", required: true })];
    const schema = schemaFromFields(fields);

    expect(schema.properties?.email).toMatchObject({ type: "string", format: "email" });
  });

  it("required fields populate the required array", () => {
    const fields = [
      makeFieldSpec({ name: "email", type: "email", required: true }),
      makeFieldSpec({ name: "name", type: "string", required: true }),
      makeFieldSpec({ name: "nickname", type: "string", required: false }),
    ];
    const schema = schemaFromFields(fields);

    expect(schema.required).toEqual(["email", "name"]);
    expect(schema.required).not.toContain("nickname");
  });

  it("no required fields means the required property is absent", () => {
    const fields = [makeFieldSpec({ name: "q", type: "string", required: false })];
    const schema = schemaFromFields(fields);

    expect(schema.required).toBeUndefined();
  });

  it("label is used as description", () => {
    const fields = [
      makeFieldSpec({ name: "q", type: "string", label: "Search query", required: false }),
    ];
    const schema = schemaFromFields(fields);

    expect(schema.properties?.q.description).toBe("Search query");
  });

  it("placeholder is used as description when no label is present", () => {
    const fields = [
      makeFieldSpec({
        name: "q",
        type: "string",
        label: undefined,
        placeholder: "Enter your search term",
        required: false,
      }),
    ];
    const schema = schemaFromFields(fields);

    expect(schema.properties?.q.description).toBe("Enter your search term");
  });

  it("label takes precedence over placeholder for description", () => {
    const fields = [
      makeFieldSpec({
        name: "q",
        type: "string",
        label: "Query",
        placeholder: "Search...",
        required: false,
      }),
    ];
    const schema = schemaFromFields(fields);

    expect(schema.properties?.q.description).toBe("Query");
  });

  it("defaultValue is set on the schema property", () => {
    const fields = [
      makeFieldSpec({ name: "lang", type: "string", required: false, defaultValue: "en" }),
    ];
    const schema = schemaFromFields(fields);

    expect(schema.properties?.lang.default).toBe("en");
  });

  it("no defaultValue means default property is absent", () => {
    const fields = [makeFieldSpec({ name: "q", type: "string", required: false, defaultValue: undefined })];
    const schema = schemaFromFields(fields);

    expect(schema.properties?.q.default).toBeUndefined();
  });

  it("pattern regex is copied to schema property", () => {
    const fields = [
      makeFieldSpec({
        name: "zip",
        type: "string",
        required: false,
        pattern: "^\\d{5}$",
      }),
    ];
    const schema = schemaFromFields(fields);

    expect(schema.properties?.zip.pattern).toBe("^\\d{5}$");
  });

  it("url field type produces {type: 'string', format: 'uri'}", () => {
    const fields = [makeFieldSpec({ name: "website", type: "url", required: false })];
    const schema = schemaFromFields(fields);

    expect(schema.properties?.website).toMatchObject({ type: "string", format: "uri" });
  });

  it("tel field type produces {type: 'string'}", () => {
    const fields = [makeFieldSpec({ name: "phone", type: "tel", required: false })];
    const schema = schemaFromFields(fields);

    expect(schema.properties?.phone).toMatchObject({ type: "string" });
  });

  it("date field type produces {type: 'string'} with description 'Date in YYYY-MM-DD format'", () => {
    const fields = [makeFieldSpec({ name: "dob", type: "date", required: false, label: undefined })];
    const schema = schemaFromFields(fields);

    expect(schema.properties?.dob).toMatchObject({
      type: "string",
      description: "Date in YYYY-MM-DD format",
    });
  });

  it("returns object schema with empty properties for empty fields array", () => {
    const schema = schemaFromFields([]);

    expect(schema).toEqual({ type: "object", properties: {} });
  });

  it("multiple fields all appear in properties", () => {
    const fields = [
      makeFieldSpec({ name: "first", type: "string", required: true }),
      makeFieldSpec({ name: "last", type: "string", required: true }),
      makeFieldSpec({ name: "age", type: "number", required: false }),
    ];
    const schema = schemaFromFields(fields);

    expect(Object.keys(schema.properties ?? {})).toEqual(["first", "last", "age"]);
  });
});

describe("schemaFromSample", () => {
  it("null sample returns {type: 'string'}", () => {
    expect(schemaFromSample(null)).toEqual({ type: "string" });
  });

  it("undefined sample returns {type: 'string'}", () => {
    expect(schemaFromSample(undefined)).toEqual({ type: "string" });
  });

  it("plain string returns {type: 'string'}", () => {
    expect(schemaFromSample("hello world")).toEqual({ type: "string" });
  });

  it("integer number returns {type: 'integer'}", () => {
    expect(schemaFromSample(42)).toEqual({ type: "integer" });
  });

  it("float number returns {type: 'number'}", () => {
    expect(schemaFromSample(3.14)).toEqual({ type: "number" });
  });

  it("boolean true returns {type: 'boolean'}", () => {
    expect(schemaFromSample(true)).toEqual({ type: "boolean" });
  });

  it("boolean false returns {type: 'boolean'}", () => {
    expect(schemaFromSample(false)).toEqual({ type: "boolean" });
  });

  it("empty array returns {type: 'array'}", () => {
    expect(schemaFromSample([])).toEqual({ type: "array" });
  });

  it("array of strings returns {type: 'array', items: {type: 'string'}}", () => {
    expect(schemaFromSample(["a", "b", "c"])).toEqual({
      type: "array",
      items: { type: "string" },
    });
  });

  it("array of integers returns {type: 'array', items: {type: 'integer'}}", () => {
    expect(schemaFromSample([1, 2, 3])).toEqual({
      type: "array",
      items: { type: "integer" },
    });
  });

  it("object sample returns {type: 'object', properties: {...}}", () => {
    const sample = { name: "Alice", age: 30, active: true };
    const schema = schemaFromSample(sample);

    expect(schema.type).toBe("object");
    expect(schema.properties?.name).toEqual({ type: "string" });
    expect(schema.properties?.age).toEqual({ type: "integer" });
    expect(schema.properties?.active).toEqual({ type: "boolean" });
  });

  it("nested object returns nested schema", () => {
    const sample = { user: { id: 1, name: "Bob" } };
    const schema = schemaFromSample(sample);

    expect(schema.properties?.user.type).toBe("object");
    expect(schema.properties?.user.properties?.id).toEqual({ type: "integer" });
    expect(schema.properties?.user.properties?.name).toEqual({ type: "string" });
  });

  it("email string returns {type: 'string', format: 'email'}", () => {
    expect(schemaFromSample("user@example.com")).toEqual({
      type: "string",
      format: "email",
    });
  });

  it("http URL string returns {type: 'string', format: 'uri'}", () => {
    expect(schemaFromSample("https://example.com/path")).toEqual({
      type: "string",
      format: "uri",
    });
  });

  it("http (non-https) URL string returns {type: 'string', format: 'uri'}", () => {
    expect(schemaFromSample("http://example.com")).toEqual({
      type: "string",
      format: "uri",
    });
  });

  it("date string YYYY-MM-DD returns {type: 'string', format: 'date'}", () => {
    expect(schemaFromSample("2024-03-15")).toEqual({
      type: "string",
      format: "date",
      description: "Date in YYYY-MM-DD format",
    });
  });

  it("date-time string ISO 8601 returns {type: 'string', format: 'date-time'}", () => {
    expect(schemaFromSample("2024-03-15T10:30:00Z")).toEqual({
      type: "string",
      format: "date-time",
    });
  });

  it("date-time string without Z suffix returns {type: 'string', format: 'date-time'}", () => {
    expect(schemaFromSample("2024-03-15T10:30")).toEqual({
      type: "string",
      format: "date-time",
    });
  });

  it("email detection takes precedence over other string formats", () => {
    // An email-like string is detected first
    const schema = schemaFromSample("test@domain.org");
    expect(schema.format).toBe("email");
  });

  it("URI detection takes precedence over date detection", () => {
    // A URL is detected before checking date patterns
    const schema = schemaFromSample("https://2024-03-15.example.com");
    expect(schema.format).toBe("uri");
  });

  it("array items schema is derived from the first element only", () => {
    // Mixed array: schema is inferred from first element (string)
    const schema = schemaFromSample(["hello", 42, true]);
    expect(schema.items).toEqual({ type: "string" });
  });

  it("object with null value property returns {type: 'string'} for that property", () => {
    const sample = { data: null };
    const schema = schemaFromSample(sample);

    expect(schema.properties?.data).toEqual({ type: "string" });
  });
});
