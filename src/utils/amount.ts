// Interswitch endpoints commonly accept kobo; MCP tools expose explicit amountNaira/amountKobo so agents cannot silently mix units.
export function nairaToKobo(amountNaira: number): number {
  assertPositiveFinite(amountNaira, 'amountNaira');
  const kobo = amountNaira * 100;
  if (!Number.isInteger(kobo)) {
    throw new Error(
      `amountNaira must have at most two decimal places. Got ${amountNaira}, which produces ${kobo} kobo.`,
    );
  }
  return kobo;
}

export function koboToNaira(amountKobo: number): number {
  assertPositiveInteger(amountKobo, 'amountKobo');
  return amountKobo / 100;
}

export function resolveKoboAmount(input: { amountNaira?: number; amountKobo?: number }): number {
  const hasNaira = input.amountNaira !== undefined;
  const hasKobo = input.amountKobo !== undefined;

  if (hasNaira === hasKobo) {
    throw new Error('Provide exactly one of amountNaira or amountKobo.');
  }

  return hasNaira ? nairaToKobo(input.amountNaira as number) : assertPositiveInteger(input.amountKobo as number, 'amountKobo');
}

export function assertPositiveFinite(value: number, fieldName: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive number.`);
  }
  return value;
}

export function assertPositiveInteger(value: number, fieldName: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }
  return value;
}
