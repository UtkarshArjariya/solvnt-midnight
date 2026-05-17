import { VerificationRequestSchema, type VerificationRequest } from './schemas';

const toBase64Url = (s: string): string => {
  const b64 =
    typeof window === 'undefined'
      ? Buffer.from(s, 'utf-8').toString('base64')
      : btoa(s);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (s: string): string => {
  const pad = (4 - (s.length % 4)) % 4;
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad);
  return typeof window === 'undefined'
    ? Buffer.from(b64, 'base64').toString('utf-8')
    : atob(b64);
};

export const encodeRequest = (request: VerificationRequest): string =>
  toBase64Url(JSON.stringify(request));

export const decodeRequest = (encoded: string): VerificationRequest | null => {
  try {
    const parsed = JSON.parse(fromBase64Url(encoded));
    const r = VerificationRequestSchema.safeParse(parsed);
    return r.success ? r.data : null;
  } catch {
    return null;
  }
};
