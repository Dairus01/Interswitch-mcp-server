import forge from 'node-forge';
import { InterswitchError } from './errors.js';

export function encryptPin(params: {
  pin: string;
  pan: string;
  rsaPublicKeyPem: string | undefined;
}): { encryptedPin: string; encryptedKey: string } {
  if (!params.rsaPublicKeyPem) {
    throw new InterswitchError(
      'CONFIGURATION_ERROR',
      'CARD360_RSA_PUBLIC_KEY is not configured. Card PIN operations require the RSA public key from the Interswitch developer console.',
      0,
    );
  }

  if (!/^\d{4,6}$/.test(params.pin)) {
    throw new InterswitchError('INVALID_INPUT', 'pin must be 4 to 6 digits.', 400);
  }

  if (!/^\d{13,19}$/.test(params.pan)) {
    throw new InterswitchError('INVALID_INPUT', 'pan must be 13 to 19 digits.', 400);
  }

  const pinBlock = buildIso9564Format0PinBlock(params.pin, params.pan);
  const clearKey = forge.random.getBytesSync(16);
  const encryptedPin = encrypt3DesCbcHex(hexToBytes(pinBlock), clearKey);
  const encryptedKey = encryptRsaHex(clearKey, params.rsaPublicKeyPem);

  return { encryptedPin, encryptedKey };
}

// ISO 9564 format 0 is required so Card 360 receives a PIN block, not a reusable plaintext PIN value.
function buildIso9564Format0PinBlock(pin: string, pan: string): string {
  const pinField = `0${pin.length}${pin}`.padEnd(16, 'F');
  const accountNumber = pan.slice(0, -1).slice(-12);
  const panField = `0000${accountNumber}`;

  const pinValue = BigInt(`0x${pinField}`);
  const panValue = BigInt(`0x${panField}`);
  return (pinValue ^ panValue).toString(16).toUpperCase().padStart(16, '0');
}

function encrypt3DesCbcHex(pinBlock: string, clearKey: string): string {
  const key = clearKey + clearKey.slice(0, 8);
  const cipher = forge.cipher.createCipher('3DES-CBC', key);
  cipher.start({ iv: '\0'.repeat(8) });
  cipher.update(forge.util.createBuffer(pinBlock, 'raw'));
  cipher.finish();
  return forge.util.bytesToHex(cipher.output.getBytes()).toUpperCase();
}

function encryptRsaHex(clearKey: string, rsaPublicKeyPem: string): string {
  let publicKey: forge.pki.rsa.PublicKey;
  try {
    publicKey = forge.pki.publicKeyFromPem(rsaPublicKeyPem);
  } catch {
    throw new InterswitchError(
      'CONFIGURATION_ERROR',
      'CARD360_RSA_PUBLIC_KEY is not a valid RSA public key PEM. Check the key from the Interswitch developer console.',
      0,
    );
  }
  const encrypted = publicKey.encrypt(clearKey, 'RSAES-PKCS1-V1_5');
  return forge.util.bytesToHex(encrypted).toUpperCase();
}

function hexToBytes(hex: string): string {
  return forge.util.hexToBytes(hex);
}
