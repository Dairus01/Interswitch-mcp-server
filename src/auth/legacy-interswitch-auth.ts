import crypto from 'node:crypto';

export function buildLegacyInterswitchAuthHeaders(input: {
  method: string;
  url: string;
  clientId: string;
  clientSecret: string;
  nonce?: string;
  timestamp?: number;
}): Record<string, string> {
  const nonce = input.nonce ?? crypto.randomBytes(16).toString('hex');
  const timestamp = String(input.timestamp ?? Math.floor(Date.now() / 1000));
  const signatureBase = `${input.method.toUpperCase()}&${encodeURIComponent(input.url)}&${timestamp}&${nonce}&${input.clientId}&${input.clientSecret}`;
  const signature = crypto.createHash('sha1').update(signatureBase).digest('base64');

  return {
    Authorization: `InterswitchAuth ${Buffer.from(input.clientId).toString('base64')}`,
    Timestamp: timestamp,
    Nonce: nonce,
    Signature: signature,
    SignatureMethod: 'SHA1',
    'Content-Type': 'application/json',
  };
}
