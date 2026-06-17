// Per-biome visual data. Each Theme maps to a ThemeVisual: the sky gradient, the
// parallax backdrop kind, the celestial body, and a tile palette. background.ts
// and sprites/tiles.ts read these so a level's whole look is data, not branches.
// Adding a biome = one entry here (+ the Theme union in types.ts).

import type { Theme } from '../types';

/** Tile colors for one biome (ground + brick/platform). */
export interface TileSkin {
  /** Solid ground body + upper shading band. */
  groundBase: string;
  groundBand: string;
  /** Top-edge cap (grass for day; rock/metal trim elsewhere) + its under-line. */
  capHi: string;
  capLo: string;
  /** Brick/platform block: body, inset face, face highlight, top/bottom edge. */
  brickBase: string;
  brickFace: string;
  brickFaceHi: string;
  brickEdge: string;
}

/** Everything the render layer needs to paint a biome's sky, backdrop, tiles. */
export interface ThemeVisual {
  /** Sky gradient: [top, bottom]. */
  sky: [string, string];
  /** Parallax backdrop style behind the play field. */
  backdrop: 'hills' | 'crystals' | 'girders';
  /** Far + near backdrop silhouette colors. */
  far: string;
  near: string;
  /** Accent (crystal glow / hazard light); unused by 'hills'. */
  accent: string;
  celestial: 'sun' | 'moon' | 'none';
  stars: boolean;
  clouds: boolean;
  cloudColor: string;
  tiles: TileSkin;
}

const GRASS_TILES: TileSkin = {
  groundBase: '#7a4a26',
  groundBand: '#8a5a30',
  capHi: '#58d68a',
  capLo: '#3f9a5e',
  brickBase: '#d98a3a',
  brickFace: '#e8a657',
  brickFaceHi: '#f2c486',
  brickEdge: '#b06a26',
};

export const THEMES: Record<Theme, ThemeVisual> = {
  // Bright meadow — the level-1 intro biome.
  day: {
    sky: ['#7ec0ff', '#bfe6ff'],
    backdrop: 'hills',
    far: '#9ad17a',
    near: '#7bbf5c',
    accent: '#ffffff',
    celestial: 'sun',
    stars: false,
    clouds: true,
    cloudColor: '#ffffff',
    tiles: GRASS_TILES,
  },
  // Moonlit hills — boss arenas keep this look.
  night: {
    sky: ['#141433', '#3a2a55'],
    backdrop: 'hills',
    far: '#3a5247',
    near: '#283d31',
    accent: '#fff7d6',
    celestial: 'moon',
    stars: true,
    clouds: true,
    cloudColor: 'rgba(180,185,225,0.5)',
    tiles: GRASS_TILES,
  },
  // Underground cavern — dark sky, glowing crystals, carved-stone tiles.
  cavern: {
    sky: ['#0c0f1e', '#241a33'],
    backdrop: 'crystals',
    far: '#241f3a',
    near: '#171228',
    accent: '#4fd9ff',
    celestial: 'none',
    stars: false,
    clouds: false,
    cloudColor: 'rgba(120,200,255,0.35)',
    tiles: {
      groundBase: '#3a3550',
      groundBand: '#4a4568',
      capHi: '#7d76a6',
      capLo: '#2a2642',
      brickBase: '#4a4564',
      brickFace: '#5c5780',
      brickFaceHi: '#8079a6',
      brickEdge: '#2f2b46',
    },
  },
  // Industrial foundry — smoggy sky, girders, hazard-striped metal grating.
  foundry: {
    sky: ['#1d1620', '#43291f'],
    backdrop: 'girders',
    far: '#2b2f38',
    near: '#1b1f26',
    accent: '#ff8a2c',
    celestial: 'none',
    stars: false,
    clouds: false,
    cloudColor: 'rgba(255,150,80,0.18)',
    tiles: {
      groundBase: '#3c4450',
      groundBand: '#4a5462',
      capHi: '#ffae3c',
      capLo: '#2a3038',
      brickBase: '#566270',
      brickFace: '#69788a',
      brickFaceHi: '#8a9aac',
      brickEdge: '#39424e',
    },
  },
};

/** The visual config for a theme (falls back to day if somehow unknown). */
export function themeVisual(theme: Theme): ThemeVisual {
  return THEMES[theme] ?? THEMES.day;
}
