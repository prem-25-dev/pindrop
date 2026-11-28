import { createServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import { CODE_LENGTH, type PartyAck, type PartyAnswer, type PartyJoin, type PartySettings, type PartyVote } from '@pinpoint/game';
import { countries, dataVersion } from './data.ts';
import { Room, newCode } from './rooms.ts';

/*
 * Party Rooms server. Rooms live in memory (one instance is plenty for a few hundred rooms);
 * the server runs every round and scores every answer, clients only send what they did.
 */

const PORT = Number(process.env.PORT ?? 4000);
/** comma-separated list of allowed web origins; any origin in development */
const ORIGINS = process.env.ORIGINS ? process.env.ORIGINS.split(',').map((s) => s.trim()) : true;
/** a room with nobody connected is closed after this long */
const EMPTY_ROOM_MS = 10 * 60_000;
/** events per second a single connection may send before it is ignored */
const EVENTS_PER_SECOND = 25;

const rooms = new Map<string, Room>();
const emptySince = new Map<string, number>();

const http = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size, data: dataVersion }));
    return;
  }
  res.writeHead(404).end();
});

const io = new Server(http, { cors: { origin: ORIGINS }, pingInterval: 10_000, pingTimeout: 8_000, maxHttpBufferSize: 16_000 });

interface SocketData {
  code?: string;
  playerId?: string;
}

/** send every connected player their own view of the room */
function broadcast(room: Room) {
  const ids = io.sockets.adapter.rooms.get(room.code);
  if (!ids) return;
  for (const sid of ids) {
    const s = io.sockets.sockets.get(sid);
    const pid = (s?.data as SocketData | undefined)?.playerId;
    if (s && pid && room.players.has(pid)) s.emit('state', room.stateFor(pid));
  }
}

function makeRoom() {
  const code = newCode((c) => rooms.has(c));
  const room = new Room(code, broadcast, (r, index, flag) => io.to(r.code).emit('flag', { index, flag }));
  rooms.set(code, room);
  return room;
}

function enter(socket: Socket, room: Room, join: PartyJoin, ack: (a: PartyAck<{ code: string; playerId: string; token: string }>) => void) {
  const prev = socket.data as SocketData;
  if (prev.code && prev.playerId && prev.code !== room.code) {
    socket.leave(prev.code);
    rooms.get(prev.code)?.drop(prev.playerId);
  }
  const r = room.join(String(join.name ?? ''), String(join.color ?? ''), typeof join.token === 'string' ? join.token : undefined);
  if (!r.ok) return ack(r);
  socket.join(room.code);
  socket.data = { code: room.code, playerId: r.player.id } satisfies SocketData;
  emptySince.delete(room.code);
  ack({ ok: true, code: room.code, playerId: r.player.id, token: r.player.token });
  socket.emit('state', room.stateFor(r.player.id));
  const flag = room.currentFlag();
  if (flag) socket.emit('flag', flag);
}

io.on('connection', (socket) => {
  // a light per-connection rate limit
  let windowStart = Date.now();
  let count = 0;
  socket.use((_packet, next) => {
    const now = Date.now();
    if (now - windowStart > 1000) {
      windowStart = now;
      count = 0;
    }
    if (++count > EVENTS_PER_SECOND) return; // drop silently
    next();
  });

  const here = (): { room: Room; id: string } | null => {
    const { code, playerId } = socket.data as SocketData;
    const room = code ? rooms.get(code) : undefined;
    return room && playerId && room.players.has(playerId) ? { room, id: playerId } : null;
  };
  const safeAck = (ack: unknown) => (typeof ack === 'function' ? (ack as (a: unknown) => void) : () => {});

  socket.on('room:create', (join: Omit<PartyJoin, 'code'>, ack) => {
    const room = makeRoom();
    enter(socket, room, { ...join, code: room.code }, safeAck(ack));
  });

  socket.on('room:join', (join: PartyJoin, ack) => {
    const code = String(join?.code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);
    const room = rooms.get(code);
    if (!room) return safeAck(ack)({ ok: false, error: 'No room with that code. Check it, or create a new one.' });
    enter(socket, room, join, safeAck(ack));
  });

  socket.on('room:leave', () => {
    const h = here();
    if (!h) return;
    socket.leave(h.room.code);
    socket.data = {};
    h.room.leave(h.id);
  });

  socket.on('vote', (v: PartyVote) => here()?.room.vote(here()!.id, v ?? {}));
  socket.on('configure', (patch: Partial<PartySettings>) => {
    const h = here();
    if (h) h.room.configure(h.id, { rounds: Number(patch?.rounds) || undefined, timer: Number(patch?.timer) || undefined, borders: typeof patch?.borders === 'boolean' ? patch.borders : undefined });
  });
  socket.on('start', () => {
    const h = here();
    if (h) h.room.start(h.id);
  });
  socket.on('lobby', () => {
    const h = here();
    if (h) h.room.lobby(h.id);
  });
  socket.on('kick', (target: string) => {
    const h = here();
    if (h) h.room.kick(h.id, String(target));
  });
  socket.on('answer', (a: PartyAnswer) => {
    const h = here();
    if (h && a && typeof a === 'object') h.room.answer(h.id, a);
  });
  socket.on('chat', (text: string) => {
    const h = here();
    if (h && typeof text === 'string') h.room.say(h.id, text);
  });

  socket.on('disconnect', () => {
    const { code, playerId } = socket.data as SocketData;
    const room = code ? rooms.get(code) : undefined;
    if (!room || !playerId) return;
    // the same player may still be connected from another tab
    const still = [...(io.sockets.adapter.rooms.get(room.code) ?? [])].some((sid) => (io.sockets.sockets.get(sid)?.data as SocketData | undefined)?.playerId === playerId);
    if (!still) room.drop(playerId);
  });
});

// close rooms nobody has been in for a while
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (room.connectedCount > 0) {
      emptySince.delete(code);
      continue;
    }
    const since = emptySince.get(code) ?? now;
    emptySince.set(code, since);
    if (now - since > EMPTY_ROOM_MS) {
      room.dispose();
      rooms.delete(code);
      emptySince.delete(code);
    }
  }
}, 30_000).unref();

http.listen(PORT, () => {
  console.log(`[realtime] Party Rooms on :${PORT} · data ${dataVersion} · ${countries.length} countries`);
});
