import { readFileSync } from "node:fs";
import { join } from "node:path";

let cached: string | undefined;

export function getVersion(): string {
  if (cached) return cached;

  // Walk up from dist/cli/util/ to find package.json
  let dir = __dirname;
  for (let i = 0; i < 5; i++) {
    try {
      const pkgPath = join(dir, "package.json");
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version: string };
      if (pkg.version) {
        cached = pkg.version;
        return cached;
      }
    } catch {
      // Not found at this level, go up
    }
    dir = join(dir, "..");
  }

  cached = "0.0.0";
  return cached;
}
