import { createHmac, randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { NextResponse, type NextRequest } from 'next/server';
import { DATA_DIR, users, type UserRow } from './db';

/*
 * Sessions are a signed cookie (user id + expiry, HMAC-SHA256); passwords are hashed with scrypt.
 * AUTH_SECRET signs the cookie. Without it, a random secret is created once in the data folder,
 * so sessions survive restarts as long as that folder is kept.
 */

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: { N: number; r: number; p: number; maxmem: number }) => Promise<Buffer>;
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
export const SESSION_COOKIE = 'pp_session';
const SESSION_DAYS = 30;

let secret: Buffer | null = null;
function getSecret(): Buffer {
  if (secret) return secret;
  if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32) return (secret = Buffer.from(process.env.AUTH_SECRET));
  const file = path.join(DATA_DIR, 'auth-secret');
  try {
    secret = Buffer.from(fs.readFileSync(file, 'utf8').trim(), 'hex');
  } catch {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const s = randomBytes(32).toString('hex');
    fs.writeFileSync(file, s, { mode: 0o600 });
    secret = Buffer.from(s, 'hex');
    if (process.env.NODE_ENV === 'production') console.warn('[auth] AUTH_SECRET is not set; created one in the data folder');
  }
  return secret;
}

/* ---------------- passwords ---------------- */

export async function hashPassword(pw: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(pw, salt, 64, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function checkPassword(pw: string, stored: string | null) {
  if (!stored) return false;
  const [kind, N, r, p, salt, hash] = stored.split('$');
  if (kind !== 'scrypt') return false;
  const want = Buffer.from(hash, 'base64');
  const got = await scrypt(pw, Buffer.from(salt, 'base64'), want.length, { N: Number(N), r: Number(r), p: Number(p), maxmem: SCRYPT.maxmem });
  return got.length === want.length && timingSafeEqual(got, want);
}

/** a hash to compare against when the email is unknown, so timing does not reveal which emails exist */
let dummy: Promise<string> | null = null;
export const dummyHash = () => (dummy ??= hashPassword(randomUUID()));

/* ---------------- sessions ---------------- */

const sign = (data: string) => createHmac('sha256', getSecret()).update(data).digest('base64url');

export function sessionValue(userId: string) {
  const body = Buffer.from(JSON.stringify({ uid: userId, exp: Date.now() + SESSION_DAYS * 86400_000 })).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function readSession(value: string | undefined): string | null {
  if (!value) return null;
  const [body, mac] = value.split('.');
  if (!body || !mac) return null;
  const want = Buffer.from(sign(body));
  const got = Buffer.from(mac);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  try {
    const { uid, exp } = JSON.parse(Buffer.from(body, 'base64url').toString()) as { uid: string; exp: number };
    return exp > Date.now() ? uid : null;
  } catch {
    return null;
  }
}

const secure = (req: NextRequest) => req.nextUrl.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https';

export function withSession(res: NextResponse, req: NextRequest, userId: string) {
  res.cookies.set(SESSION_COOKIE, sessionValue(userId), { httpOnly: true, sameSite: 'lax', secure: secure(req), path: '/', maxAge: SESSION_DAYS * 86400 });
  return res;
}
export function clearSession(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
  return res;
}

export function currentUser(req: NextRequest): UserRow | null {
  const id = readSession(req.cookies.get(SESSION_COOKIE)?.value);
  return id ? (users.byId(id) ?? null) : null;
}

/** what the browser is told about the signed-in user */
export const publicUser = (u: UserRow) => ({ id: u.id, email: u.email, name: u.name, google: !!u.google_sub, password: !!u.password_hash, since: u.created_at });

/* ---------------- request guards ---------------- */

/** refuse cross-site writes: the Origin must be this site, and the body must be JSON */
export function sameOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (origin) {
    try {
      if (new URL(origin).host !== host) return false;
    } catch {
      return false;
    }
  }
  return (req.headers.get('content-type') ?? '').includes('application/json') || req.method === 'GET' || req.method === 'DELETE';
}

const hits = new Map<string, { n: number; reset: number }>();
/** at most `max` tries per `windowMs` from one address */
export function rateLimited(req: NextRequest, key: string, max = 10, windowMs = 10 * 60_000) {
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'local';
  const k = `${key}:${ip}`;
  const now = Date.now();
  const h = hits.get(k);
  if (!h || h.reset < now) {
    hits.set(k, { n: 1, reset: now + windowMs });
    return false;
  }
  h.n++;
  return h.n > max;
}

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'cache-control': 'no-store' } });

export const validEmail = (e: string) => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(e) && e.length <= 254;
export const cleanName = (n: unknown) => (typeof n === 'string' ? n.replace(/\s+/g, ' ').trim().slice(0, 20) : '');

/** the site's own address, for OAuth redirects (NEXT_PUBLIC_SITE_URL in production) */
export function siteOrigin(req: NextRequest) {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env && !env.includes('localhost')) return env.replace(/\/$/, '');
  return req.nextUrl.origin;
}

export const googleConfigured = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
