import { randomUUID } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { users } from '@/lib/server/db';
import { cleanName, hashPassword, json, publicUser, rateLimited, sameOrigin, validEmail, withSession } from '@/lib/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** create an account with email and password */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: 'Bad request' }, 400);
  if (rateLimited(req, 'signup', 8)) return json({ error: 'Too many tries. Wait a few minutes.' }, 429);
  const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string; name?: string };
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const name = cleanName(body.name) || email.split('@')[0].slice(0, 20);
  if (!validEmail(email)) return json({ error: 'That email does not look right' }, 400);
  if (password.length < 8) return json({ error: 'Use at least 8 characters for the password' }, 400);
  if (password.length > 200) return json({ error: 'That password is too long' }, 400);
  if (users.byEmail(email)) return json({ error: 'There is already an account with that email. Sign in instead.' }, 409);
  const user = users.create({ id: randomUUID(), email, name, password_hash: await hashPassword(password), google_sub: null });
  return withSession(json({ user: publicUser(user) }), req, user.id);
}
