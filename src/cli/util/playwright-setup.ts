import { execSync } from "node:child_process";
import chalk from "chalk";
import { select } from "@inquirer/prompts";
import { log } from "../ui/logger.js";

/**
 * Checks if Playwright is importable and browser binaries are available.
 * If not, prompts the user to install interactively.
 *
 * Returns true if ready to scan, false if user cancelled.
 */
export async function ensurePlaywright(): Promise<boolean> {
  // Step 1: Check if playwright module is importable
  const moduleAvailable = await isPlaywrightModuleAvailable();

  if (!moduleAvailable) {
    log.blank();
    log.warn("Playwright is required for scanning but is not installed.");
    log.blank();

    const choice = await select({
      message: "How would you like to install Playwright?",
      choices: [
        {
          name: `${chalk.bold("playwright")} — includes Chromium binaries (recommended)`,
          value: "playwright" as const,
        },
        {
          name: `${chalk.bold("playwright-core")} — lightweight, bring your own browser`,
          value: "playwright-core" as const,
        },
        {
          name: "Cancel",
          value: "cancel" as const,
        },
      ],
    });

    if (choice === "cancel") {
      return false;
    }

    log.blank();
    const installSpinner = (await import("../ui/spinner.js")).createSpinner(
      `Installing ${chalk.cyan(choice)}...`
    );
    installSpinner.start();

    try {
      execSync(`npm install ${choice}`, {
        stdio: "pipe",
        timeout: 120_000,
      });
      installSpinner.succeed(`Installed ${chalk.cyan(choice)}`);
    } catch (err) {
      installSpinner.fail(`Failed to install ${choice}`);
      log.error(
        err instanceof Error ? err.message : "Installation failed."
      );
      return false;
    }

    // If they chose playwright (not playwright-core), install browser binaries
    if (choice === "playwright") {
      const browserSpinner = (
        await import("../ui/spinner.js")
      ).createSpinner("Installing Chromium browser...");
      browserSpinner.start();

      try {
        execSync("npx playwright install chromium", {
          stdio: "pipe",
          timeout: 300_000,
        });
        browserSpinner.succeed("Chromium browser installed");
      } catch {
        browserSpinner.fail("Failed to install Chromium");
        log.error("Run manually: npx playwright install chromium");
        return false;
      }
    }

    log.blank();
    return true;
  }

  // Step 2: Module is available, check if browser binaries work
  const browserAvailable = await isPlaywrightBrowserAvailable();
  if (!browserAvailable) {
    log.blank();
    log.warn(
      "Playwright is installed but Chromium browser binaries are missing."
    );
    log.blank();

    const choice = await select({
      message: "Install Chromium browser binaries now?",
      choices: [
        {
          name: `${chalk.bold("Yes")} — run ${chalk.cyan("npx playwright install chromium")}`,
          value: "install" as const,
        },
        {
          name: "Cancel",
          value: "cancel" as const,
        },
      ],
    });

    if (choice === "cancel") {
      return false;
    }

    log.blank();
    const browserSpinner = (
      await import("../ui/spinner.js")
    ).createSpinner("Installing Chromium browser...");
    browserSpinner.start();

    try {
      execSync("npx playwright install chromium", {
        stdio: "pipe",
        timeout: 300_000,
      });
      browserSpinner.succeed("Chromium browser installed");
    } catch {
      browserSpinner.fail("Failed to install Chromium");
      log.error("Run manually: npx playwright install chromium");
      return false;
    }

    log.blank();
  }

  return true;
}

async function isPlaywrightModuleAvailable(): Promise<boolean> {
  try {
    await import("playwright-core");
    return true;
  } catch {
    try {
      const playwrightPkg = "playwright";
      await import(playwrightPkg);
      return true;
    } catch {
      return false;
    }
  }
}

async function isPlaywrightBrowserAvailable(): Promise<boolean> {
  try {
    // Try to get the executable path without launching — if binaries
    // are missing, Playwright throws at launch time. We do a quick
    // check by seeing if chromium.executablePath() exists.
    let pw: typeof import("playwright-core");
    try {
      pw = await import("playwright-core");
    } catch {
      const playwrightPkg = "playwright";
      pw = (await import(playwrightPkg)) as typeof import("playwright-core");
    }

    // executablePath() returns the path even if the binary doesn't exist
    // on disk, so we try a real launch with a quick timeout.
    const browser = await pw.chromium.launch({ headless: true });
    await browser.close();
    return true;
  } catch {
    return false;
  }
}
