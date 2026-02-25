export interface BrowserConfig {
  executablePath?: string;
  headless?: boolean;
  userDataDir?: string;
  cookie?: string;
  args?: string[];
  /** CDP WebSocket URL to connect to an already-running browser (e.g., launched by Puppeteer). */
  cdpUrl?: string;
}

export interface BrowserSession {
  browser: { close(): Promise<void> };
  context: { newPage(): Promise<BrowserSession["page"]>; addCookies(cookies: Array<{ name: string; value: string; domain: string; path: string }>): Promise<void> };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Playwright Page, dynamically imported
  page: any;
}

export async function launchBrowser(
  config: BrowserConfig = {}
): Promise<BrowserSession> {
  let pw: typeof import("playwright-core");
  try {
    pw = await import("playwright-core");
  } catch {
    try {
      pw = await import("playwright") as typeof import("playwright-core");
    } catch {
      throw new Error(
        "Playwright is required for scanning. Install one of:\n" +
        "  npm install playwright-core   (lightweight, bring your own browser)\n" +
        "  npm install playwright         (includes browser binaries)"
      );
    }
  }

  let browser;
  let context;

  if (config.cdpUrl) {
    // Connect to an already-running browser via CDP (e.g., launched by Puppeteer on serverless)
    browser = await pw.chromium.connectOverCDP(config.cdpUrl);
    // Use existing context or create a new one
    const contexts = browser.contexts();
    context = contexts[0] || await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
    });
  } else {
    // Launch a new browser process
    const launchOptions: Record<string, unknown> = {
      headless: config.headless ?? false,
    };

    if (config.executablePath) {
      launchOptions.executablePath = config.executablePath;
    }

    if (config.args && config.args.length > 0) {
      launchOptions.args = config.args;
    }

    browser = await pw.chromium.launch(launchOptions);

    context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
    });
  }

  if (config.cookie) {
    const cookies = parseCookieString(config.cookie);
    if (cookies.length > 0) {
      await context.addCookies(cookies);
    }
  }

  const page = await context.newPage();

  return { browser, context, page } as BrowserSession;
}

function parseCookieString(
  cookieString: string
): Array<{ name: string; value: string; domain: string; path: string }> {
  return cookieString
    .split(";")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [name, ...rest] = pair.split("=");
      return {
        name: name.trim(),
        value: rest.join("=").trim(),
        domain: "",
        path: "/",
      };
    });
}
