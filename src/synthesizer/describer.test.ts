import { describe, it, expect, beforeEach } from "vitest";
import { generateDescription } from "./describer.js";
import {
  makeFormSubmitAction,
  makeApiCallAction,
  makeClickFlowAction,
  makeRouteChangeAction,
  makeFieldSpec,
  resetIdCounter,
} from "../__fixtures__/index.js";

beforeEach(() => {
  resetIdCounter();
});

describe("generateDescription", () => {
  it("form search → contains 'search'", () => {
    const action = makeFormSubmitAction({ labels: ["Search products"] });
    const desc = generateDescription([action]);
    expect(desc.toLowerCase()).toContain("search");
  });

  it("form login → contains relevant login text", () => {
    const action = makeFormSubmitAction({ labels: ["Login"] });
    const desc = generateDescription([action]);
    expect(desc.toLowerCase()).toMatch(/log\s?in|sign\s?in|auth/i);
  });

  it("form register → contains register text", () => {
    const action = makeFormSubmitAction({ labels: ["Sign up"] });
    const desc = generateDescription([action]);
    expect(desc.toLowerCase()).toMatch(/register|account/i);
  });

  it("form contact → contains contact/message text", () => {
    const action = makeFormSubmitAction({ labels: ["Contact us"] });
    const desc = generateDescription([action]);
    expect(desc.toLowerCase()).toMatch(/message|contact/i);
  });

  it("API GET → contains method info (fetch/GET/data)", () => {
    const action = makeApiCallAction({
      request: { method: "GET", url: "https://example.com/api/products", status: 200 },
    });
    const desc = generateDescription([action]);
    expect(desc.toLowerCase()).toMatch(/fetch|get|data/i);
  });

  it("API POST → contains create or POST info", () => {
    const action = makeApiCallAction({
      request: { method: "POST", url: "https://example.com/api/items", status: 201 },
    });
    const desc = generateDescription([action]);
    expect(desc.toLowerCase()).toMatch(/create|post/i);
  });

  it("API DELETE → contains 'Delete'", () => {
    const action = makeApiCallAction({
      request: { method: "DELETE", url: "https://example.com/api/items/1", status: 200 },
    });
    const desc = generateDescription([action]);
    expect(desc).toMatch(/Delete/i);
  });

  it("API PUT → contains update or PUT info", () => {
    const action = makeApiCallAction({
      request: { method: "PUT", url: "https://example.com/api/users/1", status: 200 },
    });
    const desc = generateDescription([action]);
    expect(desc.toLowerCase()).toMatch(/update|put/i);
  });

  it("click → contains button label", () => {
    const action = makeClickFlowAction({ labels: ["Add to Cart"] });
    const desc = generateDescription([action]);
    expect(desc).toContain("Add to Cart");
  });

  it("click with no labels → falls back gracefully", () => {
    const action = makeClickFlowAction({ labels: [] });
    const desc = generateDescription([action]);
    expect(desc.toLowerCase()).toContain("click");
    expect(desc.length).toBeGreaterThan(0);
  });

  it("route → contains both from and to URLs", () => {
    const action = makeRouteChangeAction({
      from: "https://example.com",
      to: "https://example.com/products",
    });
    const desc = generateDescription([action]);
    expect(desc).toContain("https://example.com");
    expect(desc).toContain("https://example.com/products");
  });

  it("description <= 500 chars", () => {
    const actions = [
      makeFormSubmitAction({ labels: ["Search very long label that could extend the description"] }),
      makeApiCallAction(),
      makeClickFlowAction(),
      makeRouteChangeAction(),
    ];
    for (const action of actions) {
      resetIdCounter();
      const desc = generateDescription([action]);
      expect(desc.length).toBeLessThanOrEqual(500);
    }
  });

  it("non-empty for any action type (length >= 10)", () => {
    resetIdCounter();
    const actions = [
      makeFormSubmitAction(),
      makeApiCallAction(),
      makeClickFlowAction(),
      makeRouteChangeAction(),
    ];
    for (const action of actions) {
      const desc = generateDescription([action]);
      expect(desc.length).toBeGreaterThanOrEqual(10);
    }
  });

  it("empty actions → returns fallback string", () => {
    const desc = generateDescription([]);
    expect(desc.length).toBeGreaterThan(0);
  });

  it("required fields appended to form description", () => {
    const action = makeFormSubmitAction({
      labels: ["Search"],
      fields: [
        makeFieldSpec({ name: "query", label: "Search query", required: true }),
        makeFieldSpec({ name: "category", label: "Category", required: false }),
      ],
    });
    const desc = generateDescription([action]);
    expect(desc).toContain("Search query");
    expect(desc).not.toContain("Category");
  });

  it("optional-only fields → no required fields line", () => {
    const action = makeFormSubmitAction({
      labels: ["Search"],
      fields: [
        makeFieldSpec({ name: "query", required: false }),
      ],
    });
    const desc = generateDescription([action]);
    expect(desc).not.toMatch(/required fields/i);
  });

  it("API POST to search path → contains search text", () => {
    const action = makeApiCallAction({
      request: { method: "POST", url: "https://example.com/api/search", status: 200 },
    });
    const desc = generateDescription([action]);
    expect(desc.toLowerCase()).toContain("search");
  });

  it("GraphQL query → describes as query operation", () => {
    const action = makeApiCallAction({
      request: {
        method: "POST",
        url: "https://example.com/graphql",
        status: 200,
        operationName: "GetProducts",
        operationType: "query",
      },
    });
    const desc = generateDescription([action]);
    expect(desc).toContain("GetProducts");
    expect(desc.toLowerCase()).toContain("graphql");
  });

  it("GraphQL mutation → describes as mutation operation", () => {
    const action = makeApiCallAction({
      request: {
        method: "POST",
        url: "https://example.com/graphql",
        status: 200,
        operationName: "CreateOrder",
        operationType: "mutation",
      },
    });
    const desc = generateDescription([action]);
    expect(desc).toContain("CreateOrder");
    expect(desc.toLowerCase()).toMatch(/mutation|execute/i);
  });
});
