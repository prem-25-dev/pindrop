'use client';
import { io, type Socket } from 'socket.io-client';
import { create } from 'zustand';
import type { PartyAck, PartyAnswer, PartySettings, PartyState, PartyVote } from '@pinpoint/game';
import { currentLook } from './look';

/** what you wear, sent along when you join */
const wearing = () => {
  const l = currentLook();
  return { hat: l.hat, glasses: l.glasses, title: l.title };
};

/*
 * The browser side of Party Rooms: one socket, and the latest room state the server sent.
 * The server decides everything; this only sends what the player did.
 */

/** where the realtime server lives: an explicit URL, port 4000 next to the dev server, or this origin behind the proxy */
function realtimeUrl() {
  if (process.env.NEXT_PUBLIC_REALTIME_URL) return process.env.NEXT_PUBLIC_REALTIME_URL;
  if (process.env.NODE_ENV === 'development') return `${location.protocol}//${location.hostname}:4000`;
  return location.origin;
}

/** your seat in a room survives a reload of this tab (each tab is its own player) */
const seatKey = (code: string) => `pinpoint-party:${code}`;
const readSeat = (code: string) => {
  try {
    return sessionStorage.getItem(seatKey(code)) ?? undefined;
  } catch {
    return undefined;
  }
};
const writeSeat = (code: string, token: string | null) => {
  try {
    if (token) sessionStorage.setItem(seatKey(code), token);
    else sessionStorage.removeItem(seatKey(code));
  } catch {
    /* storage blocked: a reload means a new seat */
  }
};

interface PartyStore {
  state: PartyState | null;
  /** Guess the Flag: the current flag (sent once per question) */
  flag: { index: number; flag: string } | null;
  /** server clock minus this clock, ms */
  skew: number;
  status: 'idle' | 'connecting' | 'online' | 'offline';
  /** the room this tab is in, and how it joined (to rejoin after a dropped connection) */
  seat: { code: string; name: string; color: string } | null;
}

export const useParty = create<PartyStore>(() => ({ state: null, flag: null, skew: 0, status: 'idle', seat: null }));

let socket: Socket | null = null;
function getSocket() {
  if (socket) return socket;
  useParty.setState({ status: 'connecting' });
  socket = io(realtimeUrl(), { transports: ['websocket', 'polling'], reconnectionDelayMax: 4000 });
  socket.on('state', (s: PartyState) => useParty.setState({ state: s, skew: s.now - Date.now() }));
  socket.on('flag', (f: { index: number; flag: string }) => useParty.setState({ flag: f }));
  socket.on('connect', () => {
    useParty.setState({ status: 'online' });
    // back after a drop: take the same seat again
    const seat = useParty.getState().seat;
    if (seat && useParty.getState().state) void join(seat.code, seat.name, seat.color);
  });
  socket.on('disconnect', () => useParty.setState({ status: 'offline' }));
  socket.on('connect_error', () => useParty.setState({ status: 'offline' }));
  return socket;
}

type JoinAck = PartyAck<{ code: string; playerId: string; token: string }>;
const ACK_TIMEOUT = 8000;

function send<T>(event: string, data: unknown): Promise<T> {
  const s = getSocket();
  return new Promise((resolve) => {
    s.timeout(ACK_TIMEOUT).emit(event, data, (err: Error | null, res: T) => resolve(err ? ({ ok: false, error: 'The party server did not answer. Try again in a moment.' } as T) : res));
  });
}

export async function createRoom(name: string, color: string) {
  const r = await send<JoinAck>('room:create', { name, color, ...wearing() });
  if (r.ok) {
    writeSeat(r.code, r.token);
    useParty.setState({ seat: { code: r.code, name, color } });
  }
  return r;
}

const joining = new Map<string, Promise<JoinAck>>();
/** join (or rejoin) a room; overlapping calls for the same room share one request */
export function join(code: string, name: string, color: string): Promise<JoinAck> {
  const running = joining.get(code);
  if (running) return running;
  const p = send<JoinAck>('room:join', { code, name, color, token: readSeat(code), ...wearing() }).then((r) => {
    if (r.ok) {
      writeSeat(r.code, r.token);
      useParty.setState({ seat: { code: r.code, name, color } });
    }
    return r;
  });
  joining.set(code, p);
  void p.finally(() => joining.delete(code));
  return p;
}

export function leave() {
  const code = useParty.getState().seat?.code;
  socket?.emit('room:leave');
  if (code) writeSeat(code, null);
  useParty.setState({ state: null, flag: null, seat: null });
}

const emit = (event: string, data?: unknown) => getSocket().emit(event, data);
export const party = {
  vote: (v: PartyVote) => emit('vote', v),
  configure: (p: Partial<Pick<PartySettings, 'rounds' | 'timer' | 'borders'>>) => emit('configure', p),
  start: () => emit('start'),
  lobby: () => emit('lobby'),
  answer: (a: PartyAnswer) => emit('answer', a),
  chat: (text: string) => emit('chat', text),
  kick: (id: string) => emit('kick', id),
};

/** the server's clock, from this one */
export const serverNow = () => Date.now() + useParty.getState().skew;
