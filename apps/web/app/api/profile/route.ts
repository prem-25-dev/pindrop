import type { NextRequest } from 'next/server';
import { profiles } from '@/lib/server/db';
import { currentUser, json, sameOrigin } from '@/lib/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 1_000_000;

/** your saved progress: passport, game history, coins and items */
export async function GET(req: NextRequest) {
  const user = currentUser(req);
  if (!user) return json({ error: 'Not signed in' }, 401);
  const row = profiles.get(user.id);
  return json({ profile: row ? JSON.parse(row.data) : null, updatedAt: row?.updated_at ?? null });
}

export async function PUT(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: 'Bad request' }, 400);
  const user = currentUser(req);
  if (!user) return json({ error: 'Not signed in' }, 401);
  const text = await req.text();
  if (text.length > MAX_BYTES) return json({ error: 'Profile is too large' }, 413);
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return json({ error: 'Bad request' }, 400);
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return json({ error: 'Bad request' }, 400);
  profiles.put(user.id, JSON.stringify(data));
  return json({ ok: true });
}
