// Ordered level registry. Adding a level = add a JSON file + one import here
// (and a SKIN entry + music track). Never hardcode a level in game logic.

import type { BossConfig, LevelConfig } from '../types';
import level1 from '../levels/level1.json';
import level2 from '../levels/level2.json';
import level3 from '../levels/level3.json';
import level4 from '../levels/level4.json';
import level5 from '../levels/level5.json';
import level6 from '../levels/level6.json';
import boss1 from '../levels/boss1.json';
import boss2 from '../levels/boss2.json';
import boss3 from '../levels/boss3.json';
import boss4 from '../levels/boss4.json';

// JSON is imported as widened types (e.g. number[][], string); the data matches
// LevelConfig by construction, so assert through unknown.
export const LEVELS: LevelConfig[] = [
  level1 as unknown as LevelConfig,
  level2 as unknown as LevelConfig,
  level3 as unknown as LevelConfig,
  level4 as unknown as LevelConfig, // TIDAL CAVERN  — moving-platform ferries
  level5 as unknown as LevelConfig, // EMBER FORGE   — dash-gaps + Chargers
  level6 as unknown as LevelConfig, // THE GLITCH GATE — parry-orb traversal
];

// Bosses, in arc order: BARKBROOD (tree) → GRANITE (stone golem) → RIME (ice)
// → THE OVERCLOCK (airborne rogue core, the true finale).
export const BOSSES: BossConfig[] = [
  boss1 as unknown as BossConfig,
  boss2 as unknown as BossConfig,
  boss3 as unknown as BossConfig,
  boss4 as unknown as BossConfig,
];

/** One stage of the campaign: a run level or a boss arena. */
export type Stage = { kind: 'level'; level: number } | { kind: 'boss'; boss: number };

/**
 * The campaign order. Most run levels end with their own boss — clearing the
 * flag funnels straight into that arena with no menu (the §0 "two-faced level"
 * hook). The three mechanic-showcase levels (TIDAL/EMBER/GLITCH) chain into the
 * next level instead, so each boss is preceded by a stage that drills the skill
 * its fight demands: ferries → GRANITE's platforms, dash → RIME's gaps, parry →
 * THE OVERCLOCK's bolts.
 */
export const CAMPAIGN: Stage[] = [
  { kind: 'level', level: 0 }, // MEADOW (day)
  { kind: 'boss', boss: 0 }, // BARKBROOD
  { kind: 'level', level: 1 }, // CAVERN (parry intro)
  { kind: 'boss', boss: 1 }, // GRANITE
  { kind: 'level', level: 3 }, // TIDAL CAVERN — moving platforms
  { kind: 'level', level: 2 }, // FOUNDRY
  { kind: 'boss', boss: 2 }, // RIME
  { kind: 'level', level: 4 }, // EMBER FORGE — dash
  { kind: 'level', level: 5 }, // THE GLITCH GATE — parry
  { kind: 'boss', boss: 3 }, // THE OVERCLOCK — airborne true finale
];

/** Boss Rush (§11.4): every boss back-to-back, no run levels. */
export const BOSS_RUSH: Stage[] = BOSSES.map((_, i) => ({ kind: 'boss', boss: i }));
