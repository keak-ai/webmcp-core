import type { ToolSpec, LintResult } from "../types.js";
import { rules } from "./rules.js";

export function lintTools(tools: ToolSpec[]): LintResult[] {
  return tools.map((tool) => ({
    tool,
    warnings: rules.flatMap((rule) => rule(tool)),
  }));
}

export function lintSummary(results: LintResult[]): {
  totalTools: number;
  totalWarnings: number;
  errors: number;
  warnings: number;
  info: number;
} {
  let errors = 0;
  let warnings = 0;
  let info = 0;

  for (const result of results) {
    for (const w of result.warnings) {
      switch (w.severity) {
        case "error":
          errors++;
          break;
        case "warning":
          warnings++;
          break;
        case "info":
          info++;
          break;
      }
    }
  }

  return {
    totalTools: results.length,
    totalWarnings: errors + warnings + info,
    errors,
    warnings,
    info,
  };
}
