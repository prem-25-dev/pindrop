import type { Difficulty } from './match';

export const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = { tourist: 1, navigator: 1.5, cartographer: 2 };

/** great-circle distance in km between [lon, lat] points */
export function haversineKm([lon1, lat1]: [number, number], [lon2, lat2]: [number, number]): number {
  const R = 6371;
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Flag-style answers (right or wrong): 100 base, up to +100 for speed when timed,
 * +10 per streak step (max +100), times the difficulty multiplier.
 */
export function answerPoints(opts: { correct: boolean; difficulty: Difficulty; streak: number; timeLeftMs?: number; timeTotalMs?: number }): number {
  if (!opts.correct) return 0;
  const speed = opts.timeTotalMs ? Math.round(100 * Math.max(0, (opts.timeLeftMs ?? 0) / opts.timeTotalMs)) : 0;
  const streak = 10 * Math.min(opts.streak, 10);
  return Math.round((100 + speed + streak) * DIFFICULTY_MULTIPLIER[opts.difficulty]);
}

/** Pin drop: 5000 inside the country, falling off with distance. `scaleKm` shrinks for continents. */
export function pinPoints(km: number, scaleKm = 2000): number {
  if (km <= 0) return 5000;
  return Math.round(5000 * Math.exp(-km / scaleKm));
}

/**
 * Find the region: tapping the right country scores 1000 (+ up to 500 for speed when timed);
 * a wrong country still earns up to 400 if it is close.
 */
export function regionPoints(opts: { correct: boolean; km: number; timeLeftMs?: number; timeTotalMs?: number; scaleKm?: number }): number {
  if (opts.correct) {
    const speed = opts.timeTotalMs ? Math.round(500 * Math.max(0, (opts.timeLeftMs ?? 0) / opts.timeTotalMs)) : 0;
    return 1000 + speed;
  }
  return Math.round(400 * Math.exp(-opts.km / (opts.scaleKm ?? 1500)));
}

/** distance scale for a scope: world-wide misses are judged more gently than within a continent */
export const scopeScaleKm = (scope: string) => (scope === 'world' ? 2000 : scope === 'europe' ? 600 : 1000);
