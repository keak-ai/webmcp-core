import type { Action, FormSubmitAction, ApiCallAction } from "../types.js";

export function generateToolName(
  actions: Action[],
  domain: string
): string {
  const prefix = sanitizeDomain(domain);
  const primary = actions[0];

  if (!primary) return `${prefix}_unknown_tool`;

  const verb = inferVerb(primary);
  const noun = inferNoun(primary);

  // Final sanitization: ensure no illegal characters survive
  return `${prefix}_${verb}_${noun}`.replace(/[^a-z0-9_]/gi, "").toLowerCase();
}

function sanitizeDomain(domain: string): string {
  return domain
    .replace(/^www\./, "")
    .split(".")[0]
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase()
    .slice(0, 20);
}

function inferVerb(action: Action): string {
  switch (action.kind) {
    case "form_submit":
      return inferVerbFromForm(action);
    case "api_call":
      return inferVerbFromApi(action);
    case "click_flow":
      return "click";
    case "route_change":
      return "navigate";
  }
}

const FORM_VERB_MAP: Array<[RegExp, string]> = [
  [/search|find|look/i, "search"],
  [/login|sign.?in|auth/i, "login"],
  [/register|sign.?up|create.?account/i, "register"],
  [/subscribe|newsletter/i, "subscribe"],
  [/contact|message|feedback/i, "send"],
  [/book|reserve/i, "book"],
  [/checkout|pay|purchase/i, "checkout"],
  [/update|edit|modify/i, "update"],
  [/delete|remove/i, "delete"],
  [/filter|sort/i, "filter"],
];

function inferVerbFromForm(action: FormSubmitAction): string {
  const labels = action.labels.join(" ").toLowerCase();
  const formAction = (action.action || "").toLowerCase();

  const match = FORM_VERB_MAP.find(([re]) => re.test(labels));
  if (match) return match[1];

  if (action.method === "GET" || formAction.includes("search")) return "search";

  return "submit";
}

function inferVerbFromApi(action: ApiCallAction): string {
  const method = action.request.method;
  const path = extractPath(action.request.url).toLowerCase();

  switch (method) {
    case "GET":
      if (/search|find|query/i.test(path)) return "search";
      return "get";
    case "POST":
      if (/search|find|query/i.test(path)) return "search";
      if (/login|auth|sign/i.test(path)) return "login";
      return "create";
    case "PUT":
    case "PATCH":
      return "update";
    case "DELETE":
      return "delete";
  }
}

function inferNoun(action: Action): string {
  switch (action.kind) {
    case "form_submit":
      return inferNounFromForm(action);
    case "api_call":
      return inferNounFromApi(action);
    case "click_flow":
      return inferNounFromLabels(action.labels);
    case "route_change":
      return inferNounFromUrl(action.to);
  }
}

const FORM_NOUN_FIELD_MAP: Array<[RegExp, string]> = [
  [/destination|depart|arriv|flight/i, "flights"],
  [/hotel|room|checkin|checkout/i, "hotels"],
  [/email|password|username/i, "account"],
];

function inferNounFromForm(action: FormSubmitAction): string {
  const labels = action.labels.join(" ").toLowerCase();

  const patterns = [
    /(?:search|find|book|reserve|create|update|delete|filter)\s+(\w+)/i,
    /(\w+)\s+(?:form|search|booking|reservation)/i,
  ];

  for (const pattern of patterns) {
    const match = labels.match(pattern);
    if (match?.[1]) {
      return sanitizeNoun(match[1]);
    }
  }

  const fieldNames = action.fields.map((f) => f.name.toLowerCase());
  const fieldMatch = FORM_NOUN_FIELD_MAP.find(([re]) =>
    fieldNames.some((n) => re.test(n))
  );
  if (fieldMatch) return fieldMatch[1];

  return "form";
}

function inferNounFromApi(action: ApiCallAction): string {
  const path = extractPath(action.request.url);
  const segments = path
    .split("/")
    .filter((s) => s && !s.match(/^(api|v\d|rest|graphql)$/i));

  const lastSegment = segments[segments.length - 1];
  if (lastSegment) {
    const cleaned = lastSegment.replace(/^[0-9a-f-]+$/i, "");
    if (cleaned) return sanitizeNoun(cleaned);
    const secondLast = segments[segments.length - 2];
    if (secondLast) return sanitizeNoun(secondLast);
  }

  if (action.request.operationName) {
    return sanitizeNoun(action.request.operationName);
  }

  return "data";
}

function inferNounFromLabels(labels: string[]): string {
  const text = labels.join(" ").toLowerCase();
  const words = text.split(/\s+/).filter((w) => w.length > 2);
  const raw = words[words.length - 1] || "element";
  return sanitizeNoun(raw);
}

function inferNounFromUrl(url: string): string {
  const path = extractPath(url);
  const segments = path.split("/").filter(Boolean);
  const raw = segments[segments.length - 1] || "page";
  return sanitizeNoun(raw);
}

function extractPath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function sanitizeNoun(noun: string): string {
  return noun
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase()
    .slice(0, 30);
}
