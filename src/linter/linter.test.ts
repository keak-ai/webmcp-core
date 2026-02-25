import { describe, it, expect, beforeEach } from "vitest";
import { lintTools, lintSummary } from "./linter.js";
import { makeToolSpec, resetIdCounter } from "../__fixtures__/index.js";

beforeEach(() => {
  resetIdCounter();
});

describe("lintTools", () => {
  it("valid tool produces no errors", () => {
    const tool = makeToolSpec();
    const [result] = lintTools([tool]);
    const errors = result.warnings.filter((w) => w.severity === "error");
    expect(errors).toHaveLength(0);
  });

  it("uppercase name triggers naming/snake-case error", () => {
    const tool = makeToolSpec({ name: "Search_Products" });
    const [result] = lintTools([tool]);
    const rules = result.warnings.map((w) => w.rule);
    expect(rules).toContain("naming/snake-case");
  });

  it("name with hyphens triggers naming/snake-case error", () => {
    const tool = makeToolSpec({ name: "search-products" });
    const [result] = lintTools([tool]);
    const rules = result.warnings.map((w) => w.rule);
    expect(rules).toContain("naming/snake-case");
    const snakeCaseWarning = result.warnings.find(
      (w) => w.rule === "naming/snake-case"
    );
    expect(snakeCaseWarning?.severity).toBe("error");
  });

  it("single segment name triggers naming/segments warning", () => {
    const tool = makeToolSpec({ name: "search" });
    const [result] = lintTools([tool]);
    const rules = result.warnings.map((w) => w.rule);
    expect(rules).toContain("naming/segments");
    const segmentsWarning = result.warnings.find(
      (w) => w.rule === "naming/segments"
    );
    expect(segmentsWarning?.severity).toBe("warning");
  });

  it("name longer than 64 chars triggers naming/length warning", () => {
    const longName = "example_" + "a".repeat(60);
    const tool = makeToolSpec({ name: longName });
    const [result] = lintTools([tool]);
    const rules = result.warnings.map((w) => w.rule);
    expect(rules).toContain("naming/length");
    const lengthWarning = result.warnings.find(
      (w) => w.rule === "naming/length"
    );
    expect(lengthWarning?.severity).toBe("warning");
  });

  it("description shorter than 10 chars triggers description/length error", () => {
    const tool = makeToolSpec({ description: "Short" });
    const [result] = lintTools([tool]);
    const rules = result.warnings.map((w) => w.rule);
    expect(rules).toContain("description/length");
    const lengthWarning = result.warnings.find(
      (w) => w.rule === "description/length"
    );
    expect(lengthWarning?.severity).toBe("error");
  });

  it("description longer than 500 chars triggers description/length warning", () => {
    const longDesc = "Search " + "x".repeat(500);
    const tool = makeToolSpec({ description: longDesc });
    const [result] = lintTools([tool]);
    const matching = result.warnings.filter(
      (w) => w.rule === "description/length" && w.severity === "warning"
    );
    expect(matching.length).toBeGreaterThan(0);
  });

  it("description not starting with action verb triggers description/verb info", () => {
    const tool = makeToolSpec({
      description: "Products can be browsed on this page.",
    });
    const [result] = lintTools([tool]);
    const rules = result.warnings.map((w) => w.rule);
    expect(rules).toContain("description/verb");
    const verbWarning = result.warnings.find(
      (w) => w.rule === "description/verb"
    );
    expect(verbWarning?.severity).toBe("info");
  });

  it("empty schema (no properties) triggers schema/empty warning", () => {
    const tool = makeToolSpec({
      inputSchema: { type: "object" },
    });
    const [result] = lintTools([tool]);
    const rules = result.warnings.map((w) => w.rule);
    expect(rules).toContain("schema/empty");
    const emptyWarning = result.warnings.find((w) => w.rule === "schema/empty");
    expect(emptyWarning?.severity).toBe("warning");
  });

  it("property missing type triggers schema/type-missing warning", () => {
    const tool = makeToolSpec({
      inputSchema: {
        type: "object",
        properties: {
          keyword: { description: "A search keyword" },
        },
        required: ["keyword"],
      },
    });
    const [result] = lintTools([tool]);
    const rules = result.warnings.map((w) => w.rule);
    expect(rules).toContain("schema/type-missing");
    const typeWarning = result.warnings.find(
      (w) => w.rule === "schema/type-missing"
    );
    expect(typeWarning?.severity).toBe("warning");
  });

  it("danger level without requiresConfirm triggers safety/confirm-danger error", () => {
    const tool = makeToolSpec({
      safety: { level: "danger", requiresConfirm: false },
    });
    const [result] = lintTools([tool]);
    const rules = result.warnings.map((w) => w.rule);
    expect(rules).toContain("safety/confirm-danger");
    const dangerWarning = result.warnings.find(
      (w) => w.rule === "safety/confirm-danger"
    );
    expect(dangerWarning?.severity).toBe("error");
  });

  it("write-sounding name with read safety triggers safety/possible-write warning", () => {
    const tool = makeToolSpec({
      name: "example_create_order",
      safety: { level: "read", requiresConfirm: false },
    });
    const [result] = lintTools([tool]);
    const rules = result.warnings.map((w) => w.rule);
    expect(rules).toContain("safety/possible-write");
    const possibleWrite = result.warnings.find(
      (w) => w.rule === "safety/possible-write"
    );
    expect(possibleWrite?.severity).toBe("warning");
  });

  it("more than 10 params triggers design/too-many-params warning", () => {
    const properties: Record<string, import("../types.js").JsonSchema> = {};
    for (let i = 1; i <= 11; i++) {
      properties[`param${i}`] = { type: "string" as const, description: `Param ${i}` };
    }
    const tool = makeToolSpec({
      inputSchema: { type: "object", properties, required: ["param1"] },
    });
    const [result] = lintTools([tool]);
    const rules = result.warnings.map((w) => w.rule);
    expect(rules).toContain("design/too-many-params");
    const tooManyWarning = result.warnings.find(
      (w) => w.rule === "design/too-many-params"
    );
    expect(tooManyWarning?.severity).toBe("warning");
  });

  it("enum with more than 20 options triggers design/large-enum info", () => {
    const enumValues = Array.from({ length: 21 }, (_, i) => `option${i}`);
    const tool = makeToolSpec({
      inputSchema: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Category",
            enum: enumValues,
          },
        },
        required: ["category"],
      },
    });
    const [result] = lintTools([tool]);
    const rules = result.warnings.map((w) => w.rule);
    expect(rules).toContain("design/large-enum");
    const largeEnum = result.warnings.find(
      (w) => w.rule === "design/large-enum"
    );
    expect(largeEnum?.severity).toBe("info");
  });
});

describe("lintSummary", () => {
  it("counts totals correctly across multiple tools and severities", () => {
    // Tool 1: danger without confirm → 1 error
    const tool1 = makeToolSpec({
      name: "example_delete_account",
      safety: { level: "danger", requiresConfirm: false },
    });
    // Tool 2: valid tool → 0 errors (may have info from description/verb)
    const tool2 = makeToolSpec();

    const results = lintTools([tool1, tool2]);
    const summary = lintSummary(results);

    expect(summary.totalTools).toBe(2);
    expect(summary.errors).toBeGreaterThanOrEqual(1);
    expect(summary.totalWarnings).toBe(
      summary.errors + summary.warnings + summary.info
    );
  });

  it("returns zero counts for a list of valid tools", () => {
    const tool = makeToolSpec({
      description: "Search products by keyword on example.com.",
    });
    const results = lintTools([tool]);
    const summary = lintSummary(results);

    expect(summary.totalTools).toBe(1);
    expect(summary.errors).toBe(0);
  });

  it("counts empty list correctly", () => {
    const summary = lintSummary([]);
    expect(summary.totalTools).toBe(0);
    expect(summary.totalWarnings).toBe(0);
    expect(summary.errors).toBe(0);
    expect(summary.warnings).toBe(0);
    expect(summary.info).toBe(0);
  });
});
