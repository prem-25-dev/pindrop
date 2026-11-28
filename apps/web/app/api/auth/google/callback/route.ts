import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { users } from '@/lib/server/db';
import { cleanName, googleConfigured, siteOrigin, withSession } from '@/lib/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Google sends the user back here with a one-time code; swap it for their identity */
export async function GET(req: NextRequest) {
  const origin = siteOrigin(req);
  const fail = (why: string) => {
    const res = NextResponse.redirect(`${origin}/login?error=${why}`);
    res.cookies.set('pp_oauth_state', '', { path: '/api/auth/google', maxAge: 0 });
    return res;
  };
  if (!googleConfigured()) return fail('google-off');
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  if (!code || !state || state !== req.cookies.get('pp_oauth_state')?.value) return fail('google-state');

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${origin}/api/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  }).catch(() => null);
  if (!tokenRes?.ok) return fail('google-token');
  const { id_token } = (await tokenRes.json()) as { id_token?: string };
  if (!id_token) return fail('google-token');

  // the ID token came straight from the Google token endpoint over TLS, so its claims can be read
  // directly (OpenID Connect Core 3.1.3.7); still check who it is for and that it is current
  let claims: { iss?: string; aud?: string; exp?: number; sub?: string; email?: string; email_verified?: boolean; name?: string };
  try {
    claims = JSON.parse(Buffer.from(id_token.split('.')[1], 'base64url').toString());
  } catch {
    return fail('google-token');
  }
  const okIssuer = claims.iss === 'https://accounts.google.com' || claims.iss === 'accounts.google.com';
  if (!okIssuer || claims.aud !== process.env.GOOGLE_CLIENT_ID || !claims.sub || (claims.exp ?? 0) * 1000 < Date.now()) return fail('google-token');
  if (!claims.email || !claims.email_verified) return fail('google-email');

  const email = claims.email.toLowerCase();
  let user = users.byGoogle(claims.sub);
  if (!user) {
    const existing = users.byEmail(email);
    if (existing) {
      // same verified email: link Google to the account that already exists
      users.linkGoogle(existing.id, claims.sub);
      user = users.byId(existing.id)!;
    } else {
      user = users.create({ id: randomUUID(), email, name: cleanName(claims.name) || email.split('@')[0].slice(0, 20), password_hash: null, google_sub: claims.sub });
    }
  }
  const res = NextResponse.redirect(`${origin}/account`);
  res.cookies.set('pp_oauth_state', '', { path: '/api/auth/google', maxAge: 0 });
  return withSession(res, req, user.id);
}
