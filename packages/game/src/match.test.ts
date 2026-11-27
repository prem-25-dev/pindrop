import { test } from 'node:test';
import assert from 'node:assert/strict';
import { judge, normalize } from './match.ts';
import { pinPoints, haversineKm, answerPoints } from './scoring.ts';
import { createRng, shuffle } from './rng.ts';

const C = (code: string, name: string, aliases: string[] = [], official?: string) => ({ code, name, aliases, official });
const ALL = [
  C('NE', 'Niger'), C('NG', 'Nigeria'), C('AT', 'Austria', ['Österreich']), C('AU', 'Australia'),
  C('PH', 'Philippines'), C('CI', 'Ivory Coast', ["Côte d'Ivoire"]), C('ML', 'Mali'), C('MW', 'Malawi'),
  C('IR', 'Iran'), C('IQ', 'Iraq'), C('DE', 'Germany', ['Deutschland']), C('US', 'United States', ['USA', 'United States of America']),
];
const t = (code: string) => ALL.find((c) => c.code === code)!;

test('normalize strips accents, case, punctuation and a leading "the"', () => {
  assert.equal(normalize("  Côte d’Ivoire "), 'cote divoire');
  assert.equal(normalize('The Gambia'), 'gambia');
});

test('navigator accepts small typos', () => {
  assert.equal(judge('Phillipines', t('PH'), ALL, 'navigator').correct, true);
  assert.equal(judge('australa', t('AU'), ALL, 'navigator').correct, true);
});

test("another country's exact name is never a near miss", () => {
  assert.equal(judge('Niger', t('NG'), ALL, 'navigator').correct, false);
  assert.equal(judge('Austria', t('AU'), ALL, 'navigator').correct, false);
  assert.equal(judge('Iraq', t('IR'), ALL, 'navigator').correct, false);
  assert.equal(judge('Mali', t('MW'), ALL, 'navigator').correct, false);
});

test('short names need a closer match', () => {
  assert.equal(judge('Mal', t('ML'), ALL, 'navigator').correct, false);
});

test('cartographer needs exact spelling but not case or accents', () => {
  assert.equal(judge('Phillipines', t('PH'), ALL, 'cartographer').correct, false);
  assert.equal(judge('PHILIPPINES', t('PH'), ALL, 'cartographer').correct, true);
  assert.equal(judge('cote divoire', t('CI'), ALL, 'cartographer').correct, true);
  assert.equal(judge('Deutschland', t('DE'), ALL, 'cartographer').correct, true);
});

test('scoring', () => {
  assert.equal(pinPoints(0), 5000);
  assert.ok(pinPoints(2000) < 2000 && pinPoints(2000) > 1700);
  assert.equal(answerPoints({ correct: true, difficulty: 'cartographer', streak: 0 }), 200);
  const london: [number, number] = [-0.1276, 51.5072];
  const paris: [number, number] = [2.3522, 48.8566];
  assert.ok(Math.abs(haversineKm(london, paris) - 344) < 5);
});

test('seeded shuffles repeat', () => {
  const a = shuffle([1, 2, 3, 4, 5, 6], createRng('daily:2026-11-27'));
  const b = shuffle([1, 2, 3, 4, 5, 6], createRng('daily:2026-11-27'));
  assert.deepEqual(a, b);
});
