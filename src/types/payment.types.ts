import type { BaseInterswitchResponse } from './common.js';

export interface PaymentResponse extends BaseInterswitchResponse {
  transactionRef?: string;
  merchantCode?: string;
  amount?: number;
}

export interface RefundResponse extends BaseInterswitchResponse {
  refundRef?: string;
  transactionRef?: string;
}
