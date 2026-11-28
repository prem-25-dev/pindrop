import type { NextRequest } from 'next/server';
import { users } from '@/lib/server/db';
import { checkPassword, dummyHash, json, publicUser, rateLimited, sameOrigin, withSession } from '@/lib/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** sign in with email and password */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: 'Bad request' }, 400);
  if (rateLimited(req, 'login', 10)) return json({ error: 'Too many tries. Wait a few minutes.' }, 429);
  const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const user = email ? users.byEmail(email) : undefined;
  // always run one hash, so a wrong email takes as long as a wrong password
  const ok = await checkPassword(password, user?.password_hash ?? (await dummyHash()));
  if (!user || !ok) {
    if (user && !user.password_hash) return json({ error: 'This account signs in with Google' }, 401);
    return json({ error: 'Wrong email or password' }, 401);
  }
  return withSession(json({ user: publicUser(user) }), req, user.id);
}
