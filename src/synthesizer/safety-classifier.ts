import type { Action, Safety, SafetyLevel } from "../types.js";

export function classifySafety(actions: Action[]): Safety {
  let level: SafetyLevel = "read";

  for (const action of actions) {
    const actionLevel = classifyAction(action);
    level = promoteSafety(level, actionLevel);
  }

  return {
    level,
    requiresConfirm: level !== "read",
  };
}

function classifyAction(action: Action): SafetyLevel {
  switch (action.kind) {
    case "form_submit":
      return classifyFormAction(action);
    case "api_call":
      return classifyApiAction(action);
    case "click_flow":
      return "write"; // Clicks can trigger side effects
    case "route_change":
      return "read"; // Navigation is read-only
  }
}

function classifyFormAction(action: Action & { kind: "form_submit" }): SafetyLevel {
  const labels = action.labels.join(" ").toLowerCase();
  const method = action.method || "POST";

  if (/delete|remove|cancel|destroy|purge/i.test(labels)) return "danger";
  if (/payment|pay|purchase|checkout|billing/i.test(labels)) return "danger";

  // GET forms are typically searches
  if (method === "GET") return "read";
  if (/search|find|filter|sort|lookup/i.test(labels)) return "read";

  // Login creates a session, so it's a write not a read
  if (/login|sign.?in|auth/i.test(labels)) return "write";

  return "write";
}

function classifyApiAction(action: Action & { kind: "api_call" }): SafetyLevel {
  const method = action.request.method;
  const path = action.request.url.toLowerCase();

  if (method === "DELETE") return "danger";

  if (/payment|charge|billing|purchase|checkout/i.test(path)) return "danger";
  if (/delete|destroy|remove|purge/i.test(path)) return "danger";

  if (method === "GET") return "read";

  if (action.request.operationType === "query") return "read";
  if (action.request.operationType === "mutation") return "write";

  return "write";
}

// Returns the more restrictive of two safety levels.
function promoteSafety(a: SafetyLevel, b: SafetyLevel): SafetyLevel {
  const order: SafetyLevel[] = ["read", "write", "danger"];
  const ai = order.indexOf(a);
  const bi = order.indexOf(b);
  return order[Math.max(ai, bi)];
}
