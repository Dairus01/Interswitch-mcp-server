/**
 * Agency Banking SOAP tools from INTERSWITCH_MCP_SKILL.md Agency Banking notes.
 * Sandbox support depends on Agency/Kimono SOAP credentials and endpoint availability.
 */
import { z } from 'zod';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { RegisteredTool } from '../types/tool.js';
import { agencyTokenManager } from '../auth/agency-token-manager.js';
import { agencyClient } from '../clients/agency-client.js';
import { requireWriteConfirmation } from '../utils/confirmation.js';
import { errorResponse } from '../utils/errors.js';
import { jsonContent } from '../utils/mcp.js';
import { redact } from '../utils/redaction.js';
import { confirmProperty } from './schemas.js';

const XmlSchema = z.object({ xml: z.string(), confirm: z.boolean().optional() });

async function runTool(fn: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    return jsonContent(await fn());
  } catch (error) {
    return jsonContent(errorResponse(error), true);
  }
}

async function getAgencyToken(): Promise<CallToolResult> {
  return runTool(async () => {
    const token = await agencyTokenManager.getToken();
    return { success: true, responseCode: '00', message: 'Agency token fetched', data: { token: redact(token) }, raw: null };
  });
}

async function submitAgencyCashoutXml(args: unknown): Promise<CallToolResult> {
  return runTool(async () => {
    const params = XmlSchema.parse(args);
    requireWriteConfirmation('isw_agency_cashout_xml', params, 'write', 'high');
    const response = await agencyClient.postXml('/kmw/kimonoservice/amex', params.xml);
    return { success: true, responseCode: 'UNKNOWN', message: 'Agency cashout XML submitted', data: redact(response), raw: redact(response) };
  });
}

async function submitAgencyRequeryXml(args: unknown): Promise<CallToolResult> {
  return runTool(async () => {
    const params = XmlSchema.parse(args);
    const response = await agencyClient.postXml('/kmw/v2/transaction/requery', params.xml);
    return { success: true, responseCode: 'UNKNOWN', message: 'Agency requery XML submitted', data: redact(response), raw: redact(response) };
  });
}

export const tools: RegisteredTool[] = [
  { definition: { name: 'isw_agency_get_token', description: 'Fetch an Agency Banking SOAP token using configured merchant and terminal IDs. Token is redacted in output.', inputSchema: { type: 'object', properties: {} } }, mode: 'read', risk: 'high', handler: getAgencyToken },
  { definition: { name: 'isw_agency_cashout_xml', description: 'Submit raw Agency Banking cashout XML. High-risk financial operation; requires confirm: true.', inputSchema: { type: 'object', properties: { xml: { type: 'string' }, confirm: confirmProperty }, required: ['xml'] } }, mode: 'write', risk: 'high', handler: submitAgencyCashoutXml },
  { definition: { name: 'isw_agency_requery_xml', description: 'Submit raw Agency Banking requery XML.', inputSchema: { type: 'object', properties: { xml: { type: 'string' } }, required: ['xml'] } }, mode: 'read', risk: 'medium', handler: submitAgencyRequeryXml },
];
