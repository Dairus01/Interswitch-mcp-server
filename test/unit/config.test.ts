import assert from 'node:assert/strict';
import { config, getConfigSummary, validateProductionConfig } from '../../src/config/config.js';

describe('configuration safety', () => {
  const originalEnv = config.env;
  const originalReadOnly = config.readOnly;
  const originalDebug = config.debug;
  const originalCore = { ...config.core };
  const originalCard360 = { ...config.card360 };
  const originalTransactionSearch = { ...config.transactionSearch };
  const originalAgency = { ...config.agency };

  afterEach(() => {
    config.env = originalEnv;
    config.readOnly = originalReadOnly;
    config.debug = originalDebug;
    config.core = { ...originalCore };
    config.card360 = { ...originalCard360 };
    config.transactionSearch = { ...originalTransactionSearch };
    config.agency = { ...originalAgency };
  });

  it('returns no production warnings in sandbox', () => {
    config.env = 'sandbox';
    assert.deepEqual(validateProductionConfig(), []);
  });

  it('warns instead of throwing for missing production credentials', () => {
    config.env = 'production';
    config.readOnly = false;
    config.debug = true;
    config.core = {};
    const warnings = validateProductionConfig();
    assert.ok(warnings.some((warning) => warning.includes('core credentials are missing')));
    assert.ok(warnings.some((warning) => warning.includes('INTERSWITCH_READ_ONLY=false')));
    assert.ok(warnings.some((warning) => warning.includes('DEBUG=true')));
  });

  it('does not leak secret values in config summary', () => {
    config.core = {
      clientId: 'client-id-secret-value',
      clientSecret: 'client-secret-value',
      merchantCode: 'merchant-secret-value',
      payableCode: 'payable-secret-value',
      initiatingEntityCode: 'entity-secret-value',
      terminalId: 'terminal-secret-value',
    };
    const serialized = JSON.stringify(getConfigSummary());
    assert.equal(serialized.includes('client-secret-value'), false);
    assert.equal(serialized.includes('client-id-secret-value'), false);
    assert.equal(serialized.includes('merchant-secret-value'), false);
    assert.equal(serialized.includes('payable-secret-value'), false);
    assert.equal(serialized.includes('entity-secret-value'), false);
    assert.equal(serialized.includes('terminal-secret-value'), false);
  });
});
