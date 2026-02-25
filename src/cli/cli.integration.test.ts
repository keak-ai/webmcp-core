import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";

const execFileAsync = promisify(execFile);

const PROJECT_ROOT = join(import.meta.dirname, "../..");
const BIN = join(PROJECT_ROOT, "bin/webmcp.mjs");
const NODE = process.execPath;

async function runCli(
  args: string[],
  options: { cwd?: string; env?: Record<string, string> } = {}
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const { stdout, stderr } = await execFileAsync(NODE, [BIN, ...args], {
      cwd: options.cwd ?? PROJECT_ROOT,
      env: { ...process.env, ...options.env, NO_COLOR: "1", FORCE_COLOR: "0" },
      timeout: 15000,
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (err: any) {
    return {
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? "",
      exitCode: err.code ?? 1,
    };
  }
}

describe("CLI: help and version", () => {
  it("--help shows usage info", async () => {
    const { stdout, exitCode } = await runCli(["--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("webmcp");
    expect(stdout).toContain("Commands");
    expect(stdout).toContain("generate");
    expect(stdout).toContain("scan");
    expect(stdout).toContain("export");
    expect(stdout).toContain("simulate");
  });

  it("-h shows usage info", async () => {
    const { stdout, exitCode } = await runCli(["-h"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("webmcp");
  });

  it("help command shows usage info", async () => {
    const { stdout, exitCode } = await runCli(["help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Commands");
  });

  it("no arguments shows usage info", async () => {
    const { stdout, exitCode } = await runCli([]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("webmcp");
  });

  it("--version shows version number", async () => {
    const { stdout, exitCode } = await runCli(["--version"]);
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("-v shows version number", async () => {
    const { stdout, exitCode } = await runCli(["-v"]);
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("version matches package.json", async () => {
    const pkg = JSON.parse(readFileSync(join(PROJECT_ROOT, "package.json"), "utf-8"));
    const { stdout } = await runCli(["--version"]);
    expect(stdout.trim()).toBe(pkg.version);
  });
});

describe("CLI: unknown command", () => {
  it("exits with error for unknown command", async () => {
    const { stderr, stdout, exitCode } = await runCli(["foobar"]);
    expect(exitCode).not.toBe(0);
    const output = stderr + stdout;
    expect(output).toContain("Unknown command");
    expect(output).toContain("foobar");
  });
});

describe("CLI: subcommand --help", () => {
  it("generate --help shows subcommand help", async () => {
    const { stdout, exitCode } = await runCli(["generate", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("generate");
    expect(stdout).toContain("url");
  });

  it("scan --help shows subcommand help", async () => {
    const { stdout, exitCode } = await runCli(["scan", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("scan");
  });

  it("export --help shows subcommand help", async () => {
    const { stdout, exitCode } = await runCli(["export", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("export");
  });

  it("simulate --help shows subcommand help", async () => {
    const { stdout, exitCode } = await runCli(["simulate", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("simulate");
  });
});

describe("CLI: error handling", () => {
  it("generate without URL exits with error", async () => {
    const { exitCode, stdout, stderr } = await runCli(["generate"], {
      cwd: tmpdir(),
    });
    expect(exitCode).not.toBe(0);
    const output = stdout + stderr;
    expect(output).toContain("No URL");
  });

  it("scan without URL exits with error", async () => {
    const { exitCode, stdout, stderr } = await runCli(["scan"], {
      cwd: tmpdir(),
    });
    expect(exitCode).not.toBe(0);
    const output = stdout + stderr;
    expect(output).toContain("No URL");
  });

  it("export without scan data exits with error", async () => {
    const tempDir = join(tmpdir(), `webmcp-cli-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });

    try {
      const { exitCode, stdout, stderr } = await runCli(["export"], {
        cwd: tempDir,
      });
      expect(exitCode).not.toBe(0);
      const output = stdout + stderr;
      expect(output).toContain("not found");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("simulate without prompt exits with error", async () => {
    const { exitCode, stdout, stderr } = await runCli(["simulate"]);
    expect(exitCode).not.toBe(0);
    const output = stdout + stderr;
    expect(output).toContain("No prompt");
  });

  it("simulate without API key exits with error", async () => {
    const cleanEnv: Record<string, string> = {};
    for (const k of [
      "WEBMCP_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY",
      "GOOGLE_API_KEY", "GEMINI_API_KEY", "MISTRAL_API_KEY",
      "GROQ_API_KEY", "XAI_API_KEY", "DEEPSEEK_API_KEY",
    ]) {
      cleanEnv[k] = "";
    }

    const { exitCode, stdout, stderr } = await runCli(
      ["simulate", "test prompt"],
      { env: cleanEnv }
    );
    expect(exitCode).not.toBe(0);
    const output = stdout + stderr;
    expect(output).toContain("API key");
  });
});

describe("CLI: export from scan data", () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = join(tmpdir(), `webmcp-export-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });

    // Create fake scan data with a form
    const scanData = {
      pages: [
        {
          url: "https://example.com",
          title: "Example",
          forms: [
            {
              selector: "form#search",
              fields: [
                { name: "q", type: "string", required: true, label: "Search" },
              ],
              labels: ["Search"],
              submitSelector: "button[type=submit]",
            },
          ],
          buttons: [],
          links: [],
          timestamp: "2025-01-01T00:00:00.000Z",
        },
      ],
      networkCalls: [],
      actions: [],
      metadata: {
        baseUrl: "https://example.com",
        startedAt: "2025-01-01T00:00:00.000Z",
        completedAt: "2025-01-01T00:01:00.000Z",
        pagesVisited: 1,
        depth: 2,
      },
    };

    mkdirSync(join(tempDir, ".webmcp"), { recursive: true });
    writeFileSync(
      join(tempDir, ".webmcp", "scan.json"),
      JSON.stringify(scanData, null, 2),
      "utf-8"
    );
  });

  afterAll(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("export reads scan data and produces manifest", async () => {
    const outDir = join(tempDir, "out-manifest");
    const { exitCode, stdout, stderr } = await runCli(
      ["export", "--format", "manifest", "--output", outDir],
      { cwd: tempDir }
    );
    expect(exitCode).toBe(0);

    const manifestPath = join(outDir, "webmcp.manifest.json");
    expect(existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    expect(manifest.version).toBe("1.0.0");
    expect(manifest.domain).toBe("example.com");
    expect(manifest.tools.length).toBeGreaterThan(0);
  });

  it("export produces yaml format", async () => {
    const outDir = join(tempDir, "out-yaml");
    const { exitCode } = await runCli(
      ["export", "--format", "yaml", "--output", outDir],
      { cwd: tempDir }
    );
    expect(exitCode).toBe(0);
    expect(existsSync(join(outDir, "webmcp.tools.yaml"))).toBe(true);
  });

  it("export produces snippet format (default)", async () => {
    const outDir = join(tempDir, "out-snippet");
    const { exitCode } = await runCli(
      ["export", "--output", outDir],
      { cwd: tempDir }
    );
    expect(exitCode).toBe(0);

    const files = ["webmcp.tools.ts"];
    for (const f of files) {
      expect(existsSync(join(outDir, f))).toBe(true);
    }
  });

  it("export produces js snippet when --lang=js", async () => {
    const outDir = join(tempDir, "out-js");
    const { exitCode } = await runCli(
      ["export", "--lang", "js", "--output", outDir],
      { cwd: tempDir }
    );
    expect(exitCode).toBe(0);
    expect(existsSync(join(outDir, "webmcp.tools.js"))).toBe(true);
  });

  it("export produces react-hook format", async () => {
    const outDir = join(tempDir, "out-react");
    const { exitCode } = await runCli(
      ["export", "--format", "react-hook", "--output", outDir],
      { cwd: tempDir }
    );
    expect(exitCode).toBe(0);
    expect(existsSync(join(outDir, "webmcp.hooks.tsx"))).toBe(true);
  });

  it("export produces html-embed format", async () => {
    const outDir = join(tempDir, "out-html");
    const { exitCode } = await runCli(
      ["export", "--format", "html-embed", "--output", outDir],
      { cwd: tempDir }
    );
    expect(exitCode).toBe(0);
    expect(existsSync(join(outDir, "webmcp.embed.html"))).toBe(true);
  });

  it("export produces userscript format", async () => {
    const outDir = join(tempDir, "out-userscript");
    const { exitCode } = await runCli(
      ["export", "--format", "userscript", "--output", outDir],
      { cwd: tempDir }
    );
    expect(exitCode).toBe(0);

    // Userscript filenames include the domain
    const files = require("node:fs").readdirSync(outDir) as string[];
    const userscriptFile = files.find((f: string) => f.endsWith(".user.js"));
    expect(userscriptFile).toBeTruthy();
  });

  it("export from explicit scan file path", async () => {
    const outDir = join(tempDir, "out-explicit");
    const scanPath = join(tempDir, ".webmcp", "scan.json");
    const { exitCode } = await runCli(
      ["export", scanPath, "--format", "manifest", "--output", outDir],
      { cwd: tempDir }
    );
    expect(exitCode).toBe(0);
    expect(existsSync(join(outDir, "webmcp.manifest.json"))).toBe(true);
  });
});
