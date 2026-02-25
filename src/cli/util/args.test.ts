import { describe, it, expect } from "vitest";
import { parseCommandArgs, GLOBAL_OPTIONS } from "./args.js";

describe("parseCommandArgs", () => {
  it("parses --format flag", () => {
    const { values } = parseCommandArgs(["--format", "manifest"]);
    expect(values.format).toBe("manifest");
  });

  it("parses -f short flag for format", () => {
    const { values } = parseCommandArgs(["-f", "yaml"]);
    expect(values.format).toBe("yaml");
  });

  it("parses --output flag", () => {
    const { values } = parseCommandArgs(["--output", "./out"]);
    expect(values.output).toBe("./out");
  });

  it("parses --api-key flag", () => {
    const { values } = parseCommandArgs(["--api-key", "sk-test"]);
    expect(values["api-key"]).toBe("sk-test");
  });

  it("parses --depth flag as string", () => {
    const { values } = parseCommandArgs(["--depth", "3"]);
    expect(values.depth).toBe("3");
  });

  it("parses --headless boolean flag", () => {
    const { values } = parseCommandArgs(["--headless"]);
    expect(values.headless).toBe(true);
  });

  it("parses --lang flag", () => {
    const { values } = parseCommandArgs(["--lang", "js"]);
    expect(values.lang).toBe("js");
  });

  it("parses --cookie flag", () => {
    const { values } = parseCommandArgs(["--cookie", "session=abc"]);
    expect(values.cookie).toBe("session=abc");
  });

  it("parses --min-confidence flag", () => {
    const { values } = parseCommandArgs(["--min-confidence", "0.8"]);
    expect(values["min-confidence"]).toBe("0.8");
  });

  it("parses --verbose boolean flag", () => {
    const { values } = parseCommandArgs(["--verbose"]);
    expect(values.verbose).toBe(true);
  });

  it("collects positionals", () => {
    const { positionals } = parseCommandArgs(["https://example.com", "--format", "yaml"]);
    expect(positionals).toContain("https://example.com");
  });

  it("allows extra options via second argument", () => {
    const { values } = parseCommandArgs(["--custom", "val"], {
      custom: { type: "string" },
    });
    expect(values.custom).toBe("val");
  });

  it("returns empty values with no args", () => {
    const { values, positionals } = parseCommandArgs([]);
    expect(positionals).toEqual([]);
    expect(values.format).toBeUndefined();
  });
});

describe("GLOBAL_OPTIONS", () => {
  it("defines expected option keys", () => {
    const keys = Object.keys(GLOBAL_OPTIONS!);
    expect(keys).toContain("format");
    expect(keys).toContain("output");
    expect(keys).toContain("api-key");
    expect(keys).toContain("provider");
    expect(keys).toContain("model");
    expect(keys).toContain("depth");
    expect(keys).toContain("headless");
    expect(keys).toContain("help");
    expect(keys).toContain("version");
    expect(keys).toContain("lang");
    expect(keys).toContain("cookie");
    expect(keys).toContain("timeout");
    expect(keys).toContain("min-confidence");
    expect(keys).toContain("verbose");
  });
});
