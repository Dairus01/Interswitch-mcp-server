import axios, { AxiosError, type AxiosInstance, type Method } from 'axios';
import type { BaseTokenManager } from '../auth/base-token-manager.js';
import { toInterswitchError } from '../utils/errors.js';

export interface RequestOptions {
  headers?: Record<string, string>;
  query?: Record<string, unknown>;
  data?: unknown;
}

export class BaseClient<TDefaultResponse = unknown> {
  private readonly http: AxiosInstance;

  constructor(
    private readonly baseUrl: string,
    private readonly tokenManager?: BaseTokenManager,
    private readonly defaultHeaders: Record<string, string> = {},
  ) {
    this.http = axios.create({ baseURL: baseUrl, timeout: 45_000 });
  }

  async request<T = TDefaultResponse>(method: Method, path: string, options: RequestOptions = {}): Promise<T> {
    return this.requestOnce<T>(method, path, options, false);
  }

  async get<T = TDefaultResponse>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('GET', path, options);
  }

  async post<T = TDefaultResponse>(path: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('POST', path, { ...options, data });
  }

  async delete<T = TDefaultResponse>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('DELETE', path, options);
  }

  private async requestOnce<T>(method: Method, path: string, options: RequestOptions, retried: boolean): Promise<T> {
    try {
      const headers: Record<string, string> = { ...this.defaultHeaders, ...options.headers };
      if (this.tokenManager) {
        headers.Authorization = `Bearer ${await this.tokenManager.getToken()}`;
      }

      const response = await this.http.request<T>({
        method,
        url: path,
        params: options.query,
        data: options.data,
        headers,
      });
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 401 && this.tokenManager && !retried) {
        this.tokenManager.invalidate();
        return this.requestOnce<T>(method, path, options, true);
      }
      throw toInterswitchError(error);
    }
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}
