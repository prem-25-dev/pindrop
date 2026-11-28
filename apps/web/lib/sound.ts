'use client';
import { useSettings } from './settings';

/*
 * Small, soft game sounds made on the fly with Web Audio (no files to download).
 * Rounded sine and triangle tones with gentle envelopes, to match the clay look.
 */

export type Sound = 'right' | 'wrong' | 'tick' | 'win' | 'pop' | 'start';

let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(a: AudioContext, freq: number, at: number, dur: number, type: OscillatorType = 'sine', gain = 0.12, slideTo?: number) {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(a.destination);
  o.start(at);
  o.stop(at + dur + 0.02);
}

export function play(s: Sound) {
  if (!useSettings.getState().sound) return;
  const a = audio();
  if (!a) return;
  const t = a.currentTime + 0.01;
  switch (s) {
    case 'right': // a bright two-note chime
      tone(a, 660, t, 0.16, 'triangle', 0.11);
      tone(a, 990, t + 0.09, 0.24, 'triangle', 0.1);
      break;
    case 'wrong': // a soft low bump
      tone(a, 220, t, 0.22, 'sine', 0.14, 140);
      break;
    case 'tick': // the last seconds of the clock
      tone(a, 1200, t, 0.05, 'sine', 0.05);
      break;
    case 'pop':
      tone(a, 520, t, 0.08, 'sine', 0.08, 760);
      break;
    case 'start':
      tone(a, 440, t, 0.12, 'triangle', 0.08);
      tone(a, 660, t + 0.1, 0.16, 'triangle', 0.08);
      break;
    case 'win': // a little rising fanfare
      [523, 659, 784, 1047].forEach((f, i) => tone(a, f, t + i * 0.1, i === 3 ? 0.45 : 0.16, 'triangle', 0.1));
      break;
  }
}
