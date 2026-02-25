import { describe, it, expect, beforeEach } from "vitest";
import { extractRouteChanges } from "./route-extractor.js";
import {
  makeDomSnapshot,
  makeDomLink,
  resetIdCounter,
} from "../__fixtures__/index.js";

beforeEach(() => {
  resetIdCounter();
});

describe("extractRouteChanges", () => {
  it("extracts an internal link", () => {
    const link = makeDomLink({
      selector: "a#nav-products",
      text: "Products",
      href: "https://example.com/products",
      isInternal: true,
    });
    const page = makeDomSnapshot({ url: "https://example.com", links: [link] });

    const result = extractRouteChanges([page]);

    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe("route_change");
    expect(result[0].from).toBe("https://example.com");
    expect(result[0].to).toBe("https://example.com/products");
    expect(result[0].trigger).toBe("a#nav-products");
    expect(result[0].labels).toContain("Products");
  });

  it("skips external links (isInternal: false)", () => {
    const link = makeDomLink({
      text: "Visit Partner",
      href: "https://other.com/partner",
      isInternal: false,
    });
    const page = makeDomSnapshot({ links: [link] });

    const result = extractRouteChanges([page]);

    expect(result).toHaveLength(0);
  });

  it("filters noise link text 'Login'", () => {
    const link = makeDomLink({ text: "Login", href: "https://example.com/auth", isInternal: true });
    const page = makeDomSnapshot({ links: [link] });

    const result = extractRouteChanges([page]);

    expect(result).toHaveLength(0);
  });

  it("filters noise link text 'Terms'", () => {
    const link = makeDomLink({ text: "Terms", href: "https://example.com/terms", isInternal: true });
    const page = makeDomSnapshot({ links: [link] });

    const result = extractRouteChanges([page]);

    expect(result).toHaveLength(0);
  });

  it("filters noise link text 'Privacy Policy'", () => {
    const link = makeDomLink({ text: "Privacy Policy", href: "https://example.com/privacy", isInternal: true });
    const page = makeDomSnapshot({ links: [link] });

    const result = extractRouteChanges([page]);

    expect(result).toHaveLength(0);
  });

  it("filters noise link text 'Sign Up'", () => {
    const link = makeDomLink({ text: "sign up", href: "https://example.com/signup", isInternal: true });
    const page = makeDomSnapshot({ links: [link] });

    const result = extractRouteChanges([page]);

    expect(result).toHaveLength(0);
  });

  it("filters noise href starting with mailto:", () => {
    const link = makeDomLink({
      text: "Email Us",
      href: "mailto:hello@example.com",
      isInternal: true,
    });
    const page = makeDomSnapshot({ links: [link] });

    const result = extractRouteChanges([page]);

    expect(result).toHaveLength(0);
  });

  it("filters noise href starting with tel:", () => {
    const link = makeDomLink({
      text: "Call Us",
      href: "tel:+15550001234",
      isInternal: true,
    });
    const page = makeDomSnapshot({ links: [link] });

    const result = extractRouteChanges([page]);

    expect(result).toHaveLength(0);
  });

  it("filters noise href starting with javascript:", () => {
    const link = makeDomLink({
      text: "Do Something",
      href: "javascript:void(0)",
      isInternal: true,
    });
    const page = makeDomSnapshot({ links: [link] });

    const result = extractRouteChanges([page]);

    expect(result).toHaveLength(0);
  });

  it("filters noise href /login", () => {
    const link = makeDomLink({
      text: "Go to Login",
      href: "https://example.com/login",
      isInternal: true,
    });
    const page = makeDomSnapshot({ url: "https://example.com", links: [link] });

    const result = extractRouteChanges([page]);

    expect(result).toHaveLength(0);
  });

  it("filters noise href /privacy", () => {
    const link = makeDomLink({
      text: "Our Policy",
      href: "https://example.com/privacy",
      isInternal: true,
    });
    const page = makeDomSnapshot({ url: "https://example.com", links: [link] });

    const result = extractRouteChanges([page]);

    expect(result).toHaveLength(0);
  });

  it("deduplicates links pointing to the same normalized URL", () => {
    const link1 = makeDomLink({
      selector: "a#nav-1",
      text: "Products",
      href: "https://example.com/products",
      isInternal: true,
    });
    const link2 = makeDomLink({
      selector: "a#nav-2",
      text: "Products",
      href: "https://example.com/products",
      isInternal: true,
    });
    const page = makeDomSnapshot({ url: "https://example.com", links: [link1, link2] });

    const result = extractRouteChanges([page]);

    expect(result).toHaveLength(1);
    expect(result[0].trigger).toBe("a#nav-1");
  });

  it("strips query params for deduplication (same path, different queries → one action)", () => {
    const link1 = makeDomLink({
      selector: "a#l1",
      text: "Products",
      href: "https://example.com/products?sort=asc",
      isInternal: true,
    });
    const link2 = makeDomLink({
      selector: "a#l2",
      text: "Products",
      href: "https://example.com/products?sort=desc",
      isInternal: true,
    });
    const page = makeDomSnapshot({ url: "https://example.com", links: [link1, link2] });

    const result = extractRouteChanges([page]);

    expect(result).toHaveLength(1);
  });

  it("strips hash for deduplication (same path, different hashes → one action)", () => {
    const link1 = makeDomLink({
      selector: "a#l1",
      text: "Features",
      href: "https://example.com/features#section-a",
      isInternal: true,
    });
    const link2 = makeDomLink({
      selector: "a#l2",
      text: "Features",
      href: "https://example.com/features#section-b",
      isInternal: true,
    });
    const page = makeDomSnapshot({ url: "https://example.com", links: [link1, link2] });

    const result = extractRouteChanges([page]);

    expect(result).toHaveLength(1);
  });

  it("skips hash-only links that point to the same page pathname", () => {
    const link = makeDomLink({
      text: "Jump to Section",
      href: "https://example.com/about#team",
      isInternal: true,
    });
    const page = makeDomSnapshot({ url: "https://example.com/about", links: [link] });

    const result = extractRouteChanges([page]);

    expect(result).toHaveLength(0);
  });

  it("skips a link pointing to the same page as the current page URL", () => {
    const link = makeDomLink({
      text: "Home",
      href: "https://example.com/",
      isInternal: true,
    });
    const page = makeDomSnapshot({ url: "https://example.com/", links: [link] });

    const result = extractRouteChanges([page]);

    expect(result).toHaveLength(0);
  });

  it("skips links with text shorter than 2 characters", () => {
    const link = makeDomLink({
      text: "A",
      href: "https://example.com/page",
      isInternal: true,
    });
    const page = makeDomSnapshot({ url: "https://example.com", links: [link] });

    const result = extractRouteChanges([page]);

    expect(result).toHaveLength(0);
  });

  it("uses aria-label as fallback when text is empty", () => {
    const link = makeDomLink({
      text: "",
      ariaLabel: "Go to About Us",
      href: "https://example.com/about",
      isInternal: true,
    });
    const page = makeDomSnapshot({ url: "https://example.com", links: [link] });

    const result = extractRouteChanges([page]);

    expect(result).toHaveLength(1);
    expect(result[0].labels).toContain("Go to About Us");
  });

  it("includes both text and aria-label in labels when both are present", () => {
    const link = makeDomLink({
      text: "About",
      ariaLabel: "About our company",
      href: "https://example.com/about",
      isInternal: true,
    });
    const page = makeDomSnapshot({ url: "https://example.com", links: [link] });

    const result = extractRouteChanges([page]);

    expect(result).toHaveLength(1);
    expect(result[0].labels).toContain("About");
    expect(result[0].labels).toContain("About our company");
  });

  it("returns empty array for empty pages array", () => {
    const result = extractRouteChanges([]);
    expect(result).toEqual([]);
  });

  it("deduplicates across multiple pages (global seenTargets set)", () => {
    const link = makeDomLink({
      text: "Pricing",
      href: "https://example.com/pricing",
      isInternal: true,
    });
    const page1 = makeDomSnapshot({ url: "https://example.com", links: [link] });
    const page2 = makeDomSnapshot({ url: "https://example.com/about", links: [link] });

    const result = extractRouteChanges([page1, page2]);

    // seenTargets is global across pages — same normalized URL only extracted once
    expect(result).toHaveLength(1);
  });

  it("generates unique IDs for each route change action", () => {
    const link1 = makeDomLink({
      selector: "a#l1",
      text: "Products",
      href: "https://example.com/products",
      isInternal: true,
    });
    const link2 = makeDomLink({
      selector: "a#l2",
      text: "About",
      href: "https://example.com/about",
      isInternal: true,
    });
    const page = makeDomSnapshot({ url: "https://example.com", links: [link1, link2] });

    const result = extractRouteChanges([page]);

    expect(result).toHaveLength(2);
    expect(result[0].id).not.toBe(result[1].id);
  });
});
