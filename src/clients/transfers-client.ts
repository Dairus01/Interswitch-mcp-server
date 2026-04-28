import { config } from '../config/config.js';
import { getBaseUrls } from '../config/urls.js';
import { passportTokenManager } from '../auth/passport-token-manager.js';
import type { BankCodeResponse, TransferResponse } from '../types/transfer.types.js';
import { BaseClient } from './base-client.js';

const urls = getBaseUrls(config.env);
export const transfersClient = new BaseClient<TransferResponse | BankCodeResponse>(urls.main, passportTokenManager);
