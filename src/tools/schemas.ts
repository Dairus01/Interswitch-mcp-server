import { z } from 'zod';

export const ConfirmSchema = z.object({
  confirm: z.boolean().optional(),
});

export const MoneySchema = z
  .object({
    amountNaira: z.number().positive().optional(),
    amountKobo: z.number().int().positive().optional(),
  })
  .refine((value) => (value.amountNaira === undefined) !== (value.amountKobo === undefined), {
    message: 'Provide exactly one of amountNaira or amountKobo.',
  });

export const ExtraSchema = z.object({
  extra: z.record(z.unknown()).optional(),
});

export function objectSchemaToJsonSchema(schema: Record<string, unknown>, required: string[] = []) {
  return {
    type: 'object' as const,
    properties: schema,
    required,
  };
}

export const confirmProperty = {
  type: 'boolean',
  description: 'Required as true for write or high-risk tools.',
};

export const amountProperties = {
  amountNaira: { type: 'number', description: 'Amount in Nigerian Naira. Do not combine with amountKobo.' },
  amountKobo: { type: 'number', description: 'Amount in kobo. Do not combine with amountNaira.' },
};
