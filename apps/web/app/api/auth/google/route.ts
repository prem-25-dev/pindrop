import { randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { googleConfigured, siteOrigin } from '@/lib/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** start Sign in with Google: send the browser to the consent screen */
export async function GET(req: NextRequest) {
  const origin = siteOrigin(req);
  if (!googleConfigured()) return NextResponse.redirect(`${origin}/login?error=google-off`);
  const state = randomBytes(16).toString('base64url');
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!);
  url.searchParams.set('redirect_uri', `${origin}/api/auth/google/callback`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'select_account');
  const res = NextResponse.redirect(url);
  res.cookies.set('pp_oauth_state', state, { httpOnly: true, sameSite: 'lax', secure: origin.startsWith('https'), path: '/api/auth/google', maxAge: 600 });
  return res;
}
