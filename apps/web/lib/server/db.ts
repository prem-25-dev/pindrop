import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

/*
 * Accounts live in a small SQLite file (Node's built-in driver, no extra service to run).
 * DATABASE_PATH points it at a persistent volume in production. The plan is Postgres once
 * the community features need it; the queries here are plain SQL and move over as they are.
 */

export const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), '.data');

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (db) return db;
  const file = process.env.DATABASE_PATH ?? path.join(DATA_DIR, 'pinpoint.db');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      name TEXT NOT NULL,
      password_hash TEXT,
      google_sub TEXT UNIQUE,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS profiles (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  return db;
}

export interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string | null;
  google_sub: string | null;
  created_at: string;
}

export const users = {
  byId: (id: string) => getDb().prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined,
  byEmail: (email: string) => getDb().prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined,
  byGoogle: (sub: string) => getDb().prepare('SELECT * FROM users WHERE google_sub = ?').get(sub) as UserRow | undefined,
  create: (u: Omit<UserRow, 'created_at'>) => {
    getDb()
      .prepare('INSERT INTO users (id, email, name, password_hash, google_sub, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(u.id, u.email, u.name, u.password_hash, u.google_sub, new Date().toISOString());
    return users.byId(u.id)!;
  },
  linkGoogle: (id: string, sub: string) => getDb().prepare('UPDATE users SET google_sub = ? WHERE id = ?').run(sub, id),
  rename: (id: string, name: string) => getDb().prepare('UPDATE users SET name = ? WHERE id = ?').run(name, id),
  remove: (id: string) => getDb().prepare('DELETE FROM users WHERE id = ?').run(id),
};

export const profiles = {
  get: (userId: string) => getDb().prepare('SELECT data, updated_at FROM profiles WHERE user_id = ?').get(userId) as { data: string; updated_at: string } | undefined,
  put: (userId: string, data: string) =>
    getDb()
      .prepare('INSERT INTO profiles (user_id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at')
      .run(userId, data, new Date().toISOString()),
};
