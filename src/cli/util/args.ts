import { parseArgs, type ParseArgsConfig } from "node:util";

export const GLOBAL_OPTIONS: ParseArgsConfig["options"] = {
  format:            { type: "string",  short: "f" },
  output:            { type: "string",  short: "o" },
  "api-key":         { type: "string" },
  provider:          { type: "string",  short: "p" },
  model:             { type: "string",  short: "m" },
  depth:             { type: "string",  short: "d" },
  headless:          { type: "boolean" },
  help:              { type: "boolean", short: "h" },
  version:           { type: "boolean", short: "v" },
  lang:              { type: "string",  short: "l" },
  force:             { type: "boolean" },
  cookie:            { type: "string" },
  timeout:           { type: "string",  short: "t" },
  "min-confidence":  { type: "string" },
  verbose:           { type: "boolean" },
};

export function parseCommandArgs(
  args: string[],
  extra?: ParseArgsConfig["options"]
) {
  return parseArgs({
    args,
    options: { ...GLOBAL_OPTIONS, ...extra },
    allowPositionals: true,
    strict: false,
  });
}
