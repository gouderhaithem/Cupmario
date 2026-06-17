// Player options (§12/§13): difficulty + master volume + reduced-motion,
// persisted to localStorage so they survive reloads. Pure storage helpers —
// applying them lives in flow.

import { BEST_KEY, SHOW_TOUCH_CONTROLS } from './constants';
import type { Difficulty } from '../types';

export interface Settings {
  /** Difficulty tier: assist / normal / expert (see flow/grade/projectile/boss). */
  difficulty: Difficulty;
  /** Master volume 0..1, in 0.1 steps. */
  volume: number;
  /** Reduced motion: suppress screen shake + the film-grain/vignette filter. */
  reducedMotion: boolean;
  /** Show the on-screen touch arrows + action buttons. */
  showTouchControls: boolean;
}

const ASSIST_KEY = `${BEST_KEY}-assist`; // legacy boolean, migrated to difficulty
const DIFFICULTY_KEY = `${BEST_KEY}-difficulty`;
const VOLUME_KEY = `${BEST_KEY}-volume`;
const REDUCED_MOTION_KEY = `${BEST_KEY}-reduced-motion`;
const TOUCH_CONTROLS_KEY = `${BEST_KEY}-touch-controls`;

const DIFFICULTIES: readonly Difficulty[] = ['assist', 'normal', 'expert'];

function isDifficulty(v: string | null): v is Difficulty {
  return v !== null && (DIFFICULTIES as readonly string[]).includes(v);
}

export function loadSettings(): Settings {
  let difficulty: Difficulty = 'normal';
  let volume = 0.5;
  let reducedMotion = false;
  let showTouchControls = SHOW_TOUCH_CONTROLS;
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
  } catch {
    /* ignore storage errors */
  }
  return { difficulty, volume, reducedMotion, showTouchControls };
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(DIFFICULTY_KEY, s.difficulty);
    localStorage.setItem(VOLUME_KEY, String(s.volume));
    localStorage.setItem(REDUCED_MOTION_KEY, s.reducedMotion ? '1' : '0');
    localStorage.setItem(TOUCH_CONTROLS_KEY, s.showTouchControls ? '1' : '0');
  } catch {
    /* ignore storage errors */
  }
}
