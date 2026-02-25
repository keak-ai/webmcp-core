import type {
  Action,
  JsonSchema,
  FormSubmitAction,
  ApiCallAction,
} from "../types.js";
import { schemaFromFields, schemaFromSample } from "../extractor/schema-inferrer.js";

export function buildInputSchema(actions: Action[]): JsonSchema {
  const schemas: JsonSchema[] = [];

  for (const action of actions) {
    switch (action.kind) {
      case "form_submit":
        schemas.push(buildFormSchema(action));
        break;
      case "api_call":
        schemas.push(buildApiSchema(action));
        break;
      case "click_flow":
        break;
      case "route_change":
        break;
    }
  }

  if (schemas.length === 0) {
    return { type: "object", properties: {} };
  }

  if (schemas.length === 1) {
    return schemas[0];
  }

  return mergeSchemas(schemas);
}

function buildFormSchema(action: FormSubmitAction): JsonSchema {
  return schemaFromFields(action.fields);
}

function buildApiSchema(action: ApiCallAction): JsonSchema {
  if (
    action.request.requestBodySample &&
    ["POST", "PUT", "PATCH"].includes(action.request.method)
  ) {
    return schemaFromSample(action.request.requestBodySample);
  }

  if (action.request.requestBodySchema) {
    return action.request.requestBodySchema;
  }

  if (action.request.method === "GET") {
    return schemaFromQueryParams(action.request.url);
  }

  return { type: "object", properties: {} };
}

function schemaFromQueryParams(url: string): JsonSchema {
  try {
    const parsed = new URL(url);
    const properties: Record<string, JsonSchema> = {};

    for (const [key, value] of parsed.searchParams) {
      properties[key] = inferParamType(value);
    }

    if (Object.keys(properties).length === 0) {
      return { type: "object", properties: {} };
    }

    return { type: "object", properties };
  } catch {
    return { type: "object", properties: {} };
  }
}

function inferParamType(value: string): JsonSchema {
  if (/^\d+$/.test(value)) return { type: "integer" };
  if (/^\d+\.\d+$/.test(value)) return { type: "number" };

  if (value === "true" || value === "false") return { type: "boolean" };

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { type: "string", format: "date" };
  }

  return { type: "string" };
}

function mergeSchemas(schemas: JsonSchema[]): JsonSchema {
  const allProperties: Record<string, JsonSchema> = {};
  const allRequired = new Set<string>();

  for (const schema of schemas) {
    if (schema.properties) {
      for (const [key, value] of Object.entries(schema.properties)) {
        if (!allProperties[key]) {
          allProperties[key] = value;
        }
      }
    }
    if (schema.required) {
      for (const r of schema.required) {
        allRequired.add(r);
      }
    }
  }

  const merged: JsonSchema = {
    type: "object",
    properties: allProperties,
  };

  if (allRequired.size > 0) {
    merged.required = Array.from(allRequired);
  }

  return merged;
}
