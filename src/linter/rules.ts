import type { ToolSpec, LintWarning, LintSeverity } from "../types.js";

export type LintRule = (tool: ToolSpec) => LintWarning[];

export const rules: LintRule[] = [
  namingConvention,
  descriptionQuality,
  schemaCompleteness,
  safetyAnnotation,
  inputSchemaDesign,
];

function namingConvention(tool: ToolSpec): LintWarning[] {
  const warnings: LintWarning[] = [];

  if (tool.name !== tool.name.toLowerCase()) {
    warnings.push(warn(tool, "naming/lowercase", "error",
      "Tool name must be lowercase.",
      `Rename to "${tool.name.toLowerCase()}".`
    ));
  }

  if (!/^[a-z][a-z0-9_]*$/.test(tool.name)) {
    warnings.push(warn(tool, "naming/snake-case", "error",
      "Tool name must be snake_case (letters, numbers, underscores only).",
    ));
  }

  const segments = tool.name.split("_");
  if (segments.length < 2) {
    warnings.push(warn(tool, "naming/segments", "warning",
      "Tool name should follow domain_verb_noun pattern (at least verb_noun).",
      "Add a domain prefix and/or verb, e.g., 'mysite_search_items'."
    ));
  }

  if (tool.name.length > 64) {
    warnings.push(warn(tool, "naming/length", "warning",
      `Tool name is ${tool.name.length} chars (max recommended: 64).`,
      "Shorten the name while keeping it descriptive."
    ));
  }

  return warnings;
}

function descriptionQuality(tool: ToolSpec): LintWarning[] {
  const warnings: LintWarning[] = [];

  if (!tool.description || tool.description.length < 10) {
    warnings.push(warn(tool, "description/length", "error",
      "Tool description is too short (minimum 10 characters).",
      "Write a clear sentence explaining what this tool does."
    ));
  }

  if (tool.description && tool.description.length > 500) {
    warnings.push(warn(tool, "description/length", "warning",
      `Tool description is ${tool.description.length} chars (max recommended: 500).`,
      "Keep descriptions concise — AI models work better with shorter descriptions."
    ));
  }

  const firstWord = tool.description?.split(" ")[0]?.toLowerCase() || "";
  const actionVerbs = [
    "search", "find", "get", "fetch", "create", "submit", "update",
    "delete", "remove", "send", "login", "register", "book", "navigate",
    "click", "filter", "sort", "subscribe", "log", "run", "execute",
    "make", "check", "list", "view", "show", "download", "upload",
  ];
  if (!actionVerbs.includes(firstWord)) {
    warnings.push(warn(tool, "description/verb", "info",
      "Consider starting the description with an action verb (e.g., 'Search for...', 'Create a...').",
    ));
  }

  return warnings;
}

function schemaCompleteness(tool: ToolSpec): LintWarning[] {
  const warnings: LintWarning[] = [];
  const schema = tool.inputSchema;

  if (!schema.properties || Object.keys(schema.properties).length === 0) {
    warnings.push(warn(tool, "schema/empty", "warning",
      "Input schema has no properties. Tools without parameters are rare.",
      "Add parameters that the AI model needs to provide."
    ));
    return warnings;
  }

  for (const [name, prop] of Object.entries(schema.properties)) {
    if (!prop.type) {
      warnings.push(warn(tool, "schema/type-missing", "warning",
        `Property "${name}" has no type defined.`,
        `Add a type (string, number, boolean, etc.) to "${name}".`
      ));
    }

    if (!prop.description) {
      warnings.push(warn(tool, "schema/description-missing", "info",
        `Property "${name}" has no description.`,
        "Add a description to help the AI model understand this field."
      ));
    }
  }

  const requiredCount = schema.required?.length || 0;
  const totalCount = Object.keys(schema.properties).length;
  if (requiredCount === 0 && totalCount > 0) {
    warnings.push(warn(tool, "schema/no-required", "info",
      "No required fields defined. Consider marking essential fields as required.",
    ));
  }

  return warnings;
}

function safetyAnnotation(tool: ToolSpec): LintWarning[] {
  const warnings: LintWarning[] = [];

  if (tool.safety.level === "danger" && !tool.safety.requiresConfirm) {
    warnings.push(warn(tool, "safety/confirm-danger", "error",
      "Dangerous tools must require user confirmation.",
      "Set requiresConfirm: true for danger-level tools."
    ));
  }

  // Name suggests side effects but safety is marked read-only
  if (tool.safety.level === "read") {
    const name = tool.name.toLowerCase();
    if (/create|update|delete|submit|send|post|book|register/.test(name)) {
      warnings.push(warn(tool, "safety/possible-write", "warning",
        `Tool "${tool.name}" is marked as "read" but its name suggests it may have side effects.`,
        'Consider changing safety level to "write" or "danger".'
      ));
    }
  }

  return warnings;
}

// Minimize "model math" — avoid making the AI compute values.
function inputSchemaDesign(tool: ToolSpec): LintWarning[] {
  const warnings: LintWarning[] = [];
  const schema = tool.inputSchema;

  if (!schema.properties) return warnings;

  const propCount = Object.keys(schema.properties).length;

  if (propCount > 10) {
    warnings.push(warn(tool, "design/too-many-params", "warning",
      `Tool has ${propCount} parameters. Consider breaking it into smaller tools.`,
      "AI models work better with focused tools that have fewer parameters."
    ));
  }

  for (const [name, prop] of Object.entries(schema.properties)) {
    if (prop.enum && prop.enum.length > 20) {
      warnings.push(warn(tool, "design/large-enum", "info",
        `Property "${name}" has ${prop.enum.length} enum options.`,
        "Consider using a free-text field with validation instead."
      ));
    }
  }

  return warnings;
}

function warn(
  tool: ToolSpec,
  rule: string,
  severity: LintSeverity,
  message: string,
  suggestion?: string
): LintWarning {
  return {
    toolId: tool.id,
    toolName: tool.name,
    rule,
    severity,
    message,
    suggestion,
  };
}
