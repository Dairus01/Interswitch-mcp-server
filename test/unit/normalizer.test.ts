import assert from 'node:assert/strict';
import { normalizeResponse } from '../../src/utils/normalizer.js';

describe('normalizer', () => {
  it('recognizes success response codes', () => {
    const result = normalizeResponse({ responseCode: '00', responseMessage: 'Approved', data: { ok: true } });
    assert.equal(result.success, true);
    assert.equal(result.responseCode, '00');
  });

  it('redacts raw sensitive values', () => {
    const result = normalizeResponse({ responseCode: '00', token: 'abc' });
    assert.deepEqual(result.raw, { responseCode: '00', token: '[REDACTED]' });
  });
});
