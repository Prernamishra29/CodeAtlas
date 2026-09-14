const SECRET_KEYS = /token|secret|password|authorization|cookie|cipher|apikey|api_key|gemini|openai/i;

function redact(value: unknown): unknown {
  if (typeof value === "string") {
    return value
      .replace(/https:\/\/x-access-token:[^@\s]+@/gi, "https://x-access-token:***@")
      .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer ***");
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SECRET_KEYS.test(key) ? "[redacted]" : redact(entry);
    }
    return out;
  }
  return value;
}

export function log(level: "debug" | "info" | "warn" | "error", msg: string, fields: Record<string, unknown> = {}) {
  const line = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...((redact(fields) as Record<string, unknown>) ?? {}),
  };
  const serialized = JSON.stringify(line);
  if (level === "error") console.error(serialized);
  else if (level === "warn") console.warn(serialized);
  else console.log(serialized);
}
