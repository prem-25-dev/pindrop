import type { ClayIconName } from '@pinpoint/ui';

export type ModeStatus = 'ready' | 'soon';

export interface Mode {
  id: string;
  title: string;
  blurb: string;
  icon: ClayIconName;
  href: string;
  status: ModeStatus;
  kind: 'explore' | 'solo' | 'party';
  /** milestone it ships in (from docs/ROADMAP.md) */
  milestone: string;
}

export const MODES: Mode[] = [
  { id: 'explore', title: 'Explore', blurb: 'Every flag on one map. Tap a country for sourced facts, colour the world by data.', icon: 'explore', href: '/explore', status: 'soon', kind: 'explore', milestone: 'Milestone 2' },
  { id: 'party', title: 'Party Rooms', blurb: 'Up to 50 friends, one room code. Vote the mode, race the flags.', icon: 'party', href: '/party', status: 'soon', kind: 'party', milestone: 'Milestone 5' },
  { id: 'guess-flag', title: 'Guess the Flag', blurb: 'A flag appears. Name the country before the clock runs out.', icon: 'flag', href: '/play/guess-flag', status: 'soon', kind: 'solo', milestone: 'Milestone 3' },
  { id: 'pin-drop', title: 'Pin Drop', blurb: 'Flag and name given. Drop your pin on a map with or without borders.', icon: 'pin', href: '/play/pin-drop', status: 'soon', kind: 'solo', milestone: 'Milestone 3' },
  { id: 'find-region', title: 'Find the Region', blurb: 'Land as close as you can. Inside the border scores the maximum.', icon: 'region', href: '/play/find-region', status: 'soon', kind: 'solo', milestone: 'Milestone 3' },
  { id: 'daily', title: 'Daily Mix', blurb: 'Five questions, five modes, the same for everyone today.', icon: 'daily', href: '/play/daily', status: 'soon', kind: 'solo', milestone: 'v2' },
  { id: 'rarity', title: 'Rarity', blurb: 'Name countries that fit a theme. The rarer the pick, the bigger the score.', icon: 'rarity', href: '/party', status: 'soon', kind: 'party', milestone: 'v2' },
  { id: 'passport', title: 'Passport', blurb: 'Earn each flag by passing hard trivia: leaders, food, cities, sport.', icon: 'passport', href: '/passport', status: 'soon', kind: 'solo', milestone: 'v2' },
  { id: 'silhouette', title: 'Silhouette', blurb: 'Just the shape. Which country is it?', icon: 'silhouette', href: '/play/silhouette', status: 'soon', kind: 'solo', milestone: 'v2' },
  { id: 'border-hop', title: 'Border Hop', blurb: 'From France to China by land, in as few hops as you can.', icon: 'hop', href: '/play/border-hop', status: 'soon', kind: 'solo', milestone: 'v2' },
];

export const DIFFICULTIES = [
  { id: 'tourist', label: 'Tourist', hint: 'Multiple choice' },
  { id: 'navigator', label: 'Navigator', hint: 'Type it, small typos are fine' },
  { id: 'cartographer', label: 'Cartographer', hint: 'Exact spelling' },
] as const;
