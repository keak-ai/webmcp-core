import type { ToolSpec, ExportResult, ExportFile, JsonSchema, HandlerStep } from "../types.js";

export interface HtmlEmbedOptions {
  domain: string;
}

export function generateHtmlEmbed(
  tools: ToolSpec[],
  options: HtmlEmbedOptions
): ExportResult {
  const lines: string[] = [];

  lines.push("<script>");
  lines.push("(function() {");
  lines.push('  "use strict";');
  lines.push("");
  lines.push("  if (!navigator.modelContext) return;");
  lines.push("");

  for (const tool of tools) {
    lines.push("  navigator.modelContext.registerTool({");
    lines.push(`    name: ${JSON.stringify(tool.name)},`);
    lines.push(`    description: ${JSON.stringify(tool.description)},`);
    lines.push(`    inputSchema: ${indentJson(tool.inputSchema, 4)},`);

    // Chrome WebMCP annotations for safety hints
    const annotations: Record<string, string> = {};
    if (tool.safety.level === "read") annotations.readOnlyHint = "true";
    if (tool.safety.level === "danger") annotations.destructiveHint = "true";
    if (Object.keys(annotations).length > 0) {
      lines.push(`    annotations: ${JSON.stringify(annotations)},`);
    }

    lines.push("    execute: async function(params) {");
    lines.push(...generateHandlerBody(tool, 6));
    lines.push("    },");
    lines.push("  });");
    lines.push("");
  }

  lines.push(`  console.log("[WebMCP] Registered ${tools.length} tool${tools.length !== 1 ? "s" : ""} for ${options.domain}");`);
  lines.push("})();");
  lines.push("</script>");
  lines.push("");

  const files: ExportFile[] = [
    {
      name: "webmcp.embed.html",
      content: lines.join("\n"),
      language: "html",
    },
  ];

  return { files, target: "html-embed" };
}

function generateHandlerBody(tool: ToolSpec, indentLevel: number): string[] {
  const lines: string[] = [];
  const pad = " ".repeat(indentLevel);
  const template = tool.implementation.handlerTemplate;

  if (!template || !template.steps.length) {
    lines.push(`${pad}return { content: [{ type: "text", text: "Done" }] };`);
    return lines;
  }

  for (const step of template.steps) {
    lines.push(...generateStep(step, pad));
  }

  return lines;
}

function generateStep(step: HandlerStep, pad: string): string[] {
  const lines: string[] = [];

  switch (step.step) {
    case "ensure_page": {
      const pathname = new URL(step.urlPattern).pathname;
      if (pathname !== "/") {
        lines.push(`${pad}if (window.location.pathname.indexOf(${JSON.stringify(pathname)}) !== 0) {`);
        lines.push(`${pad}  window.location.href = ${JSON.stringify(step.urlPattern)};`);
        lines.push(`${pad}  await new Promise(function(r) { setTimeout(r, 2000); });`);
        lines.push(`${pad}}`);
      }
      break;
    }
    case "fill_form": {
      lines.push(`${pad}var form = document.querySelector(${JSON.stringify(step.formSelector)});`);
      lines.push(`${pad}if (!form) throw new Error("Form not found");`);
      for (const [fieldName, paramExpr] of Object.entries(step.mapping)) {
        const paramKey = paramExpr.replace("params.", "");
        const safe = fieldName.replace(/[^a-zA-Z0-9_$]/g, "_");
        lines.push(`${pad}var ${safe}El = form.querySelector('[name="${fieldName}"]');`);
        lines.push(`${pad}if (${safe}El) { ${safe}El.value = String(params["${paramKey}"] || ""); ${safe}El.dispatchEvent(new Event("input", { bubbles: true })); }`);
      }
      break;
    }
    case "click": {
      lines.push(`${pad}var btn = document.querySelector(${JSON.stringify(step.selector)});`);
      lines.push(`${pad}if (btn) btn.click();`);
      if (step.waitFor) {
        lines.push(`${pad}await new Promise(function(r) { setTimeout(r, 1000); });`);
      }
      break;
    }
    case "wait_network": {
      lines.push(`${pad}await new Promise(function(resolve) {`);
      lines.push(`${pad}  var origFetch = window.fetch;`);
      lines.push(`${pad}  window.fetch = async function() {`);
      lines.push(`${pad}    var res = await origFetch.apply(this, arguments);`);
      if (step.match.urlIncludes) {
        lines.push(`${pad}    if (String(arguments[0]).indexOf(${JSON.stringify(step.match.urlIncludes)}) > -1) { window.fetch = origFetch; resolve(); }`);
      } else {
        lines.push(`${pad}    window.fetch = origFetch; resolve();`);
      }
      lines.push(`${pad}    return res;`);
      lines.push(`${pad}  };`);
      lines.push(`${pad}});`);
      break;
    }
    case "wait_element": {
      lines.push(`${pad}await new Promise(function(resolve) {`);
      lines.push(`${pad}  (function check() { document.querySelector(${JSON.stringify(step.selector)}) ? resolve() : requestAnimationFrame(check); })();`);
      lines.push(`${pad}});`);
      break;
    }
    case "extract": {
      if (step.attribute) {
        lines.push(`${pad}var extracted = (document.querySelector(${JSON.stringify(step.selector)}) || {}).getAttribute(${JSON.stringify(step.attribute)}) || null;`);
      } else {
        lines.push(`${pad}var extracted = (document.querySelector(${JSON.stringify(step.selector)}) || {}).textContent || null;`);
      }
      break;
    }
    case "return": {
      lines.push(`${pad}return { content: [{ type: "text", text: "Done" }] };`);
      break;
    }
  }

  return lines;
}

function indentJson(obj: JsonSchema, spaces: number): string {
  const pad = " ".repeat(spaces);
  return JSON.stringify(obj, null, 2)
    .split("\n")
    .map((line, i) => (i === 0 ? line : pad + line))
    .join("\n");
}
