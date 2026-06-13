// All gameplay constants live here (golden rule #3). No magic numbers in logic.

import type { Skin } from '../types';

// ---- World grid ----
export const TILE = 45;
export const COLS = 80;
export const ROWS = 12;

// ---- Viewport (canvas) ----
export const VIEW_W = 960;
export const VIEW_H = 540;

// ---- Physics ----
export const GRAVITY = 0.8;
export const JUMP = -14.2;
export const SPEED = 4.5;
export const MAXFALL = 16;

// ---- Movement feel ----
/** Horizontal acceleration toward target speed (px/frame²). */
export const ACCEL = 0.9;
/** Friction deceleration toward zero when there's no input (px/frame²). */
export const FRICTION = 1.2;
/** Frames after leaving a ledge during which a jump still fires (coyote time). */
export const COYOTE_FRAMES = 6;
/** Frames a jump press is remembered before landing (jump buffering). */
export const JUMP_BUFFER_FRAMES = 6;
/** Releasing jump while still rising cuts upward velocity by this factor. */
export const JUMP_CUT_MULT = 0.5;

// ---- Juice (screen shake + hitstop) ----
/** Shake magnitude (px) removed each gameplay tick; higher settles faster. */
export const SHAKE_DECAY = 0.9;
/** Shake magnitude (px) kicked off by a stomp. */
export const SHAKE_STOMP = 4;
/** Shake magnitude (px) kicked off by taking a hit. */
export const SHAKE_HURT = 9;
/** Frames gameplay freezes on a stomp for impact (hitstop). */
export const HITSTOP_STOMP = 3;

// ---- Moving platforms ----
/**
 * How far (px) below a platform's top a falling player still snaps onto it.
 * Set ≥ a tile so the fastest fall can't tunnel through; behaves as solid-from-above.
 */
export const MOVER_LAND_TOL = 50;

/** Stomp bounce uses a fraction of a full jump. */
export const STOMP_BOUNCE = JUMP * 0.62;
/** Crouch slows horizontal movement. */
export const CROUCH_SPEED_MULT = 0.35;
/** Fast-fall acceleration multiplier and its raised cap. */
export const FASTFALL_MULT = 1.6;
export const FASTFALL_CAP = MAXFALL * 1.7;

// ---- Shooter enemy ("Spitter") + bolts ----
/** Shooters patrol slower than walkers (fraction of base enemy speed). */
export const SHOOTER_SPEED_MULT = 0.6;
/** Horizontal distance (px) within which a shooter will fire at Pip. */
export const SHOOTER_RANGE = 9 * TILE;
/** Vertical tolerance (px) — Pip must be roughly level to be shot at. */
export const SHOOTER_AIM_Y = TILE * 1.4;
/** Frames between a shooter's shots. */
export const SHOOTER_COOLDOWN = 95;
/** Bolt dimensions (shared by player + enemy bolts). */
export const BOLT_W = 16;
export const BOLT_H = 10;
/** Enemy bolt travel speed (px/frame). */
export const ENEMY_BOLT_SPEED = 4.4;
/** Player bolt travel speed (px/frame). */
export const PLAYER_BOLT_SPEED = 9;
/** Frames between Pip's shots while armed. */
export const PLAYER_SHOOT_COOLDOWN = 16;

// ---- Mushroom power-up ----
export const MUSHROOM_W = 30;
export const MUSHROOM_H = 28;
/** Sideways drift speed (px/frame). */
export const MUSHROOM_SPEED = 1.1;
/** Upward pop velocity when first dropped. */
export const MUSHROOM_POP = -7;

// ---- Scoring ----
export const COIN_SCORE = 100;
export const STOMP_SCORE = 200;
/** Bonus for slaying a Spitter (on top of the stomp/shot score). */
export const SHOOTER_SCORE = 150;
/** Reward for eating a power mushroom. */
export const POWER_SCORE = 500;
export const CLEAR_BONUS = 500;

// ---- Lives / respawn ----
export const START_LIVES = 3;
/** Invulnerability frames after taking a hit. */
export const HURT_FRAMES = 60;
/** Falling below worldH + this margin costs a life. */
export const PIT_MARGIN = 80;

// ---- Persistence ----
export const BEST_KEY = 'my-game-platformer-v1';

// ---- Tile types ----
export const TILE_EMPTY = 0;
export const TILE_GROUND = 1;
export const TILE_BRICK = 2;

// ---- Color palette (shared, level-independent) ----
export const PALETTE = {
  skin: '#f5c89a',
  eye: '#1a1a2a',
  coin: '#ffd94a',
  coinHi: '#fff3b0',
  coinSh: '#b3842a',
  foe: '#9a5ad6',
  foeDk: '#6e3aa8',
  foeFt: '#3a2a55',
  popStomp: '#58d68a',
  // Spitter (shooter enemy): hot red/orange to read as dangerous.
  spit: '#e0563b',
  spitDk: '#a8331f',
  spitFt: '#552119',
  // Mushroom power-up.
  shroom: '#e34b4b',
  shroomHi: '#ff8a7a',
  shroomSpot: '#fff1e0',
  shroomStem: '#f3e3c4',
  // Bolts.
  boltPlayer: '#7ef0ff',
  boltPlayerHi: '#ffffff',
  boltEnemy: '#ff7a3c',
  boltEnemyHi: '#ffe08a',
  popPower: '#ff8a7a',
} as const;

// ---- Per-level player outfits (index = level index) ----
// Level 1 = blue explorer; Level 2 = red hair / green shirt / purple pants.
export const SKINS: Skin[] = [
  { hair: '#e8a23f', shirt: '#6ad1ff', shirtHi: '#8fdcff', pants: '#3a5a8a', shoe: '#2a2a3a', brim: '#c9852f' },
  { hair: '#c0392b', shirt: '#3fb874', shirtHi: '#7ee6a8', pants: '#2e1f4a', shoe: '#1a1226', brim: '#922b21' },
  { hair: '#1a1a1a', shirt: '#d4a017', shirtHi: '#ffd34d', pants: '#3a2a1a', shoe: '#1a1226', brim: '#8a6a0f' },
];
