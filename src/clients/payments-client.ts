import { config } from '../config/config.js';
import { getBaseUrls } from '../config/urls.js';
import { passportTokenManager } from '../auth/passport-token-manager.js';
import type { PaymentResponse, RefundResponse } from '../types/payment.types.js';
import { BaseClient } from './base-client.js';

const urls = getBaseUrls(config.env);
export const paymentsClient = new BaseClient<PaymentResponse | RefundResponse>(urls.main, passportTokenManager);
