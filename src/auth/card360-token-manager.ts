import { config } from '../config/config.js';
import { getBaseUrls } from '../config/urls.js';
import { BaseTokenManager } from './base-token-manager.js';

const urls = getBaseUrls(config.env);

export const card360TokenManager = new BaseTokenManager({
  tokenUrl: `${urls.passport}/passport/oauth/token`,
  clientId: config.card360.clientId,
  clientSecret: config.card360.clientSecret,
  label: 'Card 360',
});
