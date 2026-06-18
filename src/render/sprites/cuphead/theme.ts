// Per-biome palettes for the rubber-hose (Cuphead) art path. The mario path has
// its own ThemeVisual (../../themes.ts); this is the parallel, hand-drawn set so
// each level reads as a distinct place — golden meadow, moonlit hills, a glowing
// cavern, a smoky foundry — instead of one shared paper sky. background.ts picks
// the backdrop kind; tiles.ts pulls the ground/grass/brick colors from here.

import type { Theme } from '../../../types';

export interface InkTheme {
  /** Three-stop vertical sky gradient (top → mid → bottom). */
  sky: [string, string, string];
  /** Far atmospheric ridge + its distant tree/silhouette dabs. */
  ridge: string;
  ridgeTree: string;
  /** Rolling hill bands (far/near) with a darker shade for texture. */
  hillFar: string;
  hillFarDk: string;
  hillNear: string;
  hillNearDk: string;
  /** Ground body, its strata shade, and pebble speckle. */
  ground: string;
  groundDk: string;
  groundSpeck: string;
  /** Top-edge cap (grass / rock trim / hazard trim) + its under-seam. */
  grass: string;
  grassDk: string;
  /** Brick/platform block body + shade. */
  brick: string;
  brickDk: string;
  /** Glow accent: crystal shine, ember, moon-sheen. */
  accent: string;
  /** Which sky object hangs up top. */
  celestial: 'sun' | 'moon' | 'none';
  /** Which parallax backdrop is painted behind the play field. */
  backdrop: 'hills' | 'crystals' | 'girders';
  clouds: boolean;
  stars: boolean;
  /** Dark silhouette tint for the near, out-of-focus foreground plane. */
  fg: string;
  /** Ambient drifting motes that breathe life into the mid-air space. */
  ambient: 'petals' | 'fireflies' | 'embers' | 'none';
  /** Whether warm volumetric god rays slant down from the sun. */
  godRays: boolean;
}

const INK_THEMES: Record<Theme, InkTheme> = {
  // Golden-hour meadow — the bright intro biome.
  day: {
    sky: ['#ffe7bf', '#f7cd8c', '#e6ad6a'],
    ridge: '#b9a8bd',
    ridgeTree: '#9c89a3',
    hillFar: '#a9c46c',
    hillFarDk: '#8caa54',
    hillNear: '#83ab48',
    hillNearDk: '#5f8a30',
    ground: '#d29f57',
    groundDk: '#a3742f',
    groundSpeck: '#b6863f',
    grass: '#8fbe44',
    grassDk: '#5f8a2e',
    brick: '#dca866',
    brickDk: '#9c6c38',
    accent: '#fff0b0',
    celestial: 'sun',
    backdrop: 'hills',
    clouds: true,
    stars: false,
    fg: '#4f7a28',
    ambient: 'petals',
    godRays: true,
  },
  // Moonlit hills — the boss arenas. Cool indigo sky, a fat moon, stars.
  night: {
    sky: ['#241d4a', '#3a2c60', '#56406e'],
    ridge: '#473a66',
    ridgeTree: '#352a50',
    hillFar: '#4e5e74',
    hillFarDk: '#3a4a5e',
    hillNear: '#3e4f64',
    hillNearDk: '#2c3a4c',
    ground: '#52456a',
    groundDk: '#383050',
    groundSpeck: '#665a80',
    grass: '#5f9b78',
    grassDk: '#3f6c52',
    brick: '#665a80',
    brickDk: '#443a58',
    accent: '#e7defa',
    celestial: 'moon',
    backdrop: 'hills',
    clouds: true,
    stars: true,
    fg: '#26323f',
    ambient: 'fireflies',
    godRays: false,
  },
  // Underground cavern — dark warm sky, stalactites, glowing teal crystals.
  cavern: {
    sky: ['#1a1330', '#271b3e', '#37264f'],
    ridge: '#2c2446',
    ridgeTree: '#221b38',
    hillFar: '#2e2746',
    hillFarDk: '#221c38',
    hillNear: '#241d3a',
    hillNearDk: '#181230',
    ground: '#3b3552',
    groundDk: '#272140',
    groundSpeck: '#4d4668',
    grass: '#5fd0e0',
    grassDk: '#3a8aa0',
    brick: '#4a4566',
    brickDk: '#2f2a48',
    accent: '#6fe6ff',
    celestial: 'none',
    backdrop: 'crystals',
    clouds: false,
    stars: false,
    fg: '#120d24',
    ambient: 'fireflies',
    godRays: false,
  },
  // Industrial foundry — smoky amber sky, girder columns, ember glow.
  foundry: {
    sky: ['#2c1d1c', '#46291d', '#643826'],
    ridge: '#3a2c2a',
    ridgeTree: '#2a1f1e',
    hillFar: '#3a2f31',
    hillFarDk: '#2a2123',
    hillNear: '#2a2226',
    hillNearDk: '#1c161a',
    ground: '#3e3a42',
    groundDk: '#27242c',
    groundSpeck: '#4c4850',
    grass: '#ff9e3c',
    grassDk: '#b0631e',
    brick: '#4c4852',
    brickDk: '#2c2a32',
    accent: '#ff8a2c',
    celestial: 'none',
    backdrop: 'girders',
    clouds: false,
    stars: false,
    fg: '#161116',
    ambient: 'embers',
    godRays: false,
  },
};

/** The rubber-hose palette for a theme (falls back to the day meadow). */
export function inkTheme(theme: Theme): InkTheme {
  return INK_THEMES[theme] ?? INK_THEMES.day;
}
