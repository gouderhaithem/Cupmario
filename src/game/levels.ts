// Ordered level registry. Adding a level = add a JSON file + one import here
// (and a SKIN entry + music track). Never hardcode a level in game logic.

import type { BossConfig, LevelConfig } from '../types';
import level1 from '../levels/level1.json';
import level2 from '../levels/level2.json';
import level3 from '../levels/level3.json';
import boss1 from '../levels/boss1.json';
import boss2 from '../levels/boss2.json';
import boss3 from '../levels/boss3.json';

// JSON is imported as widened types (e.g. number[][], string); the data matches
// LevelConfig by construction, so assert through unknown.
export const LEVELS: LevelConfig[] = [
  level1 as unknown as LevelConfig,
  level2 as unknown as LevelConfig,
  level3 as unknown as LevelConfig,
];

// Bosses, in arc order: BARKBROOD (tree) → GRANITE (stone golem) → RIME (ice, finale).
export const BOSSES: BossConfig[] = [
  boss1 as unknown as BossConfig,
  boss2 as unknown as BossConfig,
  boss3 as unknown as BossConfig,
];

/** One stage of the campaign: a run level or a boss arena. */
export type Stage = { kind: 'level'; level: number } | { kind: 'boss'; boss: number };

/**
 * The campaign order: every run level ends with its own boss — clearing the
 * flag funnels straight into that level's arena with no menu (the §0
 * "two-faced level" hook). Each level/boss pair, in arc order.
 */
export const CAMPAIGN: Stage[] = [
  { kind: 'level', level: 0 },
  { kind: 'boss', boss: 0 }, // BARKBROOD
  { kind: 'level', level: 1 },
  { kind: 'boss', boss: 1 }, // GRANITE
  { kind: 'level', level: 2 },
  { kind: 'boss', boss: 2 }, // RIME (finale)
];

/** Boss Rush (§11.4): every boss back-to-back, no run levels. */
export const BOSS_RUSH: Stage[] = BOSSES.map((_, i) => ({ kind: 'boss', boss: i }));
