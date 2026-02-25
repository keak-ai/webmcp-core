import { z } from "zod";

export const FieldSpecSchema = z.object({
  name: z.string(),
  type: z.enum(["string", "number", "boolean", "enum", "date", "email", "tel", "url"]),
  required: z.boolean(),
  label: z.string().optional(),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
  pattern: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  defaultValue: z.string().optional(),
});

export const NetworkCallSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  url: z.string(),
  status: z.number().optional(),
  requestHeaders: z.record(z.string()).optional(),
  requestBodySchema: z.any().optional(),
  responseBodySchema: z.any().optional(),
  requestBodySample: z.any().optional(),
  responseBodySample: z.any().optional(),
  operationName: z.string().optional(),
  operationType: z.enum(["query", "mutation", "subscription"]).optional(),
});

export const FormSubmitActionSchema = z.object({
  kind: z.literal("form_submit"),
  id: z.string().uuid(),
  pageUrl: z.string(),
  formSelector: z.string(),
  fields: z.array(FieldSpecSchema),
  submitSelector: z.string(),
  labels: z.array(z.string()),
  method: z.enum(["GET", "POST"]).optional(),
  action: z.string().optional(),
  networkCalls: z.array(NetworkCallSchema),
});

export const ClickFlowActionSchema = z.object({
  kind: z.literal("click_flow"),
  id: z.string().uuid(),
  pageUrl: z.string(),
  startSelector: z.string(),
  intermediateSteps: z.array(z.string()).optional(),
  resultingUrl: z.string().optional(),
  networkCalls: z.array(NetworkCallSchema),
  labels: z.array(z.string()),
  screenshotPath: z.string().optional(),
});

export const ApiCallActionSchema = z.object({
  kind: z.literal("api_call"),
  id: z.string().uuid(),
  pageUrl: z.string(),
  request: NetworkCallSchema,
  triggerSelector: z.string().optional(),
  labels: z.array(z.string()),
});

export const RouteChangeActionSchema = z.object({
  kind: z.literal("route_change"),
  id: z.string().uuid(),
  from: z.string(),
  to: z.string(),
  trigger: z.string().optional(),
  labels: z.array(z.string()),
});

export const ActionSchema = z.discriminatedUnion("kind", [
  FormSubmitActionSchema,
  ClickFlowActionSchema,
  ApiCallActionSchema,
  RouteChangeActionSchema,
]);

export const SafetySchema = z.object({
  level: z.enum(["read", "write", "danger"]),
  requiresConfirm: z.boolean(),
});

export const ToolSpecSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().min(1),
  inputSchema: z.any(),
  outputSchema: z.any().optional(),
  safety: SafetySchema,
  availability: z.object({
    urlPatterns: z.array(z.string()),
    requiresAuth: z.boolean(),
  }),
  implementation: z.object({
    kind: z.enum(["js_handler", "form_declarative"]),
    handlerTemplate: z.any().optional(),
    form: z
      .object({
        toolname: z.string(),
        tooldescription: z.string(),
        toolautosubmit: z.boolean().optional(),
        formSelector: z.string(),
      })
      .optional(),
  }),
  provenance: z.object({
    actions: z.array(z.string()),
    createdFrom: z.literal("autogen-v1"),
    confidence: z.number().min(0).max(1),
    pageUrl: z.string(),
  }),
});
