import type { Page } from "playwright-core";

export interface CrawlOptions {
  depth: number;
  timeout: number;
  ignoreSelectors: string[];
}

export interface PageVisit {
  url: string;
  depth: number;
}

export async function* crawlSite(
  page: Page,
  startUrl: string,
  options: CrawlOptions
): AsyncGenerator<PageVisit> {
  const visited = new Set<string>();
  const queue: Array<{ url: string; depth: number }> = [
    { url: normalizeUrl(startUrl), depth: 0 },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const normalized = normalizeUrl(current.url);

    if (visited.has(normalized)) continue;
    if (current.depth > options.depth) continue;

    visited.add(normalized);

    try {
      await page.goto(current.url, {
        waitUntil: "domcontentloaded",
        timeout: options.timeout,
      });

      await page.waitForLoadState("load").catch(() => {});
      await page.waitForTimeout(2000);

      yield { url: current.url, depth: current.depth };

      if (current.depth < options.depth) {
        const links = await discoverInternalLinks(page, startUrl, options.ignoreSelectors);

        for (const link of links) {
          const normalizedLink = normalizeUrl(link);
          if (!visited.has(normalizedLink)) {
            queue.push({ url: link, depth: current.depth + 1 });
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`  Warning: Failed to load ${current.url}: ${message}`);
    }
  }
}

async function discoverInternalLinks(
  page: Page,
  baseUrl: string,
  ignoreSelectors: string[]
): Promise<string[]> {
  const baseOrigin = new URL(baseUrl).origin;
  const ignoreSelectorsStr = JSON.stringify(ignoreSelectors);

  return page.evaluate(
    ({ origin, ignoreArr }) => {
      const links: string[] = [];
      const anchors = document.querySelectorAll("a[href]");

      for (const anchor of anchors) {
        const shouldIgnore = ignoreArr.some((sel: string) => anchor.matches(sel));
        if (shouldIgnore) continue;

        const href = (anchor as HTMLAnchorElement).href;
        try {
          const url = new URL(href);
          if (url.origin === origin && !url.hash) {
            links.push(url.href);
          }
        } catch {
          // Invalid URL, skip
        }
      }

      return [...new Set(links)];
    },
    { origin: baseOrigin, ignoreArr: JSON.parse(ignoreSelectorsStr) }
  );
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
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
