import { config } from '../config/config.js';
import { getBaseUrls } from '../config/urls.js';
import { passportTokenManager } from '../auth/passport-token-manager.js';
import { BaseClient } from './base-client.js';

const urls = getBaseUrls(config.env);
export const transferServiceClient = new BaseClient(urls.main, passportTokenManager);
