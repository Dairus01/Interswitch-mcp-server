import { AxiosError } from 'axios';
import { ZodError } from 'zod';
import { normalizeResponse } from './normalizer.js';

export class InterswitchError extends Error {
  constructor(
    public readonly responseCode: string,
    public readonly responseDescription: string,
    public readonly httpStatus: number,
    public readonly raw?: unknown,
  ) {
    super(`ISW ${responseCode}: ${responseDescription}`);
  }

  get isRetryable(): boolean {
    return ['01', '09', '91', '96', '90009'].includes(this.responseCode);
  }
}

export function toInterswitchError(error: unknown): InterswitchError {
  if (error instanceof InterswitchError) {
    return error;
  }

  if (error instanceof ZodError) {
    return new InterswitchError('INVALID_INPUT', error.message, 400, error.flatten());
  }

  if (error instanceof AxiosError) {
    if (!error.response) {
      return new InterswitchError('96', error.message, 503, { code: error.code });
    }

    const normalized = normalizeResponse(error.response.data ?? { message: error.message });
    return new InterswitchError(normalized.responseCode, normalized.message, error.response.status, normalized.raw);
  }

  if (error instanceof Error) {
    return new InterswitchError('CLIENT_ERROR', error.message, 0);
  }

  return new InterswitchError('CLIENT_ERROR', 'Unknown error', 0, error);
}

export function errorResponse(error: unknown) {
  const iswError = toInterswitchError(error);
  return {
    success: false,
    responseCode: iswError.responseCode,
    message: iswError.responseDescription,
    data: null,
    raw: iswError.raw,
  };
}
