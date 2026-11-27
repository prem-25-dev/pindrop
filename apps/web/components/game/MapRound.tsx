'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { pinPoints, regionPoints, scopeScaleKm } from '@pinpoint/game';
import type { CountryIndexItem } from '@/lib/countries';
import { kmToCountry, type WorldShapes } from '@/lib/geo';
import type { GameSettings } from '@/lib/games';
import { SCOPES, continentsOf, inScope } from '@/lib/scopes';
import { GameMap, type GameMapHandle, type Reveal } from './GameMap';
import { Confetti, Feedback, TimerBar, useCountdown, type RoundResult } from './shared';

const km = (v: number) => (v === 0 ? 'right on it' : `${Math.round(v).toLocaleString('en')} km away`);

export function MapRound({
  kind, country, settings, world, byCode, onDone,
}: {
  kind: 'pin' | 'find';
  country: CountryIndexItem;
  settings: GameSettings;
  world: WorldShapes;
  byCode: Map<string, CountryIndexItem>;
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

  // frame the map for this round
  useEffect(() => {
    const view = SCOPES.find((s) => s.id === playScope)?.view;
    const t = setTimeout(() => (view ? mapRef.current?.fitView(view) : mapRef.current?.reset()), 60);
    return () => clearTimeout(t);
  }, [playScope, country.code]);

  const conclude = (r: RoundResult, rv: Reveal) => {
    if (result) return;
    setResult(r);
    setReveal(rv);
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

  const tapCountry = (code: string, lonlat: [number, number], timeLeft = left) => {
    const correct = code === country.code;
    const d = correct ? 0 : kmToCountry(lonlat, world.geometry.get(country.code));
    const points = regionPoints({ correct, km: d, scaleKm: scale, timeLeftMs: settings.timer ? timeLeft : undefined, timeTotalMs: settings.timer ? settings.timer * 1000 : undefined });
    conclude(
      { code: country.code, correct, points, answer: correct ? null : (byCode.get(code)?.name ?? code), km: d, ms: performance.now() - started.current },
      { target: country.code, correct, tapped: code },
    );
  };

  const left = useCountdown(settings.timer, !result, () => (kind === 'pin' ? submitPin(pin) : conclude({ code: country.code, correct: false, points: 0, answer: null, ms: settings.timer * 1000 }, { target: country.code, correct: false })));

  return (
    <div className="flex flex-col gap-4">
      {settings.timer > 0 && <TimerBar left={left} total={settings.timer * 1000} />}

      {/* the prompt */}
      <div className="clay flex flex-wrap items-center justify-between gap-3 px-4 py-3" data-elev="2" style={{ borderRadius: 'var(--radius)' }}>
        <div className="flex items-center gap-3.5">
          {showFlag && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={country.flag} alt={`Flag of ${country.name}`} width={64} height={48} className="h-12 w-16 rounded-xl" style={{ boxShadow: '0 8px 16px -8px var(--clay-drop)' }} />
          )}
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-[var(--ink-3)]">{kind === 'pin' ? 'Drop a pin on' : 'Tap the country'}</p>
            <p className="text-2xl font-black leading-tight tracking-tight">{country.name}</p>
          </div>
        </div>
        {kind === 'pin' && !result && (
          <button onClick={() => submitPin(pin)} disabled={!pin} className="clay-tint tint-accent clay-focus rounded-full px-5 py-2.5 font-black disabled:opacity-40">
            Drop pin
          </button>
        )}
      </div>

      {/* the map */}
      <div className="clay relative overflow-hidden p-1.5" data-elev="2" style={{ borderRadius: 'var(--radius-lg)' }}>
        <div className="relative h-[min(62vh,560px)] overflow-hidden" style={{ borderRadius: 'calc(var(--radius-lg) - 6px)' }}>
          <GameMap
            ref={mapRef}
            world={world}
            borders={kind === 'find'}
            active={active}
            pin={pin}
            reveal={reveal}
            disabled={!!result}
            onTapPoint={kind === 'pin' ? setPin : undefined}
            onTapCountry={kind === 'find' ? (code, ll) => tapCountry(code, ll) : undefined}
          />
          <Confetti fire={fire} />
          {kind === 'pin' && !pin && !result && (
            <p className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-[var(--frost)] px-3 py-1 text-xs font-extrabold text-[var(--ink-2)] backdrop-blur">
              Tap the map to place your pin, drag to move around
            </p>
          )}
        </div>
      </div>

      {result && (
        <Feedback
          result={result}
          country={country}
          extra={result.km != null ? km(result.km) : undefined}
          title={
            kind === 'pin'
              ? result.km == null ? 'Time is up' : result.km === 0 ? 'Bullseye!' : result.points >= 3000 ? 'Close!' : result.points >= 1000 ? 'In the area' : 'Off the mark'
              : undefined
          }
          partial={kind === 'pin' && !result.correct && result.points >= 1000}
          onNext={() => onDone(result)}
        />
      )}
    </div>
  );
}
