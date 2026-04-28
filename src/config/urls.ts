import type { InterswitchEnvironment } from '../types/common.js';

export interface BaseUrls {
  main: string;
  passport: string;
  transactionSearch: string;
  card360: string;
  payouts: string;
  sandboxApi: string;
  agency: string;
}

export function getBaseUrls(env: InterswitchEnvironment): BaseUrls {
  if (env === 'production') {
    return {
      main: 'https://api.interswitchng.com',
      passport: 'https://passport.interswitchng.com',
      transactionSearch: 'https://transactionSearch.interswitchng.com',
      card360: 'https://api.interswitchng.com',
      payouts: 'https://payouts.interswitchng.com',
      sandboxApi: 'https://api.interswitchng.com',
      agency: 'https://api.interswitchng.com',
    };
  }

  return {
    main: 'https://qa.interswitchng.com',
    passport: 'https://passport-v2.k8.isw.la',
    transactionSearch: 'https://transactionSearch.interswitchng.com',
    card360: 'https://payment-api.k8.isw.la',
    payouts: 'https://isw-payout-service.k8.isw.la',
    sandboxApi: 'https://sandbox.interswitchng.com',
    agency: 'https://qa.interswitchng.com',
  };
}
