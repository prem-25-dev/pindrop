'use client';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { ClayButton, ClayIcon, type ClayIconName } from '@pinpoint/ui';
import { useSettings } from '@/lib/settings';

const STEPS: { icon: ClayIconName; title: string; body: string }[] = [
  { icon: 'home', title: 'Your dock', body: 'Everything lives in the dock: Explore, Games, Party and your Passport. Pin your favourite games there too.' },
  { icon: 'explore', title: 'Explore the world', body: 'A map made of flags. Tap any country for facts, and every number links to where it came from.' },
  { icon: 'party', title: 'Play solo or with friends', body: 'Pick a game and a difficulty: Tourist, Navigator or Cartographer. Or open a room and share the code.' },
];

/** First-visit 3-step tour. */
export function Tour() {
  const { tourDone, setTourDone } = useSettings();
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);
  // wait for stored settings so returning visitors never see a flash of the tour
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 600);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!tourDone) setStep(0);
  }, [tourDone]);

  const show = ready && !tourDone;
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/20 p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tour-title"
            initial={{ opacity: 0, y: 40, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="clay w-full max-w-md p-7 text-center"
            data-elev="4"
            style={{ borderRadius: 'var(--radius-xl)' }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="flex flex-col items-center"
              >
                <motion.div initial={{ rotate: -12, scale: 0.6 }} animate={{ rotate: -6, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 12 }}>
                  <ClayIcon name={s.icon} size={96} />
                </motion.div>
                <h2 id="tour-title" className="mt-6 text-2xl font-black tracking-tight">{s.title}</h2>
                <p className="mt-2 text-balance font-semibold leading-relaxed text-[var(--ink-2)]">{s.body}</p>
              </motion.div>
            </AnimatePresence>
            <div className="mt-6 flex justify-center gap-2" aria-hidden>
              {STEPS.map((_, i) => (
                <span key={i} className={`h-2 rounded-full transition-all ${i === step ? 'w-6 bg-[var(--peach)]' : 'w-2 bg-[var(--ink-3)] opacity-40'}`} />
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between gap-3">
              <ClayButton variant="ghost" size="sm" onClick={() => setTourDone(true)}>
                Skip
              </ClayButton>
              <ClayButton autoFocus onClick={() => (last ? setTourDone(true) : setStep(step + 1))}>
                {last ? "Let's go" : 'Next'}
              </ClayButton>
            </div>
            <p className="sr-only" aria-live="polite">Step {step + 1} of {STEPS.length}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
