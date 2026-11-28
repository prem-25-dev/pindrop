import type { NextRequest } from 'next/server';
import { users } from '@/lib/server/db';
import { cleanName, clearSession, currentUser, googleConfigured, json, publicUser, sameOrigin } from '@/lib/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** who is signed in, and which sign-in methods this server offers */
export async function GET(req: NextRequest) {
  const user = currentUser(req);
  return json({ user: user ? publicUser(user) : null, providers: { google: googleConfigured(), email: true } });
}

/** change the display name */
export async function PATCH(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: 'Bad request' }, 400);
  const user = currentUser(req);
  if (!user) return json({ error: 'Not signed in' }, 401);
  const { name } = (await req.json().catch(() => ({}))) as { name?: string };
  const clean = cleanName(name);
  if (!clean) return json({ error: 'Pick a name' }, 400);
  users.rename(user.id, clean);
  return json({ user: publicUser(users.byId(user.id)!) });
}

/** delete the account and everything stored with it */
export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: 'Bad request' }, 400);
  const user = currentUser(req);
  if (!user) return json({ error: 'Not signed in' }, 401);
  users.remove(user.id);
  return clearSession(json({ ok: true }));
}
