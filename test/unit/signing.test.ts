import assert from 'node:assert/strict';
import { buildSingleTransferMac, hmacHex } from '../../src/utils/signing.js';

describe('signing utilities', () => {
  it('computes deterministic hmac hex', () => {
    assert.equal(hmacHex('sha256', 'secret', 'abc'), hmacHex('sha256', 'secret', 'abc'));
  });

  it('computes transfer mac as sha512 hex', () => {
    const mac = buildSingleTransferMac({ initiatingAmount: 100, initiatingCurrencyCode: 566, initiatingPaymentMethodCode: 'CA', terminatingAmount: 100, terminatingCurrencyCode: 566, terminatingPaymentMethodCode: 'AC', terminatingCountryCode: 'NG' });
    assert.equal(mac.length, 128);
  });
});
