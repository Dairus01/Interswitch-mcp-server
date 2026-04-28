export type InterswitchEnvironment = 'sandbox' | 'production';
export type ToolMode = 'read' | 'write';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface NormalizedResponse<T = unknown> {
  success: boolean;
  responseCode: string;
  message: string;
  data: T | null;
  raw: unknown;
}

export interface BaseInterswitchResponse {
  responseCode?: string;
  ResponseCode?: string;
  responseMessage?: string;
  responseDescription?: string;
  ResponseDescription?: string;
  message?: string;
  transactionRef?: string;
  [key: string]: unknown;
}

export interface InterswitchTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in: number;
  scope?: string;
  [key: string]: unknown;
}

export interface DomainCredentialState {
  configured: boolean;
  label: string;
}
