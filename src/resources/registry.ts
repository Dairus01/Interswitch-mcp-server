import type { ReadResourceResult, Resource } from '@modelcontextprotocol/sdk/types.js';
import { getConfigSummary } from '../config/config.js';
import { responseCodes } from './response-codes.js';

export const resources: Resource[] = [
  {
    uri: 'isw://response-codes',
    name: 'Interswitch response codes',
    description: 'Global response code reference from INTERSWITCH_MCP_SKILL.md',
    mimeType: 'application/json',
  },
  {
    uri: 'isw://config-summary',
    name: 'Interswitch MCP config summary',
    description: 'Safe summary of loaded configuration without secrets',
    mimeType: 'application/json',
  },
];

export async function readResource(uri: string): Promise<ReadResourceResult> {
  if (uri === 'isw://response-codes') {
    return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(responseCodes, null, 2) }] };
  }
  if (uri === 'isw://config-summary') {
    return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(getConfigSummary(), null, 2) }] };
  }
  throw new Error(`Unknown resource: ${uri}`);
}
