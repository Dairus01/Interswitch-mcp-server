/**
 * Interswitch MCP tool group implemented from INTERSWITCH_MCP_SKILL.md.
 * Sandbox behavior depends on configured Interswitch credentials and documented endpoint availability.
 */
import { z } from 'zod';
import type { RegisteredTool } from '../types/tool.js';
import { cardlessClient } from '../clients/cardless-client.js';
import { resolveKoboAmount } from '../utils/amount.js';
import { requireWriteConfirmation } from '../utils/confirmation.js';
import { normalizeResponse } from '../utils/normalizer.js';
import { jsonContent, normalizedContent } from '../utils/mcp.js';
import { toInterswitchError } from '../utils/errors.js';
import { amountProperties, confirmProperty } from './schemas.js';

async function invoke<T>(fn: () => Promise<T>) { try { return normalizedContent(normalizeResponse(await fn())); } catch (error) { const e = toInterswitchError(error); return jsonContent({ success: false, responseCode: e.responseCode, message: e.responseDescription, data: null, raw: e.raw }, true); } }

const PaycodeSchema = z.object({ amountNaira: z.number().positive().optional(), amountKobo: z.number().int().positive().optional(), customerId: z.string(), transactionRef: z.string(), expiryDate: z.string(), narration: z.string().optional(), confirm: z.boolean().optional(), extra: z.record(z.unknown()).optional() });
const BulkPaycodeSchema = z.object({ paycodes: z.array(PaycodeSchema.omit({ confirm: true })).max(100), confirm: z.boolean().optional(), extra: z.record(z.unknown()).optional() });
const PaycodeIdSchema = z.object({ paycode: z.string(), confirm: z.boolean().optional() });

export const tools: RegisteredTool[] = [
  { definition: { name: 'isw_create_paycode', description: 'Create a cardless withdrawal paycode. Requires confirm: true.', inputSchema: { type: 'object', properties: { ...amountProperties, customerId: { type: 'string' }, transactionRef: { type: 'string' }, expiryDate: { type: 'string' }, narration: { type: 'string' }, confirm: confirmProperty, extra: { type: 'object' } }, required: ['customerId', 'transactionRef', 'expiryDate'] } }, mode: 'write', risk: 'medium', handler: async (args) => { const p = PaycodeSchema.parse(args); requireWriteConfirmation('isw_create_paycode', p, 'write', 'medium'); return invoke(() => cardlessClient.post('/api/v2/cardlessservices/paycodes', { customerId: p.customerId, transactionRef: p.transactionRef, expiryDate: p.expiryDate, narration: p.narration, amount: resolveKoboAmount(p), ...p.extra })); } },
  { definition: { name: 'isw_create_bulk_paycodes', description: 'Create multiple cardless withdrawal paycodes. High-risk batch operation; requires confirm: true. Max 100.', inputSchema: { type: 'object', properties: { paycodes: { type: 'array', maxItems: 100, items: { type: 'object' } }, confirm: confirmProperty, extra: { type: 'object' } }, required: ['paycodes'] } }, mode: 'write', risk: 'high', handler: async (args) => { const p = BulkPaycodeSchema.parse(args); requireWriteConfirmation('isw_create_bulk_paycodes', p, 'write', 'high'); return invoke(() => cardlessClient.post('/api/v2/cardlessservices/paycodes/bulk', { paycodes: p.paycodes.map((paycode) => ({ customerId: paycode.customerId, transactionRef: paycode.transactionRef, expiryDate: paycode.expiryDate, narration: paycode.narration, amount: resolveKoboAmount(paycode), ...paycode.extra })), ...p.extra })); } },
  { definition: { name: 'isw_get_paycode_status', description: 'Get status of a generated paycode.', inputSchema: { type: 'object', properties: { paycode: { type: 'string' } }, required: ['paycode'] } }, mode: 'read', risk: 'low', handler: async (args) => { const p = PaycodeIdSchema.parse(args); return invoke(() => cardlessClient.get(`/api/v2/cardlessservices/paycodes/${encodeURIComponent(p.paycode)}`)); } },
  { definition: { name: 'isw_deactivate_paycode', description: 'Deactivate an unused paycode. Requires confirm: true.', inputSchema: { type: 'object', properties: { paycode: { type: 'string' }, confirm: confirmProperty }, required: ['paycode'] } }, mode: 'write', risk: 'medium', handler: async (args) => { const p = PaycodeIdSchema.parse(args); requireWriteConfirmation('isw_deactivate_paycode', p, 'write', 'medium'); return invoke(() => cardlessClient.delete(`/api/v2/cardlessservices/paycodes/${encodeURIComponent(p.paycode)}`)); } },
];
