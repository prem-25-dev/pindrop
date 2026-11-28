'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { pinPoints, regionPoints, scopeScaleKm } from '@pinpoint/game';
import { botFind, botPin, type BotAnswer, type BotPlayer } from '@/lib/bot';
import type { CountryIndexItem } from '@/lib/countries';
import { kmToCountry, type WorldShapes } from '@/lib/geo';
import type { GameSettings } from '@/lib/games';
import { SCOPES, continentsOf, inScope } from '@/lib/scopes';
import type { RoomPlayer } from './GameRoom';
import type { Post } from './GameScreen';
import { GameMap, type GameMapHandle, type Reveal } from './GameMap';
import { Confetti, Feedback, TimerBar, useCountdown, type RoundResult } from './shared';
import { ClayFlag } from '../ClayFlag';
import { play } from '@/lib/sound';

const kmLabel = (v: number) => (v === 0 ? 'right on it' : `${Math.round(v).toLocaleString('en')} km away`);

export function MapRound({
  kind, country, settings, world, byCode, index, bots, post, setStatus, onReveal, onNext,
}: {
  kind: 'pin' | 'find';
  country: CountryIndexItem;
  settings: GameSettings;
  world: WorldShapes;
  byCode: Map<string, CountryIndexItem>;
  index: number;
  bots: BotPlayer[];
  post: Post;
  setStatus: (id: string, s: RoomPlayer['status']) => void;
  onReveal: (r: RoundResult) => void;
  onNext: () => void;
}) {
  const mapRef = useRef<GameMapHandle>(null);
  const [pin, setPin] = useState<[number, number] | null>(null);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [fire, setFire] = useState(0);
  const started = useRef(performance.now());
  const { difficulty } = settings;

  // Tourist plays inside the country's continent; otherwise the chosen scope
  const playScope = useMemo(() => (difficulty === 'tourist' ? (continentsOf(country)[0] ?? settings.scope) : settings.scope), [difficulty, country, settings.scope]);
  const active = useMemo(() => (code: string) => inScope(byCode.get(code), playScope), [byCode, playScope]);
  const scale = scopeScaleKm(playScope);
  const showFlag = difficulty !== 'cartographer';
  const borders = kind === 'find' || settings.borders;

  // every bot answers the same question (seeded per bot)
  const answers = useMemo<BotAnswer[]>(
    () =>
      bots.map((b) => {
        const base = { botId: b.id, level: b.level, seed: settings.seed, index, country, timer: settings.timer };
        return kind === 'pin' ? botPin({ ...base, world, scaleKm: scale }) : botFind({ ...base, world, byCode, active, scaleKm: scale });
      }),
    [bots, settings.seed, settings.timer, index, country, kind, world, scale, byCode, active],
  );

  // bots lock in at their own pace; where they went stays hidden until the reveal
  useEffect(() => {
    if (result) return;
    const timers = answers.map((a, i) =>
      setTimeout(() => {
        setStatus(bots[i].id, 'answered');
        post({ from: 'system', tone: 'info', text: `${bots[i].name} ${kind === 'pin' ? 'dropped a pin' : 'made a pick'}` });
      }, a.ms),
    );
    return () => timers.forEach(clearTimeout);
  }, [answers, bots, kind, post, result, setStatus]);

  // frame the map for this round
  useEffect(() => {
    const view = SCOPES.find((s) => s.id === playScope)?.view;
    const t = setTimeout(() => (view ? mapRef.current?.fitView(view) : mapRef.current?.reset()), 60);
    return () => clearTimeout(t);
  }, [playScope, country.code]);

  const conclude = (r: RoundResult, rv: Reveal) => {
    if (result) return;
    const full = { ...r, bots: answers };
    setResult(full);
    setReveal({
      ...rv,
      others: bots.map((b, i) => ({ id: b.id, name: b.name, color: b.color, pin: answers[i].pin ?? null, tapped: answers[i].correct ? null : (answers[i].tapped ?? null) })),
    });
    play(r.correct || r.points >= 2500 ? 'right' : 'wrong');
    if (r.correct) setFire((f) => f + 1);
    setTimeout(() => mapRef.current?.focusCountry(country.code, rv.pin ?? undefined), 250);
    // how everyone did, in the chat
    bots.forEach((b, i) => {
      const a = answers[i];
      const text =
        kind === 'pin'
          ? a.km == null ? `${b.name} ran out of time` : `${b.name}: ${a.km === 0 ? 'bullseye!' : `${Math.round(a.km).toLocaleString('en')} km off`} · +${a.points.toLocaleString('en')}`
          : a.correct ? `${b.name} found it` : a.answer ? `${b.name} picked ${a.answer}` : `${b.name} ran out of time`;
      post({ from: 'system', tone: a.correct ? 'good' : 'info', text });
    });
    post({ from: 'system', tone: r.correct ? 'good' : r.points >= 1000 ? 'info' : 'bad', text: r.correct ? `You nailed ${country.name}!` : `${country.name} is in green` });
    onReveal(full);
  };

  const submitPin = (p: [number, number] | null) => {
    const d = p ? kmToCountry(p, world.geometry.get(country.code)) : Infinity;
    const points = p ? pinPoints(d, scale) : 0;
    conclude(
      { code: country.code, correct: d === 0, points, answer: null, km: p ? d : undefined, ms: performance.now() - started.current },
      { target: country.code, correct: d === 0, pin: p },
    );
  };

  const tapCountry = (code: string, lonlat: [number, number]) => {
    const correct = code === country.code;
    const d = correct ? 0 : kmToCountry(lonlat, world.geometry.get(country.code));
    const points = regionPoints({ correct, km: d, scaleKm: scale, timeLeftMs: settings.timer ? left : undefined, timeTotalMs: settings.timer ? settings.timer * 1000 : undefined });
    conclude(
      { code: country.code, correct, points, answer: correct ? null : (byCode.get(code)?.name ?? code), km: d, ms: performance.now() - started.current },
      { target: country.code, correct, tapped: code },
    );
  };

  const left = useCountdown(settings.timer, !result, () =>
    kind === 'pin' ? submitPin(pin) : conclude({ code: country.code, correct: false, points: 0, answer: null, ms: settings.timer * 1000 }, { target: country.code, correct: false }),
  );

  return (
    <div className="relative h-full w-full">
      {/* the map fills the game area */}
      <div className="absolute inset-0">
        <GameMap
          ref={mapRef}
          world={world}
          borders={borders}
          active={active}
          pin={pin}
          reveal={reveal}
          disabled={!!result}
          onTapPoint={kind === 'pin' ? setPin : undefined}
          onTapCountry={kind === 'find' ? tapCountry : undefined}
        />
        <Confetti fire={fire} />
      </div>

      {/* the question, floating on top */}
      <div className="pointer-events-none absolute inset-x-3 top-3 flex justify-center">
        <div className="pointer-events-auto w-full max-w-xl space-y-2">
          <div className="clay flex flex-wrap items-center justify-between gap-3 px-4 py-2.5" data-elev="3" style={{ borderRadius: 'var(--radius)' }}>
            <div className="flex min-w-0 items-center gap-3.5">
              {showFlag && (
                <ClayFlag src={country.flag} alt={`Flag of ${country.name}`} width={56} depth={3} />
              )}
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--ink-3)]">{kind === 'pin' ? 'Drop a pin on' : 'Tap the country'}</p>
                <p className="truncate text-xl font-black leading-tight tracking-tight sm:text-2xl">{country.name}</p>
              </div>
            </div>
            {kind === 'pin' && !result && (
              <button onClick={() => submitPin(pin)} disabled={!pin} className="clay-tint tint-accent clay-focus rounded-full px-5 py-2.5 font-black disabled:opacity-40">
                Drop pin
              </button>
            )}
          </div>
          {settings.timer > 0 && !result && <TimerBar left={left} total={settings.timer * 1000} />}
          {kind === 'pin' && !pin && !result && (
            <p className="mx-auto w-fit rounded-full bg-[var(--frost)] px-3 py-1 text-xs font-extrabold text-[var(--ink-2)] backdrop-blur">Tap the map to place your pin. Drag to move around.</p>
          )}
        </div>
      </div>

      {/* feedback, floating at the bottom */}
      {result && (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-center">
          <div className="pointer-events-auto w-full max-w-2xl rounded-2xl shadow-[0_18px_40px_-16px_var(--clay-drop)]">
            <Feedback
              result={result}
              country={country}
              extra={result.km != null ? kmLabel(result.km) : undefined}
              title={
                kind === 'pin'
                  ? result.km == null ? 'Time is up' : result.km === 0 ? 'Bullseye!' : result.points >= 3000 ? 'Close!' : result.points >= 1000 ? 'In the area' : 'Off the mark'
                  : undefined
              }
              partial={kind === 'pin' && !result.correct && result.points >= 1000}
              onNext={onNext}
            />
          </div>
        </div>
      )}
    </div>
  );
}
