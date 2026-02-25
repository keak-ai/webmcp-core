import type { ToolSpec, ExportResult, ExportFile } from "../types.js";

export interface ManifestOptions {
  domain: string;
}

export function generateManifest(
  tools: ToolSpec[],
  options: ManifestOptions
): ExportResult {
  const manifest = {
    version: "1.0.0",
    domain: options.domain,
    generatedAt: new Date().toISOString(),
    generatedBy: "webmcp-autogen",
    toolCount: tools.length,
    tools: tools.map((tool) => ({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      outputSchema: tool.outputSchema || null,
      safety: tool.safety,
      availability: tool.availability,
      implementation: {
        kind: tool.implementation.kind,
        form: tool.implementation.form || null,
      },
      provenance: tool.provenance,
    })),
  };

  const files: ExportFile[] = [
    {
      name: "webmcp.manifest.json",
      content: JSON.stringify(manifest, null, 2) + "\n",
      language: "json",
    },
  ];

  return { files, target: "manifest" };
}
