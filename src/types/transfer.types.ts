import type { BaseInterswitchResponse } from './common.js';

export interface TransferResponse extends BaseInterswitchResponse {
  transactionRef?: string;
  transferCode?: string;
  beneficiaryAccountNumber?: string;
  beneficiaryBankCode?: string;
}

export interface BankCodeResponse extends BaseInterswitchResponse {
  banks?: Array<{ bankCode?: string; bankName?: string }>;
}
