import dotenv from 'dotenv';
import { z } from 'zod';
import type { AppConfig } from '../types/config.js';

dotenv.config();

const Booleanish = z
  .string()
  .optional()
  .transform((value) => value === 'true');

const EnvSchema = z.object({
  INTERSWITCH_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  INTERSWITCH_CLIENT_ID: z.string().optional(),
  INTERSWITCH_CLIENT_SECRET: z.string().optional(),
  INTERSWITCH_MERCHANT_CODE: z.string().optional(),
  INTERSWITCH_PAYABLE_CODE: z.string().optional(),
  INTERSWITCH_INITIATING_ENTITY_CODE: z.string().optional(),
  INTERSWITCH_TERMINAL_ID: z.string().optional(),
  INTERSWITCH_READ_ONLY: Booleanish.default('false'),
  INTERSWITCH_REQUIRE_CONFIRMATION: Booleanish.default('true'),
  CARD360_CLIENT_ID: z.string().optional(),
  CARD360_CLIENT_SECRET: z.string().optional(),
  CARD360_RSA_PUBLIC_KEY: z.string().optional(),
  TRANSACTION_SEARCH_CLIENT_ID: z.string().optional(),
  TRANSACTION_SEARCH_CLIENT_SECRET: z.string().optional(),
  INTERSWITCH_AGENCY_MERCHANT_ID: z.string().optional(),
  INTERSWITCH_AGENCY_TERMINAL_ID: z.string().optional(),
  INTERSWITCH_LEGACY_AUTH_ENABLED: Booleanish.default('false'),
  DEBUG: Booleanish.default('false'),
});

const env = EnvSchema.parse(process.env);

export const config: AppConfig = {
  env: env.INTERSWITCH_ENV,
  readOnly: env.INTERSWITCH_READ_ONLY,
  requireConfirmation: env.INTERSWITCH_REQUIRE_CONFIRMATION,
  core: {
    clientId: env.INTERSWITCH_CLIENT_ID,
    clientSecret: env.INTERSWITCH_CLIENT_SECRET,
    merchantCode: env.INTERSWITCH_MERCHANT_CODE,
    payableCode: env.INTERSWITCH_PAYABLE_CODE,
    initiatingEntityCode: env.INTERSWITCH_INITIATING_ENTITY_CODE,
    terminalId: env.INTERSWITCH_TERMINAL_ID,
  },
  card360: {
    clientId: env.CARD360_CLIENT_ID,
    clientSecret: env.CARD360_CLIENT_SECRET,
    rsaPublicKey: env.CARD360_RSA_PUBLIC_KEY,
  },
  transactionSearch: {
    clientId: env.TRANSACTION_SEARCH_CLIENT_ID,
    clientSecret: env.TRANSACTION_SEARCH_CLIENT_SECRET,
  },
  agency: {
    merchantId: env.INTERSWITCH_AGENCY_MERCHANT_ID,
    terminalId: env.INTERSWITCH_AGENCY_TERMINAL_ID,
  },
  legacyAuthEnabled: env.INTERSWITCH_LEGACY_AUTH_ENABLED,
  debug: env.DEBUG,
};

export function requireConfigValue(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing required configuration: ${name}`);
  }
  return value;
}

export function getConfigSummary() {
  return {
    env: config.env,
    readOnly: config.readOnly,
    requireConfirmation: config.requireConfirmation,
    coreCredentialsConfigured: Boolean(config.core.clientId && config.core.clientSecret),
    merchantCodeConfigured: Boolean(config.core.merchantCode),
    payableCodeConfigured: Boolean(config.core.payableCode),
    initiatingEntityCodeConfigured: Boolean(config.core.initiatingEntityCode),
    terminalIdConfigured: Boolean(config.core.terminalId),
    card360Configured: Boolean(config.card360.clientId && config.card360.clientSecret),
    card360RsaPublicKeyConfigured: Boolean(config.card360.rsaPublicKey),
    transactionSearchConfigured: Boolean(config.transactionSearch.clientId && config.transactionSearch.clientSecret),
    agencyConfigured: Boolean(config.agency.merchantId && config.agency.terminalId),
    legacyAuthEnabled: config.legacyAuthEnabled,
  };
}
