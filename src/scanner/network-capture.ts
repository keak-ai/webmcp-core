import type { Page, Request, Response } from "playwright-core";
import type { NetworkCall } from "../types.js";

export interface NetworkRecorder {
  getCalls(): NetworkCall[];
  stop(): void;
}

export function createNetworkRecorder(page: Page, baseUrl: string): NetworkRecorder {
  const calls: NetworkCall[] = [];
  let active = true;
  const baseHost = getBaseDomain(baseUrl);

  const onResponse = async (response: Response) => {
    if (!active) return;

    const request = response.request();
    const resourceType = request.resourceType();

    if (
      resourceType !== "fetch" &&
      resourceType !== "xhr" &&
      resourceType !== "document"
    ) {
      return;
    }

    const url = request.url();

    if (!isSameSite(url, baseHost)) return;

    if (isStaticResource(url)) return;

    const method = request.method() as NetworkCall["method"];
    const status = response.status();

    let requestBodySample: unknown = undefined;
    let responseBodySample: unknown = undefined;
    let operationName: string | undefined;
    let operationType: NetworkCall["operationType"] = undefined;

    try {
      const postData = request.postData();
      if (postData) {
        try {
          const parsed = JSON.parse(postData);
          requestBodySample = parsed;

          if (parsed.query && (parsed.operationName || parsed.variables !== undefined)) {
            operationName = parsed.operationName;
            operationType = parsed.query.trim().startsWith("mutation")
              ? "mutation"
              : "query";
          }
        } catch {
          requestBodySample = postData;
        }
      }
    } catch {
      // Request body not available
    }

    try {
      const contentType = response.headers()["content-type"] || "";
      if (contentType.includes("json")) {
        const body = await response.json();
        responseBodySample = body;
      }
    } catch {
      // Response body not available
    }

    calls.push({
      method,
      url,
      status,
      requestBodySample,
      responseBodySample,
      operationName,
      operationType,
    });
  };

  page.on("response", onResponse);

  return {
    getCalls: () => [...calls],
    stop: () => {
      active = false;
      page.off("response", onResponse);
    },
  };
}

function getBaseDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

// Matches exact hostname or any subdomain relationship
function isSameSite(requestUrl: string, baseHost: string): boolean {
  try {
    const callHost = new URL(requestUrl).hostname;
    return (
      callHost === baseHost ||
      callHost.endsWith("." + baseHost) ||
      baseHost.endsWith("." + callHost)
    );
  } catch {
    return false;
  }
}

function isStaticResource(url: string): boolean {
  const staticExtensions = [
    ".js", ".css", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico",
    ".woff", ".woff2", ".ttf", ".eot", ".map",
  ];
  try {
    const path = new URL(url).pathname.toLowerCase();
    return staticExtensions.some((ext) => path.endsWith(ext));
  } catch {
    return false;
  }
}
