import { v4 as uuid } from "uuid";
import type {
  Action,
  ToolSpec,
  HandlerTemplate,
  HandlerStep,
  FormSubmitAction,
  ApiCallAction,
} from "../types.js";
import { generateToolName } from "./namer.js";
import { generateDescription } from "./describer.js";
import { buildInputSchema } from "./schema-builder.js";
import { classifySafety } from "./safety-classifier.js";

export interface ClusterOptions {
  minConfidence?: number;
  domain?: string;
}

export function clusterActions(
  actions: Action[],
  options: ClusterOptions = {}
): ToolSpec[] {
  const { minConfidence = 0.5 } = options;

  const groups = groupActions(actions);

  const tools: ToolSpec[] = [];

  for (const group of groups) {
    const confidence = computeConfidence(group);
    if (confidence < minConfidence) continue;

    const domain = extractDomain(group);
    const tool = buildToolSpec(group, domain, confidence);
    tools.push(tool);
  }

  return deduplicateTools(tools);
}

function groupActions(actions: Action[]): Action[][] {
  const groups: Action[][] = [];
  const used = new Set<string>();

  const forms = actions.filter(
    (a): a is FormSubmitAction => a.kind === "form_submit"
  );

  for (const form of forms) {
    const group: Action[] = [form];
    used.add(form.id);

    const relatedApis = actions.filter(
      (a): a is ApiCallAction =>
        a.kind === "api_call" &&
        !used.has(a.id) &&
        isSamePage(a.pageUrl, form.pageUrl)
    );

    if (form.action) {
      const matchingApi = relatedApis.find((a) =>
        urlPathMatches(a.request.url, form.action!)
      );
      if (matchingApi) {
        group.push(matchingApi);
        used.add(matchingApi.id);
      }
    }

    groups.push(group);
  }

  const remainingApis = actions.filter(
    (a): a is ApiCallAction =>
      a.kind === "api_call" && !used.has(a.id)
  );

  for (const api of remainingApis) {
    groups.push([api]);
    used.add(api.id);
  }

  for (const action of actions) {
    if (!used.has(action.id)) {
      groups.push([action]);
    }
  }

  return groups;
}

function buildToolSpec(
  actions: Action[],
  domain: string,
  confidence: number
): ToolSpec {
  const primary = actions[0];
  const name = generateToolName(actions, domain);
  const description = generateDescription(actions);
  const inputSchema = buildInputSchema(actions);
  const safety = classifySafety(actions);
  const pageUrl = getActionPageUrl(primary);

  return {
    id: uuid(),
    name,
    description,
    inputSchema,
    safety,
    availability: {
      urlPatterns: [buildUrlPattern(pageUrl)],
      requiresAuth: false,
    },
    implementation: buildImplementation(actions),
    provenance: {
      actions: actions.map((a) => a.id),
      createdFrom: "autogen-v1",
      confidence,
      pageUrl,
    },
  };
}

function buildImplementation(
  actions: Action[]
): ToolSpec["implementation"] {
  const primary = actions[0];

  if (primary.kind === "form_submit") {
    return {
      kind: "form_declarative",
      form: {
        toolname: "",
        tooldescription: "",
        toolautosubmit: false,
        formSelector: primary.formSelector,
      },
      handlerTemplate: buildHandlerTemplate(actions),
    };
  }

  return {
    kind: "js_handler",
    handlerTemplate: buildHandlerTemplate(actions),
  };
}

function buildHandlerTemplate(actions: Action[]): HandlerTemplate {
  const steps: HandlerStep[] = [];
  const primary = actions[0];

  const primaryUrl = getActionPageUrl(primary);
  if (primaryUrl) {
    steps.push({
      step: "ensure_page",
      urlPattern: primaryUrl,
    });
  }

  switch (primary.kind) {
    case "form_submit": {
      const mapping: Record<string, string> = {};
      for (const field of primary.fields) {
        mapping[field.name] = `params.${field.name}`;
      }

      steps.push({
        step: "fill_form",
        formSelector: primary.formSelector,
        formFallbackSelectors: primary.formFallbackSelectors,
        mapping,
      });

      steps.push({
        step: "click",
        selector: primary.submitSelector,
        fallbackSelectors: primary.submitFallbackSelectors,
      });

      steps.push({
        step: "wait_network",
        match: {
          urlIncludes: primary.action || undefined,
        },
      });

      break;
    }

    case "api_call": {
      steps.push({
        step: "wait_network",
        match: {
          urlIncludes: extractPathname(primary.request.url),
          operationName: primary.request.operationName,
        },
      });

      break;
    }

    case "click_flow": {
      steps.push({
        step: "click",
        selector: primary.startSelector,
      });

      if (primary.intermediateSteps) {
        for (let i = 0; i < primary.intermediateSteps.length; i++) {
          const selector = primary.intermediateSteps[i];
          const fallbackSelectors = primary.intermediateFallbackSelectors?.[i];
          steps.push({
            step: "click",
            selector,
            ...(fallbackSelectors && fallbackSelectors.length > 0
              ? { fallbackSelectors }
              : {}),
          });
        }
      }

      break;
    }

    case "route_change": {
      steps.push({
        step: "ensure_page",
        urlPattern: primary.to,
      });

      break;
    }
  }

  steps.push({
    step: "return",
    format: "json",
  });

  return { steps };
}

function computeConfidence(actions: Action[]): number {
  let score = 0.5;

  const primary = actions[0];
  if (!primary) return 0;

  if (primary.kind === "form_submit") {
    if (primary.labels.length > 0) score += 0.1;
    if (primary.fields.length > 0) score += 0.1;
    if (primary.fields.length >= 2) score += 0.1;
    if (primary.submitSelector) score += 0.05;
  }

  if (primary.kind === "api_call") {
    if (primary.request.status && primary.request.status < 400) score += 0.1;
    if (primary.request.responseBodySample) score += 0.1;
    if (primary.request.operationName) score += 0.1;

    if (!primary.request.responseBodySample) score -= 0.15;

    if (primary.request.method === "GET") {
      try {
        const params = new URL(primary.request.url).searchParams;
        if ([...params].length === 0) score -= 0.1;
      } catch {
        /* URL parse failure is non-fatal */
      }
    }

    try {
      const path = new URL(primary.request.url).pathname.toLowerCase();
      if (/\/(embed|widget|player|iframe)\b/.test(path)) score -= 0.2;
    } catch {
      /* URL parse failure is non-fatal */
    }
  }

  if (primary.kind === "click_flow") {
    if (primary.labels.length > 0 && primary.labels[0].length > 2) score += 0.15;
    if (primary.labels.length > 1) score += 0.05;
  }

  if (primary.kind === "route_change") {
    if (primary.labels.length > 0) score += 0.1;
    try {
      const segments = new URL(primary.to).pathname.split("/").filter(Boolean);
      if (segments.length <= 2) score += 0.1;
    } catch {
      /* URL parse failure is non-fatal */
    }
  }

  if (actions.length > 1) score += 0.1;

  return Math.min(Math.max(score, 0), 1.0);
}

function getActionPageUrl(action: Action): string {
  switch (action.kind) {
    case "form_submit":
    case "click_flow":
    case "api_call":
      return action.pageUrl;
    case "route_change":
      return action.from;
  }
}

function extractDomain(actions: Action[]): string {
  for (const action of actions) {
    const url = getActionPageUrl(action) || ("request" in action ? (action as ApiCallAction).request.url : "");
    try {
      return new URL(url).hostname;
    } catch {
      continue;
    }
  }
  return "unknown";
}

function isSamePage(url1: string, url2: string): boolean {
  try {
    return new URL(url1).pathname === new URL(url2).pathname;
  } catch {
    return false;
  }
}

function urlPathMatches(url: string, formAction: string): boolean {
  try {
    const urlPath = new URL(url).pathname;
    const actionPath = formAction.startsWith("http")
      ? new URL(formAction).pathname
      : formAction;
    return urlPath === actionPath;
  } catch {
    return false;
  }
}

function buildUrlPattern(pageUrl: string): string {
  try {
    const parsed = new URL(pageUrl);
    return `${parsed.origin}${parsed.pathname}*`;
  } catch {
    return "*";
  }
}

function extractPathname(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function deduplicateTools(tools: ToolSpec[]): ToolSpec[] {
  const seen = new Map<string, ToolSpec>();

  for (const tool of tools) {
    const existing = seen.get(tool.name);
    if (existing) {
      if (tool.provenance.confidence > existing.provenance.confidence) {
        seen.set(tool.name, tool);
      }
    } else {
      seen.set(tool.name, tool);
    }
  }

  return Array.from(seen.values());
}
