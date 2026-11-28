'use client';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Avatar, type Mood } from './Avatar';

export interface RoomPlayer {
  id: string;
  name: string;
  color: string;
  score: number;
  /** what happened this round */
  status: 'thinking' | 'answered' | 'correct' | 'wrong' | 'idle';
  tag?: string;
  isYou?: boolean;
  /** points gained in the round that just ended, shown as a pop */
  gained?: number;
}

/** the local player (a real name and avatar arrive with accounts) */
export const YOU = { id: 'you', name: 'You', color: '#ff8a5b' };

export interface ChatMsg {
  id: string;
  from: string; // 'you' | 'system' | bot id
  name?: string;
  color?: string;
  text: string;
  tone?: 'good' | 'bad' | 'info';
}

const moodOf = (s: RoomPlayer['status']): Mood => (s === 'correct' ? 'happy' : s === 'wrong' ? 'sad' : s === 'thinking' ? 'thinking' : 'idle');
const statusText: Record<RoomPlayer['status'], string> = { thinking: 'thinking…', answered: 'answered', correct: 'got it ✓', wrong: 'missed', idle: '' };

function Players({ players, compact }: { players: RoomPlayer[]; compact: boolean }) {
  const ranked = [...players].sort((a, b) => b.score - a.score);
  return (
    <ol className="space-y-1.5" aria-label="Players">
      <AnimatePresence initial={false}>
        {ranked.map((p, i) => (
          <motion.li
            key={p.id}
            layout
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className={`relative flex items-center gap-2.5 rounded-2xl px-2.5 py-2 ${p.isYou ? 'clay' : ''}`}
            data-elev={p.isYou ? '1' : undefined}
            style={p.isYou ? undefined : { background: 'color-mix(in oklab, var(--ink) 4%, transparent)' }}
          >
            <span className="w-4 text-center text-xs font-black tabular-nums text-[var(--ink-3)]">{i + 1}</span>
            <Avatar color={p.color} size={compact ? 30 : 36} mood={moodOf(p.status)} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black">{p.name}</p>
              <p className="truncate text-[11px] font-bold" style={{ color: p.status === 'correct' ? 'var(--c4)' : p.status === 'wrong' ? 'var(--bad)' : 'var(--ink-3)' }}>
                {p.tag ?? (statusText[p.status] || ' ')}
              </p>
            </div>
            <div className="flex flex-col items-end leading-tight">
              <span className="text-sm font-black tabular-nums">{p.score.toLocaleString('en')}</span>
              <AnimatePresence>
                {!!p.gained && (
                  <motion.span key={`${p.id}-${p.score}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[11px] font-black tabular-nums" style={{ color: 'var(--c4)' }}>
                    +{p.gained.toLocaleString('en')}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </motion.li>
        ))}
      </AnimatePresence>
    </ol>
  );
}

export function Chat({ messages, onSend, placeholder, compact }: { messages: ChatMsg[]; onSend: (t: string) => void; placeholder: string; compact: boolean }) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(!compact);
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, open]);
  const shown = open ? messages : messages.slice(-1);
  return (
    <div className="flex h-full flex-col gap-2">
      <div ref={log} className={`min-h-0 space-y-1 overflow-y-auto pr-1 ${compact ? (open ? 'h-24' : 'h-6 overflow-hidden') : 'flex-1'}`} role="log" aria-live="polite" aria-label="Chat">
        {shown.map((m) => (
          <p key={m.id} className="text-sm leading-snug" style={{ color: m.tone === 'good' ? 'var(--c4)' : m.tone === 'bad' ? 'var(--bad)' : m.from === 'system' ? 'var(--ink-3)' : undefined }}>
            {m.from !== 'system' && (
              <span className="mr-1.5 font-black" style={{ color: m.color }}>
                {m.name}:
              </span>
            )}
            <span className={m.from === 'system' ? 'font-extrabold' : 'font-semibold'}>{m.text}</span>
          </p>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          onSend(text.trim());
          setText('');
        }}
      >
        {compact && (
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? 'Collapse chat' : 'Expand chat'} className="clay clay-interactive clay-focus h-11 w-11 shrink-0 rounded-full text-sm font-black text-[var(--ink-2)]" data-elev="1">
            {open ? '▾' : '▴'}
          </button>
        )}
        <label className="clay-well flex h-11 flex-1 items-center rounded-full px-4">
          <span className="sr-only">{placeholder}</span>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={120}
            data-chat-input
            className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-[var(--ink-3)]"
          />
        </label>
        <button type="submit" className="clay-tint tint-accent clay-focus h-11 rounded-full px-5 text-sm font-black">
          Send
        </button>
      </form>
    </div>
  );
}

/**
 * The room layout (skribbl-style): game in the middle, players on the right, chat along the bottom.
 * `compact` (map games) gives the map more room: a slim player bar and a one-line chat strip.
 * On phones the players become a strip across the top.
 */
export function GameRoom({
  players, messages, onSend, placeholder, compact = false, children,
}: {
  players: RoomPlayer[];
  messages: ChatMsg[];
  onSend: (text: string) => void;
  placeholder: string;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`grid h-full min-h-0 gap-2 p-2 sm:gap-3 sm:p-3 lg:grid-rows-[1fr_auto] ${compact ? 'lg:grid-cols-[1fr_220px]' : 'lg:grid-cols-[1fr_280px]'} grid-rows-[auto_1fr_auto]`}>
      {/* players: top strip on phones, right bar on large screens */}
      <aside className={`clay min-h-0 overflow-hidden p-2 lg:row-span-2 lg:col-start-2 lg:row-start-1 lg:overflow-y-auto lg:p-3`} data-elev="2" style={{ borderRadius: 'var(--radius)' }}>
        <p className="mb-2 hidden px-1 text-[11px] font-extrabold uppercase tracking-wider text-[var(--ink-3)] lg:block">Players</p>
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] lg:block">
          <div className="lg:hidden">
            <div className="flex gap-2">
              {players.map((p) => (
                <div key={p.id} className="flex shrink-0 items-center gap-1.5 rounded-full py-1 pl-1 pr-3" style={{ background: p.isYou ? 'color-mix(in oklab, var(--accent) 12%, transparent)' : 'color-mix(in oklab, var(--ink) 5%, transparent)' }}>
                  <Avatar color={p.color} size={26} mood={moodOf(p.status)} />
                  <span className="text-xs font-black">{p.isYou ? 'You' : p.name}</span>
                  <span className="text-xs font-black tabular-nums text-[var(--ink-2)]">{p.score.toLocaleString('en')}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden lg:block">
            <Players players={players} compact={compact} />
          </div>
        </div>
      </aside>

      {/* the game */}
      <section className={`relative min-h-0 overflow-hidden lg:col-start-1 lg:row-start-1 ${compact ? '' : 'clay'}`} data-elev={compact ? undefined : '2'} style={{ borderRadius: 'var(--radius-lg)' }}>
        {children}
      </section>

      {/* chat */}
      <div className={`clay min-h-0 p-2 sm:p-3 lg:col-start-1 lg:row-start-2 ${compact ? '' : 'h-[150px] sm:h-[180px]'}`} data-elev="2" style={{ borderRadius: 'var(--radius)' }}>
        <Chat messages={messages} onSend={onSend} placeholder={placeholder} compact={compact} />
      </div>
    </div>
  );
}
