import { config } from '../config/config.js';
import { getBaseUrls } from '../config/urls.js';
import { transactionSearchTokenManager } from '../auth/transaction-search-token-manager.js';
import { BaseClient } from './base-client.js';

const urls = getBaseUrls(config.env);
export const transactionSearchClient = new BaseClient(urls.transactionSearch, transactionSearchTokenManager, {
  ClientId: config.transactionSearch.clientId ?? '',
});
