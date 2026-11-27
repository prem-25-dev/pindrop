'use client';
import { forwardRef, memo, useImperativeHandle, type CSSProperties } from 'react';
import type { WorldShapes } from '@/lib/geo';
import { useZoomStage } from '@/lib/useZoomStage';

export interface GameMapHandle {
  fitView: (view: [[number, number], [number, number]]) => void;
  focusCountry: (code: string, alsoPoint?: [number, number]) => void;
  reset: () => void;
  zoomBy: (f: number) => void;
}

export interface Reveal {
  target: string;
  correct: boolean;
  /** the country the player tapped (Find the Region) */
  tapped?: string | null;
  /** the player's pin, lon/lat (Pin Drop) */
  pin?: [number, number] | null;
  /** the bot's pin and wrong tap, when playing vs a bot */
  botPin?: [number, number] | null;
  botTapped?: string | null;
}

interface Props {
  world: WorldShapes;
  borders: boolean;
  /** false = outside the chosen continent: faded and not tappable */
  active: (code: string) => boolean;
  /** pending pin (Pin Drop) before it is confirmed, lon/lat */
  pin?: [number, number] | null;
  reveal?: Reveal | null;
  disabled?: boolean;
  botName?: string;
  onTapCountry?: (code: string, lonlat: [number, number]) => void;
  onTapPoint?: (lonlat: [number, number]) => void;
}

/** a map pin with its tip at (0,0), constant size on screen */
function PinMark({ x, y, color, label }: { x: number; y: number; color: string; label?: string }) {
  return (
    <g style={{ transform: `translate(${x}px, ${y}px) scale(calc(0.9 / var(--k, 1)))` } as CSSProperties} pointerEvents="none">
      {label && (
        <g transform="translate(12 -30)">
          <rect x="0" y="-9" width={label.length * 6.4 + 14} height="18" rx="9" fill={color} />
          <text x="7" y="4" fontSize="11" fontWeight="800" fill="#fff">{label}</text>
        </g>
      )}
      <ellipse cx="0" cy="0" rx="5" ry="2" fill="#000" opacity=".25" />
      <path d="M0 0C-5-7-9-11-9-16.5a9 9 0 1 1 18 0C9-11 5-7 0 0Z" fill={color} stroke="#fff" strokeWidth="1.6" />
      <circle cx="0" cy="-16.5" r="3.4" fill="#fff" />
    </g>
  );
}

const Countries = memo(function Countries({ world, borders, active }: { world: WorldShapes; borders: boolean; active: (code: string) => boolean }) {
  if (!borders) {
    return (
      <>
        <path d={world.land} fill="var(--game-land)" />
        {/* fade what's outside the chosen continent */}
        {world.shapes.map((s) =>
          active(s.code) ? null : <path key={s.code} d={s.d} fill="var(--game-sea)" opacity="0.6" pointerEvents="none" />,
        )}
      </>
    );
  }
  return (
    <>
      {world.disputed.map((d, i) => (
        <path key={`dp${i}`} d={d} fill="var(--game-land)" stroke="var(--game-line)" strokeWidth={0.7} vectorEffect="non-scaling-stroke" pointerEvents="none" />
      ))}
      {world.shapes.map((s) => {
        const on = active(s.code);
        return (
          <path
            key={s.code}
            d={s.d}
            data-code={s.code}
            className={on ? 'game-country cursor-pointer' : undefined}
            fill="var(--game-land)"
            opacity={on ? 1 : 0.35}
            pointerEvents={on ? undefined : 'none'}
            stroke="var(--game-line)"
            strokeWidth={0.7}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </>
  );
});

export const GameMap = forwardRef<GameMapHandle, Props>(function GameMap({ world, borders, active, pin, reveal, disabled, botName, onTapCountry, onTapPoint }, ref) {
  const { w, h } = world;
  const z = useZoomStage(w, h, { maxK: 30 });
  const shapeBy = new Map(world.shapes.map((s) => [s.code, s]));

  useImperativeHandle(ref, () => ({
    fitView: (view) => z.fitView(world.projection, view),
    focusCountry: (code, alsoPoint) => {
      const s = shapeBy.get(code);
      if (!s) return;
      let [[x0, y0], [x1, y1]] = s.box;
      if (alsoPoint) {
        const p = world.projection(alsoPoint);
        if (p) [x0, y0, x1, y1] = [Math.min(x0, p[0]), Math.min(y0, p[1]), Math.max(x1, p[0]), Math.max(y1, p[1])];
      }
      const padX = Math.max(8, (x1 - x0) * 0.25);
      const padY = Math.max(6, (y1 - y0) * 0.25);
      z.fitBox([[x0 - padX, y0 - padY], [x1 + padX, y1 + padY]], { maxK: 12 });
    },
    reset: () => z.reset(),
    zoomBy: (f) => z.zoomBy(f),
  }));

  const onClick = (e: React.MouseEvent) => {
    if (disabled) return;
    const u = z.toUser(e.clientX, e.clientY);
    if (!u) return;
    const lonlat = world.projection.invert?.(u) as [number, number] | undefined;
    if (!lonlat) return;
    if (onTapCountry) {
      const code = (e.target as Element).closest('[data-code]')?.getAttribute('data-code');
      if (code) onTapCountry(code, lonlat);
      return;
    }
    onTapPoint?.(lonlat);
  };

  const target = reveal ? shapeBy.get(reveal.target) : null;
  const tapped = reveal?.tapped ? shapeBy.get(reveal.tapped) : null;
  const pinXY = pin ? world.projection(pin) : null;
  const revealPinXY = reveal?.pin ? world.projection(reveal.pin) : null;
  const botPinXY = reveal?.botPin ? world.projection(reveal.botPin) : null;
  const botTapped = reveal?.botTapped && reveal.botTapped !== reveal.tapped ? shapeBy.get(reveal.botTapped) : null;
  // tiny answers (islands, microstates) get a ring so they can be seen at any zoom
  const tinyTarget = target && Math.max(target.box[1][0] - target.box[0][0], target.box[1][1] - target.box[0][1]) < 6;

  return (
    <div
      ref={z.boxRef}
      onClick={onClick}
      className={`relative h-full w-full touch-none overflow-hidden ${disabled ? '' : onTapPoint ? 'cursor-crosshair' : ''}`}
      style={{ background: 'var(--game-sea)' }}
    >
      <div ref={z.stageRef} className="h-full w-full" style={{ transformOrigin: '0 0', willChange: 'transform' }}>
        <svg ref={z.svgRef} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" className="h-full w-full select-none" role="img" aria-label="World map">
          <g ref={z.gRef}>
            <Countries world={world} borders={borders} active={active} />

            {/* reveal: the right country, the wrong tap, and the line from the pin */}
            {tapped && tapped.code !== reveal?.target && <path d={tapped.d} fill="var(--bad)" opacity=".85" stroke="#fff" strokeWidth={1.2} vectorEffect="non-scaling-stroke" pointerEvents="none" />}
            {botTapped && <path d={botTapped.d} fill="var(--c3)" opacity=".55" stroke="#fff" strokeWidth={1} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" pointerEvents="none" />}
            {target && (
              <path
                d={target.d}
                // the answer is always green; a wrong pick (drawn underneath) is red
                fill="var(--c4)"
                stroke="#fff"
                strokeWidth={1.6}
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
                style={{ filter: 'drop-shadow(0 calc(2px / var(--k, 1)) calc(3px / var(--k, 1)) rgba(0,0,0,.35))' }}
              />
            )}
            {target && revealPinXY && !reveal?.correct && (
              <line
                x1={revealPinXY[0]}
                y1={revealPinXY[1]}
                x2={target.center[0]}
                y2={target.center[1]}
                stroke="var(--ink)"
                strokeOpacity=".55"
                strokeWidth={1.6}
                strokeDasharray="4 4"
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
            )}
            {target && tinyTarget && (
              <circle cx={target.center[0]} cy={target.center[1]} fill="none" stroke="var(--c4)" strokeWidth={3} vectorEffect="non-scaling-stroke" className="animate-pulse" style={{ r: 'calc(16px / var(--k, 1))' } as CSSProperties} pointerEvents="none" />
            )}
            {botPinXY && <PinMark x={botPinXY[0]} y={botPinXY[1]} color="var(--c3)" label={botName} />}
            {revealPinXY && <PinMark x={revealPinXY[0]} y={revealPinXY[1]} color={reveal?.correct ? 'var(--c4)' : 'var(--bad)'} label={botPinXY ? 'You' : undefined} />}
            {!reveal && pinXY && <PinMark x={pinXY[0]} y={pinXY[1]} color="var(--accent)" />}
          </g>
        </svg>
      </div>

      {/* zoom */}
      <div className="absolute right-3 top-1/2 flex -translate-y-1/2 flex-col gap-2" onClick={(e) => e.stopPropagation()}>
        {[
          { label: 'Zoom in', icon: '+', f: 1.8 },
          { label: 'Zoom out', icon: '−', f: 1 / 1.8 },
        ].map((b) => (
          <button key={b.label} type="button" onClick={() => z.zoomBy(b.f)} aria-label={b.label} className="clay clay-interactive clay-focus flex h-10 w-10 items-center justify-center rounded-full text-lg font-black text-[var(--ink-2)]" data-elev="2">
            {b.icon}
          </button>
        ))}
      </div>
    </div>
  );
});
