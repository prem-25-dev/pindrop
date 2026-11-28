import type { Difficulty } from './match';

/*
 * Party Rooms protocol, shared by the realtime server (apps/realtime) and the web client.
 * The server owns the room: it picks the questions, times the rounds and scores every answer.
 * Clients send intents (vote, answer, chat) and render the state they are sent.
 */

export type PartyGame = 'guess-flag' | 'pin-drop' | 'find-region';
export type PartyPhase = 'lobby' | 'countdown' | 'question' | 'reveal' | 'results';

export const PARTY_GAMES: PartyGame[] = ['guess-flag', 'pin-drop', 'find-region'];
export const PARTY_LEVELS: Difficulty[] = ['tourist', 'navigator', 'cartographer'];
export const PARTY_SCOPES = ['world', 'africa', 'europe', 'asia', 'north-america', 'south-america', 'oceania'] as const;
export const PARTY_ROUNDS = [5, 10, 15, 20] as const;
export const PARTY_TIMERS = [10, 15, 20, 30, 45] as const;
export const PARTY_MAX_PLAYERS = 50;
/** guesses per flag when typing */
export const PARTY_TRIES = 3;
/** room codes avoid look-alike characters (no O/0, I/1, L) */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 5;

export interface PartySettings {
  game: PartyGame;
  difficulty: Difficulty;
  scope: string;
  rounds: number;
  /** seconds per question */
  timer: number;
  /** Pin Drop: show borders */
  borders: boolean;
}

/** what each player voted for; the host's vote breaks ties */
export interface PartyVote {
  game?: PartyGame;
  difficulty?: Difficulty;
  scope?: string;
}

export interface PartyPlayer {
  id: string;
  name: string;
  color: string;
  score: number;
  /** answers right so far this game */
  right: number;
  connected: boolean;
  host: boolean;
  /** during a question: has this player locked in / finished? */
  done: boolean;
  /** during a typed flag question: wrong guesses so far */
  tries: number;
  /** after a correct typed guess, or a correct pick: they got it */
  correct: boolean;
  /** points gained in the last revealed round */
  gained: number;
  /** cosmetics from the shop */
  hat?: string | null;
  glasses?: string | null;
  title?: string | null;
}

export interface PartyQuestion {
  index: number;
  total: number;
  game: PartyGame;
  difficulty: Difficulty;
  /** Guess the Flag: the flag as a data URL with nothing in it that names the country */
  flag?: string;
  /** Pin Drop / Find the Region: the country to find (its name is part of the question) */
  code?: string;
  name?: string;
  /** map games: the region the map is framed to */
  playScope?: string;
  borders?: boolean;
  /** Tourist flags: four names to pick from */
  choices?: { code: string; name: string }[];
  /** server clock, ms */
  startedAt: number;
  deadline: number;
}

export interface PartyRoundResult {
  id: string;
  points: number;
  correct: boolean;
  /** pin drop / region: km from the country */
  km?: number | null;
  pin?: [number, number] | null;
  tapped?: string | null;
  /** typed or picked answer, shown after the reveal */
  answer?: string | null;
}

export interface PartyReveal {
  index: number;
  code: string;
  name: string;
  results: PartyRoundResult[];
  /** server clock, ms: when the next question starts */
  nextAt: number;
}

export interface PartyChat {
  id: string;
  from: string; // player id or 'system'
  name?: string;
  color?: string;
  text: string;
  tone?: 'good' | 'bad' | 'info';
}

/** everything one client needs to draw the room */
export interface PartyState {
  code: string;
  phase: PartyPhase;
  you: string;
  hostId: string;
  players: PartyPlayer[];
  settings: PartySettings;
  votes: Record<string, PartyVote>;
  question: PartyQuestion | null;
  reveal: PartyReveal | null;
  /** countdown: server clock, ms, when the first question shows */
  startsAt: number | null;
  chat: PartyChat[];
  /** server clock at the time this state was sent, to correct for clock skew */
  now: number;
}

export type PartyAnswer =
  | { kind: 'text'; text: string }
  | { kind: 'choice'; code: string }
  | { kind: 'pin'; lonlat: [number, number] }
  | { kind: 'tap'; code: string; lonlat: [number, number] };

export interface PartyJoin {
  code: string;
  name: string;
  color: string;
  /** reconnect token from an earlier join, to take your seat back */
  token?: string;
  hat?: string | null;
  glasses?: string | null;
  title?: string | null;
}

export type PartyAck<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export const DEFAULT_PARTY_SETTINGS: PartySettings = { game: 'guess-flag', difficulty: 'navigator', scope: 'world', rounds: 10, timer: 20, borders: false };
