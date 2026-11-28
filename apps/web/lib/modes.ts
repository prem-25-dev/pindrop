import type { ClayIconName } from '@pinpoint/ui';

export type ModeStatus = 'ready' | 'soon';

export interface Mode {
  id: string;
  title: string;
  blurb: string;
  icon: ClayIconName;
  href: string;
  status: ModeStatus;
  kind: 'explore' | 'game' | 'party';
  /** milestone it ships in (from docs/ROADMAP.md) */
  milestone: string;
  /** card colour: [light, base, deep]; picked to contrast with the icon's own colours */
  tone: [string, string, string];
  /** text colour on the card */
  ink: 'light' | 'dark';
}

export const MODES: Mode[] = [
  { id: 'explore', title: 'Explore', blurb: 'Every flag on one map. Tap a country for sourced facts, colour the world by data.', icon: 'explore', href: '/explore', status: 'ready', kind: 'explore', milestone: 'Milestone 2', tone: ['#5FE6C4', '#14B08F', '#0A7663'], ink: 'light' },
  { id: 'party', title: 'Party Rooms', blurb: 'Every game works with friends too. One room code, up to 50 players, vote the game.', icon: 'party', href: '/party', status: 'ready', kind: 'party', milestone: 'Milestone 5', tone: ['#B79BFF', '#7C4DFF', '#5427D6'], ink: 'light' },
  { id: 'guess-flag', title: 'Guess the Flag', blurb: 'A flag appears. Name the country before the clock runs out.', icon: 'flag', href: '/play/guess-flag', status: 'ready', kind: 'game', milestone: 'Milestone 3', tone: ['#FFE07A', '#FFB21E', '#E08600'], ink: 'dark' },
  { id: 'pin-drop', title: 'Pin Drop', blurb: 'Flag and name given. Drop your pin on a map with or without borders.', icon: 'pin', href: '/play/pin-drop', status: 'ready', kind: 'game', milestone: 'Milestone 3', tone: ['#86C8FF', '#3A8DF5', '#1E5CC8'], ink: 'light' },
  { id: 'find-region', title: 'Find the Region', blurb: 'Land as close as you can. Inside the border scores the maximum.', icon: 'region', href: '/play/find-region', status: 'ready', kind: 'game', milestone: 'Milestone 3', tone: ['#7FE8A6', '#22B56B', '#137A47'], ink: 'light' },
  { id: 'daily', title: 'Daily Mix', blurb: 'Five questions, five modes, the same for everyone today.', icon: 'daily', href: '/play/daily', status: 'ready', kind: 'game', milestone: 'Milestone 3', tone: ['#FFA48A', '#FF5E3A', '#D23A18'], ink: 'light' },
  { id: 'rarity', title: 'Rarity', blurb: 'Name countries that fit a theme. The rarer the pick, the bigger the score.', icon: 'rarity', href: '/play/rarity', status: 'soon', kind: 'game', milestone: 'v2', tone: ['#8E9BFF', '#4F5BEA', '#323BB8'], ink: 'light' },
  { id: 'passport', title: 'Passport', blurb: 'Your profile as a passport. Pass a country exam to earn its stamp.', icon: 'passport', href: '/passport', status: 'ready', kind: 'game', milestone: 'Milestone 4', tone: ['#7DE4F2', '#16A9C6', '#0B7390'], ink: 'light' },
  { id: 'silhouette', title: 'Silhouette', blurb: 'Just the shape. Which country is it?', icon: 'silhouette', href: '/play/silhouette', status: 'ready', kind: 'game', milestone: 'Milestone 3', tone: ['#FFB6D0', '#F2588F', '#C42F66'], ink: 'light' },
  { id: 'border-hop', title: 'Border Hop', blurb: 'From France to China by land, in as few hops as you can.', icon: 'hop', href: '/play/border-hop', status: 'ready', kind: 'game', milestone: 'Milestone 3', tone: ['#D2F48A', '#8BD13A', '#5A9A1C'], ink: 'dark' },
];

export const DIFFICULTIES = [
  { id: 'tourist', label: 'Tourist', hint: 'Multiple choice' },
  { id: 'navigator', label: 'Navigator', hint: 'Type it, small typos are fine' },
  { id: 'cartographer', label: 'Cartographer', hint: 'Exact spelling' },
] as const;
