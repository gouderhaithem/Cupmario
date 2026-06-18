// All gameplay constants live here (golden rule #3). No magic numbers in logic.

import type { BoltStyle, BossShape, BossSkin, Skin } from '../types';

// ---- World grid ----
export const TILE = 45;
export const COLS = 80;
export const ROWS = 12;

// ---- Viewport (canvas) ----
export const VIEW_W = 960;
export const VIEW_H = 540;

// ---- On-screen touch controls ----
// Default visibility of the on-screen arrow + action buttons for a fresh player
// (no saved setting yet). Hidden by default; players flip it live in the pause
// menu (PAUSE → TOUCH CONTROLS: ON/OFF), which persists to localStorage.
export const SHOW_TOUCH_CONTROLS = false;

// ---- Physics ----
export const GRAVITY = 0.8;
export const JUMP = -14.2;
export const SPEED = 4.5;
export const MAXFALL = 16;

// ---- Dash (run-and-gun dodge) ----
/** Horizontal burst velocity during a dash (px/frame). */
export const DASH_SPEED = 11;
/** Active dash duration (frames). */
export const DASH_FRAMES = 9;
/** Invulnerable window inside the dash (frames, counted from the start). */
export const DASH_IFRAMES = 7;
/** Cooldown before Pip may dash again (frames). */
export const DASH_CD = 28;

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
/** Player bolt travel speed (px/frame) — base for the EX/Super bolt. */
export const PLAYER_BOLT_SPEED = 9;

// ---- Parry + Super (Cuphead-style) ----
/** Bounce velocity from a successful parry (a touch stronger than a stomp). */
export const PARRY_BOUNCE = JUMP * 0.7;
/** Invulnerability frames granted by a parry. */
export const PARRY_IFRAMES = 10;
/** Super meter capacity in cards; a full meter unleashes the MEGABLAST. */
export const SUPER_MAX = 5;
/** Every Nth shooter bolt is pink (parryable). */
export const PARRY_EVERY = 2;
/** EX shot (1 card): size and speed multipliers over a normal bolt; it pierces. */
export const EX_SCALE = 2.2;
export const EX_SPEED_MULT = 1.5;
/** Frames the white MEGABLAST flash lingers. */
export const FLASH_FRAMES = 12;
/** Small flash kicked off by a successful parry (subtle vs. the MEGABLAST wash). */
export const PARRY_FLASH = 5;
/** Parry-traversal orbs (§0 "Charge the Glitch"). */
/** Hit-box size of a floating parry orb (px). */
export const ORB_SIZE = 30;
/** Frames an orb stays dormant after being parried (lets a missed jump retry). */
export const ORB_RESPAWN = 70;
/** Forward speed (px/frame) imparted toward Pip's facing on a traversal parry. */
export const PARRY_FORWARD = 5.4;

// ---- Grades (§7) ----
/** Clear a run level under this many ticks (≈ 40s) for the time bonus. */
export const GRADE_FAST_TICKS = 60 * 40;
/** Beat the boss under this many ticks (≈ 55s) for the time bonus. */
export const GRADE_FAST_TICKS_BOSS = 60 * 55;

// ---- Weapons (§3) ----
/** Initial upward kick added to a lobbed (arc) shot, so it travels in a parabola. */
export const ARC_LIFT = 5;
/** Frames to fully charge the Charge gun. */
export const CHARGE_MAX = 45;
/** Charged-shot multipliers: damage and size scale up to these at full charge. */
export const CHARGE_DMG_MULT = 4;
export const CHARGE_SIZE_MULT = 2.4;
/** How sharply a homing bolt steers toward its target (radians/tick). */
export const HOMING_TURN = 0.12;

// ---- Boss fight ----
/** Boss body size (px). */
export const BOSS_W = 104;
export const BOSS_H = 88;
/** Wind-up frames an attack flashes/telegraphs before it fires. */
export const BOSS_TELEGRAPH = 26;
/** Frames the boss flashes white after taking a hit. */
export const BOSS_HURT_FLASH = 8;
/** Damage per hit by weapon tier. */
export const BOSS_BOLT_DAMAGE = 1; // a normal player bolt
export const BOSS_EX_DAMAGE = 3; // an EX (piercing) bolt
export const BOSS_MEGA_DAMAGE = 6; // a full-meter MEGABLAST
/** Death-wobble frames after KO before the win screen. */
export const BOSS_KO_FRAMES = 90;
/** Idle hover bob speed + amplitude (px). */
export const BOSS_BOB_SPEED = 0.05;
export const BOSS_BOB_AMP = 10;
/** Score awarded for defeating the boss. */
export const BOSS_SCORE = 3000;
/** Gravity added to a lobbed (arc) bolt each tick. */
export const BOLT_GRAV = 0.34;
/** Pattern tuning: speeds in px/frame. */
export const SPITARC_VY = -8.5; // initial upward velocity of a lob
export const SPITARC_TRAVEL = 44; // frames-to-target estimate for lob aim
export const FAN_SPEED = 4.3; // boltFan pellet speed
export const FAN_SPREAD = 0.42; // radians between fan pellets
export const GROUNDPOUND_SPEED = 5.2; // shockwave speed along the floor
export const PINKRAIN_VY = 4.0; // falling-bolt speed
export const PINKRAIN_COUNT = 7; // bolts per pinkRain volley
/** Max simultaneous summoned walkers (summonWalkers no-ops above this). */
export const BOSS_MAX_ADDS = 3;

// ---- Boss movement + new patterns (§7) ----
/** Horizontal speed (px/frame) of a charge roll across the arena (GRANITE). */
export const BOSS_DASH_SPEED = 9;
/** laserSweep beam thickness (px). */
export const BEAM_H = 22;
/** laserSweep telegraph frames (beam is harmless, shown as a warning line). */
export const BEAM_WARN = 32;
/** laserSweep lethal duration (frames) once it fires. */
export const BEAM_LIFE = 46;
/** ringBurst: bolts in a full circle (bullet-hell finale) + their speed. */
export const RING_COUNT = 12;
export const RING_SPEED = 3.4;
/** Frames of white blink-flash when a boss teleports. */
export const TELEPORT_FLASH = 6;
/** Hover heights a teleport alternates between (teaches up/down aiming). */
export const TELEPORT_HIGH_Y = 2 * TILE;
export const TELEPORT_LOW_Y = 5 * TILE;
/**
 * Crouched collision-box height (px). Pip shrinks from 58→30 when ducking so he
 * fits under a one-tile (45px) gap to crawl beneath low platforms. The 28px drop
 * (PLAYER_H − CROUCH_H) also lowers his profile under a sweeping beam.
 */
export const CROUCH_H = 30;

// ---- Per-boss ground movement (§ boss redesign: all bosses fight grounded) ----
// GRANITE (lumber): slow ground walk that tracks Pip between charge-rolls.
/** Fraction of the gap to Pip closed each tick while lumbering (slow stomp). */
export const LUMBER_TRACK = 0.018;
// RIME (stoke): shuffles side to side around its center on the floor.
/** Stoke shuffle angular speed (radians/frame). */
export const STOKE_SPEED = 0.022;
/** Stoke shuffle amplitude (px) either side of center. */
export const STOKE_AMP = 2.2 * TILE;
/** Idle sway accumulator speed (drives the planted tree's lean + leaf rustle). */
export const SWAY_SPEED = 0.04;
// hop (BARKBROOD): anchored on one side, springs straight up on a timer.
/** Launch velocity of a boss hop (px/frame, negative = up). */
export const BOSS_HOP_V = -15;
/** Gravity pulling a hopping boss back to the floor (px/frame²). */
export const BOSS_HOP_GRAVITY = 0.72;
/** Frames a hopping boss rests on the floor between jumps. */
export const BOSS_HOP_CD = 130;
/** Gap (px) a side-anchored boss keeps from the arena wall. */
export const BOSS_SIDE_MARGIN = TILE;
// rootPillars: telegraphed columns that erupt from the floor.
export const PILLAR_WARN = 34;
export const PILLAR_LIFE = 40;
export const PILLAR_W = 38;
/** Tiles tall a root pillar rises from the floor. */
export const PILLAR_TILES = 4;
/** Pillars per rootPillars volley. */
export const PILLAR_COUNT = 4;
// floorPulse: electrified floor segments that zap after a warning.
export const SHOCK_WARN = 30;
export const SHOCK_LIFE = 34;
/** How tall the electrified floor band stands (px above the floor). */
export const SHOCK_H = 34;
/** Arena split into this many segments; alternating ones electrify. */
export const SHOCK_SEGMENTS = 7;
// spiralShot: a rotating arm of bolts (THE OVERCLOCK).
export const SPIRAL_ARMS = 3;
/** Bolts fired along each arm per cast. */
export const SPIRAL_BOLTS = 4;
/** Angle the spiral advances each cast (radians). */
export const SPIRAL_STEP = 0.5;
/** Spiral bolt speed (px/frame). */
export const SPIRAL_SPEED = 3.6;

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

// ---- Lives / health / respawn ----
export const START_LIVES = 3;
/** Player collision box (matches spawnPlayer). */
export const PLAYER_W = 34;
export const PLAYER_H = 58;
/** Hit points per life — a hit costs 1 HP + i-frames; 0 HP costs a life. */
export const MAX_HP = 3;
/** Assist mode (§12.2): extra HP, slower enemy bolts; S-ranks are locked off. */
export const ASSIST_BONUS_HP = 1;
export const ASSIST_BOLT_MULT = 0.7;
/** Expert mode (§13.4): faster incoming bolts + tighter (shorter) telegraphs. */
export const EXPERT_BOLT_MULT = 1.3;
export const EXPERT_TELEGRAPH_MULT = 0.7;
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
/** Coin question-block: bump from below for a coin, then becomes TILE_USED. */
export const TILE_QBLOCK = 3;
/** A spent question-block (still solid). */
export const TILE_USED = 4;
/** Weapon question-block: bump from below for a power mushroom. */
export const TILE_POWBLOCK = 5;

// ---- Variety pack (§8) ----
/** Flyer "Drone": horizontal patrol speed + sine-path amplitude/speed. */
export const FLYER_SPEED = 1.8;
export const FLYER_AMP = TILE * 1.1;
export const FLYER_BOB_SPEED = 0.06;
/** Score bonus for a flyer / turret kill (on top of the base stomp score). */
export const FLYER_SCORE = 100;
export const TURRET_SCORE = 150;
/** Turret: how often it fires and how wide its aimed 3-bolt burst spreads. */
export const TURRET_COOLDOWN = 110;
export const TURRET_BURST = 3;
export const TURRET_SPREAD = 0.28;
export const TURRET_RANGE = 12 * TILE;
/** Score bonus for a mortar / charger kill (on top of the base stomp score). */
export const MORTAR_SCORE = 150;
export const CHARGER_SCORE = 150;

// ---- Mortar (stationary arc-lobber) ----
/** Horizontal range (px) within which a mortar lobs at Pip. */
export const MORTAR_RANGE = 14 * TILE;
/** Frames between mortar shells. */
export const MORTAR_COOLDOWN = 120;
/** Initial upward velocity of a lobbed shell (it then falls under gravity). */
export const MORTAR_VY = -8.5;
/** Frames-to-target estimate used to aim the shell's horizontal velocity. */
export const MORTAR_TRAVEL = 46;

// ---- Bomber (flying bomb-dropper) ----
/** Frames between bomb drops. */
export const BOMBER_DROP_CD = 90;
/** Horizontal window (px) within which a bomber will drop on Pip below it. */
export const BOMBER_AIM_X = TILE * 1.2;
/** Initial downward velocity of a dropped bomb (then accelerates via gravity). */
export const BOMBER_DROP_VY = 1.5;

// ---- Charger (line-of-sight dasher) ----
/** Slow stalking patrol speed (px/frame). */
export const CHARGER_PATROL_SPEED = 0.8;
/** Committed dash speed (px/frame). */
export const CHARGER_DASH_SPEED = 7.5;
/** Sight box: horizontal reach + vertical tolerance (px) to trigger a dash. */
export const CHARGER_SIGHT_X = 10 * TILE;
export const CHARGER_SIGHT_Y = TILE * 0.8;
/** Wind-up telegraph (frames) before the dash commits. */
export const CHARGER_WIND = 28;
/** Cooldown (frames) back to patrol after a dash ends. */
export const CHARGER_CD = 70;

/** Stomp-chain combo: score doubles per chained stomp, capped at this many. */
export const STOMP_COMBO_CAP = 4;
/** Crumbling platform: frames after contact before it falls, and its fall accel. */
export const CRUMBLE_DELAY = 26;
export const CRUMBLE_GRAV = 0.6;
/** Per-level time budget (frames ≈ 60/s) and score per leftover second on clear. */
export const LEVEL_TIME = 75 * 60;
export const TIME_BONUS_PER_SEC = 12;
/** Boss "READY? / FIGHT!" intro hold (frames) before the boss starts attacking. */
export const BOSS_INTRO = 110;

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
  // Parryable (pink) bolts + parry feedback.
  boltPink: '#ff5fb0',
  boltPinkHi: '#ffd0e8',
  parry: '#ff8fd0',
  // Boss (ROOTKIT, the Buried King): earthy glitch with a hot crown.
  boss: '#5d4b8c',
  bossDk: '#3a2d5c',
  bossLo: '#241a3a',
  bossEye: '#ff5fb0',
  bossCrown: '#ffd94a',
  bossHpFill: '#ff4d6d',
  bossHpBack: '#3a1020',
  // Flying "Drone" enemy: cool teal to read as airborne/mechanical.
  flyer: '#3fb4c4',
  flyerDk: '#26727e',
  flyerFt: '#163e45',
  // Stationary "Turret": gunmetal with a hot muzzle.
  turret: '#7a8290',
  turretDk: '#4a525e',
  turretMuzzle: '#ff7a3c',
  // Stationary "Mortar": squat iron cannon, hot muzzle, molten arcing shells.
  mortar: '#6b7280',
  mortarDk: '#42474f',
  mortarMuzzle: '#ff8a3c',
  // Flying "Bomber": steel drone that drops fused iron bombs.
  bomber: '#5a7d8c',
  bomberDk: '#39525e',
  // Dashing "Charger": a hot-orange brute with horns and a glowing wind-up.
  charger: '#d77a35',
  chargerDk: '#9a531f',
  chargerFt: '#5a3216',
  // New enemy shot tints (non-parryable; parryables stay pink).
  dart: '#9fe0ff',
  dartHi: '#ffffff',
  shell: '#e0563b',
  shellHi: '#ff9a4c',
  bomb: '#c2cbd6',
  bombHi: '#ffd34d',
  // Question / used blocks.
  qblock: '#e0a82e',
  qblockHi: '#ffd34d',
  qblockUsed: '#7a5a2a',
  powblock: '#c84bd6',
  powblockHi: '#f08aff',
  combo: '#ffd34d',
} as const;

/**
 * Per-enemy armament (§3 weapons-as-data, for foes). The firing geometry lives
 * in enemy.ts; this supplies each shot's projectile shape/size/style/tint so
 * different enemies read as different weapons. `grav` shells arc and die on land.
 */
export interface EnemyArm {
  speed: number;
  w: number;
  h: number;
  style: BoltStyle;
  tint: string;
  tintHi: string;
  grav?: boolean;
}
export const ENEMY_ARMS: Record<'shooter' | 'turret' | 'mortar' | 'bomber', EnemyArm> = {
  shooter: { speed: ENEMY_BOLT_SPEED, w: BOLT_W, h: BOLT_H, style: 'bolt', tint: PALETTE.boltEnemy, tintHi: PALETTE.boltEnemyHi },
  turret: { speed: 5.6, w: 24, h: 6, style: 'dart', tint: PALETTE.dart, tintHi: PALETTE.dartHi },
  mortar: { speed: 0, w: 22, h: 22, style: 'lob', tint: PALETTE.shell, tintHi: PALETTE.shellHi, grav: true },
  bomber: { speed: 0, w: 18, h: 20, style: 'lob', tint: PALETTE.bomb, tintHi: PALETTE.bombHi, grav: true },
};

// ---- Per-boss looks (index = boss index, see levels.ts BOSSES) ----
// Each boss gets a distinct color set + silhouette so the fights don't look
// like reskins. BARKBROOD = bark-brown tree with a leafy crown; GRANITE =
// grey stone golem veined with molten cracks; RIME = pale-cyan ice crystal.
export const BOSS_SKINS: BossSkin[] = [
  // BARKBROOD, the Elder Oak: bark browns, amber eyes, mossy-green canopy.
  { body: '#7a4a24', bodyDk: '#5a3318', bodyLo: '#3a200f', accent: '#9c6a36', eye: '#ffd23c', crown: '#4f9b3a' },
  // GRANITE, the Stone Warden: cool greys with glowing magma cracks.
  { body: '#8a8b92', bodyDk: '#5c5d66', bodyLo: '#36373e', accent: '#ff7a2f', eye: '#ffb24a', crown: '#c8d2dc' },
  // RIME, the Frost Spire: icy cyans + frosty white highlights.
  { body: '#7fceff', bodyDk: '#3f8fb8', bodyLo: '#1d4a66', accent: '#eafcff', eye: '#bfefff', crown: '#ffffff' },
];
export const BOSS_SHAPES: BossShape[] = ['tree', 'rock', 'crystal'];

// ---- Per-level player outfits (index = level index) ----
// Level 1 = blue explorer; Level 2 = red hair / green shirt / purple pants.
export const SKINS: Skin[] = [
  { hair: '#e8a23f', shirt: '#6ad1ff', shirtHi: '#8fdcff', pants: '#3a5a8a', shoe: '#2a2a3a', brim: '#c9852f' },
  { hair: '#c0392b', shirt: '#3fb874', shirtHi: '#7ee6a8', pants: '#2e1f4a', shoe: '#1a1226', brim: '#922b21' },
  { hair: '#1a1a1a', shirt: '#d4a017', shirtHi: '#ffd34d', pants: '#3a2a1a', shoe: '#1a1226', brim: '#8a6a0f' },
];
