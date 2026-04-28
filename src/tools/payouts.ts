/**
 * Payout tools from INTERSWITCH_MCP_SKILL.md Domain 10.
 * The skill only documents read endpoints, so payout creation is intentionally not exposed.
 */
import { z } from 'zod';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { RegisteredTool } from '../types/tool.js';
import { payoutsClient } from '../clients/payouts-client.js';
import { errorResponse } from '../utils/errors.js';
import { jsonContent, normalizedContent } from '../utils/mcp.js';
import { normalizeResponse } from '../utils/normalizer.js';

const InstitutionsSchema = z.object({ code: z.string().optional(), name: z.string().optional(), type: z.string().optional() });

async function runTool(fn: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    return normalizedContent(normalizeResponse(await fn()));
  } catch (error) {
    return jsonContent(errorResponse(error), true);
  }
}

async function getReceivingInstitutions(args: unknown): Promise<CallToolResult> {
  return runTool(async () => {
    const params = InstitutionsSchema.parse(args ?? {});
    return payoutsClient.get('/api/v2/payouts/institutions', { query: params });
  });
}

async function getPayoutChannels(): Promise<CallToolResult> {
  return runTool(() => payoutsClient.get('/api/v2/payouts/channels'));
}

export const tools: RegisteredTool[] = [
  { definition: { name: 'isw_get_receiving_institutions', description: 'List payout receiving institutions.', inputSchema: { type: 'object', properties: { code: { type: 'string' }, name: { type: 'string' }, type: { type: 'string' } } } }, mode: 'read', risk: 'low', handler: getReceivingInstitutions },
  { definition: { name: 'isw_get_payout_channels', description: 'List available payout channels.', inputSchema: { type: 'object', properties: {} } }, mode: 'read', risk: 'low', handler: getPayoutChannels },
];
