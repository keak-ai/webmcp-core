import type { Action, FormSubmitAction, ApiCallAction } from "../types.js";

export function generateDescription(actions: Action[]): string {
  if (actions.length === 0) return "Unknown tool.";

  const primary = actions[0];
  const parts: string[] = [];

  switch (primary.kind) {
    case "form_submit":
      parts.push(describeFormAction(primary));
      break;
    case "api_call":
      parts.push(describeApiAction(primary));
      break;
    case "click_flow":
      parts.push(describeClickAction(primary));
      break;
    case "route_change":
      parts.push(`Navigate from ${primary.from} to ${primary.to}.`);
      break;
  }

  if (primary.kind === "form_submit" && primary.fields.length > 0) {
    const fieldNames = primary.fields
      .filter((f) => f.required)
      .map((f) => f.label || f.name);

    if (fieldNames.length > 0) {
      parts.push(`Required fields: ${fieldNames.join(", ")}.`);
    }
  }

  return parts.join(" ");
}

const FORM_DESCRIPTIONS: Array<[RegExp, string]> = [
  [/search|find/i, "Search by filling out the form"],
  [/login|sign.?in/i, "Log in via the form"],
  [/register|sign.?up/i, "Register a new account"],
  [/contact|message/i, "Send a message via the contact form"],
  [/book|reserv/i, "Make a booking via the form"],
  [/subscribe/i, "Subscribe via the form"],
];

function describeFormAction(action: FormSubmitAction): string {
  const labels = action.labels.join(" ").toLowerCase();

  const match = FORM_DESCRIPTIONS.find(([re]) => re.test(labels));
  if (match) return `${match[1]} on ${shortenUrl(action.pageUrl)}.`;

  const fieldCount = action.fields.length;
  return `Submit a form with ${fieldCount} field${fieldCount !== 1 ? "s" : ""} on ${shortenUrl(action.pageUrl)}.`;
}

function describeApiAction(action: ApiCallAction): string {
  const method = action.request.method;
  const path = extractPath(action.request.url);

  if (action.request.operationName) {
    const op = action.request.operationType === "mutation" ? "Execute" : "Run";
    return `${op} the ${action.request.operationName} GraphQL ${action.request.operationType || "operation"}.`;
  }

  switch (method) {
    case "GET":
      return `Fetch data from ${path}.`;
    case "POST":
      if (/search|query|find/i.test(path)) {
        return `Search via POST ${path}.`;
      }
      return `Create a resource via POST ${path}.`;
    case "PUT":
    case "PATCH":
      return `Update a resource via ${method} ${path}.`;
    case "DELETE":
      return `Delete a resource via DELETE ${path}.`;
  }
}

function describeClickAction(
  action: Action & { kind: "click_flow" }
): string {
  const label = action.labels[0] || "a button";
  return `Click ${label} on ${shortenUrl(action.pageUrl)}.`;
}

function extractPath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function shortenUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname + parsed.pathname;
  } catch {
    return url;
  }
}
