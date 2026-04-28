import axios from 'axios';
import { config } from '../config/config.js';
import { getBaseUrls } from '../config/urls.js';

interface AgencyTokenCache {
  token: string;
  expiresAt: number;
}

export class AgencyTokenManager {
  private cache: AgencyTokenCache | null = null;
  private pendingFetch: Promise<string> | null = null;
  private readonly http = axios.create({ timeout: 30_000 });

  async getToken(): Promise<string> {
    if (this.cache && Date.now() < this.cache.expiresAt - 60_000) {
      return this.cache.token;
    }

    if (!this.pendingFetch) {
      this.pendingFetch = this.fetchToken().finally(() => {
        this.pendingFetch = null;
      });
    }

    return this.pendingFetch;
  }

  invalidate(): void {
    this.cache = null;
    this.pendingFetch = null;
  }

  private async fetchToken(): Promise<string> {
    if (!config.agency.merchantId || !config.agency.terminalId) {
      throw new Error('Agency Banking credentials are not configured.');
    }

    const urls = getBaseUrls(config.env);
    const xml = `<tokenRequest><merchantId>${escapeXml(config.agency.merchantId)}</merchantId><terminalId>${escapeXml(config.agency.terminalId)}</terminalId></tokenRequest>`;
    const response = await this.http.post(`${urls.agency}/kmw/requesttoken/perform-process`, xml, {
      headers: { 'Content-Type': 'application/xml', Accept: 'application/xml' },
    });

    const body = String(response.data);
    const token = body.match(/<token>([^<]+)<\/token>/)?.[1];
    if (!token) {
      throw new Error('Agency Banking token response did not include token.');
    }

    this.cache = { token, expiresAt: Date.now() + 24 * 60 * 60 * 1000 };
    return token;
  }
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'\"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char] as string);
}

export const agencyTokenManager = new AgencyTokenManager();
