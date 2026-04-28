/**
 * Interswitch MCP tool group implemented from INTERSWITCH_MCP_SKILL.md.
 * Sandbox behavior depends on configured Interswitch credentials and documented endpoint availability.
 */
import { z } from 'zod';
import type { RegisteredTool } from '../types/tool.js';
import { transferServiceClient } from '../clients/transfer-service-client.js';
import { resolveKoboAmount } from '../utils/amount.js';
import { requireWriteConfirmation } from '../utils/confirmation.js';
import { normalizeResponse } from '../utils/normalizer.js';
import { jsonContent, normalizedContent } from '../utils/mcp.js';
import { toInterswitchError } from '../utils/errors.js';
import { amountProperties, confirmProperty } from './schemas.js';

async function invoke<T>(fn: () => Promise<T>) { try { return normalizedContent(normalizeResponse(await fn())); } catch (error) { const e = toInterswitchError(error); return jsonContent({ success: false, responseCode: e.responseCode, message: e.responseDescription, data: null, raw: e.raw }, true); } }
const InquirySchema = z.object({ beneficiaryAccountNumber: z.string(), beneficiaryBankCode: z.string(), amountNaira: z.number().positive().optional(), amountKobo: z.number().int().positive().optional(), extra: z.record(z.unknown()).optional() });
const CompletionSchema = z.object({ inquiryRef: z.string(), otp: z.string(), confirm: z.boolean().optional(), extra: z.record(z.unknown()).optional() });
const RequerySchema = z.object({ transactionRef: z.string() });

export const tools: RegisteredTool[] = [
  { definition: { name: 'isw_credit_inquiry', description: 'Run Transfer Service credit inquiry before bank credit.', inputSchema: { type: 'object', properties: { beneficiaryAccountNumber: { type: 'string' }, beneficiaryBankCode: { type: 'string' }, ...amountProperties, extra: { type: 'object' } }, required: ['beneficiaryAccountNumber', 'beneficiaryBankCode'] } }, mode: 'read', risk: 'low', handler: async (args) => { const p = InquirySchema.parse(args); return invoke(() => transferServiceClient.post('/api/v2/transfers/inquiry', { beneficiaryAccountNumber: p.beneficiaryAccountNumber, beneficiaryBankCode: p.beneficiaryBankCode, amount: resolveKoboAmount(p), ...p.extra })); } },
  { definition: { name: 'isw_complete_credit', description: 'Complete bank credit using inquiryRef and OTP. High-risk financial operation; requires confirm: true.', inputSchema: { type: 'object', properties: { inquiryRef: { type: 'string' }, otp: { type: 'string' }, confirm: confirmProperty, extra: { type: 'object' } }, required: ['inquiryRef', 'otp'] } }, mode: 'write', risk: 'high', handler: async (args) => { const p = CompletionSchema.parse(args); requireWriteConfirmation('isw_complete_credit', p, 'write', 'high'); return invoke(() => transferServiceClient.post('/api/v2/transfers/completion', { inquiryRef: p.inquiryRef, otp: p.otp, ...p.extra })); } },
  { definition: { name: 'isw_requery_transfer', description: 'Requery Transfer Service transaction status.', inputSchema: { type: 'object', properties: { transactionRef: { type: 'string' } }, required: ['transactionRef'] } }, mode: 'read', risk: 'low', handler: async (args) => { const p = RequerySchema.parse(args); return invoke(() => transferServiceClient.get(`/api/v2/transfers/${encodeURIComponent(p.transactionRef)}/requery`)); } },
];
