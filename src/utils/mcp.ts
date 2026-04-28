import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { NormalizedResponse } from '../types/common.js';
import { redact } from './redaction.js';

export function jsonContent(value: unknown, isError = false): CallToolResult {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(redact(value), null, 2),
      },
    ],
    isError,
  };
}

export function normalizedContent(response: NormalizedResponse): CallToolResult {
  return jsonContent(response, !response.success && !['01', '09', '90009'].includes(response.responseCode));
}
