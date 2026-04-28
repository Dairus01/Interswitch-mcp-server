import crypto from 'node:crypto';

export function sha512Hex(input: string): string {
  return crypto.createHash('sha512').update(input, 'utf8').digest('hex');
}

export function hmacHex(algorithm: string, secret: string, input: string): string {
  return crypto.createHmac(algorithm, secret).update(input, 'utf8').digest('hex');
}

export function hmacBase64(algorithm: string, secret: string, input: string): string {
  return crypto.createHmac(algorithm, secret).update(input, 'utf8').digest('base64');
}

export function buildSingleTransferMac(input: {
  initiatingAmount: number;
  initiatingCurrencyCode: string | number;
  initiatingPaymentMethodCode: string;
  terminatingAmount: number;
  terminatingCurrencyCode: string | number;
  terminatingPaymentMethodCode: string;
  terminatingCountryCode: string;
}): string {
  return sha512Hex(
    `${input.initiatingAmount}${input.initiatingCurrencyCode}${input.initiatingPaymentMethodCode}${input.terminatingAmount}${input.terminatingCurrencyCode}${input.terminatingPaymentMethodCode}${input.terminatingCountryCode}`,
  );
}
