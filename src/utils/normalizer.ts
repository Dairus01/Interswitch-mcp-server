import type { NormalizedResponse } from '../types/common.js';
import { redact } from './redaction.js';

const SUCCESS_CODES = new Set(['00', '90000', 'S00', 'S201']);
const PENDING_CODES = new Set(['01', '09', '90009']);

export function normalizeResponse<T = unknown>(raw: unknown, fallbackData?: T): NormalizedResponse<T> {
  const redactedRaw = redact(raw);
  const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const responseCode = extractString(record, ['responseCode', 'ResponseCode', 'code', 'status']) ?? 'UNKNOWN';
  const message = extractString(record, ['responseMessage', 'responseDescription', 'ResponseDescription', 'message', 'description']) ?? responseCodeToMessage(responseCode);
  const data = (record.data as T | undefined) ?? fallbackData ?? (redactedRaw as T);

  return {
    success: SUCCESS_CODES.has(responseCode),
    responseCode,
    message,
    data: data ?? null,
    raw: redactedRaw,
  };
}

export function responseCodeToMessage(code: string): string {
  const messages: Record<string, string> = {
    '00': 'Approved / Success',
    '01': 'Pending — poll requery',
    '05': 'Do not honor',
    '06': 'General error',
    '12': 'Invalid transaction',
    '14': 'Invalid card number',
    '25': 'Unable to locate record',
    '51': 'Insufficient funds',
    '54': 'Expired card',
    '57': 'Transaction not permitted to cardholder',
    '62': 'Restricted card',
    '65': 'Exceeds withdrawal limit',
    '68': 'Response received too late',
    '91': 'Issuer or switch inoperative',
    '96': 'System malfunction',
    '90000': 'Successful',
    S00: 'Salary lending success',
    S201: 'Salary repayment notification successful',
  };
  return messages[code] ?? (PENDING_CODES.has(code) ? 'Pending / in progress' : 'No response message provided');
}

function extractString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
    if (typeof value === 'number') {
      return String(value);
    }
  }
  return undefined;
}
