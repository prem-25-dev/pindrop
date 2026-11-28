import { randomBytes, randomUUID } from 'node:crypto';
import {
  CODE_ALPHABET, CODE_LENGTH, DEFAULT_PARTY_SETTINGS, PARTY_GAMES, PARTY_LEVELS, PARTY_MAX_PLAYERS, PARTY_ROUNDS, PARTY_SCOPES, PARTY_TIMERS, PARTY_TRIES,
  answerPoints, createRng, judge, pinPoints, regionPoints, scopeScaleKm, shuffle,
  type Difficulty, type PartyAnswer, type PartyChat, type PartyGame, type PartyPhase, type PartyPlayer, type PartyQuestion, type PartyReveal,
  type PartyRoundResult, type PartySettings, type PartyState, type PartyVote,
} from '@pinpoint/game';
import { anonymousFlag, byCode, continentsOf, countries, inScope, kmToCountry, type Country } from './data.ts';

const COUNTDOWN_MS = 3500;
const REVEAL_MS = 6500;
/** a host who drops gets this long to come back before someone else takes over */
const HOST_GRACE_MS = 20_000;
/** in the lobby, a player who dropped loses their seat after this long */
const LOBBY_SEAT_MS = 2 * 60_000;
const CHAT_KEEP = 80;
const CHAT_GAP_MS = 350;
/** typed flags: each later try is worth less */
const TRY_SHARE = [1, 0.7, 0.4];

interface Player extends PartyPlayer {
  token: string;
  joinedAt: number;
  streak: number;
  lastChat: number;
  dropTimer: NodeJS.Timeout | null;
}

/** chat lines a player sends after they solved a typed flag are only shown to others who solved it too */
interface Chat extends PartyChat {
  spoiler?: boolean;
}

const pool195 = countries.filter((c) => c.un195);
const hex = /^#[0-9a-f]{6}$/i;

export function newCode(taken: (code: string) => boolean): string {
  for (;;) {
    const bytes = randomBytes(CODE_LENGTH);
    const code = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
    if (!taken(code)) return code;
  }
}

/** four options for Tourist flags: the answer plus three look-alikes (same subregion, else region, else anywhere) */
function choicesFor(answer: Country, seed: string) {
  const rng = createRng(`choices:${seed}:${answer.code}`);
  const others = pool195.filter((c) => c.code !== answer.code);
  const tiers = [others.filter((c) => c.subregion === answer.subregion), others.filter((c) => c.region === answer.region), others];
  const picked: Country[] = [];
  for (const tier of tiers) for (const c of shuffle(tier, rng)) if (picked.length < 3 && !picked.includes(c)) picked.push(c);
  return shuffle([answer, ...picked], rng).map((c) => ({ code: c.code, name: c.name }));
}

export class Room {
  hostId = '';
  phase: PartyPhase = 'lobby';
  settings: PartySettings = { ...DEFAULT_PARTY_SETTINGS };
  players = new Map<string, Player>();
  votes = new Map<string, PartyVote>();
  chat: Chat[] = [];
  questions: string[] = [];
  index = 0;
  seed = '';
  question: PartyQuestion | null = null;
  reveal: PartyReveal | null = null;
  startsAt: number | null = null;
  answers = new Map<string, PartyRoundResult>();
  lastActive = Date.now();
  private timer: NodeJS.Timeout | null = null;
  private hostTimer: NodeJS.Timeout | null = null;
  private msg = 0;

  constructor(
    readonly code: string,
    /** called after anything changes, to send everyone their view */
    private changed: (room: Room) => void,
    /** called when a new flag question starts (sent once, not with every state) */
    private flagOut: (room: Room, index: number, flag: string) => void,
  ) {}

  /* ---------------- people ---------------- */

  join(name: string, color: string, token?: string, look: { hat?: unknown; glasses?: unknown; title?: unknown } = {}): { ok: true; player: Player } | { ok: false; error: string } {
    const cosmetic = (v: unknown, max = 24) => (typeof v === 'string' && /^[\w ' -]{1,40}$/.test(v) ? v.slice(0, max) : null);
    const wear = { hat: cosmetic(look.hat), glasses: cosmetic(look.glasses), title: cosmetic(look.title) };
    this.lastActive = Date.now();
    const back = token ? [...this.players.values()].find((p) => p.token === token) : undefined;
    if (back) {
      Object.assign(back, wear);
      back.connected = true;
      if (back.dropTimer) clearTimeout(back.dropTimer);
      back.dropTimer = null;
      if (back.id === this.hostId && this.hostTimer) {
        clearTimeout(this.hostTimer);
        this.hostTimer = null;
      }
      this.system(`${back.name} is back`, 'info');
      this.changed(this);
      return { ok: true, player: back };
    }
    if (this.players.size >= PARTY_MAX_PLAYERS) return { ok: false, error: 'This room is full' };
    let clean = name.replace(/\s+/g, ' ').trim().slice(0, 20) || 'Traveller';
    const taken = new Set([...this.players.values()].map((p) => p.name.toLowerCase()));
    for (let n = 2; taken.has(clean.toLowerCase()); n++) clean = `${name.trim().slice(0, 17) || 'Traveller'} ${n}`;
    const p: Player = {
      id: randomUUID().slice(0, 8),
      token: randomUUID(),
      name: clean,
      color: hex.test(color) ? color : '#ff8a5b',
      score: 0,
      right: 0,
      connected: true,
      host: false,
      done: false,
      tries: 0,
      correct: false,
      gained: 0,
      ...wear,
      joinedAt: Date.now(),
      streak: 0,
      lastChat: 0,
      dropTimer: null,
    };
    this.players.set(p.id, p);
    if (!this.hostId) this.hostId = p.id;
    this.system(`${p.name} joined`, 'info');
    this.changed(this);
    return { ok: true, player: p };
  }

  /** the socket went away: keep the seat for a while */
  drop(id: string) {
    const p = this.players.get(id);
    if (!p) return;
    p.connected = false;
    this.system(`${p.name} lost connection`, 'info');
    if (id === this.hostId) {
      this.hostTimer = setTimeout(() => {
        this.hostTimer = null;
        if (!this.players.get(id)?.connected) this.handOver();
      }, HOST_GRACE_MS);
    }
    if (this.phase === 'lobby') {
      p.dropTimer = setTimeout(() => {
        if (!p.connected && this.phase === 'lobby') this.remove(id, `${p.name} left`);
      }, LOBBY_SEAT_MS);
    }
    this.checkAllDone();
    this.changed(this);
  }

  leave(id: string) {
    const p = this.players.get(id);
    if (p) this.remove(id, `${p.name} left`);
  }

  kick(by: string, target: string) {
    if (by !== this.hostId || by === target) return;
    const p = this.players.get(target);
    if (p) this.remove(target, `${p.name} was removed by the host`);
  }

  private remove(id: string, note: string) {
    const p = this.players.get(id);
    if (!p) return;
    if (p.dropTimer) clearTimeout(p.dropTimer);
    this.players.delete(id);
    this.votes.delete(id);
    this.system(note, 'info');
    if (id === this.hostId) this.handOver();
    this.checkAllDone();
    this.changed(this);
  }

  private handOver() {
    const next = [...this.players.values()].filter((p) => p.connected).sort((a, b) => a.joinedAt - b.joinedAt)[0];
    if (!next || next.id === this.hostId) return;
    this.hostId = next.id;
    this.system(`${next.name} is now the host`, 'info');
    this.changed(this);
  }

  get connectedCount() {
    return [...this.players.values()].filter((p) => p.connected).length;
  }

  /* ---------------- lobby ---------------- */

  vote(id: string, v: PartyVote) {
    if (this.phase !== 'lobby' && this.phase !== 'results') return;
    if (!this.players.has(id)) return;
    const cur = { ...this.votes.get(id) };
    if (v.game && PARTY_GAMES.includes(v.game)) cur.game = v.game;
    if (v.difficulty && PARTY_LEVELS.includes(v.difficulty)) cur.difficulty = v.difficulty;
    if (v.scope && (PARTY_SCOPES as readonly string[]).includes(v.scope)) cur.scope = v.scope;
    this.votes.set(id, cur);
    this.tally();
    this.changed(this);
  }

  /** majority per field; the host's vote breaks a tie; nobody voted = keep what is set */
  private tally() {
    const pick = <K extends keyof PartyVote>(field: K): PartyVote[K] | undefined => {
      const counts = new Map<PartyVote[K], number>();
      for (const v of this.votes.values()) if (v[field]) counts.set(v[field], (counts.get(v[field]) ?? 0) + 1);
      if (!counts.size) return undefined;
      const top = Math.max(...counts.values());
      const leaders = [...counts].filter(([, n]) => n === top).map(([k]) => k);
      const hostVote = this.votes.get(this.hostId)?.[field];
      if (leaders.length > 1 && hostVote && leaders.includes(hostVote)) return hostVote;
      if (leaders.length > 1 && leaders.includes(this.settings[field as keyof PartySettings] as PartyVote[K])) return this.settings[field as keyof PartySettings] as PartyVote[K];
      return leaders[0];
    };
    this.settings.game = pick('game') ?? this.settings.game;
    this.settings.difficulty = pick('difficulty') ?? this.settings.difficulty;
    this.settings.scope = pick('scope') ?? this.settings.scope;
  }

  /** host-only knobs that are not voted on */
  configure(id: string, patch: Partial<Pick<PartySettings, 'rounds' | 'timer' | 'borders'>>) {
    if (id !== this.hostId || (this.phase !== 'lobby' && this.phase !== 'results')) return;
    if (patch.rounds && (PARTY_ROUNDS as readonly number[]).includes(patch.rounds)) this.settings.rounds = patch.rounds;
    if (patch.timer && (PARTY_TIMERS as readonly number[]).includes(patch.timer)) this.settings.timer = patch.timer;
    if (typeof patch.borders === 'boolean') this.settings.borders = patch.borders;
    this.changed(this);
  }

  /* ---------------- the game ---------------- */

  start(id: string) {
    if (id !== this.hostId || (this.phase !== 'lobby' && this.phase !== 'results')) return;
    const map = this.settings.game !== 'guess-flag';
    const pool = pool195.filter((c) => inScope(c, this.settings.scope) && (!map || c.hasShape));
    this.seed = randomUUID();
    this.questions = shuffle(pool, createRng(`party:${this.seed}`)).slice(0, this.settings.rounds).map((c) => c.code);
    this.index = 0;
    for (const p of this.players.values()) Object.assign(p, { score: 0, right: 0, streak: 0, gained: 0, done: false, tries: 0, correct: false });
    this.reveal = null;
    this.question = null;
    this.phase = 'countdown';
    this.startsAt = Date.now() + COUNTDOWN_MS;
    this.system(`Starting ${GAME_NAMES[this.settings.game]}: ${this.questions.length} rounds`, 'info');
    this.after(COUNTDOWN_MS, () => this.ask());
    this.changed(this);
  }

  /** back to the lobby after the results (or to stop a game early) */
  lobby(id: string) {
    if (id !== this.hostId) return;
    this.clear();
    this.phase = 'lobby';
    this.question = null;
    this.reveal = null;
    this.startsAt = null;
    this.changed(this);
  }

  private ask() {
    if (this.index >= this.questions.length) return this.finish();
    const c = byCode.get(this.questions[this.index])!;
    const s = this.settings;
    const now = Date.now();
    this.answers.clear();
    for (const p of this.players.values()) Object.assign(p, { done: false, tries: 0, correct: false, gained: 0 });
    this.phase = 'question';
    this.startsAt = null;
    this.reveal = null;
    const base = { index: this.index, total: this.questions.length, game: s.game, difficulty: s.difficulty, startedAt: now, deadline: now + s.timer * 1000 };
    if (s.game === 'guess-flag') {
      this.question = { ...base, ...(s.difficulty === 'tourist' ? { choices: choicesFor(c, this.seed) } : {}) };
      this.flagOut(this, this.index, anonymousFlag(c.code));
    } else {
      const playScope = s.difficulty === 'tourist' ? (continentsOf(c)[0] ?? s.scope) : s.scope;
      this.question = { ...base, code: c.code, name: c.name, playScope, borders: s.game === 'find-region' || s.borders, ...(s.difficulty !== 'cartographer' ? { flag: `/flags/${c.code.toLowerCase()}.svg` } : {}) };
    }
    this.after(s.timer * 1000 + 250, () => this.close());
    this.changed(this);
  }

  /** the flag data for a question in progress, for someone who (re)joins mid-round */
  currentFlag(): { index: number; flag: string } | null {
    if (this.phase !== 'question' || this.settings.game !== 'guess-flag') return null;
    return { index: this.index, flag: anonymousFlag(this.questions[this.index]) };
  }

  /** returns true when the text was taken as a guess (so it is not also posted as chat) */
  answer(id: string, a: PartyAnswer): boolean {
    const p = this.players.get(id);
    const q = this.question;
    if (!p || !q || this.phase !== 'question' || p.done) return false;
    const target = byCode.get(this.questions[this.index])!;
    const now = Date.now();
    const timing = { timeLeftMs: Math.max(0, q.deadline - now), timeTotalMs: this.settings.timer * 1000 };
    const d = this.settings.difficulty;

    if (q.game === 'guess-flag') {
      if (a.kind === 'choice' && d === 'tourist') {
        const correct = a.code === target.code;
        this.system(correct ? `${p.name} guessed it!` : `${p.name} locked in`, correct ? 'good' : 'info');
        this.settle(p, { id, correct, points: answerPoints({ correct, difficulty: d, streak: correct ? p.streak + 1 : 0, ...timing }), answer: byCode.get(a.code)?.name ?? null });
        return true;
      }
      if (a.kind === 'text' && d !== 'tourist') {
        const text = a.text.trim().slice(0, 60);
        if (!text) return false;
        const v = judge(text, target, pool195, d);
        if (v.correct) {
          const pts = answerPoints({ correct: true, difficulty: d, streak: p.streak + 1, ...timing });
          this.system(`${p.name} guessed it!`, 'good');
          this.settle(p, { id, correct: true, points: Math.round(pts * (TRY_SHARE[p.tries] ?? 0.4)), answer: null });
        } else {
          p.tries++;
          this.post({ from: p.id, name: p.name, color: p.color, text });
          if (p.tries >= PARTY_TRIES) this.settle(p, { id, correct: false, points: 0, answer: text });
        }
        this.checkAllDone();
        this.changed(this);
        return true;
      }
      return false;
    }

    const scale = scopeScaleKm(q.playScope ?? this.settings.scope);
    if (q.game === 'pin-drop' && a.kind === 'pin' && validLonLat(a.lonlat)) {
      const km = kmToCountry(a.lonlat, target.code);
      this.system(`${p.name} dropped a pin`, 'info');
      this.settle(p, { id, correct: km === 0, points: Number.isFinite(km) ? pinPoints(km, scale) : 0, km, pin: a.lonlat });
      return true;
    }
    if (q.game === 'find-region' && a.kind === 'tap' && validLonLat(a.lonlat) && byCode.has(a.code)) {
      const correct = a.code === target.code;
      const km = correct ? 0 : kmToCountry(a.lonlat, target.code);
      this.system(`${p.name} made a pick`, 'info');
      this.settle(p, { id, correct, points: regionPoints({ correct, km, scaleKm: scale, ...timing }), km, tapped: a.code, answer: byCode.get(a.code)?.name ?? null });
      return true;
    }
    return false;
  }

  private settle(p: Player, r: PartyRoundResult) {
    this.answers.set(p.id, r);
    p.done = true;
    p.correct = r.correct;
    this.checkAllDone();
    this.changed(this);
  }

  /** everyone still here has answered: reveal early */
  private checkAllDone() {
    if (this.phase !== 'question') return;
    const here = [...this.players.values()].filter((p) => p.connected);
    if (here.length && here.every((p) => p.done)) {
      this.after(600, () => this.close());
    }
  }

  private close() {
    if (this.phase !== 'question') return;
    const target = byCode.get(this.questions[this.index])!;
    const results: PartyRoundResult[] = [];
    for (const p of this.players.values()) {
      const r = this.answers.get(p.id) ?? { id: p.id, correct: false, points: 0, answer: null };
      results.push(r);
      p.score += r.points;
      p.gained = r.points;
      p.right += r.correct ? 1 : 0;
      p.streak = r.correct ? p.streak + 1 : 0;
      p.done = true;
      p.correct = r.correct;
    }
    this.phase = 'reveal';
    const last = this.index >= this.questions.length - 1;
    this.reveal = { index: this.index, code: target.code, name: target.name, results, nextAt: Date.now() + REVEAL_MS };
    this.system(`It was ${target.name}`, 'info');
    this.after(REVEAL_MS, () => {
      this.index++;
      if (last) this.finish();
      else this.ask();
    });
    this.changed(this);
  }

  private finish() {
    this.clear();
    this.phase = 'results';
    this.question = null;
    const ranked = [...this.players.values()].sort((a, b) => b.score - a.score);
    if (ranked.length === 1) this.system(`Game over: ${ranked[0].score.toLocaleString('en')} points`, 'good');
    else if (ranked[0]) {
      const tie = ranked[1] && ranked[1].score === ranked[0].score;
      this.system(tie ? "It's a tie at the top!" : `${ranked[0].name} wins with ${ranked[0].score.toLocaleString('en')}!`, 'good');
    }
    this.changed(this);
  }

  /* ---------------- chat ---------------- */

  say(id: string, raw: string) {
    const p = this.players.get(id);
    if (!p) return;
    const now = Date.now();
    if (now - p.lastChat < CHAT_GAP_MS) return;
    p.lastChat = now;
    const text = raw.replace(/\s+/g, ' ').trim().slice(0, 120);
    if (!text) return;
    // typed flags: what you type is your guess until you are done
    if (this.phase === 'question' && this.settings.game === 'guess-flag' && this.settings.difficulty !== 'tourist' && !p.done) {
      if (this.answer(id, { kind: 'text', text })) return;
    }
    const spoiler = this.phase === 'question' && this.settings.game === 'guess-flag' && p.correct;
    this.post({ from: p.id, name: p.name, color: p.color, text, spoiler });
    this.changed(this);
  }

  private post(m: Omit<Chat, 'id'>) {
    this.chat.push({ ...m, id: `${this.code}-${++this.msg}` });
    if (this.chat.length > CHAT_KEEP) this.chat.splice(0, this.chat.length - CHAT_KEEP);
  }
  private system(text: string, tone: PartyChat['tone']) {
    this.post({ from: 'system', text, tone });
  }

  /* ---------------- views ---------------- */

  stateFor(id: string): PartyState {
    const me = this.players.get(id);
    const solved = !!me?.correct;
    return {
      code: this.code,
      phase: this.phase,
      you: id,
      hostId: this.hostId,
      players: [...this.players.values()].map(({ token: _t, joinedAt: _j, streak: _s, lastChat: _l, dropTimer: _d, ...pub }) => ({ ...pub, host: pub.id === this.hostId })),
      settings: this.settings,
      votes: Object.fromEntries(this.votes),
      question: this.question,
      reveal: this.reveal,
      startsAt: this.startsAt,
      chat: this.chat.filter((m) => !m.spoiler || solved || m.from === id || this.phase !== 'question').map(({ spoiler: _s, ...m }) => m),
      now: Date.now(),
    };
  }

  /* ---------------- timers ---------------- */

  private after(ms: number, fn: () => void) {
    this.clear();
    this.timer = setTimeout(() => {
      this.timer = null;
      fn();
    }, ms);
  }
  private clear() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
  dispose() {
    this.clear();
    if (this.hostTimer) clearTimeout(this.hostTimer);
    for (const p of this.players.values()) if (p.dropTimer) clearTimeout(p.dropTimer);
  }
}

const GAME_NAMES: Record<PartyGame, string> = { 'guess-flag': 'Guess the Flag', 'pin-drop': 'Pin Drop', 'find-region': 'Find the Region' };
const validLonLat = (p: unknown): p is [number, number] =>
  Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === 'number' && Number.isFinite(n)) && Math.abs(p[0]) <= 360 && Math.abs(p[1]) <= 90;
export type { Difficulty };
