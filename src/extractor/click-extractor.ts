import { v4 as uuid } from "uuid";
import type { ClickFlowAction, DomSnapshot } from "../types.js";

const NOISE_BUTTONS = [
  "close", "dismiss", "cancel", "\u00d7", "\u2715", "\u2716",
  "menu", "toggle", "hamburger", "sidebar",
  "expand", "collapse", "more", "less", "show more", "show less",
  "cookie", "accept", "reject", "consent", "got it", "i agree",
  "ok", "okay", "yes", "no", "confirm",
  "share", "tweet", "like", "follow",
  "play", "pause", "mute", "unmute", "fullscreen",
  "scroll", "back to top", "top",
];

export function extractClickFlows(
  pages: DomSnapshot[]
): ClickFlowAction[] {
  const actions: ClickFlowAction[] = [];

  for (const page of pages) {
    const seenText = new Set<string>();

    for (const button of page.buttons) {
      if (button.isInsideForm) continue;

      const label = button.text || button.ariaLabel || "";
      if (!label || label.length < 2) continue;

      if (isNoiseButton(label)) continue;

      const normalizedText = label.toLowerCase().trim();
      if (seenText.has(normalizedText)) continue;
      seenText.add(normalizedText);

      actions.push({
        kind: "click_flow",
        id: uuid(),
        pageUrl: page.url,
        startSelector: button.selector,
        labels: [button.text, button.ariaLabel].filter(
          (s): s is string => !!s && s.trim().length > 0
        ),
        networkCalls: [],
      });
    }
  }

  return actions;
}

function isNoiseButton(text: string): boolean {
  const normalized = text.toLowerCase().trim();

  if (NOISE_BUTTONS.includes(normalized)) return true;

  // Single character buttons (x, arrows, etc.)
  if (normalized.length === 1) return true;

  return false;
}
