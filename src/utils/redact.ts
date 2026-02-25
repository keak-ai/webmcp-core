const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /key/i,
  /auth/i,
  /credit.?card/i,
  /cvv/i,
  /ssn/i,
  /social.?security/i,
];

export function redact(
  data: unknown,
  maxStringLength: number = 200
): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data === "string") {
    return data.length > maxStringLength
      ? data.slice(0, 50) + "...[truncated]"
      : data;
  }
  if (typeof data !== "object") return data;
  if (Array.isArray(data)) return data.map((item) => redact(item, maxStringLength));

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_PATTERNS.some((p) => p.test(key))) {
      result[key] = "[REDACTED]";
    } else {
      result[key] = redact(value, maxStringLength);
    }
  }
  return result;
}

export function isSensitiveFieldName(name: string): boolean {
  return SENSITIVE_PATTERNS.some((p) => p.test(name));
}
