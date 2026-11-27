'use client';
import { motion } from 'motion/react';
import { ClayIcon, Segmented, type ClayIconName } from '@pinpoint/ui';
import type { Difficulty } from '@pinpoint/game';
import { BOTS, makeBots, type BotLevel } from '@/lib/bot';
import { Avatar } from './Avatar';
import { DIFFICULTIES } from '@/lib/modes';
import type { GameDef, GameSettings, Length } from '@/lib/games';
import { SCOPES } from '@/lib/scopes';

const TIMERS = [0, 10, 15, 20, 30, 45, 60];
const lengthLabel = (l: Length) => (l === 'all' ? 'Every country' : l === 'endless' ? 'Endless (3 lives)' : `${l} rounds`);

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-extrabold uppercase tracking-wider text-[var(--ink-3)]">{label}</p>
      {children}
    </div>
  );
}

export function Setup({
  game, icon, settings, onChange, onStart, best,
}: {
  game: GameDef;
  icon: ClayIconName;
  settings: GameSettings;
  onChange: (s: GameSettings) => void;
  onStart: () => void;
  best: number | null;
}) {
  const set = (patch: Partial<GameSettings>) => onChange({ ...settings, ...patch });
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-2xl">
      <div className="clay p-6 sm:p-8" data-elev="3" style={{ borderRadius: 'var(--radius-xl)' }}>
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 shrink-0 [&>svg]:h-full [&>svg]:w-full" style={{ rotate: '-6deg' }}>
            <ClayIcon name={icon} size={80} />
          </div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-[var(--accent)]">Solo · Party</p>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{game.title}</h1>
          </div>
        </div>

        <div className="mt-7 space-y-6">
          <Field label="Difficulty">
            <Segmented
              label="Difficulty"
              value={settings.difficulty}
              onChange={(d: Difficulty) => set({ difficulty: d })}
              options={DIFFICULTIES.map((d) => ({ value: d.id, label: d.label }))}
            />
            <p className="text-sm font-semibold text-[var(--ink-2)]">{game.levels[settings.difficulty]}</p>
          </Field>

          <Field label="Where">
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Where">
              {SCOPES.map((s) => (
                <button
                  key={s.id}
                  role="radio"
                  aria-checked={settings.scope === s.id}
                  onClick={() => set({ scope: s.id })}
                  className={`clay-focus rounded-full px-3.5 py-1.5 text-sm font-extrabold ${settings.scope === s.id ? 'clay-tint tint-c3' : 'clay clay-interactive text-[var(--ink-2)]'}`}
                  data-elev="1"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Bots">
              <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Number of bots">
                {[0, 1, 2, 3].map((n) => (
                  <button
                    key={n}
                    role="radio"
                    aria-checked={settings.bots === n}
                    onClick={() => set({ bots: n })}
                    className={`clay-focus rounded-full px-3.5 py-1.5 text-sm font-extrabold ${settings.bots === n ? 'clay-tint tint-c2' : 'clay clay-interactive text-[var(--ink-2)]'}`}
                    data-elev="1"
                  >
                    {n === 0 ? 'Solo' : n}
                  </button>
                ))}
              </div>
              {settings.bots > 0 && (
                <>
                  <div className="flex items-center gap-1" aria-hidden>
                    {makeBots(settings.bots, settings.botLevel).map((b) => (
                      <span key={b.id} className="flex items-center gap-1 pr-2 text-xs font-black" style={{ color: b.color }}>
                        <Avatar color={b.color} size={30} />
                        {b.name}
                      </span>
                    ))}
                  </div>
                  <Segmented
                    label="Bot skill"
                    value={settings.botLevel}
                    onChange={(v: BotLevel) => set({ botLevel: v })}
                    options={[
                      { value: 'easy', label: 'Easy' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'hard', label: 'Hard' },
                    ]}
                  />
                </>
              )}
              <p className="text-sm font-semibold text-[var(--ink-2)]">{settings.bots === 0 ? 'Just you and the map' : `Bots: ${BOTS[settings.botLevel].blurb.toLowerCase()}`}</p>
            </Field>
            {game.id === 'pin-drop' && (
              <Field label="Map">
                <Segmented
                  label="Map borders"
                  value={settings.borders ? 'borders' : 'none'}
                  onChange={(v: 'borders' | 'none') => set({ borders: v === 'borders' })}
                  options={[
                    { value: 'none', label: 'No borders' },
                    { value: 'borders', label: 'With borders' },
                  ]}
                />
                <p className="text-sm font-semibold text-[var(--ink-2)]">{settings.borders ? 'Country outlines help you aim' : 'Just the land: the classic challenge'}</p>
              </Field>
            )}
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Length">
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Length">
                {game.lengths.map((l) => (
                  <button
                    key={String(l)}
                    role="radio"
                    aria-checked={settings.length === l}
                    onClick={() => set({ length: l })}
                    className={`clay-focus rounded-full px-3.5 py-1.5 text-sm font-extrabold ${settings.length === l ? 'clay-tint tint-accent' : 'clay clay-interactive text-[var(--ink-2)]'}`}
                    data-elev="1"
                  >
                    {lengthLabel(l)}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Timer">
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Timer per question">
                {TIMERS.map((t) => (
                  <button
                    key={t}
                    role="radio"
                    aria-checked={settings.timer === t}
                    onClick={() => set({ timer: t })}
                    className={`clay-focus rounded-full px-3 py-1.5 text-sm font-extrabold ${settings.timer === t ? 'clay-tint tint-accent' : 'clay clay-interactive text-[var(--ink-2)]'}`}
                    data-elev="1"
                  >
                    {t ? `${t}s` : 'Off'}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm font-bold text-[var(--ink-3)]">{best != null ? `Your best here: ${best.toLocaleString('en')}` : 'No best score yet for these settings'}</p>
          <button onClick={onStart} className="clay-tint tint-accent clay-focus inline-flex h-14 items-center gap-3 rounded-full pl-2 pr-7 text-lg font-black transition-transform hover:-translate-y-0.5 active:scale-95" autoFocus>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/25">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M8 5.5c0-1.2 1.3-1.9 2.3-1.3l9.3 5.9c.9.6.9 2 0 2.6l-9.3 5.9c-1 .6-2.3-.1-2.3-1.3z" />
              </svg>
            </span>
            Start
          </button>
        </div>
      </div>
      <p className="mt-4 text-center text-sm font-semibold text-[var(--ink-3)]">Playing with friends arrives with Party Rooms: same games, one room code. Until then, take on a bot.</p>
    </motion.div>
  );
}
