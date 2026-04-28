import assert from 'node:assert/strict';
import { config } from '../../src/config/config.js';
import { requireWriteConfirmation } from '../../src/utils/confirmation.js';

describe('confirmation gate', () => {
  const originalReadOnly = config.readOnly;
  const originalRequireConfirmation = config.requireConfirmation;

  afterEach(() => {
    config.readOnly = originalReadOnly;
    config.requireConfirmation = originalRequireConfirmation;
  });

  it('throws when confirm is missing from a write tool', () => {
    assert.throws(() => requireWriteConfirmation('test_write', {}, 'write', 'medium'), /requires explicit confirmation/);
  });

  it('throws when confirm is false for a write tool', () => {
    assert.throws(() => requireWriteConfirmation('test_write', { confirm: false }, 'write', 'medium'), /requires explicit confirmation/);
  });

  it('passes when confirm is true for a write tool', () => {
    assert.doesNotThrow(() => requireWriteConfirmation('test_write', { confirm: true }, 'write', 'medium'));
  });

  it('throws when read-only mode is enabled even with confirm true', () => {
    config.readOnly = true;
    assert.throws(() => requireWriteConfirmation('test_write', { confirm: true }, 'write', 'medium'), /INTERSWITCH_READ_ONLY=true/);
  });

  it('requires confirmation for high-risk read tools', () => {
    assert.throws(() => requireWriteConfirmation('test_read', {}, 'read', 'high'), /requires explicit confirmation/);
    assert.doesNotThrow(() => requireWriteConfirmation('test_read', { confirm: true }, 'read', 'high'));
  });

  it('allows high-risk read tools in read-only mode when confirmed', () => {
    config.readOnly = true;
    assert.doesNotThrow(() => requireWriteConfirmation('test_read', { confirm: true }, 'read', 'high'));
  });

  it('does not require confirmation for low-risk reads', () => {
    config.requireConfirmation = true;
    assert.doesNotThrow(() => requireWriteConfirmation('test_read', {}, 'read', 'low'));
  });
});
