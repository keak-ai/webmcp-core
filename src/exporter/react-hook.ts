import type { ToolSpec, ExportResult, ExportFile, JsonSchema, HandlerStep } from "../types.js";

export interface ReactHookOptions {
  domain: string;
}

export function generateReactHook(
  tools: ToolSpec[],
  options: ReactHookOptions
): ExportResult {
  const lines: string[] = [];

  lines.push('"use client";');
  lines.push("");
  lines.push('import { useEffect } from "react";');
  lines.push("");

  lines.push("declare global {");
  lines.push("  interface Navigator {");
  lines.push("    modelContext?: {");
  lines.push("      registerTool(def: {");
  lines.push("        name: string;");
  lines.push("        description: string;");
  lines.push("        inputSchema: Record<string, unknown>;");
  lines.push("        annotations?: Record<string, string>;");
  lines.push("        execute: (params: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }> }>;");
  lines.push("      }): void;");
  lines.push("      unregisterTool(name: string): void;");
  lines.push("    };");
  lines.push("  }");
  lines.push("}");
  lines.push("");

  lines.push("/**");
  lines.push(` * Register WebMCP tools for ${options.domain}.`);
  lines.push(" * Tools are registered on mount and cleaned up on unmount.");
  lines.push(" *");
  lines.push(" * @example");
  lines.push(" * ```tsx");
  lines.push(' * import { useWebMCPTools } from "./webmcp.hooks";');
  lines.push(" *");
  lines.push(" * function App() {");
  lines.push(" *   useWebMCPTools();");
  lines.push(" *   return <div>My App</div>;");
  lines.push(" * }");
  lines.push(" * ```");
  lines.push(" */");
  lines.push("export function useWebMCPTools(): void {");
  lines.push("  useEffect(() => {");
  lines.push("    if (!navigator.modelContext) return;");
  lines.push("");

  for (const tool of tools) {
    lines.push("    navigator.modelContext.registerTool({");
    lines.push(`      name: ${JSON.stringify(tool.name)},`);
    lines.push(`      description: ${JSON.stringify(tool.description)},`);
    lines.push(`      inputSchema: ${indentJson(tool.inputSchema, 6)},`);

    // Chrome WebMCP annotations for safety hints
    const annotations: Record<string, string> = {};
    if (tool.safety.level === "read") annotations.readOnlyHint = "true";
    if (tool.safety.level === "danger") annotations.destructiveHint = "true";
    if (Object.keys(annotations).length > 0) {
      lines.push(`      annotations: ${JSON.stringify(annotations)},`);
    }

    lines.push("      execute: async (params: Record<string, unknown>) => {");
    lines.push(...generateHandlerBody(tool, 8));
    lines.push("      },");
    lines.push("    });");
    lines.push("");
  }

  const toolNames = tools.map((t) => JSON.stringify(t.name));
  lines.push("    return () => {");
  for (const name of toolNames) {
    lines.push(`      navigator.modelContext?.unregisterTool(${name});`);
  }
  lines.push("    };");
  lines.push("  }, []);");
  lines.push("}");
  lines.push("");

  const files: ExportFile[] = [
    {
      name: "webmcp.hooks.tsx",
      content: lines.join("\n"),
      language: "typescriptreact",
    },
  ];

  return { files, target: "react-hook" };
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
        lines.push(`${pad}if (!window.location.pathname.startsWith(${JSON.stringify(pathname)})) {`);
        lines.push(`${pad}  window.location.href = ${JSON.stringify(step.urlPattern)};`);
        lines.push(`${pad}  await new Promise(resolve => setTimeout(resolve, 2000));`);
        lines.push(`${pad}}`);
      }
      break;
    }
    case "fill_form": {
      lines.push(`${pad}const form = document.querySelector(${JSON.stringify(step.formSelector)});`);
      lines.push(`${pad}if (!form) throw new Error("Form not found");`);
      for (const [fieldName, paramExpr] of Object.entries(step.mapping)) {
        const paramKey = paramExpr.replace("params.", "");
        const safe = fieldName.replace(/[^a-zA-Z0-9_$]/g, "_");
        lines.push(`${pad}const ${safe}El = form.querySelector('[name="${fieldName}"]') as HTMLInputElement | null;`);
        lines.push(`${pad}if (${safe}El) { ${safe}El.value = String(params["${paramKey}"] ?? ""); ${safe}El.dispatchEvent(new Event("input", { bubbles: true })); }`);
      }
      break;
    }
    case "click": {
      lines.push(`${pad}(document.querySelector(${JSON.stringify(step.selector)}) as HTMLElement)?.click();`);
      if (step.waitFor) {
        lines.push(`${pad}await new Promise(resolve => setTimeout(resolve, 1000));`);
      }
      break;
    }
    case "wait_network": {
      lines.push(`${pad}await new Promise<void>((resolve) => {`);
      lines.push(`${pad}  const origFetch = window.fetch;`);
      lines.push(`${pad}  window.fetch = async (...args) => {`);
      lines.push(`${pad}    const res = await origFetch(...args);`);
      if (step.match.urlIncludes) {
        lines.push(`${pad}    if (String(args[0]).includes(${JSON.stringify(step.match.urlIncludes)})) { window.fetch = origFetch; resolve(); }`);
      } else {
        lines.push(`${pad}    window.fetch = origFetch; resolve();`);
      }
      lines.push(`${pad}    return res;`);
      lines.push(`${pad}  };`);
      lines.push(`${pad}});`);
      break;
    }
    case "wait_element": {
      lines.push(`${pad}await new Promise<void>((resolve) => {`);
      lines.push(`${pad}  const check = () => document.querySelector(${JSON.stringify(step.selector)}) ? resolve() : requestAnimationFrame(check);`);
      lines.push(`${pad}  check();`);
      lines.push(`${pad}});`);
      break;
    }
    case "extract": {
      if (step.attribute) {
        lines.push(`${pad}const extracted = document.querySelector(${JSON.stringify(step.selector)})?.getAttribute(${JSON.stringify(step.attribute)}) ?? null;`);
      } else {
        lines.push(`${pad}const extracted = document.querySelector(${JSON.stringify(step.selector)})?.textContent ?? null;`);
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
