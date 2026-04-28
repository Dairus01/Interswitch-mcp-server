/**
 * Card 360 card-management tools from INTERSWITCH_MCP_SKILL.md Domain 6.
 * Sandbox access requires separate Card 360 credentials and PIN operations require a configured RSA public key.
 */
import { z } from 'zod';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { RegisteredTool } from '../types/tool.js';
import { config } from '../config/config.js';
import { card360Client } from '../clients/card360-client.js';
import { resolveKoboAmount } from '../utils/amount.js';
import { requireWriteConfirmation } from '../utils/confirmation.js';
import { errorResponse } from '../utils/errors.js';
import { jsonContent, normalizedContent } from '../utils/mcp.js';
import { normalizeResponse } from '../utils/normalizer.js';
import { encryptPin } from '../utils/pin-encryption.js';
import { amountProperties, confirmProperty } from './schemas.js';

const ExtraSchema = z.object({ extra: z.record(z.unknown()).optional() });
const CardPanSchema = ExtraSchema.extend({ cardPan: z.string(), confirm: z.boolean().optional() });
const RequestRefSchema = ExtraSchema.extend({ requestRef: z.string(), page: z.number().int().positive().optional(), pageSize: z.number().int().positive().optional() });
const AccountSchema = ExtraSchema.extend({ accountNumber: z.string() });
const IssuerSchema = ExtraSchema.extend({ issuerNumber: z.string(), page: z.number().int().positive().optional(), pageSize: z.number().int().positive().optional() });
const LogSchema = ExtraSchema.extend({ fromDate: z.string().optional(), toDate: z.string().optional(), page: z.number().int().positive().optional(), pageSize: z.number().int().positive().optional() });
const GenericWriteSchema = ExtraSchema.extend({
  cardPan: z.string().optional(),
  requestRef: z.string().optional(),
  amountNaira: z.number().positive().optional(),
  amountKobo: z.number().int().positive().optional(),
  confirm: z.boolean().optional(),
}).passthrough();
const CardPanWriteSchema = GenericWriteSchema.extend({
  cardPan: z.string().min(1),
});
const ReissuePinSchema = ExtraSchema.extend({ cardPan: z.string(), pan: z.string(), pin: z.string().regex(/^\d{4,6}$/), confirm: z.boolean().optional() });
const ChangePinSchema = ExtraSchema.extend({ cardPan: z.string(), pan: z.string(), oldPin: z.string().regex(/^\d{4,6}$/), newPin: z.string().regex(/^\d{4,6}$/), confirm: z.boolean().optional() });

async function runTool(fn: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    return normalizedContent(normalizeResponse(await fn()));
  } catch (error) {
    return jsonContent(errorResponse(error), true);
  }
}

function buildBody(params: z.infer<typeof GenericWriteSchema>): Record<string, unknown> {
  const body: Record<string, unknown> = { ...params, ...params.extra };
  delete body.extra;
  delete body.confirm;
  if (params.amountNaira !== undefined || params.amountKobo !== undefined) {
    body.amount = resolveKoboAmount(params);
    delete body.amountNaira;
    delete body.amountKobo;
  }
  return body;
}

function genericWriteHandler(
  name: string,
  pathBuilder: (params: z.infer<typeof GenericWriteSchema>) => string,
  risk: 'medium' | 'high' = 'high',
  schema: z.ZodType<z.infer<typeof GenericWriteSchema>> = GenericWriteSchema,
): (args: unknown) => Promise<CallToolResult> {
  return async (args) => runTool(async () => {
    const params = schema.parse(args);
    requireWriteConfirmation(name, params, 'write', risk);
    return card360Client.post(pathBuilder(params), buildBody(params));
  });
}

function genericReadHandler(schema: z.ZodType<Record<string, unknown>>, pathBuilder: (params: Record<string, unknown>) => string, risk: 'low' | 'high' = 'low', queryBuilder?: (params: Record<string, unknown>) => Record<string, unknown> | undefined): (args: unknown) => Promise<CallToolResult> {
  return async (args) => runTool(async () => {
    const params = schema.parse(args);
    requireWriteConfirmation(pathBuilder(params), params, 'read', risk);
    return card360Client.get(pathBuilder(params), { query: queryBuilder ? queryBuilder(params) : params.extra as Record<string, unknown> | undefined });
  });
}

async function reissueCardPin(args: unknown): Promise<CallToolResult> {
  return runTool(async () => {
    const params = ReissuePinSchema.parse(args);
    requireWriteConfirmation('isw_reissue_card_pin', params, 'write', 'high');
    const encrypted = encryptPin({ pin: params.pin, pan: params.pan, rsaPublicKeyPem: config.card360.rsaPublicKey });
    return card360Client.post(`/api/v1/card360/cards/${encodeURIComponent(params.cardPan)}/pin/reissue`, { ...encrypted, ...params.extra });
  });
}

async function changeCardPin(args: unknown): Promise<CallToolResult> {
  return runTool(async () => {
    const params = ChangePinSchema.parse(args);
    requireWriteConfirmation('isw_change_card_pin', params, 'write', 'high');
    const oldPin = encryptPin({ pin: params.oldPin, pan: params.pan, rsaPublicKeyPem: config.card360.rsaPublicKey });
    const newPin = encryptPin({ pin: params.newPin, pan: params.pan, rsaPublicKeyPem: config.card360.rsaPublicKey });
    return card360Client.post(`/api/v1/card360/cards/${encodeURIComponent(params.cardPan)}/pin/change`, {
      encryptedOldPin: oldPin.encryptedPin,
      encryptedNewPin: newPin.encryptedPin,
      encryptedKey: newPin.encryptedKey,
      encryptedOldKey: oldPin.encryptedKey,
      ...params.extra,
    });
  });
}

const commonCardProperties = { cardPan: { type: 'string' }, requestRef: { type: 'string' }, ...amountProperties, confirm: confirmProperty, extra: { type: 'object' } };
const cardPanInputSchema = { type: 'object' as const, properties: commonCardProperties, required: ['cardPan'] };

export const tools: RegisteredTool[] = [
  { definition: { name: 'isw_create_card', description: 'Provision a new Verve card through Card 360. Requires confirm: true.', inputSchema: { type: 'object', properties: commonCardProperties } }, mode: 'write', risk: 'high', handler: genericWriteHandler('isw_create_card', () => '/api/v1/card360/cards') },
  { definition: { name: 'isw_retry_card_creation', description: 'Retry a Card 360 card creation request. Requires confirm: true.', inputSchema: { type: 'object', properties: commonCardProperties } }, mode: 'write', risk: 'medium', handler: genericWriteHandler('isw_retry_card_creation', () => '/api/v1/card360/cards/retry', 'medium') },
  { definition: { name: 'isw_initiate_card_data_prep', description: 'Initiate Card 360 card data prep. Requires confirm: true.', inputSchema: { type: 'object', properties: commonCardProperties } }, mode: 'write', risk: 'medium', handler: genericWriteHandler('isw_initiate_card_data_prep', () => '/api/v1/card360/dataprep', 'medium') },
  { definition: { name: 'isw_fetch_data_prep_request', description: 'Fetch Card 360 data prep request by requestRef.', inputSchema: { type: 'object', properties: { requestRef: { type: 'string' }, extra: { type: 'object' } }, required: ['requestRef'] } }, mode: 'read', risk: 'low', handler: genericReadHandler(RequestRefSchema, (params) => `/api/v1/card360/dataprep/${encodeURIComponent(String(params.requestRef))}`) },
  { definition: { name: 'isw_fetch_prepared_cards', description: 'Fetch prepared cards for a data prep request.', inputSchema: { type: 'object', properties: { requestRef: { type: 'string' }, page: { type: 'number' }, pageSize: { type: 'number' }, extra: { type: 'object' } }, required: ['requestRef'] } }, mode: 'read', risk: 'low', handler: genericReadHandler(RequestRefSchema, (params) => `/api/v1/card360/dataprep/${encodeURIComponent(String(params.requestRef))}/cards`, 'low', (params) => ({ page: params.page, pageSize: params.pageSize, ...(params.extra as Record<string, unknown> | undefined) })) },
  { definition: { name: 'isw_bulk_card_production', description: 'Submit Card 360 bulk card production. Requires confirm: true.', inputSchema: { type: 'object', properties: commonCardProperties } }, mode: 'write', risk: 'high', handler: genericWriteHandler('isw_bulk_card_production', () => '/api/v1/card360/cards/bulk') },
  { definition: { name: 'isw_reissue_card_pin', description: 'Reissue a Card 360 card PIN. The plaintext pin is encrypted locally and never sent. Requires confirm: true.', inputSchema: { type: 'object', properties: { cardPan: { type: 'string' }, pan: { type: 'string' }, pin: { type: 'string' }, confirm: confirmProperty, extra: { type: 'object' } }, required: ['cardPan', 'pan', 'pin'] } }, mode: 'write', risk: 'high', handler: reissueCardPin },
  { definition: { name: 'isw_change_card_pin', description: 'Change a Card 360 card PIN. Plaintext PINs are encrypted locally and never sent. Requires confirm: true.', inputSchema: { type: 'object', properties: { cardPan: { type: 'string' }, pan: { type: 'string' }, oldPin: { type: 'string' }, newPin: { type: 'string' }, confirm: confirmProperty, extra: { type: 'object' } }, required: ['cardPan', 'pan', 'oldPin', 'newPin'] } }, mode: 'write', risk: 'high', handler: changeCardPin },
  { definition: { name: 'isw_get_pin', description: 'Get a card PIN. Sensitive operation; requires confirm: true and redacts sensitive fields.', inputSchema: { type: 'object', properties: { cardPan: { type: 'string' }, confirm: confirmProperty, extra: { type: 'object' } }, required: ['cardPan'] } }, mode: 'read', risk: 'high', handler: genericReadHandler(CardPanSchema, (params) => `/api/v1/card360/cards/${encodeURIComponent(String(params.cardPan))}/pin`, 'high') },
  { definition: { name: 'isw_block_card', description: 'Block a card immediately. Requires confirm: true.', inputSchema: cardPanInputSchema }, mode: 'write', risk: 'high', handler: genericWriteHandler('isw_block_card', (params) => `/api/v1/card360/cards/${encodeURIComponent(String(params.cardPan))}/block`, 'high', CardPanWriteSchema) },
  { definition: { name: 'isw_unblock_card', description: 'Unblock a card. Requires confirm: true.', inputSchema: cardPanInputSchema }, mode: 'write', risk: 'high', handler: genericWriteHandler('isw_unblock_card', (params) => `/api/v1/card360/cards/${encodeURIComponent(String(params.cardPan))}/unblock`, 'high', CardPanWriteSchema) },
  { definition: { name: 'isw_block_prepaid_card', description: 'Block a prepaid card. Requires confirm: true.', inputSchema: cardPanInputSchema }, mode: 'write', risk: 'high', handler: genericWriteHandler('isw_block_prepaid_card', (params) => `/api/v1/card360/cards/${encodeURIComponent(String(params.cardPan))}/prepaid/block`, 'high', CardPanWriteSchema) },
  { definition: { name: 'isw_unblock_prepaid_card', description: 'Unblock a prepaid card. Requires confirm: true.', inputSchema: cardPanInputSchema }, mode: 'write', risk: 'high', handler: genericWriteHandler('isw_unblock_prepaid_card', (params) => `/api/v1/card360/cards/${encodeURIComponent(String(params.cardPan))}/prepaid/unblock`, 'high', CardPanWriteSchema) },
  { definition: { name: 'isw_link_card_to_account', description: 'Link a Card 360 card to an account. Requires confirm: true.', inputSchema: cardPanInputSchema }, mode: 'write', risk: 'high', handler: genericWriteHandler('isw_link_card_to_account', (params) => `/api/v1/card360/cards/${encodeURIComponent(String(params.cardPan))}/link`, 'high', CardPanWriteSchema) },
  { definition: { name: 'isw_check_prepaid_balance', description: 'Check prepaid card balance.', inputSchema: { type: 'object', properties: { cardPan: { type: 'string' }, extra: { type: 'object' } }, required: ['cardPan'] } }, mode: 'read', risk: 'low', handler: genericReadHandler(CardPanSchema, (params) => `/api/v1/card360/cards/${encodeURIComponent(String(params.cardPan))}/prepaid/balance`) },
  { definition: { name: 'isw_check_debit_balance', description: 'Check debit card balance.', inputSchema: { type: 'object', properties: { cardPan: { type: 'string' }, extra: { type: 'object' } }, required: ['cardPan'] } }, mode: 'read', risk: 'low', handler: genericReadHandler(CardPanSchema, (params) => `/api/v1/card360/cards/${encodeURIComponent(String(params.cardPan))}/debit/balance`) },
  { definition: { name: 'isw_confirm_prepaid_sufficient', description: 'Confirm prepaid card sufficient balance. Requires confirm: true.', inputSchema: cardPanInputSchema }, mode: 'write', risk: 'medium', handler: genericWriteHandler('isw_confirm_prepaid_sufficient', (params) => `/api/v1/card360/cards/${encodeURIComponent(String(params.cardPan))}/prepaid/sufficiency`, 'medium', CardPanWriteSchema) },
  { definition: { name: 'isw_confirm_debit_sufficient', description: 'Confirm debit card sufficient balance. Requires confirm: true.', inputSchema: cardPanInputSchema }, mode: 'write', risk: 'medium', handler: genericWriteHandler('isw_confirm_debit_sufficient', (params) => `/api/v1/card360/cards/${encodeURIComponent(String(params.cardPan))}/debit/sufficiency`, 'medium', CardPanWriteSchema) },
  { definition: { name: 'isw_fetch_cards_by_issuer', description: 'Fetch cards by issuer number.', inputSchema: { type: 'object', properties: { issuerNumber: { type: 'string' }, page: { type: 'number' }, pageSize: { type: 'number' }, extra: { type: 'object' } }, required: ['issuerNumber'] } }, mode: 'read', risk: 'low', handler: genericReadHandler(IssuerSchema, () => '/api/v1/card360/cards', 'low', (params) => ({ issuerNumber: params.issuerNumber, page: params.page, pageSize: params.pageSize, ...(params.extra as Record<string, unknown> | undefined) })) },
  { definition: { name: 'isw_fetch_single_card_by_pan', description: 'Fetch card details by PAN. Sensitive fields are redacted.', inputSchema: { type: 'object', properties: { cardPan: { type: 'string' }, extra: { type: 'object' } }, required: ['cardPan'] } }, mode: 'read', risk: 'low', handler: genericReadHandler(CardPanSchema, (params) => `/api/v1/card360/cards/${encodeURIComponent(String(params.cardPan))}`) },
  { definition: { name: 'isw_fetch_cards_by_account', description: 'Fetch cards linked to an account.', inputSchema: { type: 'object', properties: { accountNumber: { type: 'string' }, extra: { type: 'object' } }, required: ['accountNumber'] } }, mode: 'read', risk: 'low', handler: genericReadHandler(AccountSchema, (params) => `/api/v1/card360/cards/account/${encodeURIComponent(String(params.accountNumber))}`) },
  { definition: { name: 'isw_fetch_customer_card_details', description: 'Fetch customer card details by account.', inputSchema: { type: 'object', properties: { accountNumber: { type: 'string' }, extra: { type: 'object' } }, required: ['accountNumber'] } }, mode: 'read', risk: 'low', handler: genericReadHandler(AccountSchema, (params) => `/api/v1/card360/cards/account/${encodeURIComponent(String(params.accountNumber))}/customer`) },
  { definition: { name: 'isw_fetch_request_logs', description: 'Fetch Card 360 request logs.', inputSchema: { type: 'object', properties: { fromDate: { type: 'string' }, toDate: { type: 'string' }, page: { type: 'number' }, pageSize: { type: 'number' }, extra: { type: 'object' } } } }, mode: 'read', risk: 'low', handler: genericReadHandler(LogSchema, () => '/api/v1/card360/logs', 'low', (params) => ({ fromDate: params.fromDate, toDate: params.toDate, page: params.page, pageSize: params.pageSize, ...(params.extra as Record<string, unknown> | undefined) })) },
  { definition: { name: 'isw_validate_card', description: 'Validate card CVV and expiry. Requires confirm: true.', inputSchema: cardPanInputSchema }, mode: 'write', risk: 'medium', handler: genericWriteHandler('isw_validate_card', (params) => `/api/v1/card360/cards/${encodeURIComponent(String(params.cardPan))}/validate`, 'medium', CardPanWriteSchema) },
];
