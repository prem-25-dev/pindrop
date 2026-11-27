'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { pinPoints, regionPoints, scopeScaleKm } from '@pinpoint/game';
import { BOTS, botFind, botPin, type BotLevel } from '@/lib/bot';
import type { CountryIndexItem } from '@/lib/countries';
import { kmToCountry, type WorldShapes } from '@/lib/geo';
import type { GameSettings } from '@/lib/games';
import { SCOPES, continentsOf, inScope } from '@/lib/scopes';
import { GameMap, type GameMapHandle, type Reveal } from './GameMap';
import { BotChip, Confetti, Feedback, TimerBar, useCountdown, type RoundResult } from './shared';

const kmLabel = (v: number) => (v === 0 ? 'right on it' : `${Math.round(v).toLocaleString('en')} km away`);

export function MapRound({
  kind, country, settings, world, byCode, index, onDone,
}: {
  kind: 'pin' | 'find';
  country: CountryIndexItem;
  settings: GameSettings;
  world: WorldShapes;
  byCode: Map<string, CountryIndexItem>;
  index: number;
  onDone: (r: RoundResult) => void;
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

  // the bot answers the same question (seeded)
  const vsBot = settings.opponent !== 'solo';
  const level = settings.opponent as BotLevel;
  const bot = useMemo(() => {
    if (!vsBot) return undefined;
    const base = { level, seed: settings.seed, index, country, timer: settings.timer };
    return kind === 'pin' ? botPin({ ...base, world, scaleKm: scale }) : botFind({ ...base, world, byCode, active, scaleKm: scale });
  }, [vsBot, level, settings.seed, settings.timer, index, country, kind, world, scale, byCode, active]);
  const botName = vsBot ? BOTS[level].name : '';

  // frame the map for this round
  useEffect(() => {
    const view = SCOPES.find((s) => s.id === playScope)?.view;
    const t = setTimeout(() => (view ? mapRef.current?.fitView(view) : mapRef.current?.reset()), 60);
    return () => clearTimeout(t);
  }, [playScope, country.code]);

  const conclude = (r: RoundResult, rv: Reveal) => {
    if (result) return;
    setResult({ ...r, bot });
    setReveal({ ...rv, botPin: bot?.pin ?? null, botTapped: bot && !bot.correct ? (bot.tapped ?? null) : null });
    if (r.correct) setFire((f) => f + 1);
    setTimeout(() => mapRef.current?.focusCountry(country.code, rv.pin ?? undefined), 250);
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
      {/* the map fills the screen */}
      <div className="absolute inset-0">
        <GameMap
          ref={mapRef}
          world={world}
          borders={borders}
          active={active}
          pin={pin}
          reveal={reveal}
          disabled={!!result}
          botName={botName}
          onTapPoint={kind === 'pin' ? setPin : undefined}
          onTapCountry={kind === 'find' ? tapCountry : undefined}
        />
        <Confetti fire={fire} />
      </div>

      {/* the question, floating on top */}
      <div className="pointer-events-none absolute inset-x-3 top-3 flex justify-center">
        <div className="pointer-events-auto w-full max-w-xl space-y-2">
          <div className="clay flex flex-wrap items-center justify-between gap-3 px-4 py-3" data-elev="3" style={{ borderRadius: 'var(--radius)' }}>
            <div className="flex min-w-0 items-center gap-3.5">
              {showFlag && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={country.flag} alt={`Flag of ${country.name}`} width={64} height={48} className="h-12 w-16 shrink-0 rounded-xl" style={{ boxShadow: '0 8px 16px -8px var(--clay-drop)' }} />
              )}
              <div className="min-w-0">
                <p className="text-xs font-extrabold uppercase tracking-wider text-[var(--ink-3)]">{kind === 'pin' ? 'Drop a pin on' : 'Tap the country'}</p>
                <p className="truncate text-2xl font-black leading-tight tracking-tight">{country.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {bot && <BotChip name={botName} ms={bot.ms} done={!!result} />}
              {kind === 'pin' && !result && (
                <button onClick={() => submitPin(pin)} disabled={!pin} className="clay-tint tint-accent clay-focus rounded-full px-5 py-2.5 font-black disabled:opacity-40">
                  Drop pin
                </button>
              )}
            </div>
          </div>
          {settings.timer > 0 && !result && <TimerBar left={left} total={settings.timer * 1000} />}
          {kind === 'pin' && !pin && !result && (
            <p className="mx-auto w-fit rounded-full bg-[var(--frost)] px-3 py-1 text-xs font-extrabold text-[var(--ink-2)] backdrop-blur">Tap the map to place your pin. Drag to move around.</p>
          )}
        </div>
      </div>

      {/* feedback, floating at the bottom */}
      {result && (
        <div className="pointer-events-none absolute inset-x-3 bottom-[max(16px,env(safe-area-inset-bottom))] flex justify-center">
          <div className="pointer-events-auto w-full max-w-2xl rounded-2xl shadow-[0_18px_40px_-16px_var(--clay-drop)]">
            <Feedback
              result={result}
              country={country}
              extra={result.km != null ? kmLabel(result.km) : undefined}
              bot={bot}
              botName={botName}
              title={
                kind === 'pin'
                  ? result.km == null ? 'Time is up' : result.km === 0 ? 'Bullseye!' : result.points >= 3000 ? 'Close!' : result.points >= 1000 ? 'In the area' : 'Off the mark'
                  : undefined
              }
              partial={kind === 'pin' && !result.correct && result.points >= 1000}
              onNext={() => onDone(result)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
