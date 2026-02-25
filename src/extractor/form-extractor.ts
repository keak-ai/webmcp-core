import { v4 as uuid } from "uuid";
import type { Action, FormSubmitAction, DomSnapshot, DomForm } from "../types.js";

export function extractForms(pages: DomSnapshot[]): FormSubmitAction[] {
  const actions: FormSubmitAction[] = [];

  for (const page of pages) {
    for (const form of page.forms) {
      if (form.fields.length === 0) continue;

      actions.push({
        kind: "form_submit",
        id: uuid(),
        pageUrl: page.url,
        formSelector: form.selector,
        fields: form.fields,
        submitSelector: form.submitSelector || `${form.selector} button`,
        labels: form.labels,
        method: (form.method as "GET" | "POST") || "POST",
        action: form.action,
        networkCalls: [],
      });
    }
  }

  return actions;
}
