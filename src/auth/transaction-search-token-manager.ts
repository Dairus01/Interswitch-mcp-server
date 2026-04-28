import { config } from '../config/config.js';
import { getBaseUrls } from '../config/urls.js';
import { BaseTokenManager } from './base-token-manager.js';

const urls = getBaseUrls(config.env);

export const transactionSearchTokenManager = new BaseTokenManager({
  tokenUrl: `${urls.transactionSearch}/api/v3/transaction-search/token`,
  clientId: config.transactionSearch.clientId,
  clientSecret: config.transactionSearch.clientSecret,
  label: 'Transaction Search',
  method: 'GET',
});
