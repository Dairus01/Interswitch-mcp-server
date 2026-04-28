import { config } from '../config/config.js';
import type { RiskLevel, ToolMode } from '../types/common.js';

export function requireWriteConfirmation(toolName: string, args: unknown, mode: ToolMode, risk: RiskLevel): void {
  if (config.readOnly && mode === 'write') {
    throw new Error(`${toolName} is blocked because INTERSWITCH_READ_ONLY=true.`);
  }

  const needsConfirmation = mode === 'write' || risk === 'high';
  if (!needsConfirmation) {
    return;
  }

  const confirm = args && typeof args === 'object' && (args as Record<string, unknown>).confirm === true;
  if (!confirm) {
    throw new Error(`${toolName} requires explicit confirmation. Retry with confirm: true.`);
  }
}
