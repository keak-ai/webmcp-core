import { describe, it, expect, beforeEach } from "vitest";
import { generateToolName } from "./namer.js";
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

describe("generateToolName", () => {
  it("form with search label → name contains search", () => {
    const action = makeFormSubmitAction({ labels: ["Search products"] });
    const name = generateToolName([action], "example.com");
    expect(name).toContain("search");
  });

  it("form with login label → name contains login", () => {
    const action = makeFormSubmitAction({ labels: ["Login"] });
    const name = generateToolName([action], "example.com");
    expect(name).toContain("login");
  });

  it("API GET → name contains get", () => {
    const action = makeApiCallAction({
      request: { method: "GET", url: "https://example.com/api/users", status: 200 },
    });
    const name = generateToolName([action], "example.com");
    expect(name).toContain("get");
  });

  it("API POST → name contains create", () => {
    const action = makeApiCallAction({
      request: { method: "POST", url: "https://example.com/api/products", status: 201 },
    });
    const name = generateToolName([action], "example.com");
    expect(name).toContain("create");
  });

  it("API DELETE → name contains delete", () => {
    const action = makeApiCallAction({
      request: { method: "DELETE", url: "https://example.com/api/items/1", status: 200 },
    });
    const name = generateToolName([action], "example.com");
    expect(name).toContain("delete");
  });

  it("click → name contains click", () => {
    const action = makeClickFlowAction({ labels: ["Add to Cart"] });
    const name = generateToolName([action], "example.com");
    expect(name).toContain("click");
  });

  it("route → name contains navigate", () => {
    const action = makeRouteChangeAction({
      from: "https://example.com",
      to: "https://example.com/products",
    });
    const name = generateToolName([action], "example.com");
    expect(name).toContain("navigate");
  });

  it("output is always snake_case (matches ^[a-z][a-z0-9_]*$)", () => {
    const actions = [
      makeFormSubmitAction({ labels: ["Search products"] }),
      makeApiCallAction(),
      makeClickFlowAction(),
      makeRouteChangeAction(),
    ];
    const snakeCaseRegex = /^[a-z][a-z0-9_]*$/;

    for (const action of actions) {
      resetIdCounter();
      const name = generateToolName([action], "example.com");
      expect(name).toMatch(snakeCaseRegex);
    }
  });

  it("max 64 chars", () => {
    const action = makeFormSubmitAction({
      labels: ["Search for very long product category name that goes on and on"],
    });
    const name = generateToolName([action], "verylongdomainname.example.com");
    expect(name.length).toBeLessThanOrEqual(64);
  });

  it("domain extracted from hostname — strips www prefix", () => {
    const action = makeFormSubmitAction({ labels: ["Search"] });
    const name = generateToolName([action], "www.example.com");
    expect(name).toContain("example");
    expect(name).not.toContain("www");
  });

  it("domain extracted from full hostname including subdomains uses first segment", () => {
    const action = makeFormSubmitAction({ labels: ["Search"] });
    const name = generateToolName([action], "shop.mystore.com");
    expect(name).toContain("shop");
  });

  it("empty actions returns domain_unknown_tool", () => {
    const name = generateToolName([], "example.com");
    expect(name).toContain("unknown");
  });

  it("API PUT → name contains update", () => {
    const action = makeApiCallAction({
      request: { method: "PUT", url: "https://example.com/api/users/1", status: 200 },
    });
    const name = generateToolName([action], "example.com");
    expect(name).toContain("update");
  });

  it("form with filter label → name contains filter", () => {
    const action = makeFormSubmitAction({ labels: ["Filter results"] });
    const name = generateToolName([action], "example.com");
    expect(name).toContain("filter");
  });

  it("API search path → name contains search", () => {
    const action = makeApiCallAction({
      request: { method: "GET", url: "https://example.com/api/search?q=test", status: 200 },
    });
    const name = generateToolName([action], "example.com");
    expect(name).toContain("search");
  });

  it("form GET method with no matching labels → returns search verb", () => {
    const action = makeFormSubmitAction({
      labels: ["Submit"],
      method: "GET",
    });
    const name = generateToolName([action], "example.com");
    expect(name).toContain("search");
  });

  it("noun inferred from route URL path", () => {
    const action = makeRouteChangeAction({
      from: "https://example.com",
      to: "https://example.com/dashboard",
    });
    const name = generateToolName([action], "example.com");
    expect(name).toContain("dashboard");
  });

  it("noun inferred from API URL path segments", () => {
    const action = makeApiCallAction({
      request: { method: "GET", url: "https://example.com/api/v1/orders", status: 200 },
    });
    const name = generateToolName([action], "example.com");
    expect(name).toContain("orders");
  });

  it("form fields with email keyword → noun is account", () => {
    const action = makeFormSubmitAction({
      labels: ["Sign In"],
      fields: [
        makeFieldSpec({ name: "email", type: "email" }),
        makeFieldSpec({ name: "password", type: "string" }),
      ],
    });
    const name = generateToolName([action], "example.com");
    expect(name).toContain("account");
  });
});
