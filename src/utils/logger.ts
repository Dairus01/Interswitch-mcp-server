import { config } from '../config/config.js';
import { redact } from './redaction.js';

export function logDebug(message: string, data?: unknown): void {
  if (!config.debug) {
    return;
  }
  console.error(`[interswitch-mcp-server] DEBUG: ${message}`, data === undefined ? '' : JSON.stringify(redact(data)));
}

export function logWarn(message: string, data?: unknown): void {
  console.error(`[interswitch-mcp-server] WARN: ${message}`, data === undefined ? '' : JSON.stringify(redact(data)));
}
