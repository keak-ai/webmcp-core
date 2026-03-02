import type { Page } from "playwright-core";
import type { DomSnapshot, DomForm, DomButton, DomLink, FieldSpec } from "../types.js";

export async function captureDom(page: Page): Promise<DomSnapshot> {
  const result = await page.evaluate(() => {
    // Helpers must be defined inside evaluate() so they run in the browser context.
    function getCssPath(el: Element): string {
      const segments: string[] = [];
      let current: Element | null = el;
      while (current && current.nodeType === 1) {
        const tag = current.tagName.toLowerCase();
        if (current.id && /^[a-zA-Z][\w-]*$/.test(current.id)) {
          const idSel: string = "#" + CSS.escape(current.id);
          try {
            if (document.querySelector(idSel) === current) {
              segments.unshift(idSel);
              break;
            }
          } catch {
            /* ignore */
          }
        }
        const parent: Element | null = current.parentElement;
        let selector = tag;
        if (parent) {
          const siblings = Array.from(parent.children).filter(
            (n: Element) => n.tagName === current!.tagName
          );
          if (siblings.length > 1) {
            const idx = siblings.indexOf(current) + 1;
            selector += ":nth-of-type(" + idx + ")";
          }
        }
        segments.unshift(selector);
        current = parent;
      }
      return segments.join(" > ");
    }

    function getStableSelectors(
      el: Element,
      temporarySelector: string
    ): { primary: string; fallbackSelectors: string[] } {
      const fallbacks: string[] = [];
      let primary = "";

      if (el.id && /^[a-zA-Z][\w-]*$/.test(el.id)) {
        const idSel = "#" + CSS.escape(el.id);
        if (!primary) primary = idSel;
        else fallbacks.push(idSel);
      }

      const ariaLabel = el.getAttribute("aria-label");
      if (ariaLabel && ariaLabel.trim()) {
        const ariaSel = '[aria-label="' + ariaLabel.trim().replace(/"/g, '\\"') + '"]';
        if (!primary) primary = ariaSel;
        else if (fallbacks.indexOf(ariaSel) === -1) fallbacks.push(ariaSel);
      }

      const pathSel = getCssPath(el);
      if (pathSel && pathSel.length < 500) {
        if (!primary) primary = pathSel;
        else if (fallbacks.indexOf(pathSel) === -1) fallbacks.push(pathSel);
      }

      if (!primary) primary = temporarySelector;
      else if (
        temporarySelector &&
        temporarySelector !== primary &&
        temporarySelector.indexOf("data-webmcp-idx") === -1
      ) {
        fallbacks.push(temporarySelector);
      }
      if (temporarySelector.indexOf("data-webmcp-idx") !== -1 && temporarySelector !== primary) {
        fallbacks.push(temporarySelector);
      }

      const seen: string[] = [];
      for (let i = 0; i < fallbacks.length; i++) {
        if (seen.indexOf(fallbacks[i]) === -1) seen.push(fallbacks[i]);
      }
      return { primary, fallbackSelectors: seen };
    }

    const forms: DomForm[] = [];
    document.querySelectorAll("form").forEach((form, formIndex) => {
      const fields: FieldSpec[] = [];
      const formSelector = form.id
        ? `#${form.id}`
        : `form:nth-of-type(${formIndex + 1})`;

      form.querySelectorAll("input, select, textarea").forEach((el) => {
        const input = el as HTMLInputElement;
        const name = input.name || input.id || "";
        if (!name) return;

        let label: string | undefined;
        const labelEl = form.querySelector(`label[for="${input.id}"]`);
        if (labelEl) {
          label = labelEl.textContent?.trim();
        } else {
          const parentLabel = input.closest("label");
          if (parentLabel) {
            label = parentLabel.textContent?.trim()?.replace(input.value, "").trim();
          }
        }

        let type: FieldSpec["type"] = "string";
        if (el.tagName === "SELECT") type = "enum";
        else if (input.type === "number" || input.type === "range") type = "number";
        else if (input.type === "checkbox") type = "boolean";
        else if (input.type === "email") type = "email";
        else if (input.type === "tel") type = "tel";
        else if (input.type === "url") type = "url";
        else if (input.type === "date" || input.type === "datetime-local") type = "date";

        let options: string[] | undefined;
        if (el.tagName === "SELECT") {
          options = Array.from((el as HTMLSelectElement).options)
            .filter((opt) => opt.value)
            .map((opt) => opt.value);
        }

        fields.push({
          name,
          type,
          required: input.required || input.hasAttribute("required"),
          label,
          placeholder: input.placeholder || undefined,
          options,
          pattern: input.pattern || undefined,
          min: input.min ? Number(input.min) : undefined,
          max: input.max ? Number(input.max) : undefined,
          defaultValue: input.defaultValue || undefined,
          // Chrome WebMCP Declarative API attributes
          toolparamtitle: el.getAttribute("toolparamtitle") || undefined,
          toolparamdescription: el.getAttribute("toolparamdescription") || undefined,
        });
      });

      const submitBtn =
        form.querySelector('button[type="submit"]') ||
        form.querySelector('input[type="submit"]') ||
        form.querySelector("button:not([type])");
      const submitSelectorRaw = submitBtn
        ? submitBtn.id
          ? `#${submitBtn.id}`
          : `${formSelector} button[type="submit"]`
        : `${formSelector} button`;

      const formStable = getStableSelectors(form, formSelector);
      const submitStable = submitBtn
        ? getStableSelectors(submitBtn, submitSelectorRaw)
        : null;
      var resolvedSubmitSelector = submitStable
        ? submitStable.primary
        : formStable.primary + " button";

      const labels: string[] = [];
      const ariaLabel = form.getAttribute("aria-label");
      if (ariaLabel) labels.push(ariaLabel);
      const legend = form.querySelector("legend");
      if (legend) labels.push(legend.textContent?.trim() || "");
      const prev = form.previousElementSibling;
      if (prev && /^h[1-6]$/i.test(prev.tagName)) {
        labels.push(prev.textContent?.trim() || "");
      }

      // Chrome WebMCP Declarative API attributes
      const toolname = form.getAttribute("toolname") || undefined;
      const tooldescription = form.getAttribute("tooldescription") || undefined;
      const toolautosubmit = form.hasAttribute("toolautosubmit") || undefined;

      // If toolname is present, include it as a label for namer/describer
      if (toolname && !labels.includes(toolname)) {
        labels.unshift(toolname);
      }
      if (tooldescription && !labels.includes(tooldescription)) {
        labels.push(tooldescription);
      }

      forms.push({
        selector: formStable.primary,
        formFallbackSelectors:
          formStable.fallbackSelectors.length > 0
            ? formStable.fallbackSelectors
            : undefined,
        id: form.id || undefined,
        action: form.action || undefined,
        method: (form.method || "GET").toUpperCase(),
        fields,
        submitSelector: submitStable ? submitStable.primary : resolvedSubmitSelector,
        submitFallbackSelectors:
          submitStable && submitStable.fallbackSelectors.length > 0
            ? submitStable.fallbackSelectors
            : undefined,
        labels: labels.filter(Boolean),
        toolname,
        tooldescription,
        toolautosubmit: toolautosubmit || undefined,
      });
    });

    // Normalize text extracted from elements: collapse whitespace,
    // trim, and cap length to avoid bloated tool names/descriptions.
    function cleanText(el: Element, maxLen = 120): string {
      const raw = (el as HTMLElement).innerText || el.textContent || "";
      return raw.replace(/\s+/g, " ").trim().slice(0, maxLen);
    }

    const buttons: DomButton[] = [];
    document
      .querySelectorAll("button, [role='button'], a.btn, a.button")
      .forEach((el, idx) => {
        const isInsideForm = !!el.closest("form");
        const text = cleanText(el);
        const ariaLabel = el.getAttribute("aria-label") || undefined;

        if (!text && !ariaLabel) return;

        const temporarySelector = el.id
          ? "#" + CSS.escape(el.id)
          : `[data-webmcp-idx="${idx}"]`;
        const { primary, fallbackSelectors } = getStableSelectors(
          el,
          temporarySelector
        );

        buttons.push({
          selector: primary,
          fallbackSelectors:
            fallbackSelectors.length > 0 ? fallbackSelectors : undefined,
          text,
          ariaLabel,
          type: (el as HTMLButtonElement).type || undefined,
          isInsideForm,
        });
      });

    const links: DomLink[] = [];
    document.querySelectorAll("a[href]").forEach((el) => {
      const anchor = el as HTMLAnchorElement;
      const text = cleanText(anchor);
      const href = anchor.href;
      const ariaLabel = anchor.getAttribute("aria-label") || undefined;

      if (!text && !ariaLabel) return;

      let isInternal = false;
      try {
        isInternal = new URL(href).origin === window.location.origin;
      } catch {
        isInternal = true;
      }

      const temporarySelector = anchor.id
        ? "#" + anchor.id
        : `a[href="${anchor.getAttribute("href")}"]`;
      const { primary, fallbackSelectors } = getStableSelectors(
        el,
        temporarySelector
      );

      links.push({
        selector: primary,
        fallbackSelectors:
          fallbackSelectors.length > 0 ? fallbackSelectors : undefined,
        text,
        href,
        ariaLabel,
        isInternal,
      });
    });

    return {
      url: window.location.href,
      title: document.title,
      forms,
      buttons,
      links,
      timestamp: new Date().toISOString(),
    };
  });

  return result as DomSnapshot;
}
