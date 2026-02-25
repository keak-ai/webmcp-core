import { v4 as uuid } from "uuid";
import type { ApiCallAction, DomSnapshot, NetworkCall } from "../types.js";

const BLOCKED_DOMAINS = [
  "accounts.google.com",
  "adnxs.com",
  "adsrvr.org",
  "akamai.net",
  "akamaihd.net",
  "akamaized.net",
  "algolia.io",
  "algolia.net",
  "algolianet.com",
  "amplitude.com",
  "analytics.google.com",
  "auth0.com",
  "bugsnag.com",
  "calendly.com",
  "cdnjs.cloudflare.com",
  "clarity.ms",
  "clerk.com",
  "clerk.dev",
  "cloudflare-dns.com",
  "cloudflare.com",
  "cloudfront.net",
  "crisp.chat",
  "criteo.com",
  "criteo.net",
  "datadog-agent",
  "datadoghq.com",
  "doubleclick.net",
  "drift.com",
  "driftt.com",
  "facebook.com",
  "facebook.net",
  "fastly.net",
  "fbcdn.net",
  "firebase.googleapis.com",
  "firebaseapp.com",
  "fontawesome.com",
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "fullstory.com",
  "google-analytics.com",
  "googleapis.com",
  "googleadservices.com",
  "googlesyndication.com",
  "googletagmanager.com",
  "googlevideo.com",
  "gotolstoy.com",
  "gtag",
  "gtm.js",
  "heap.io",
  "heapanalytics.com",
  "hotjar.com",
  "hotjar.io",
  "hsforms.com",
  "hubspot.com",
  "hubspot.net",
  "intercom.com",
  "intercom.io",
  "intercomcdn.com",
  "jsdelivr.net",
  "linkedin.com",
  "logrocket.com",
  "logrocket.io",
  "mapbox.com",
  "maps.google.com",
  "maps.googleapis.com",
  "meilisearch.com",
  "mixpanel.com",
  "newrelic.com",
  "nr-data.net",
  "outbrain.com",
  "pinterest.com",
  "posthog.com",
  "raygun.com",
  "rollbar.com",
  "salesforce.com",
  "segment.com",
  "segment.io",
  "cdn.segment.com",
  "sentry-cdn.com",
  "sentry.io",
  "supabase.co",
  "taboola.com",
  "trackjs.com",
  "twitter.com",
  "typeform.com",
  "typekit.com",
  "typesense.org",
  "unpkg.com",
  "use.typekit.net",
  "vidyard.com",
  "vimeo.com",
  "vimeocdn.com",
  "wistia.com",
  "wistia.net",
  "x.com",
  "youtu.be",
  "youtube-nocookie.com",
  "youtube.com",
  "ytimg.com",
  "zdassets.com",
  "zendesk.com",
];

const BLOCKED_URL_PATTERNS = [
  /\/analytics/i,
  /\/tracking/i,
  /\/pixel/i,
  /\/beacon/i,
  /\/telemetry/i,
  /\/collect\b/i,
  /\/events?\//i,
  /\/__analytics/i,
  /\/log\b/i,
];

const STATIC_PATHS = [
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.json",
  "/sw.js",
  "/service-worker.js",
];

const FRAMEWORK_PREFIXES = [
  "/_next/",
  "/__nextjs_",
  "/_nuxt/",
  "/__webpack_",
  "/hot-update",
  "/.well-known/",
];

export function extractApiCalls(
  networkCalls: NetworkCall[],
  pages: DomSnapshot[],
  baseUrl: string
): ApiCallAction[] {
  const actions: ApiCallAction[] = [];
  const baseHost = getHostname(baseUrl);

  const relevantCalls = networkCalls.filter((call) => {
    if (!isSameSite(call.url, baseHost)) return false;
    if (isNoiseCall(call)) return false;
    if (isStaticPath(call.url)) return false;
    if (isRedirectOrEmpty(call)) return false;
    return true;
  });

  const grouped = groupByEndpoint(relevantCalls);

  for (const [key, calls] of grouped) {
    const representative = calls[0];

    if (isPageNavigation(representative, pages)) continue;

    const pageUrl = findPageContext(representative, pages);

    actions.push({
      kind: "api_call",
      id: uuid(),
      pageUrl: pageUrl || representative.url,
      request: representative,
      labels: buildLabels(representative),
    });
  }

  return actions;
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

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

function isNoiseCall(call: NetworkCall): boolean {
  const url = call.url.toLowerCase();

  if (BLOCKED_DOMAINS.some((d) => url.includes(d))) return true;
  if (BLOCKED_URL_PATTERNS.some((p) => p.test(url))) return true;

  return false;
}

function isStaticPath(url: string): boolean {
  try {
    const path = new URL(url).pathname.toLowerCase();
    if (STATIC_PATHS.includes(path)) return true;
    if (FRAMEWORK_PREFIXES.some((p) => path.startsWith(p))) return true;
    return false;
  } catch {
    return false;
  }
}

function isRedirectOrEmpty(call: NetworkCall): boolean {
  if (!call.status) return false;
  if (call.status >= 300 && call.status < 400) return true;
  if (call.status === 204) return true;
  return false;
}

function groupByEndpoint(
  calls: NetworkCall[]
): Map<string, NetworkCall[]> {
  const map = new Map<string, NetworkCall[]>();

  for (const call of calls) {
    try {
      const parsed = new URL(call.url);
      const key = `${call.method}:${parsed.pathname}`;

      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(call);
    } catch {
      // Invalid URL, skip
    }
  }

  return map;
}

function isPageNavigation(call: NetworkCall, pages: DomSnapshot[]): boolean {
  if (call.method !== "GET") return false;
  return pages.some((p) => {
    try {
      return new URL(p.url).pathname === new URL(call.url).pathname;
    } catch {
      return false;
    }
  });
}

function findPageContext(
  call: NetworkCall,
  pages: DomSnapshot[]
): string | undefined {
  try {
    const callOrigin = new URL(call.url).origin;
    const matchingPage = pages.find((p) => {
      try {
        return new URL(p.url).origin === callOrigin;
      } catch {
        return false;
      }
    });
    return matchingPage?.url;
  } catch {
    return undefined;
  }
}

function buildLabels(call: NetworkCall): string[] {
  const labels: string[] = [];

  try {
    const parsed = new URL(call.url);
    labels.push(`${call.method} ${parsed.pathname}`);
  } catch {
    labels.push(`${call.method} ${call.url}`);
  }

  if (call.operationName) {
    labels.push(call.operationName);
  }

  return labels;
}
