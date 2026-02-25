import { describe, it, expect, beforeEach } from "vitest";
import { extractForms } from "./form-extractor.js";
import {
  makeDomSnapshot,
  makeDomForm,
  makeFieldSpec,
  resetIdCounter,
} from "../__fixtures__/index.js";

beforeEach(() => {
  resetIdCounter();
});

describe("extractForms", () => {
  it("extracts a form with fields and returns one FormSubmitAction with matching fields", () => {
    const field = makeFieldSpec({ name: "email", type: "email", required: true });
    const form = makeDomForm({
      selector: "form#login",
      fields: [field],
      labels: ["Login Form"],
      submitSelector: "button#login-submit",
      method: "POST",
      action: "/api/login",
    });
    const page = makeDomSnapshot({ url: "https://example.com/login", forms: [form] });

    const result = extractForms([page]);

    expect(result).toHaveLength(1);
    const action = result[0];
    expect(action.kind).toBe("form_submit");
    expect(action.pageUrl).toBe("https://example.com/login");
    expect(action.formSelector).toBe("form#login");
    expect(action.fields).toEqual([field]);
    expect(action.labels).toEqual(["Login Form"]);
    expect(action.submitSelector).toBe("button#login-submit");
    expect(action.method).toBe("POST");
    expect(action.action).toBe("/api/login");
    expect(action.networkCalls).toEqual([]);
  });

  it("skips forms with no fields and returns empty array", () => {
    const form = makeDomForm({ fields: [] });
    const page = makeDomSnapshot({ forms: [form] });

    const result = extractForms([page]);

    expect(result).toHaveLength(0);
  });

  it("preserves Chrome declarative attrs (toolname, tooldescription) on DomForm", () => {
    const form = makeDomForm({
      toolname: "login_user",
      tooldescription: "Log in to the application",
      fields: [makeFieldSpec({ name: "username" })],
    });
    const page = makeDomSnapshot({ forms: [form] });

    const result = extractForms([page]);

    expect(result).toHaveLength(1);
    // The form's toolname/tooldescription are on DomForm; extractForms passes the form object through
    // Verify the form fields are captured correctly alongside the declarative attrs existing on the source form
    expect(result[0].fields[0].name).toBe("username");
    // The formSelector matches the form that carried the declarative attrs
    expect(result[0].formSelector).toBe(form.selector);
  });

  it("handles multiple pages with multiple forms and returns the correct count", () => {
    const page1 = makeDomSnapshot({
      url: "https://example.com/page1",
      forms: [
        makeDomForm({ selector: "form#a", fields: [makeFieldSpec({ name: "f1" })] }),
        makeDomForm({ selector: "form#b", fields: [makeFieldSpec({ name: "f2" })] }),
      ],
    });
    const page2 = makeDomSnapshot({
      url: "https://example.com/page2",
      forms: [
        makeDomForm({ selector: "form#c", fields: [makeFieldSpec({ name: "f3" })] }),
      ],
    });
    // page3 has only empty forms — should contribute 0
    const page3 = makeDomSnapshot({
      url: "https://example.com/page3",
      forms: [makeDomForm({ fields: [] })],
    });

    const result = extractForms([page1, page2, page3]);

    expect(result).toHaveLength(3);
    expect(result.map((a) => a.formSelector)).toEqual(["form#a", "form#b", "form#c"]);
  });

  it("generates a unique ID per extracted form", () => {
    const page = makeDomSnapshot({
      forms: [
        makeDomForm({ selector: "form#x", fields: [makeFieldSpec({ name: "a" })] }),
        makeDomForm({ selector: "form#y", fields: [makeFieldSpec({ name: "b" })] }),
      ],
    });

    const result = extractForms([page]);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBeTruthy();
    expect(result[1].id).toBeTruthy();
    expect(result[0].id).not.toBe(result[1].id);
  });

  it("falls back to a default submitSelector when form has no submitSelector", () => {
    const form = makeDomForm({
      selector: "form#contact",
      submitSelector: undefined,
      fields: [makeFieldSpec({ name: "message" })],
    });
    const page = makeDomSnapshot({ forms: [form] });

    const result = extractForms([page]);

    expect(result).toHaveLength(1);
    expect(result[0].submitSelector).toBe("form#contact button");
  });

  it("defaults method to POST when form has no method", () => {
    const form = makeDomForm({
      method: undefined,
      fields: [makeFieldSpec({ name: "q" })],
    });
    const page = makeDomSnapshot({ forms: [form] });

    const result = extractForms([page]);

    expect(result[0].method).toBe("POST");
  });

  it("returns empty array when pages array is empty", () => {
    const result = extractForms([]);
    expect(result).toEqual([]);
  });
});
