import assert from 'node:assert/strict';
import { nairaToKobo, koboToNaira, resolveKoboAmount } from '../../src/utils/amount.js';

describe('amount utilities', () => {
  it('converts naira to kobo', () => {
    assert.equal(nairaToKobo(100), 10000);
  });

  it('rejects naira amounts with more than two decimal places', () => {
    assert.throws(() => nairaToKobo(10.999), /at most two decimal places/);
  });

  it('allows naira amounts with exactly two decimal places', () => {
    assert.equal(nairaToKobo(10.99), 1099);
  });

  it('converts one-decimal naira amounts exactly', () => {
    assert.equal(nairaToKobo(10.1), 1010);
  });

  it('converts kobo to naira', () => {
    assert.equal(koboToNaira(10000), 100);
  });

  it('requires exactly one amount field', () => {
    assert.throws(() => resolveKoboAmount({}), /exactly one/);
    assert.throws(() => resolveKoboAmount({ amountNaira: 1, amountKobo: 100 }), /exactly one/);
  });
});
