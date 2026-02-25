import type { Page } from "playwright-core";

export async function captureScreenshot(
  page: Page,
  outputPath: string
): Promise<void> {
  await page.screenshot({
    path: outputPath,
    fullPage: true,
  });
}
