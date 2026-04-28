import assert from 'node:assert/strict';
import { redact } from '../../src/utils/redaction.js';

describe('redaction', () => {
  it('masks PAN-like values and sensitive keys', () => {
    const result = redact({ pan: '5061050254756707864', nested: { note: 'card 5061050254756707864', token: 'secret' } }) as Record<string, unknown>;
    assert.equal(result.pan, '[REDACTED]');
    assert.deepEqual(result.nested, { note: 'card 506105******7864', token: '[REDACTED]' });
  });
});
