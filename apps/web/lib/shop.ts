/*
 * The shop catalogue: cosmetic items bought with coins earned by playing.
 * Nothing here costs real money. Prices are tuned so a few games buy something small
 * and the rare pieces take a while.
 */

export type ItemCategory = 'cover' | 'theme' | 'hat' | 'glasses' | 'color' | 'title';
export type Rarity = 'common' | 'rare' | 'epic';

export interface ShopItem {
  id: string;
  category: ItemCategory;
  name: string;
  price: number;
  rarity: Rarity;
  /** what it does: a cover id, palette id, hat or glasses style, colour hex or title text */
  value: string;
  blurb?: string;
}

/** passport cover colours: base, highlight, shade, the raised lettering, and the board around the pages */
export interface CoverPalette {
  base: string;
  light: string;
  dark: string;
  ink: string;
  board: { base: string; light: string; dark: string };
}

export const COVERS: Record<string, CoverPalette> = {
  classic: { base: '#4f7fd1', light: '#86b0f0', dark: '#2f5398', ink: '#fbf3df', board: { base: '#3d66b3', light: '#5f8ad6', dark: '#244681' } },
  burgundy: { base: '#8c2a3a', light: '#c0566a', dark: '#5a1522', ink: '#f6dfa6', board: { base: '#6e1f2d', light: '#9a3d4e', dark: '#4a111c' } },
  emerald: { base: '#2f9a6a', light: '#6fd3a2', dark: '#1d6b48', ink: '#f6f0d8', board: { base: '#25805a', light: '#4fb487', dark: '#155038' } },
  midnight: { base: '#2b2f4a', light: '#565d8c', dark: '#171a2e', ink: '#e9d9a6', board: { base: '#22253c', light: '#3e4468', dark: '#11131f' } },
  rose: { base: '#e27a97', light: '#f7b3c6', dark: '#b94f6e', ink: '#fff5f0', board: { base: '#c9617f', light: '#eb93ad', dark: '#923a55' } },
  sunflower: { base: '#f2b53c', light: '#ffd97a', dark: '#c98a12', ink: '#4a3206', board: { base: '#d99a20', light: '#f5c24f', dark: '#a06c06' } },
  lavender: { base: '#8f7ad8', light: '#bfb0f2', dark: '#6450b0', ink: '#fbf7ff', board: { base: '#7864c4', light: '#a593e6', dark: '#4e3c92' } },
  kraft: { base: '#b08a5e', light: '#d8b88e', dark: '#7f5f3a', ink: '#fbf1df', board: { base: '#977349', light: '#c29e73', dark: '#694c2b' } },
  gold: { base: '#d9a93a', light: '#ffe08a', dark: '#9c7314', ink: '#3b2a05', board: { base: '#2b2f4a', light: '#4b5180', dark: '#171a2e' } },
};

export const ITEMS: ShopItem[] = [
  // passport covers
  { id: 'cover-classic', category: 'cover', name: 'Classic blue', price: 0, rarity: 'common', value: 'classic', blurb: 'The one you started with' },
  { id: 'cover-burgundy', category: 'cover', name: 'Burgundy', price: 150, rarity: 'common', value: 'burgundy', blurb: 'Old-school, with gold letters' },
  { id: 'cover-emerald', category: 'cover', name: 'Emerald', price: 150, rarity: 'common', value: 'emerald' },
  { id: 'cover-kraft', category: 'cover', name: 'Kraft paper', price: 200, rarity: 'common', value: 'kraft', blurb: 'A well-travelled look' },
  { id: 'cover-rose', category: 'cover', name: 'Rose', price: 250, rarity: 'rare', value: 'rose' },
  { id: 'cover-lavender', category: 'cover', name: 'Lavender', price: 250, rarity: 'rare', value: 'lavender' },
  { id: 'cover-sunflower', category: 'cover', name: 'Sunflower', price: 300, rarity: 'rare', value: 'sunflower' },
  { id: 'cover-midnight', category: 'cover', name: 'Midnight', price: 400, rarity: 'rare', value: 'midnight', blurb: 'Navy clay with gold lettering' },
  { id: 'cover-gold', category: 'cover', name: 'Gold edition', price: 1200, rarity: 'epic', value: 'gold', blurb: 'For collectors. Gold clay on a midnight board' },

  // app themes (the three original palettes are free)
  { id: 'theme-atlas', category: 'theme', name: 'Atlas', price: 0, rarity: 'common', value: 'atlas', blurb: 'Warm paper clay, vermilion and teal' },
  { id: 'theme-mono', category: 'theme', name: 'Mono', price: 0, rarity: 'common', value: 'mono', blurb: 'Cool grey clay, cobalt accent' },
  { id: 'theme-terra', category: 'theme', name: 'Terra', price: 0, rarity: 'common', value: 'terra', blurb: 'Sand and terracotta, sage and ochre' },
  { id: 'theme-ocean', category: 'theme', name: 'Ocean', price: 500, rarity: 'rare', value: 'ocean', blurb: 'Sea-glass clay with a coral accent' },
  { id: 'theme-sakura', category: 'theme', name: 'Sakura', price: 500, rarity: 'rare', value: 'sakura', blurb: 'Blossom pink clay with plum' },
  { id: 'theme-forest', category: 'theme', name: 'Forest', price: 500, rarity: 'rare', value: 'forest', blurb: 'Moss clay with amber' },
  { id: 'theme-candy', category: 'theme', name: 'Candy', price: 900, rarity: 'epic', value: 'candy', blurb: 'Lilac clay, bubblegum and mint' },

  // avatar hats
  { id: 'hat-cap', category: 'hat', name: 'Cap', price: 120, rarity: 'common', value: 'cap' },
  { id: 'hat-beanie', category: 'hat', name: 'Beanie', price: 120, rarity: 'common', value: 'beanie' },
  { id: 'hat-party', category: 'hat', name: 'Party hat', price: 150, rarity: 'common', value: 'party' },
  { id: 'hat-beret', category: 'hat', name: 'Beret', price: 200, rarity: 'rare', value: 'beret' },
  { id: 'hat-explorer', category: 'hat', name: 'Explorer hat', price: 300, rarity: 'rare', value: 'explorer', blurb: 'For the Pin Drop pros' },
  { id: 'hat-graduate', category: 'hat', name: 'Graduate cap', price: 350, rarity: 'rare', value: 'graduate' },
  { id: 'hat-tophat', category: 'hat', name: 'Top hat', price: 450, rarity: 'rare', value: 'tophat' },
  { id: 'hat-crown', category: 'hat', name: 'Crown', price: 1000, rarity: 'epic', value: 'crown', blurb: 'Rule the leaderboard' },

  // avatar glasses
  { id: 'glasses-round', category: 'glasses', name: 'Round specs', price: 100, rarity: 'common', value: 'round' },
  { id: 'glasses-shades', category: 'glasses', name: 'Shades', price: 180, rarity: 'common', value: 'shades' },
  { id: 'glasses-star', category: 'glasses', name: 'Star glasses', price: 300, rarity: 'rare', value: 'star' },
  { id: 'glasses-monocle', category: 'glasses', name: 'Monocle', price: 400, rarity: 'rare', value: 'monocle' },

  // extra avatar colours
  { id: 'color-mint', category: 'color', name: 'Mint', price: 80, rarity: 'common', value: '#48c9a9' },
  { id: 'color-sky', category: 'color', name: 'Sky', price: 80, rarity: 'common', value: '#5aa9f0' },
  { id: 'color-lemon', category: 'color', name: 'Lemon', price: 80, rarity: 'common', value: '#f2d14a' },
  { id: 'color-coral', category: 'color', name: 'Coral', price: 80, rarity: 'common', value: '#ff7a6b' },
  { id: 'color-grape', category: 'color', name: 'Grape', price: 120, rarity: 'rare', value: '#7b5be0' },
  { id: 'color-ink', category: 'color', name: 'Ink', price: 150, rarity: 'rare', value: '#2d3142' },
  { id: 'color-gold', category: 'color', name: 'Gold', price: 600, rarity: 'epic', value: '#d9a93a' },

  // titles, shown under your name
  { id: 'title-traveller', category: 'title', name: 'Traveller', price: 0, rarity: 'common', value: 'Traveller' },
  { id: 'title-flag-nerd', category: 'title', name: 'Flag Nerd', price: 200, rarity: 'common', value: 'Flag Nerd' },
  { id: 'title-border-hopper', category: 'title', name: 'Border Hopper', price: 250, rarity: 'common', value: 'Border Hopper' },
  { id: 'title-globetrotter', category: 'title', name: 'Globetrotter', price: 350, rarity: 'rare', value: 'Globetrotter' },
  { id: 'title-pin-master', category: 'title', name: 'Pin Master', price: 400, rarity: 'rare', value: 'Pin Master' },
  { id: 'title-cartographer', category: 'title', name: 'Cartographer', price: 600, rarity: 'rare', value: 'Cartographer' },
  { id: 'title-world-champion', category: 'title', name: 'World Champion', price: 1500, rarity: 'epic', value: 'World Champion' },
];

export const ITEM = new Map(ITEMS.map((i) => [i.id, i]));
export const FREE_ITEMS = ITEMS.filter((i) => i.price === 0).map((i) => i.id);

export const CATEGORIES: { id: ItemCategory; label: string; blurb: string }[] = [
  { id: 'cover', label: 'Passport covers', blurb: 'Re-cover your passport in a new clay' },
  { id: 'theme', label: 'Themes', blurb: 'Recolour the whole app' },
  { id: 'hat', label: 'Hats', blurb: 'Your avatar, dressed up, in every room' },
  { id: 'glasses', label: 'Glasses', blurb: 'For the well-read traveller' },
  { id: 'color', label: 'Avatar colours', blurb: 'More clay colours for your avatar' },
  { id: 'title', label: 'Titles', blurb: 'Shown under your name' },
];

export const RARITY: Record<Rarity, { label: string; color: string }> = {
  common: { label: 'Common', color: '#8d9099' },
  rare: { label: 'Rare', color: '#3c6ad3' },
  epic: { label: 'Epic', color: '#b0399c' },
};

/** what you have on */
export interface Equipped {
  cover: string;
  hat: string | null;
  glasses: string | null;
  title: string | null;
}
export const DEFAULT_EQUIPPED: Equipped = { cover: 'cover-classic', hat: null, glasses: null, title: null };

export const coverOf = (itemId: string | undefined) => COVERS[ITEM.get(itemId ?? '')?.value ?? 'classic'] ?? COVERS.classic;
