// Player options (§12/§13): difficulty + master volume + reduced-motion,
// persisted to localStorage so they survive reloads. Pure storage helpers —
// applying them lives in flow.

import { BEST_KEY, SHOW_TOUCH_CONTROLS } from './constants';
import type { Difficulty, Style } from '../types';

export interface Settings {
  /** Difficulty tier: assist / normal / expert (see flow/grade/projectile/boss). */
  difficulty: Difficulty;
  /** Master volume 0..1, in 0.1 steps. */
  volume: number;
  /** Reduced motion: suppress screen shake + the film-grain/vignette filter. */
  reducedMotion: boolean;
  /** Show the on-screen touch arrows + action buttons. */
  showTouchControls: boolean;
  /** Art-direction style (cuphead vintage vs mario clean). Visual only. */
  style: Style;
  /** Colorblind-friendly UI palette (red/green-safe hearts, HP, grades, tags). */
  colorblind: boolean;
  /** Auto-fire the equipped weapon (touch-friendly; charge weapons exempt). */
  autoFire: boolean;
}

/**
 * True on touch-first devices (phones/tablets). Used to pick sensible mobile
 * defaults — on-screen controls + auto-fire — when the player hasn't chosen yet.
 * Guarded so it never throws in a non-DOM (test) environment.
 */
export function isTouchDevice(): boolean {
  try {
    if (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) return true;
    if (typeof matchMedia === 'function') return matchMedia('(pointer: coarse)').matches;
  } catch {
    /* ignore — assume non-touch */
  }
  return false;
}

const ASSIST_KEY = `${BEST_KEY}-assist`; // legacy boolean, migrated to difficulty
const DIFFICULTY_KEY = `${BEST_KEY}-difficulty`;
const VOLUME_KEY = `${BEST_KEY}-volume`;
const REDUCED_MOTION_KEY = `${BEST_KEY}-reduced-motion`;
const TOUCH_CONTROLS_KEY = `${BEST_KEY}-touch-controls`;
const STYLE_KEY = `${BEST_KEY}-style`;
const COLORBLIND_KEY = `${BEST_KEY}-colorblind`;
const AUTO_FIRE_KEY = `${BEST_KEY}-auto-fire`;

/** Default look when nothing is stored or in the URL — keeps the vintage grade. */
const DEFAULT_STYLE: Style = 'cuphead';

const DIFFICULTIES: readonly Difficulty[] = ['assist', 'normal', 'expert'];
const STYLES: readonly Style[] = ['mario', 'cuphead'];

function isDifficulty(v: string | null): v is Difficulty {
  return v !== null && (DIFFICULTIES as readonly string[]).includes(v);
}

function isStyle(v: string | null): v is Style {
  return v !== null && (STYLES as readonly string[]).includes(v);
}

/**
 * Resolve the art style: an explicit `?style=` URL param wins (and is remembered
 * for next time), otherwise the stored choice, otherwise {@link DEFAULT_STYLE}.
 */
function resolveStyle(): Style {
  let style: Style = DEFAULT_STYLE;
  const stored = localStorage.getItem(STYLE_KEY);
  if (isStyle(stored)) style = stored;
  const fromUrl = new URLSearchParams(window.location.search).get('style');
  if (isStyle(fromUrl)) {
    style = fromUrl;
    localStorage.setItem(STYLE_KEY, fromUrl); // URL param + remember
  }
  return style;
}

export function loadSettings(): Settings {
  // Touch devices default to on-screen controls + auto-fire so the game is
  // playable with no keyboard; both remain overridable in the pause menu.
  const touch = isTouchDevice();
  let difficulty: Difficulty = 'normal';
  let volume = 0.5;
  let reducedMotion = false;
  let showTouchControls = SHOW_TOUCH_CONTROLS || touch;
  let style: Style = DEFAULT_STYLE;
  let colorblind = false;
  let autoFire = touch;
  try {
    const stored = localStorage.getItem(DIFFICULTY_KEY);
    if (isDifficulty(stored)) {
      difficulty = stored;
    } else if (localStorage.getItem(ASSIST_KEY) === '1') {
      difficulty = 'assist'; // migrate the legacy assist boolean
    }
    const v = parseFloat(localStorage.getItem(VOLUME_KEY) ?? '');
    if (!Number.isNaN(v)) volume = Math.min(1, Math.max(0, v));
    reducedMotion = localStorage.getItem(REDUCED_MOTION_KEY) === '1';
    const t = localStorage.getItem(TOUCH_CONTROLS_KEY);
    if (t !== null) showTouchControls = t === '1'; // unset → keep the constant default
    style = resolveStyle();
    colorblind = localStorage.getItem(COLORBLIND_KEY) === '1';
    const af = localStorage.getItem(AUTO_FIRE_KEY);
    if (af !== null) autoFire = af === '1'; // unset → keep the touch default
  } catch {
    /* ignore storage errors */
  }
  return { difficulty, volume, reducedMotion, showTouchControls, style, colorblind, autoFire };
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(DIFFICULTY_KEY, s.difficulty);
    localStorage.setItem(VOLUME_KEY, String(s.volume));
    localStorage.setItem(REDUCED_MOTION_KEY, s.reducedMotion ? '1' : '0');
    localStorage.setItem(TOUCH_CONTROLS_KEY, s.showTouchControls ? '1' : '0');
    localStorage.setItem(STYLE_KEY, s.style);
    localStorage.setItem(COLORBLIND_KEY, s.colorblind ? '1' : '0');
    localStorage.setItem(AUTO_FIRE_KEY, s.autoFire ? '1' : '0');
  } catch {
    /* ignore storage errors */
  }
}
