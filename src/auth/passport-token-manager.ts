import { config } from '../config/config.js';
import { getBaseUrls } from '../config/urls.js';
import { BaseTokenManager } from './base-token-manager.js';

const urls = getBaseUrls(config.env);

export const passportTokenManager = new BaseTokenManager({
  tokenUrl: `${urls.passport}/passport/oauth/token`,
  clientId: config.core.clientId,
  clientSecret: config.core.clientSecret,
  label: 'Interswitch Passport',
});
