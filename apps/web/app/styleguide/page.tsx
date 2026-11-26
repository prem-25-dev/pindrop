'use client';
import { useState } from 'react';
import { ClayButton, ClayIcon, ClaySurface, Segmented, clayIconNames } from '@pinpoint/ui';
import { DIFFICULTIES } from '@/lib/modes';

const SWATCHES = [
  ['Peach', '--peach', 'Primary action, pins'],
  ['Lilac', '--lilac', 'Focus, highlights'],
  ['Sky', '--sky', 'Info, links'],
  ['Mint', '--mint', 'Correct, success'],
  ['Sun', '--sun', 'Rewards, XP'],
  ['Rose', '--rose', 'Wrong answers'],
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-black tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

export default function StyleGuide() {
  const [diff, setDiff] = useState<string>('navigator');
  const [mode, setMode] = useState<'flags' | 'data'>('flags');
  return (
    <div className="space-y-12">
      <header className="pt-4">
        <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[var(--peach-deep)]">Design system</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Mac layout, made of clay</h1>
        <p className="mt-3 max-w-2xl font-semibold text-[var(--ink-2)]">
          Every surface in Pinpoint is soft clay: two inner shadows and a gentle drop shadow. Frosted glass appears only on overlays. Switch the theme in Settings to see dark clay.
        </p>
      </header>

      <Section title="Colour">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {SWATCHES.map(([name, v, use]) => (
            <ClaySurface key={name} elev={1} className="p-3">
              <div className="clay-tint h-16 rounded-2xl" style={{ ['--tint' as string]: `var(${v})`, ['--tint-deep' as string]: `color-mix(in oklab, var(${v}) 80%, black)` }} />
              <p className="mt-3 font-extrabold">{name}</p>
              <p className="text-xs font-semibold text-[var(--ink-3)]">{use}</p>
            </ClaySurface>
          ))}
        </div>
      </Section>

      <Section title="Surfaces and elevation">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-5">
          {([0, 1, 2, 3, 4] as const).map((e) => (
            <ClaySurface key={e} elev={e} light className="flex h-32 items-center justify-center font-black text-[var(--ink-2)]">
              Level {e}
            </ClaySurface>
          ))}
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <ClaySurface elev={2} interactive light radius="lg" className="p-6">
            <p className="font-black">Interactive card</p>
            <p className="text-sm font-semibold text-[var(--ink-2)]">Hover to lift, press to sink. The light follows your pointer.</p>
          </ClaySurface>
          <div className="clay-well flex items-center gap-3 rounded-3xl p-6">
            <span className="font-black">Sunken well</span>
            <span className="text-sm font-semibold text-[var(--ink-2)]">Used for inputs, tracks and selected states.</span>
          </div>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-4">
          <ClayButton size="lg">Play now</ClayButton>
          <ClayButton variant="lilac">Create room</ClayButton>
          <ClayButton variant="sky">Explore</ClayButton>
          <ClayButton variant="mint">Correct!</ClayButton>
          <ClayButton variant="soft">Settings</ClayButton>
          <ClayButton variant="ghost">Skip</ClayButton>
          <ClayButton size="sm">Small</ClayButton>
        </div>
      </Section>

      <Section title="Controls">
        <div className="flex flex-wrap items-center gap-6">
          <Segmented
            label="Difficulty"
            value={diff}
            onChange={setDiff}
            options={DIFFICULTIES.map((d) => ({ value: d.id, label: d.label }))}
          />
          <Segmented
            label="Map mode"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'flags', label: 'Flags' },
              { value: 'data', label: 'Data' },
            ]}
          />
          <label className="clay-well flex h-12 w-72 items-center rounded-full px-5">
            <span className="sr-only">Answer</span>
            <input placeholder="Type a country…" className="w-full bg-transparent font-bold outline-none placeholder:text-[var(--ink-3)]" />
          </label>
        </div>
        <p className="text-sm font-semibold text-[var(--ink-3)]">{DIFFICULTIES.find((d) => d.id === diff)?.hint}</p>
      </Section>

      <Section title="3D clay icons">
        <div className="grid grid-cols-4 gap-6 sm:grid-cols-8">
          {clayIconNames.map((n) => (
            <div key={n} className="flex flex-col items-center gap-2">
              <ClayIcon name={n} size={64} title={n} />
              <span className="text-xs font-bold text-[var(--ink-3)]">{n}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type">
        <ClaySurface elev={1} className="space-y-3 p-6">
          <p className="text-5xl font-black tracking-tight">Cartographer</p>
          <p className="text-2xl font-extrabold">Find the region · 4,812 pts</p>
          <p className="max-w-xl font-semibold text-[var(--ink-2)]">
            Body text uses a rounded sans. Gatrelli will replace the fallback (Nunito) as soon as the font file arrives.
          </p>
        </ClaySurface>
      </Section>
    </div>
  );
}
