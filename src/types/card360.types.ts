import type { BaseInterswitchResponse } from './common.js';

export interface Card360Response extends BaseInterswitchResponse {
  requestRef?: string;
  cardPan?: string;
  accountNumber?: string;
}

export interface Card360PagedResponse extends Card360Response {
  page?: number;
  pageSize?: number;
  totalCount?: number;
}
