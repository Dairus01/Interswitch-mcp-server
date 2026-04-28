import type { InterswitchEnvironment } from './common.js';

export interface AppConfig {
  env: InterswitchEnvironment;
  readOnly: boolean;
  requireConfirmation: boolean;
  core: {
    clientId?: string;
    clientSecret?: string;
    merchantCode?: string;
    payableCode?: string;
    initiatingEntityCode?: string;
    terminalId?: string;
  };
  card360: {
    clientId?: string;
    clientSecret?: string;
    rsaPublicKey?: string;
  };
  transactionSearch: {
    clientId?: string;
    clientSecret?: string;
  };
  agency: {
    merchantId?: string;
    terminalId?: string;
  };
  legacyAuthEnabled: boolean;
  debug: boolean;
}
