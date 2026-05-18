import { NextResponse } from 'next/server';
import { z } from 'zod';
import { putRequest } from '@/lib/store';
import { ClaimTypeSchema, CurrencySchema, type VerificationRequest } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

const CreateBody = z.object({
  threshold: z.number().int().positive(),
  claimType: ClaimTypeSchema,
  currency: CurrencySchema,
  verifierLabel: z.string().min(1).max(64).optional(),
  ttlSeconds: z.number().int().positive().max(60 * 60).default(15 * 60),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = CreateBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body', detail: parsed.error.flatten() }, { status: 400 });
  }
  const { threshold, claimType, currency, verifierLabel, ttlSeconds } = parsed.data;
  const request: VerificationRequest = {
    requestId: crypto.randomUUID(),
    threshold,
    claimType,
    currency,
    expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    ...(verifierLabel ? { verifierLabel } : {}),
  };
  putRequest(request);
  return NextResponse.json(request, { status: 201 });
}
