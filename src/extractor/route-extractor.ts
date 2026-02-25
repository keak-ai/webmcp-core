import { v4 as uuid } from "uuid";
import type { RouteChangeAction, DomSnapshot } from "../types.js";

const NOISE_LINK_TEXTS = [
  "login", "log in", "logout", "log out",
  "signin", "sign in", "signout", "sign out",
  "signup", "sign up", "register",
  "terms", "terms of service", "terms of use", "terms & conditions",
  "privacy", "privacy policy",
  "cookie", "cookie policy", "cookie settings",
  "legal", "disclaimer",
  "sitemap", "site map",
  "rss", "feed", "atom",
  "skip to content", "skip navigation", "skip to main",
  "back", "go back", "return",
];

const NOISE_HREF_PATTERNS = [
  "mailto:", "tel:", "javascript:",
  "/login", "/logout", "/signin", "/signout",
  "/signup", "/register",
  "/terms", "/privacy", "/legal",
  "/cookie", "/sitemap",
  "/rss", "/feed",
  "/cdn-cgi/",
];

export function extractRouteChanges(
  pages: DomSnapshot[]
): RouteChangeAction[] {
  const actions: RouteChangeAction[] = [];
  const seenTargets = new Set<string>();

  for (const page of pages) {
    for (const link of page.links) {
      if (!link.isInternal) continue;

      if (link.href.includes("#") && new URL(link.href).pathname === new URL(page.url).pathname) continue;

      const label = link.text || link.ariaLabel || "";
      if (!label || label.length < 2) continue;

      if (isNoiseLink(label, link.href)) continue;

      const normalizedTarget = normalizeUrl(link.href);
      if (seenTargets.has(normalizedTarget)) continue;

      if (normalizedTarget === normalizeUrl(page.url)) continue;

      seenTargets.add(normalizedTarget);

      actions.push({
        kind: "route_change",
        id: uuid(),
        from: page.url,
        to: link.href,
        trigger: link.selector,
        labels: [link.text, link.ariaLabel].filter(
          (s): s is string => !!s && s.trim().length > 0
        ),
      });
    }
  }

  return actions;
}

function isNoiseLink(text: string, href: string): boolean {
  const normalizedText = text.toLowerCase().trim();
  const normalizedHref = href.toLowerCase();

  if (NOISE_LINK_TEXTS.includes(normalizedText)) return true;
  if (NOISE_HREF_PATTERNS.some((p) => normalizedHref.includes(p))) return true;

  return false;
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.search = "";
    let path = parsed.pathname;
    if (path.endsWith("/") && path !== "/") {
      path = path.slice(0, -1);
    }
    parsed.pathname = path;
    return parsed.toString();
  } catch {
    return url;
  }
}
