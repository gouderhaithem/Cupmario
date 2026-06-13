// Ordered level registry. Adding a level = add a JSON file + one import here
// (and a SKIN entry + music track). Never hardcode a level in game logic.

import type { LevelConfig } from '../types';
import level1 from '../levels/level1.json';
import level2 from '../levels/level2.json';
import level3 from '../levels/level3.json';

// JSON is imported as widened types (e.g. number[][], string); the data matches
// LevelConfig by construction, so assert through unknown.
export const LEVELS: LevelConfig[] = [
  level1 as unknown as LevelConfig,
  level2 as unknown as LevelConfig,
  level3 as unknown as LevelConfig,
];
