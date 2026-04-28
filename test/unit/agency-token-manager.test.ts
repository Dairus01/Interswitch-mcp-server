import assert from 'node:assert/strict';
import nock from 'nock';
import { AgencyTokenManager } from '../../src/auth/agency-token-manager.js';
import { config } from '../../src/config/config.js';

describe('AgencyTokenManager', () => {
  const originalEnv = config.env;
  const originalAgency = { ...config.agency };

  afterEach(() => {
    nock.cleanAll();
    config.env = originalEnv;
    config.agency = { ...originalAgency };
  });

  it('coalesces concurrent token fetches', async () => {
    config.env = 'sandbox';
    config.agency = { merchantId: 'merchant-1', terminalId: 'terminal-1' };

    const scope = nock('https://qa.interswitchng.com')
      .post('/kmw/requesttoken/perform-process')
      .once()
      .reply(200, '<tokenResponse><token>agency-token</token></tokenResponse>');

    const manager = new AgencyTokenManager();
    const [firstToken, secondToken] = await Promise.all([manager.getToken(), manager.getToken()]);

    assert.equal(firstToken, 'agency-token');
    assert.equal(secondToken, 'agency-token');
    assert.equal(scope.isDone(), true);
  });
});
