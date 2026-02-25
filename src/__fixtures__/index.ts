import type {
  DomSnapshot,
  DomForm,
  DomButton,
  DomLink,
  FieldSpec,
  NetworkCall,
  FormSubmitAction,
  ApiCallAction,
  ClickFlowAction,
  RouteChangeAction,
  ToolSpec,
  ScanResult,
} from "../types.js";

let idCounter = 0;
function nextId(): string {
  return `test-id-${++idCounter}`;
}

export function resetIdCounter(): void {
  idCounter = 0;
}

export function makeFieldSpec(overrides: Partial<FieldSpec> = {}): FieldSpec {
  return {
    name: "query",
    type: "string",
    required: false,
    label: "Search query",
    ...overrides,
  };
}

export function makeDomButton(overrides: Partial<DomButton> = {}): DomButton {
  return {
    selector: "button#submit",
    text: "Submit",
    isInsideForm: false,
    ...overrides,
  };
}

export function makeDomLink(overrides: Partial<DomLink> = {}): DomLink {
  return {
    selector: "a.nav-link",
    text: "Products",
    href: "/products",
    isInternal: true,
    ...overrides,
  };
}

export function makeDomForm(overrides: Partial<DomForm> = {}): DomForm {
  return {
    selector: "form#search",
    fields: [makeFieldSpec()],
    labels: ["Search"],
    submitSelector: "button[type=submit]",
    ...overrides,
  };
}

export function makeDomSnapshot(
  overrides: Partial<DomSnapshot> = {}
): DomSnapshot {
  return {
    url: "https://example.com",
    title: "Example Site",
    forms: [makeDomForm()],
    buttons: [makeDomButton()],
    links: [makeDomLink()],
    timestamp: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export function makeNetworkCall(
  overrides: Partial<NetworkCall> = {}
): NetworkCall {
  return {
    method: "GET",
    url: "https://example.com/api/products",
    status: 200,
    ...overrides,
  };
}

export function makeFormSubmitAction(
  overrides: Partial<FormSubmitAction> = {}
): FormSubmitAction {
  return {
    kind: "form_submit",
    id: nextId(),
    pageUrl: "https://example.com",
    formSelector: "form#search",
    fields: [makeFieldSpec()],
    submitSelector: "button[type=submit]",
    labels: ["Search"],
    method: "GET",
    networkCalls: [],
    ...overrides,
  };
}

export function makeApiCallAction(
  overrides: Partial<ApiCallAction> = {}
): ApiCallAction {
  return {
    kind: "api_call",
    id: nextId(),
    pageUrl: "https://example.com",
    request: makeNetworkCall(),
    labels: ["Fetch products"],
    ...overrides,
  };
}

export function makeClickFlowAction(
  overrides: Partial<ClickFlowAction> = {}
): ClickFlowAction {
  return {
    kind: "click_flow",
    id: nextId(),
    pageUrl: "https://example.com",
    startSelector: "button#add-to-cart",
    networkCalls: [],
    labels: ["Add to Cart"],
    ...overrides,
  };
}

export function makeRouteChangeAction(
  overrides: Partial<RouteChangeAction> = {}
): RouteChangeAction {
  return {
    kind: "route_change",
    id: nextId(),
    from: "https://example.com",
    to: "https://example.com/products",
    labels: ["Products"],
    ...overrides,
  };
}

export function makeToolSpec(overrides: Partial<ToolSpec> = {}): ToolSpec {
  return {
    id: nextId(),
    name: "example_search_products",
    description: "Search products by keyword on example.com.",
    inputSchema: {
      type: "object",
      properties: {
        keyword: { type: "string", description: "Search term" },
      },
      required: ["keyword"],
    },
    safety: {
      level: "read",
      requiresConfirm: false,
    },
    availability: {
      urlPatterns: ["https://example.com/*"],
      requiresAuth: false,
    },
    implementation: {
      kind: "js_handler",
    },
    provenance: {
      actions: ["action-1"],
      createdFrom: "autogen-v1",
      confidence: 0.8,
      pageUrl: "https://example.com",
    },
    ...overrides,
  };
}

export function makeScanResult(
  overrides: Partial<ScanResult> = {}
): ScanResult {
  return {
    pages: [makeDomSnapshot()],
    networkCalls: [],
    actions: [],
    metadata: {
      baseUrl: "https://example.com",
      startedAt: "2025-01-01T00:00:00.000Z",
      completedAt: "2025-01-01T00:01:00.000Z",
      pagesVisited: 1,
      depth: 2,
    },
    ...overrides,
  };
}
