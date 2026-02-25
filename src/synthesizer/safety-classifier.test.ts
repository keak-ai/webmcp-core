import { describe, it, expect, beforeEach } from "vitest";
import { classifySafety } from "./safety-classifier.js";
import {
  makeFormSubmitAction,
  makeApiCallAction,
  makeClickFlowAction,
  makeRouteChangeAction,
  resetIdCounter,
} from "../__fixtures__/index.js";

beforeEach(() => {
  resetIdCounter();
});

describe("classifySafety", () => {
  it("GET API → read level", () => {
    const action = makeApiCallAction({
      request: { method: "GET", url: "https://example.com/api/products", status: 200 },
    });
    const safety = classifySafety([action]);
    expect(safety.level).toBe("read");
    expect(safety.requiresConfirm).toBe(false);
  });

  it("POST form → write level", () => {
    const action = makeFormSubmitAction({ method: "POST", labels: ["Submit"] });
    const safety = classifySafety([action]);
    expect(safety.level).toBe("write");
    expect(safety.requiresConfirm).toBe(true);
  });

  it("DELETE API → danger level", () => {
    const action = makeApiCallAction({
      request: { method: "DELETE", url: "https://example.com/api/items/1", status: 200 },
    });
    const safety = classifySafety([action]);
    expect(safety.level).toBe("danger");
    expect(safety.requiresConfirm).toBe(true);
  });

  it("payment keyword in form label → danger", () => {
    const action = makeFormSubmitAction({ labels: ["Payment information"], method: "POST" });
    const safety = classifySafety([action]);
    expect(safety.level).toBe("danger");
  });

  it("checkout keyword in form label → danger", () => {
    const action = makeFormSubmitAction({ labels: ["Checkout"], method: "POST" });
    const safety = classifySafety([action]);
    expect(safety.level).toBe("danger");
  });

  it("delete keyword in form label → danger", () => {
    const action = makeFormSubmitAction({ labels: ["Delete account"], method: "POST" });
    const safety = classifySafety([action]);
    expect(safety.level).toBe("danger");
  });

  it("search form (GET method) → read", () => {
    const action = makeFormSubmitAction({ labels: ["Search"], method: "GET" });
    const safety = classifySafety([action]);
    expect(safety.level).toBe("read");
    expect(safety.requiresConfirm).toBe(false);
  });

  it("search keyword in POST form label → read", () => {
    const action = makeFormSubmitAction({ labels: ["Search products"], method: "POST" });
    const safety = classifySafety([action]);
    expect(safety.level).toBe("read");
  });

  it("route change → read", () => {
    const action = makeRouteChangeAction({
      from: "https://example.com",
      to: "https://example.com/products",
    });
    const safety = classifySafety([action]);
    expect(safety.level).toBe("read");
    expect(safety.requiresConfirm).toBe(false);
  });

  it("click flow → write", () => {
    const action = makeClickFlowAction({ labels: ["Add to Cart"] });
    const safety = classifySafety([action]);
    expect(safety.level).toBe("write");
    expect(safety.requiresConfirm).toBe(true);
  });

  it("mixed read + write → write (promotion)", () => {
    const readAction = makeApiCallAction({
      request: { method: "GET", url: "https://example.com/api/products", status: 200 },
    });
    const writeAction = makeFormSubmitAction({ labels: ["Submit"], method: "POST" });
    const safety = classifySafety([readAction, writeAction]);
    expect(safety.level).toBe("write");
  });

  it("mixed write + danger → danger (promotion)", () => {
    const writeAction = makeFormSubmitAction({ labels: ["Submit"], method: "POST" });
    const dangerAction = makeApiCallAction({
      request: { method: "DELETE", url: "https://example.com/api/items/1", status: 200 },
    });
    const safety = classifySafety([writeAction, dangerAction]);
    expect(safety.level).toBe("danger");
    expect(safety.requiresConfirm).toBe(true);
  });

  it("mixed read + danger → danger (promotion)", () => {
    const readAction = makeApiCallAction({
      request: { method: "GET", url: "https://example.com/api/products", status: 200 },
    });
    const dangerAction = makeApiCallAction({
      request: { method: "DELETE", url: "https://example.com/api/items/1", status: 200 },
    });
    const safety = classifySafety([readAction, dangerAction]);
    expect(safety.level).toBe("danger");
  });

  it("payment keyword in API URL → danger", () => {
    const action = makeApiCallAction({
      request: { method: "POST", url: "https://example.com/api/payment/charge", status: 200 },
    });
    const safety = classifySafety([action]);
    expect(safety.level).toBe("danger");
  });

  it("API POST to normal endpoint → write", () => {
    const action = makeApiCallAction({
      request: { method: "POST", url: "https://example.com/api/orders", status: 201 },
    });
    const safety = classifySafety([action]);
    expect(safety.level).toBe("write");
  });

  it("API PATCH → write", () => {
    const action = makeApiCallAction({
      request: { method: "PATCH", url: "https://example.com/api/users/1", status: 200 },
    });
    const safety = classifySafety([action]);
    expect(safety.level).toBe("write");
  });

  it("login form → write (creates session, not read)", () => {
    const action = makeFormSubmitAction({ labels: ["Login"], method: "POST" });
    const safety = classifySafety([action]);
    expect(safety.level).toBe("write");
  });

  it("empty actions → read (default)", () => {
    const safety = classifySafety([]);
    expect(safety.level).toBe("read");
    expect(safety.requiresConfirm).toBe(false);
  });

  it("requiresConfirm is false only for read level", () => {
    const readAction = makeApiCallAction({
      request: { method: "GET", url: "https://example.com/api/data", status: 200 },
    });
    const writeAction = makeFormSubmitAction({ labels: ["Submit"], method: "POST" });
    const dangerAction = makeApiCallAction({
      request: { method: "DELETE", url: "https://example.com/api/items/1", status: 200 },
    });

    expect(classifySafety([readAction]).requiresConfirm).toBe(false);
    expect(classifySafety([writeAction]).requiresConfirm).toBe(true);
    expect(classifySafety([dangerAction]).requiresConfirm).toBe(true);
  });

  it("GraphQL query operation → read", () => {
    const action = makeApiCallAction({
      request: {
        method: "POST",
        url: "https://example.com/graphql",
        status: 200,
        operationType: "query",
      },
    });
    const safety = classifySafety([action]);
    expect(safety.level).toBe("read");
  });

  it("GraphQL mutation operation → write", () => {
    const action = makeApiCallAction({
      request: {
        method: "POST",
        url: "https://example.com/graphql",
        status: 200,
        operationType: "mutation",
      },
    });
    const safety = classifySafety([action]);
    expect(safety.level).toBe("write");
  });
});
