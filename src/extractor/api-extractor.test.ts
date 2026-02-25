import { describe, it, expect, beforeEach } from "vitest";
import { extractApiCalls } from "./api-extractor.js";
import {
  makeDomSnapshot,
  makeNetworkCall,
  resetIdCounter,
} from "../__fixtures__/index.js";

beforeEach(() => {
  resetIdCounter();
});

describe("extractApiCalls", () => {
  it("extracts a same-site POST API call", () => {
    const call = makeNetworkCall({
      method: "POST",
      url: "https://example.com/api/users",
      status: 200,
    });
    const page = makeDomSnapshot({ url: "https://example.com" });

    const result = extractApiCalls([call], [page], "https://example.com");

    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe("api_call");
    expect(result[0].request).toEqual(call);
    expect(result[0].labels).toContain("POST /api/users");
  });

  it("blocks cross-origin calls to other.com", () => {
    const call = makeNetworkCall({
      method: "GET",
      url: "https://other.com/api/data",
      status: 200,
    });
    const page = makeDomSnapshot({ url: "https://example.com" });

    const result = extractApiCalls([call], [page], "https://example.com");

    expect(result).toHaveLength(0);
  });

  it("blocks calls to google-analytics.com", () => {
    const call = makeNetworkCall({
      method: "POST",
      url: "https://www.google-analytics.com/collect",
      status: 200,
    });
    const page = makeDomSnapshot({ url: "https://google-analytics.com" });

    const result = extractApiCalls([call], [page], "https://google-analytics.com");

    expect(result).toHaveLength(0);
  });

  it("blocks calls to segment.io", () => {
    const call = makeNetworkCall({
      method: "POST",
      url: "https://api.segment.io/v1/track",
      status: 200,
    });
    const page = makeDomSnapshot({ url: "https://segment.io" });

    const result = extractApiCalls([call], [page], "https://segment.io");

    expect(result).toHaveLength(0);
  });

  it("blocks calls to hotjar.com", () => {
    const call = makeNetworkCall({
      method: "POST",
      url: "https://vc.hotjar.io/api/v2/site/123/visit-data",
      status: 200,
    });
    const page = makeDomSnapshot({ url: "https://hotjar.com" });

    const result = extractApiCalls([call], [page], "https://hotjar.com");

    expect(result).toHaveLength(0);
  });

  it("blocks URLs matching /analytics pattern", () => {
    const call = makeNetworkCall({
      method: "POST",
      url: "https://example.com/analytics/event",
      status: 200,
    });
    const page = makeDomSnapshot({ url: "https://example.com" });

    const result = extractApiCalls([call], [page], "https://example.com");

    expect(result).toHaveLength(0);
  });

  it("blocks URLs matching /tracking pattern", () => {
    const call = makeNetworkCall({
      method: "POST",
      url: "https://example.com/tracking/pixel.gif",
      status: 200,
    });
    const page = makeDomSnapshot({ url: "https://example.com" });

    const result = extractApiCalls([call], [page], "https://example.com");

    expect(result).toHaveLength(0);
  });

  it("blocks URLs matching /pixel pattern", () => {
    const call = makeNetworkCall({
      method: "GET",
      url: "https://example.com/pixel/track",
      status: 200,
    });
    const page = makeDomSnapshot({ url: "https://example.com" });

    const result = extractApiCalls([call], [page], "https://example.com");

    expect(result).toHaveLength(0);
  });

  it("blocks URLs matching /beacon pattern", () => {
    const call = makeNetworkCall({
      method: "POST",
      url: "https://example.com/beacon",
      status: 200,
    });
    const page = makeDomSnapshot({ url: "https://example.com" });

    const result = extractApiCalls([call], [page], "https://example.com");

    expect(result).toHaveLength(0);
  });

  it("blocks static asset .js files", () => {
    const call = makeNetworkCall({
      method: "GET",
      url: "https://example.com/_next/static/chunks/main.js",
      status: 200,
    });
    const page = makeDomSnapshot({ url: "https://example.com" });

    const result = extractApiCalls([call], [page], "https://example.com");

    expect(result).toHaveLength(0);
  });

  it("blocks static asset .css files via framework prefix _next", () => {
    const call = makeNetworkCall({
      method: "GET",
      url: "https://example.com/_next/static/css/styles.css",
      status: 200,
    });
    const page = makeDomSnapshot({ url: "https://example.com" });

    const result = extractApiCalls([call], [page], "https://example.com");

    expect(result).toHaveLength(0);
  });

  it("blocks static asset .woff font files via font CDN domain (fonts.gstatic.com)", () => {
    const call = makeNetworkCall({
      method: "GET",
      url: "https://fonts.gstatic.com/s/roboto/v30/roboto.woff2",
      status: 200,
    });
    const page = makeDomSnapshot({ url: "https://fonts.gstatic.com" });

    const result = extractApiCalls([call], [page], "https://fonts.gstatic.com");

    expect(result).toHaveLength(0);
  });

  it("groups 3 duplicate GET /api/products calls into one action", () => {
    const calls = [
      makeNetworkCall({ method: "GET", url: "https://example.com/api/products?page=1", status: 200 }),
      makeNetworkCall({ method: "GET", url: "https://example.com/api/products?page=2", status: 200 }),
      makeNetworkCall({ method: "GET", url: "https://example.com/api/products?page=3", status: 200 }),
    ];
    const page = makeDomSnapshot({ url: "https://example.com" });

    const result = extractApiCalls(calls, [page], "https://example.com");

    expect(result).toHaveLength(1);
    expect(result[0].labels).toContain("GET /api/products");
  });

  it("filters page navigations (GET matching existing page URL pathname)", () => {
    const call = makeNetworkCall({
      method: "GET",
      url: "https://example.com/products",
      status: 200,
    });
    const page = makeDomSnapshot({ url: "https://example.com/products" });

    const result = extractApiCalls([call], [page], "https://example.com");

    expect(result).toHaveLength(0);
  });

  it("filters redirect responses (3xx status)", () => {
    const call = makeNetworkCall({
      method: "GET",
      url: "https://example.com/api/old-endpoint",
      status: 301,
    });
    const page = makeDomSnapshot({ url: "https://example.com" });

    const result = extractApiCalls([call], [page], "https://example.com");

    expect(result).toHaveLength(0);
  });

  it("filters 302 redirect responses", () => {
    const call = makeNetworkCall({
      method: "GET",
      url: "https://example.com/api/redirect",
      status: 302,
    });
    const page = makeDomSnapshot({ url: "https://example.com" });

    const result = extractApiCalls([call], [page], "https://example.com");

    expect(result).toHaveLength(0);
  });

  it("filters 204 no-content responses", () => {
    const call = makeNetworkCall({
      method: "DELETE",
      url: "https://example.com/api/items/1",
      status: 204,
    });
    const page = makeDomSnapshot({ url: "https://example.com" });

    const result = extractApiCalls([call], [page], "https://example.com");

    expect(result).toHaveLength(0);
  });

  it("preserves GraphQL operationName in labels", () => {
    const call = makeNetworkCall({
      method: "POST",
      url: "https://example.com/graphql",
      status: 200,
      operationName: "GetUserProfile",
    });
    const page = makeDomSnapshot({ url: "https://example.com" });

    const result = extractApiCalls([call], [page], "https://example.com");

    expect(result).toHaveLength(1);
    expect(result[0].labels).toContain("GetUserProfile");
    expect(result[0].labels).toContain("POST /graphql");
  });

  it("handles subdomains as same-site (api.example.com when base is example.com)", () => {
    const call = makeNetworkCall({
      method: "GET",
      url: "https://api.example.com/v1/users",
      status: 200,
    });
    const page = makeDomSnapshot({ url: "https://example.com" });

    const result = extractApiCalls([call], [page], "https://example.com");

    expect(result).toHaveLength(1);
    expect(result[0].request.url).toBe("https://api.example.com/v1/users");
  });

  it("returns empty array when no network calls provided", () => {
    const page = makeDomSnapshot({ url: "https://example.com" });

    const result = extractApiCalls([], [page], "https://example.com");

    expect(result).toEqual([]);
  });

  it("extracts distinct endpoints from mixed same-site calls", () => {
    const calls = [
      makeNetworkCall({ method: "GET", url: "https://example.com/api/products", status: 200 }),
      makeNetworkCall({ method: "POST", url: "https://example.com/api/orders", status: 201 }),
    ];
    const page = makeDomSnapshot({ url: "https://example.com" });

    const result = extractApiCalls(calls, [page], "https://example.com");

    expect(result).toHaveLength(2);
    const labels = result.flatMap((r) => r.labels);
    expect(labels).toContain("GET /api/products");
    expect(labels).toContain("POST /api/orders");
  });

  it("assigns pageUrl from matching page origin", () => {
    const call = makeNetworkCall({
      method: "POST",
      url: "https://example.com/api/submit",
      status: 200,
    });
    const page = makeDomSnapshot({ url: "https://example.com/dashboard" });

    const result = extractApiCalls([call], [page], "https://example.com");

    expect(result).toHaveLength(1);
    expect(result[0].pageUrl).toBe("https://example.com/dashboard");
  });
});
