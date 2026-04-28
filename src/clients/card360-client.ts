import { config } from '../config/config.js';
import { getBaseUrls } from '../config/urls.js';
import { card360TokenManager } from '../auth/card360-token-manager.js';
import type { Card360PagedResponse, Card360Response } from '../types/card360.types.js';
import { BaseClient } from './base-client.js';

const urls = getBaseUrls(config.env);
export const card360Client = new BaseClient<Card360Response | Card360PagedResponse>(urls.card360, card360TokenManager);
