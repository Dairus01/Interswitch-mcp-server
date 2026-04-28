/**
 * Interswitch MCP tool group implemented from INTERSWITCH_MCP_SKILL.md.
 * Sandbox behavior depends on configured Interswitch credentials and documented endpoint availability.
 */
import { z } from 'zod';
import type { RegisteredTool } from '../types/tool.js';
import { hmacHex } from '../utils/signing.js';
import { requireWriteConfirmation } from '../utils/confirmation.js';
import { jsonContent } from '../utils/mcp.js';
import { confirmProperty } from './schemas.js';

const PayloadSchema = z.object({ payload: z.record(z.unknown()) });
const MacSchema = z.object({ algorithm: z.string().default('sha256'), secret: z.string(), fields: z.array(z.string()).min(1), payload: z.record(z.unknown()), confirm: z.boolean().optional() });
const BuildResponseSchema = z.object({ transactionReference: z.string(), requestId: z.string(), responseCode: z.string(), amount: z.union([z.string(), z.number()]).optional(), originalTransactionReference: z.string().optional(), secret: z.string().optional(), confirm: z.boolean().optional() });

function validatePayload(args: unknown, required: string[]) {
  const { payload } = PayloadSchema.parse(args);
  const missing = required.filter((field) => payload[field] === undefined || payload[field] === null || payload[field] === '');
  return jsonContent({ success: missing.length === 0, responseCode: missing.length === 0 ? '00' : '10400', message: missing.length === 0 ? 'Payload is valid' : `Missing required fields: ${missing.join(', ')}`, data: { missing }, raw: { required } }, missing.length > 0);
}

export const tools: RegisteredTool[] = [
  { definition: { name: 'isw_fintech_validate_debit_payload', description: 'Validate incoming Fintech Card Processing debit payload shape.', inputSchema: { type: 'object', properties: { payload: { type: 'object' } }, required: ['payload'] } }, mode: 'read', risk: 'low', handler: async (args) => validatePayload(args, ['transactionReference', 'requestId', 'rrn', 'stan', 'walletId', 'amount', 'currencyCode', 'mac']) },
  { definition: { name: 'isw_fintech_validate_reversal_payload', description: 'Validate incoming Fintech Card Processing reversal payload shape.', inputSchema: { type: 'object', properties: { payload: { type: 'object' } }, required: ['payload'] } }, mode: 'read', risk: 'low', handler: async (args) => validatePayload(args, ['transactionReference', 'originalTransactionReference', 'requestId', 'rrn', 'stan', 'walletId', 'amount', 'currencyCode', 'mac']) },
  { definition: { name: 'isw_fintech_validate_enquiry_payload', description: 'Validate incoming Fintech Card Processing enquiry payload shape.', inputSchema: { type: 'object', properties: { payload: { type: 'object' } }, required: ['payload'] } }, mode: 'read', risk: 'low', handler: async (args) => validatePayload(args, ['transactionReference', 'requestId', 'rrn', 'stan', 'walletId', 'mac']) },
  { definition: { name: 'isw_fintech_validate_place_lien_payload', description: 'Validate incoming Fintech Card Processing place-lien payload shape.', inputSchema: { type: 'object', properties: { payload: { type: 'object' } }, required: ['payload'] } }, mode: 'read', risk: 'low', handler: async (args) => validatePayload(args, ['transactionReference', 'requestId', 'walletId', 'rrn', 'stan', 'amount', 'currencyCode', 'mac']) },
  { definition: { name: 'isw_fintech_validate_debit_lien_payload', description: 'Validate incoming Fintech Card Processing debit-lien payload shape.', inputSchema: { type: 'object', properties: { payload: { type: 'object' } }, required: ['payload'] } }, mode: 'read', risk: 'low', handler: async (args) => validatePayload(args, ['transactionReference', 'requestId', 'walletId', 'rrn', 'stan', 'amount', 'currencyCode', 'mac']) },
  { definition: { name: 'isw_fintech_compute_mac', description: 'Compute Fintech Card Processing HMAC over ordered fields.', inputSchema: { type: 'object', properties: { algorithm: { type: 'string', default: 'sha256' }, secret: { type: 'string' }, fields: { type: 'array', items: { type: 'string' } }, payload: { type: 'object' }, confirm: confirmProperty }, required: ['secret', 'fields', 'payload'] } }, mode: 'read', risk: 'high', handler: async (args) => { const p = MacSchema.parse(args); requireWriteConfirmation('isw_fintech_compute_mac', p, 'read', 'high'); const input = p.fields.map((field) => String(p.payload[field] ?? '')).join(''); return jsonContent({ success: true, responseCode: '00', message: 'MAC computed', data: { mac: hmacHex(p.algorithm, p.secret, input) }, raw: { fields: p.fields } }); } },
  { definition: { name: 'isw_fintech_build_response', description: 'Build a Fintech Card Processing response payload and optional MAC.', inputSchema: { type: 'object', properties: { transactionReference: { type: 'string' }, requestId: { type: 'string' }, responseCode: { type: 'string' }, amount: {}, originalTransactionReference: { type: 'string' }, secret: { type: 'string' }, confirm: confirmProperty }, required: ['transactionReference', 'requestId', 'responseCode'] } }, mode: 'read', risk: 'high', handler: async (args) => { const p = BuildResponseSchema.parse(args); requireWriteConfirmation('isw_fintech_build_response', p, 'read', 'high'); const body: Record<string, unknown> = { transactionReference: p.transactionReference, requestId: p.requestId, responseCode: p.responseCode, amount: p.amount, originalTransactionReference: p.originalTransactionReference }; if (p.secret) body.mac = hmacHex('sha256', p.secret, `${p.transactionReference}${p.requestId}${p.responseCode}`); return jsonContent({ success: true, responseCode: '00', message: 'Response built', data: body, raw: null }); } },
];
