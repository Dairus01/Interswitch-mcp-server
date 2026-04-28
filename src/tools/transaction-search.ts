/**
 * Interswitch MCP tool group implemented from INTERSWITCH_MCP_SKILL.md.
 * Sandbox behavior depends on configured Interswitch credentials and documented endpoint availability.
 */
import { z } from 'zod';
import type { RegisteredTool } from '../types/tool.js';
import { transactionSearchClient } from '../clients/transaction-search-client.js';
import { normalizeResponse } from '../utils/normalizer.js';
import { jsonContent, normalizedContent } from '../utils/mcp.js';
import { toInterswitchError } from '../utils/errors.js';

async function invoke<T>(fn: () => Promise<T>) { try { return normalizedContent(normalizeResponse(await fn())); } catch (error) { const e = toInterswitchError(error); return jsonContent({ success: false, responseCode: e.responseCode, message: e.responseDescription, data: null, raw: e.raw }, true); } }

const QuickSearchSchema = z.object({ amountKobo: z.number().int().positive().optional(), terminalId: z.string().optional(), fromDate: z.string(), toDate: z.string(), extra: z.record(z.unknown()).optional() });
const ReferenceSearchSchema = z.object({ transactionRef: z.string(), fromDate: z.string(), toDate: z.string(), extra: z.record(z.unknown()).optional() });
const BulkSearchSchema = z.object({ transactions: z.array(z.string()).min(1).max(100), extra: z.record(z.unknown()).optional() });
const DetailsSchema = z.object({ transactionId: z.string() });

export const tools: RegisteredTool[] = [
  { definition: { name: 'isw_transaction_search_quick_search', description: 'Search transactions by amountKobo, terminal, and date range. Dates use YYYY-MM-DD HH:mm:ss.', inputSchema: { type: 'object', properties: { amountKobo: { type: 'number' }, terminalId: { type: 'string' }, fromDate: { type: 'string' }, toDate: { type: 'string' }, extra: { type: 'object' } }, required: ['fromDate', 'toDate'] } }, mode: 'read', risk: 'low', handler: async (args) => { const p = QuickSearchSchema.parse(args); return invoke(() => transactionSearchClient.get('/api/v3/transaction-search/transactions/quick-search', { query: { amount: p.amountKobo, terminalId: p.terminalId, fromDate: p.fromDate, toDate: p.toDate, ...p.extra } })); } },
  { definition: { name: 'isw_transaction_search_reference_search', description: 'Search transactions by transaction reference and date range.', inputSchema: { type: 'object', properties: { transactionRef: { type: 'string' }, fromDate: { type: 'string' }, toDate: { type: 'string' }, extra: { type: 'object' } }, required: ['transactionRef', 'fromDate', 'toDate'] } }, mode: 'read', risk: 'low', handler: async (args) => { const p = ReferenceSearchSchema.parse(args); return invoke(() => transactionSearchClient.get('/api/v3/transaction-search/transactions/reference-search', { query: { transactionRef: p.transactionRef, fromDate: p.fromDate, toDate: p.toDate, ...p.extra } })); } },
  { definition: { name: 'isw_transaction_search_bulk_search', description: 'Search multiple transaction references at once.', inputSchema: { type: 'object', properties: { transactions: { type: 'array', maxItems: 100, items: { type: 'string' } }, extra: { type: 'object' } }, required: ['transactions'] } }, mode: 'read', risk: 'low', handler: async (args) => { const p = BulkSearchSchema.parse(args); return invoke(() => transactionSearchClient.post('/api/v3/transaction-search/transactions/bulk-search', { transactions: p.transactions, ...p.extra })); } },
  { definition: { name: 'isw_get_transaction_details', description: 'Get Transaction Search details by transactionId.', inputSchema: { type: 'object', properties: { transactionId: { type: 'string' } }, required: ['transactionId'] } }, mode: 'read', risk: 'low', handler: async (args) => { const p = DetailsSchema.parse(args); return invoke(() => transactionSearchClient.get(`/api/v3/transaction-search/transactions/${encodeURIComponent(p.transactionId)}`)); } },
];
