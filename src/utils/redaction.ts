const SENSITIVE_KEY_PATTERN = /(token|secret|password|key|pin|otp|cvv|cvv2|pan|track2|authdata|authorization)/i;
const PAN_PATTERN = /\b(\d{6})\d{3,9}(\d{4})\b/g;

export function maskPan(value: string): string {
  return value.replace(PAN_PATTERN, '$1******$2');
}

export function redact<T>(value: T): T {
  return redactInternal(value) as T;
}

function redactInternal(value: unknown): unknown {
  if (typeof value === 'string') {
    return maskPan(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactInternal(item));
  }

  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      output[key] = SENSITIVE_KEY_PATTERN.test(key) ? '[REDACTED]' : redactInternal(nested);
    }
    return output;
  }

  return value;
}
