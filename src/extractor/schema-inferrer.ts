import type { FieldSpec, JsonSchema, NetworkCall } from "../types.js";

export function schemaFromFields(fields: FieldSpec[]): JsonSchema {
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];

  for (const field of fields) {
    const prop: JsonSchema = {};

    switch (field.type) {
      case "string":
        prop.type = "string";
        break;
      case "number":
        prop.type = "number";
        if (field.min !== undefined) prop.minimum = field.min;
        if (field.max !== undefined) prop.maximum = field.max;
        break;
      case "boolean":
        prop.type = "boolean";
        break;
      case "enum":
        prop.type = "string";
        if (field.options && field.options.length > 0) {
          prop.enum = field.options;
        }
        break;
      case "email":
        prop.type = "string";
        prop.format = "email";
        break;
      case "date":
        prop.type = "string";
        prop.description = "Date in YYYY-MM-DD format";
        break;
      case "tel":
        prop.type = "string";
        break;
      case "url":
        prop.type = "string";
        prop.format = "uri";
        break;
      default:
        prop.type = "string";
    }

    if (field.label) {
      prop.description = field.label;
    } else if (field.placeholder) {
      prop.description = field.placeholder;
    }

    if (field.defaultValue) {
      prop.default = field.defaultValue;
    }

    if (field.pattern) {
      prop.pattern = field.pattern;
    }

    properties[field.name] = prop;

    if (field.required) {
      required.push(field.name);
    }
  }

  return {
    type: "object",
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}

export function schemaFromSample(sample: unknown): JsonSchema {
  if (sample === null || sample === undefined) {
    return { type: "string" };
  }

  if (typeof sample === "string") {
    return detectStringFormat(sample);
  }

  if (typeof sample === "number") {
    return Number.isInteger(sample)
      ? { type: "integer" }
      : { type: "number" };
  }

  if (typeof sample === "boolean") {
    return { type: "boolean" };
  }

  if (Array.isArray(sample)) {
    if (sample.length === 0) {
      return { type: "array" };
    }
    return {
      type: "array",
      items: schemaFromSample(sample[0]),
    };
  }

  if (typeof sample === "object") {
    const properties: Record<string, JsonSchema> = {};
    for (const [key, value] of Object.entries(sample as Record<string, unknown>)) {
      properties[key] = schemaFromSample(value);
    }
    return {
      type: "object",
      properties,
    };
  }

  return { type: "string" };
}

function detectStringFormat(value: string): JsonSchema {
  const schema: JsonSchema = { type: "string" };

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    schema.format = "email";
    return schema;
  }

  if (/^https?:\/\//.test(value)) {
    schema.format = "uri";
    return schema;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    schema.format = "date";
    schema.description = "Date in YYYY-MM-DD format";
    return schema;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    schema.format = "date-time";
    return schema;
  }

  return schema;
}
