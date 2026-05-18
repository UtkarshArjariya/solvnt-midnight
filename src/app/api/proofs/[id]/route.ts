import { NextResponse } from 'next/server';
import { ProofPackageSchema } from '@/lib/schemas';
import { getRequest, readProof, submitProof } from '@/lib/store';
import { verifyProof } from '@/lib/verify';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const parsed = ProofPackageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'malformed_proof' }, { status: 400 });
  }
  if (parsed.data.requestId !== params.id) {
    return NextResponse.json({ error: 'request_id_mismatch' }, { status: 400 });
  }
  const request = getRequest(params.id);
  if (!request) {
    return NextResponse.json({ error: 'request_not_found' }, { status: 404 });
  }
  const verification = verifyProof(parsed.data, request);
  if (!verification.verified) {
    return NextResponse.json({ error: verification.reason }, { status: 400 });
  }
  const ok = submitProof(params.id, parsed.data);
  if (!ok) return NextResponse.json({ error: 'submit_failed' }, { status: 500 });
  return NextResponse.json({ status: 'received' }, { status: 200 });
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const slot = readProof(params.id);
  return NextResponse.json(slot);
}
