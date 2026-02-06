import crypto from 'crypto';

export function base64UrlEncode(input: Buffer): string {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function generateRandomBase64Url(bytes = 32): string {
  return base64UrlEncode(crypto.randomBytes(bytes));
}

export function sha256Base64Url(input: string): string {
  const hash = crypto.createHash('sha256').update(input).digest();
  return base64UrlEncode(hash);
}

export function generatePkcePair(): { verifier: string; challenge: string } {
  const verifier = generateRandomBase64Url(48);
  const challenge = sha256Base64Url(verifier);
  return { verifier, challenge };
}
