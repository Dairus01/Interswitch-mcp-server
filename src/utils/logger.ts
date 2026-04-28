import { config } from '../config/config.js';
import { redact } from './redaction.js';

export function logDebug(message: string, data?: unknown): void {
  if (!config.debug) {
    return;
  }
  console.error(message, data === undefined ? '' : JSON.stringify(redact(data)));
}
