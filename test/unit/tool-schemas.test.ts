import assert from 'node:assert/strict';
import { registeredTools } from '../../src/tools/registry.js';

function toolSchema(name: string) {
  const tool = registeredTools.find((candidate) => candidate.definition.name === name);
  assert.ok(tool, `${name} should be registered`);
  return tool.definition.inputSchema as Record<string, unknown>;
}

describe('tool MCP schemas', () => {
  it('exposes bulk transfer item fields', () => {
    const schema = toolSchema('isw_bulk_transfer');
    const properties = schema.properties as Record<string, unknown>;
    const transactions = properties.transactions as Record<string, unknown>;
    const item = transactions.items as Record<string, unknown>;
    const itemProperties = item.properties as Record<string, unknown>;

    assert.ok(itemProperties.beneficiaryAccountName);
    assert.ok(itemProperties.beneficiaryAccountNumber);
    assert.ok(itemProperties.beneficiaryBankCode);
    assert.ok(itemProperties.senderName);
    assert.ok(itemProperties.transactionRef);
    assert.deepEqual(item.required, ['beneficiaryAccountName', 'beneficiaryAccountNumber', 'beneficiaryBankCode', 'senderName', 'transactionRef']);
  });

  it('exposes bulk paycode item fields', () => {
    const schema = toolSchema('isw_create_bulk_paycodes');
    const properties = schema.properties as Record<string, unknown>;
    const paycodes = properties.paycodes as Record<string, unknown>;
    const item = paycodes.items as Record<string, unknown>;
    const itemProperties = item.properties as Record<string, unknown>;

    assert.ok(itemProperties.customerId);
    assert.ok(itemProperties.transactionRef);
    assert.ok(itemProperties.expiryDate);
    assert.deepEqual(item.required, ['customerId', 'transactionRef', 'expiryDate']);
  });

  it('marks cardPan as required for Card 360 card path write tools', () => {
    for (const name of ['isw_block_card', 'isw_unblock_card', 'isw_block_prepaid_card', 'isw_unblock_prepaid_card', 'isw_link_card_to_account']) {
      const schema = toolSchema(name);
      assert.deepEqual(schema.required, ['cardPan'], `${name} should require cardPan`);
    }
  });
});
