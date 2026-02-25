import { describe, it, expect } from "vitest";
import { redact, isSensitiveFieldName } from "./redact.js";

describe("redact()", () => {
  it("returns null as-is", () => {
    expect(redact(null)).toBeNull();
  });

  it("returns undefined as-is", () => {
    expect(redact(undefined)).toBeUndefined();
  });

  it("returns short strings unchanged", () => {
    expect(redact("hello")).toBe("hello");
  });

  it("passes through numbers", () => {
    expect(redact(42)).toBe(42);
  });

  it("passes through booleans", () => {
    expect(redact(true)).toBe(true);
  });

  it("truncates strings longer than 200 characters", () => {
    const long = "a".repeat(201);
    const result = redact(long) as string;
    expect(result).toBe("a".repeat(50) + "...[truncated]");
    expect(result.length).toBeLessThan(long.length);
  });

  it("does not truncate strings exactly 200 characters", () => {
    const exact = "b".repeat(200);
    expect(redact(exact)).toBe(exact);
  });

  it("redacts a top-level password field", () => {
    const result = redact({ password: "s3cr3t" }) as Record<string, unknown>;
    expect(result.password).toBe("[REDACTED]");
  });

  it("redacts a token field", () => {
    const result = redact({ token: "abc123" }) as Record<string, unknown>;
    expect(result.token).toBe("[REDACTED]");
  });

  it("redacts a secret field", () => {
    const result = redact({ secret: "mysecret" }) as Record<string, unknown>;
    expect(result.secret).toBe("[REDACTED]");
  });

  it("redacts an apiKey field (matches /key/i)", () => {
    const result = redact({ apiKey: "key-value" }) as Record<string, unknown>;
    expect(result.apiKey).toBe("[REDACTED]");
  });

  it("redacts an authToken field (matches /auth/i)", () => {
    const result = redact({ authToken: "bearer-xyz" }) as Record<string, unknown>;
    expect(result.authToken).toBe("[REDACTED]");
  });

  it("redacts a creditCard field (matches /credit.?card/i)", () => {
    const result = redact({ creditCard: "4111111111111111" }) as Record<string, unknown>;
    expect(result.creditCard).toBe("[REDACTED]");
  });

  it("redacts a cvv field", () => {
    const result = redact({ cvv: "123" }) as Record<string, unknown>;
    expect(result.cvv).toBe("[REDACTED]");
  });

  it("redacts an ssn field", () => {
    const result = redact({ ssn: "123-45-6789" }) as Record<string, unknown>;
    expect(result.ssn).toBe("[REDACTED]");
  });

  it("redacts a socialSecurity field (matches /social.?security/i)", () => {
    const result = redact({ socialSecurity: "123-45-6789" }) as Record<string, unknown>;
    expect(result.socialSecurity).toBe("[REDACTED]");
  });

  it("preserves non-sensitive fields", () => {
    const result = redact({ username: "alice", email: "alice@example.com" }) as Record<string, unknown>;
    expect(result.username).toBe("alice");
    expect(result.email).toBe("alice@example.com");
  });

  it("redacts nested sensitive fields", () => {
    const result = redact({
      user: {
        name: "Alice",
        password: "hunter2",
        profile: {
          token: "tok_123",
          bio: "Developer",
        },
      },
    }) as Record<string, unknown>;

    const user = result.user as Record<string, unknown>;
    expect(user.name).toBe("Alice");
    expect(user.password).toBe("[REDACTED]");

    const profile = user.profile as Record<string, unknown>;
    expect(profile.token).toBe("[REDACTED]");
    expect(profile.bio).toBe("Developer");
  });

  it("handles arrays by recursively processing elements", () => {
    const result = redact([
      { username: "alice", password: "p1" },
      { username: "bob", token: "t2" },
    ]) as Array<Record<string, unknown>>;

    expect(Array.isArray(result)).toBe(true);
    expect(result[0].username).toBe("alice");
    expect(result[0].password).toBe("[REDACTED]");
    expect(result[1].username).toBe("bob");
    expect(result[1].token).toBe("[REDACTED]");
  });

  it("handles arrays of primitives", () => {
    const result = redact([1, 2, 3]);
    expect(result).toEqual([1, 2, 3]);
  });

  it("truncates long string values inside objects", () => {
    const long = "x".repeat(201);
    const result = redact({ description: long }) as Record<string, unknown>;
    expect(result.description).toBe("x".repeat(50) + "...[truncated]");
  });

  it("respects a custom maxStringLength", () => {
    // maxStringLength controls the threshold, but slice always takes first 50 chars
    const long = "a".repeat(51);
    const result = redact(long, 10) as string;
    // length 51 > maxStringLength 10 → truncated; slice(0,50) = "a".repeat(50)
    expect(result).toBe("a".repeat(50) + "...[truncated]");
  });

  it("handles empty objects", () => {
    expect(redact({})).toEqual({});
  });

  it("handles empty arrays", () => {
    expect(redact([])).toEqual([]);
  });

  it("is case-insensitive for sensitive key matching (PASSWORD)", () => {
    const result = redact({ PASSWORD: "secret" }) as Record<string, unknown>;
    expect(result.PASSWORD).toBe("[REDACTED]");
  });
});

describe("isSensitiveFieldName()", () => {
  it("returns true for 'password'", () => {
    expect(isSensitiveFieldName("password")).toBe(true);
  });

  it("returns true for 'PASSWORD' (case-insensitive)", () => {
    expect(isSensitiveFieldName("PASSWORD")).toBe(true);
  });

  it("returns true for 'secret'", () => {
    expect(isSensitiveFieldName("secret")).toBe(true);
  });

  it("returns true for 'token'", () => {
    expect(isSensitiveFieldName("token")).toBe(true);
  });

  it("returns true for 'apiKey' (matches /key/i)", () => {
    expect(isSensitiveFieldName("apiKey")).toBe(true);
  });

  it("returns true for 'authHeader' (matches /auth/i)", () => {
    expect(isSensitiveFieldName("authHeader")).toBe(true);
  });

  it("returns true for 'creditCard' (matches /credit.?card/i)", () => {
    expect(isSensitiveFieldName("creditCard")).toBe(true);
  });

  it("returns true for 'cvv'", () => {
    expect(isSensitiveFieldName("cvv")).toBe(true);
  });

  it("returns true for 'ssn'", () => {
    expect(isSensitiveFieldName("ssn")).toBe(true);
  });

  it("returns true for 'socialSecurity' (matches /social.?security/i)", () => {
    expect(isSensitiveFieldName("socialSecurity")).toBe(true);
  });

  it("returns false for 'username'", () => {
    expect(isSensitiveFieldName("username")).toBe(false);
  });

  it("returns false for 'email'", () => {
    expect(isSensitiveFieldName("email")).toBe(false);
  });

  it("returns false for 'name'", () => {
    expect(isSensitiveFieldName("name")).toBe(false);
  });

  it("returns false for 'description'", () => {
    expect(isSensitiveFieldName("description")).toBe(false);
  });

  it("returns false for 'url'", () => {
    expect(isSensitiveFieldName("url")).toBe(false);
  });
});
