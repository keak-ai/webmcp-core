export interface JsonSchema {
  type?: "object" | "string" | "number" | "integer" | "boolean" | "array";
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: string[];
  description?: string;
  default?: unknown;
  format?: "email" | "uri" | "date" | "time" | "date-time";
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  additionalProperties?: boolean | JsonSchema;
  examples?: unknown[];
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
}

export interface FieldSpec {
  name: string;
  type:
    | "string"
    | "number"
    | "boolean"
    | "enum"
    | "date"
    | "email"
    | "tel"
    | "url";
  required: boolean;
  label?: string;
  placeholder?: string;
  options?: string[]; // For enum/select fields
  pattern?: string; // Validation regex
  min?: number;
  max?: number;
  defaultValue?: string;
  // Chrome WebMCP Declarative API attributes (Chrome 146+)
  toolparamtitle?: string;
  toolparamdescription?: string;
}

export interface NetworkCall {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  status?: number;
  requestHeaders?: Record<string, string>;
  requestBodySchema?: JsonSchema;
  responseBodySchema?: JsonSchema;
  requestBodySample?: unknown;
  responseBodySample?: unknown;
  operationName?: string; // GraphQL operation name
  operationType?: "query" | "mutation" | "subscription";
}

export type Action =
  | FormSubmitAction
  | ClickFlowAction
  | ApiCallAction
  | RouteChangeAction;

export interface FormSubmitAction {
  kind: "form_submit";
  id: string;
  pageUrl: string;
  formSelector: string;
  fields: FieldSpec[];
  submitSelector: string;
  labels: string[];
  method?: "GET" | "POST";
  action?: string; // Form action URL
  networkCalls: NetworkCall[];
}

export interface ClickFlowAction {
  kind: "click_flow";
  id: string;
  pageUrl: string;
  startSelector: string;
  intermediateSteps?: string[];
  resultingUrl?: string;
  networkCalls: NetworkCall[];
  labels: string[];
  screenshotPath?: string;
}

export interface ApiCallAction {
  kind: "api_call";
  id: string;
  pageUrl: string;
  request: NetworkCall;
  triggerSelector?: string;
  labels: string[];
}

export interface RouteChangeAction {
  kind: "route_change";
  id: string;
  from: string;
  to: string;
  trigger?: string;
  labels: string[];
}

export type HandlerStep =
  | { step: "ensure_page"; urlPattern: string }
  | {
      step: "fill_form";
      formSelector: string;
      mapping: Record<string, string>;
    }
  | { step: "click"; selector: string; waitFor?: string }
  | {
      step: "wait_network";
      match: { urlIncludes?: string; operationName?: string };
    }
  | { step: "wait_element"; selector: string; timeout?: number }
  | { step: "extract"; selector: string; attribute?: string }
  | {
      step: "return";
      format: "text" | "json";
      mapping?: Record<string, string>;
    };

export interface HandlerTemplate {
  steps: HandlerStep[];
}

export type SafetyLevel = "read" | "write" | "danger";

export interface Safety {
  level: SafetyLevel;
  requiresConfirm: boolean;
}

export interface ToolSpec {
  id: string;
  name: string;
  description: string;
  inputSchema: JsonSchema;
  outputSchema?: JsonSchema;

  safety: Safety;

  availability: {
    urlPatterns: string[];
    requiresAuth: boolean;
  };

  implementation: {
    kind: "js_handler" | "form_declarative";
    handlerTemplate?: HandlerTemplate;
    form?: {
      toolname: string;
      tooldescription: string;
      toolautosubmit?: boolean;
      formSelector: string;
    };
  };

  provenance: {
    actions: string[];
    createdFrom: "autogen-v1";
    confidence: number;
    pageUrl: string;
  };
}

export type AuthMethod = "none" | "cookie" | "browser-login";
export type OutputTarget = "snippet" | "userscript" | "manifest" | "yaml" | "react-hook" | "html-embed";
export type OutputLang = "ts" | "js";
export type Framework = "vanilla" | "react" | "vue" | "next" | "nuxt" | "svelte" | "vite" | "shopify" | "astro" | "html";

export interface AutogenConfig {
  baseUrl: string;
  auth: {
    method: AuthMethod;
    profilePath?: string | null;
    cookie?: string | null;
  };
  output: {
    target: OutputTarget;
    lang: OutputLang;
    outDir: string;
    framework: Framework;
  };
  browser: {
    executablePath?: string | null;
    headless: boolean;
  };
  scan: {
    depth: number;
    ignore: string[];
    timeout: number;
  };
}

export interface DomSnapshot {
  url: string;
  title: string;
  forms: DomForm[];
  buttons: DomButton[];
  links: DomLink[];
  timestamp: string;
}

export interface DomForm {
  selector: string;
  id?: string;
  action?: string;
  method?: string;
  fields: FieldSpec[];
  submitSelector?: string;
  labels: string[];
  // Chrome WebMCP Declarative API attributes (Chrome 146+)
  toolname?: string;
  tooldescription?: string;
  toolautosubmit?: boolean;
}

export interface DomButton {
  selector: string;
  text: string;
  ariaLabel?: string;
  type?: string;
  isInsideForm: boolean;
}

export interface DomLink {
  selector: string;
  text: string;
  href: string;
  ariaLabel?: string;
  isInternal: boolean;
}

export interface ScanResult {
  pages: DomSnapshot[];
  networkCalls: NetworkCall[];
  actions: Action[];
  metadata: {
    baseUrl: string;
    startedAt: string;
    completedAt: string;
    pagesVisited: number;
    depth: number;
  };
}

export type ScanProgressEvent =
  | { type: "page_visiting"; url: string; depth: number }
  | { type: "page_visited"; url: string; formsFound: number; buttonsFound: number }
  | { type: "network_call"; method: string; url: string }
  | { type: "action_discovered"; kind: Action["kind"]; label: string }
  | { type: "screenshot"; path: string }
  | { type: "error"; message: string }
  | { type: "complete"; summary: ScanResult["metadata"] };

export type LintSeverity = "error" | "warning" | "info";

export interface LintWarning {
  toolId: string;
  toolName: string;
  rule: string;
  severity: LintSeverity;
  message: string;
  suggestion?: string;
}

export interface LintResult {
  tool: ToolSpec;
  warnings: LintWarning[];
}

export interface ExportResult {
  files: ExportFile[];
  target: OutputTarget;
}

export interface ExportFile {
  name: string;
  content: string;
  language: string;
}
