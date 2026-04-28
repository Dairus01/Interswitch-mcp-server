import axios, { type AxiosInstance } from 'axios';
import type { InterswitchTokenResponse } from '../types/common.js';

export interface TokenManagerOptions {
  tokenUrl: string;
  clientId?: string;
  clientSecret?: string;
  label: string;
  method?: 'GET' | 'POST';
}

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

export class BaseTokenManager {
  private cache: TokenCache | null = null;
  private pendingFetch: Promise<string> | null = null;
  private readonly refreshBufferMs = 60_000;
  private readonly http: AxiosInstance;

  constructor(private readonly options: TokenManagerOptions) {
    this.http = axios.create({ timeout: 30_000 });
  }

  async getToken(): Promise<string> {
    this.ensureConfigured();
    if (this.cache && Date.now() < this.cache.expiresAt - this.refreshBufferMs) {
      return this.cache.accessToken;
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
  }

  protected ensureConfigured(): void {
    if (!this.options.clientId || !this.options.clientSecret) {
      throw new Error(`${this.options.label} credentials are not configured.`);
    }
  }

  protected async fetchToken(): Promise<string> {
    const auth = Buffer.from(`${this.options.clientId}:${this.options.clientSecret}`).toString('base64');
    const method = this.options.method ?? 'POST';
    const response = await this.http.request<InterswitchTokenResponse>({
      method,
      url: this.options.tokenUrl,
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: method === 'POST' ? new URLSearchParams({ grant_type: 'client_credentials' }).toString() : undefined,
    });

    const token = response.data.access_token;
    if (!token) {
      throw new Error(`${this.options.label} token response did not include access_token.`);
    }

    const expiresIn = typeof response.data.expires_in === 'number' ? response.data.expires_in : 3600;
    this.cache = {
      accessToken: token,
      expiresAt: Date.now() + expiresIn * 1000,
    };
    return token;
  }
}
