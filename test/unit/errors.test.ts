import assert from 'node:assert/strict';
import { AxiosError } from 'axios';
import { z } from 'zod';
import { InterswitchError, toInterswitchError } from '../../src/utils/errors.js';

describe('error conversion', () => {
  it('returns the same InterswitchError when passed one', () => {
    const error = new InterswitchError('05', 'Do not honor', 400);
    assert.equal(toInterswitchError(error), error);
  });

  it('converts ZodError to INVALID_INPUT', () => {
    const result = z.object({ value: z.string() }).safeParse({ value: 123 });
    assert.equal(result.success, false);
    const error = toInterswitchError(result.error);
    assert.equal(error.responseCode, 'INVALID_INPUT');
    assert.equal(error.httpStatus, 400);
  });

  it('converts an Axios network error to responseCode 96 and httpStatus 503', () => {
    const axiosError = new AxiosError('socket hang up', 'ECONNRESET');
    const error = toInterswitchError(axiosError);
    assert.equal(error.responseCode, '96');
    assert.equal(error.httpStatus, 503);
  });

  it('converts an Axios API error using the response responseCode', () => {
    const axiosError = new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
      data: { responseCode: '10400', responseDescription: 'Bad request' },
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: {} as never,
    });
    const error = toInterswitchError(axiosError);
    assert.equal(error.responseCode, '10400');
    assert.equal(error.responseDescription, 'Bad request');
    assert.equal(error.httpStatus, 400);
  });

  it('converts a generic Error to CLIENT_ERROR', () => {
    const error = toInterswitchError(new Error('boom'));
    assert.equal(error.responseCode, 'CLIENT_ERROR');
    assert.equal(error.responseDescription, 'boom');
  });
});
