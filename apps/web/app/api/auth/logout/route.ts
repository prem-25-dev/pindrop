import type { NextRequest } from 'next/server';
import { clearSession, json, sameOrigin } from '@/lib/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: 'Bad request' }, 400);
  return clearSession(json({ ok: true }));
}
