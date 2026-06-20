// Player update: input -> velocity, jump (with held-latch), gravity, duck and
// fast-fall, then AABB collision. Mutates state.player.

import { sfx } from '../engine/audio';
import {
  ACCEL,
  ARC_LIFT,
  BOLT_H,
  BOLT_W,
  CHARGE_DMG_MULT,
  CHARGE_MAX,
  CHARGE_SIZE_MULT,
  COYOTE_FRAMES,
  CROUCH_H,
  CROUCH_SPEED_MULT,
  FASTFALL_CAP,
  FASTFALL_MULT,
  FRICTION,
  GRAVITY,
  JUMP,
  JUMP_BUFFER_FRAMES,
  JUMP_CUT_MULT,
  MAXFALL,
  PLAYER_H,
  SKID_MIN,
  SPEED,
  TILE,
  WALL_JUMP_H,
  WALL_JUMP_LOCK,
  WALL_JUMP_V_MULT,
} from './constants';
import { bumpBlocks } from './blocks';
import { updateDash } from './dash';
import { updateWall } from './wall';
import { collideX, collideY, solid } from './physics';
import { spawnJumpDust, spawnLandDust, spawnSkidDust } from './puff';
import { LAND_DUST_MIN, LAND_SQUASH_DECAY } from './constants';
import type { GameState, Pawn } from './state';
import type { Level, Player, Weapon } from '../types';
import { currentWeapon } from './weapons';

/** Diagonal velocity normalizer so diagonal bolts aren't faster than cardinal. */
const DIAG = Math.SQRT1_2;

/**
 * The 8-direction aim vector for a fired bolt. Holding Lock roots Pip and lets
 * the direction keys choose any of 8 directions; otherwise bolts fly straight
 * ahead, except a Down press in mid-air fires straight down (a pogo shot).
 */
function aimVector(state: GameState, pawn: Pawn): { ax: number; ay: number } {
  const p = pawn.player;
  const keys = pawn.keys;
  // Gamepad right-stick (twin-stick) aim overrides, already normalized.
  if (pawn.aimX !== 0 || pawn.aimY !== 0) {
    return { ax: pawn.aimX, ay: pawn.aimY };
  }
  let ax = 0;
  let ay = 0;
  if (keys.lock) {
    if (keys.left) ax -= 1;
    if (keys.right) ax += 1;
    if (keys.up) ay -= 1;
    if (keys.down) ay += 1;
    if (ax === 0 && ay === 0) ax = p.face; // locked but no direction → face
  } else if (keys.down && !p.onGround) {
    ay = 1; // down-shot in the air
  } else if (state.boss) {
    // Boss fights: auto-aim at the boss so an overhead boss is hittable with any
    // gun. Manual Lock-aim (above) and the air down-shot still override this.
    const bx = state.boss.x + state.boss.w / 2;
    const by = state.boss.y + state.boss.h / 2;
    const dx = bx - (p.x + p.w / 2);
    const dy = by - (p.y + p.h * 0.42);
    const len = Math.hypot(dx, dy) || 1;
    return { ax: dx / len, ay: dy / len };
  } else {
    ax = p.face;
  }
  return ax !== 0 && ay !== 0 ? { ax: ax * DIAG, ay: ay * DIAG } : { ax, ay };
}

export function updatePlayer(state: GameState, pawn: Pawn): void {
  const p = pawn.player;
  const keys = pawn.keys;
  const level = state.level;

  // Host-authoritative side effects (weapon swap, block-bumps, firing) are
  // suppressed while a co-op guest is locally predicting its own avatar: the
  // host owns weapons/score/grid/projectiles and re-syncs them via snapshots, so
  // running them here would spawn ghost bolts or permanently desync local tiles.
  const predicting = state.netPredict === 'live';

  // Weapon switch (rising edge): cycle through the unlocked guns.
  if (!predicting && keys.switchWeapon && !pawn.switchLatch) {
    pawn.switchLatch = true;
    if (pawn.weapons.length > 1) {
      pawn.weaponIdx = (pawn.weaponIdx + 1) % pawn.weapons.length;
      pawn.charge = 0;
      sfx('swap');
    }
  } else if (!keys.switchWeapon) {
    pawn.switchLatch = false;
  }

  // Coyote time: refresh while grounded, count down once airborne so a jump
  // still fires for a few frames after stepping off a ledge.
  if (p.onGround) pawn.coyote = COYOTE_FRAMES;
  else if (pawn.coyote > 0) pawn.coyote -= 1;

  // Jump buffer: remember a fresh press (rising edge) for a few frames so a
  // jump tapped just before landing still fires on touchdown. The latch keeps
  // a held button from refilling the buffer (no auto-rejump).
  // (Lock roots Pip for free-aim, so it suppresses both jump and movement.)
  if (keys.jump && !pawn.jumpLatch && !keys.lock) {
    pawn.jumpBuffer = JUMP_BUFFER_FRAMES;
    pawn.jumpLatch = true;
  } else if (!keys.jump) {
    pawn.jumpLatch = false;
  }
  if (pawn.jumpBuffer > 0) pawn.jumpBuffer -= 1;

  // Ducking on the ground: a real hitbox shrink (58→30) so Pip can crawl under
  // low platforms. Feet stay planted (we grow/shrink from the head). Standing
  // back up is blocked while a solid tile is directly overhead, so a crouch held
  // under a brick stays a crouch instead of clipping Pip into it.
  updateCrouch(state, pawn);

  // Horizontal: accelerate toward the target speed, decelerate via friction
  // when there's no input. Gives weighty, non-binary control.
  let dir = 0;
  if (!keys.lock) {
    if (keys.left) dir -= 1;
    if (keys.right) dir += 1;
  }
  if (pawn.wallJumpLock > 0) {
    // Just wall-jumped: ignore input + friction for a few frames so the away
    // push-off survives instead of being instantly cancelled by holding toward
    // the wall.
    pawn.wallJumpLock -= 1;
  } else if (dir !== 0) {
    const target = dir * SPEED * (p.crouch ? CROUCH_SPEED_MULT : 1);
    if (p.vx < target) p.vx = Math.min(target, p.vx + ACCEL);
    else if (p.vx > target) p.vx = Math.max(target, p.vx - ACCEL);
    p.face = dir < 0 ? -1 : 1;
  } else if (p.vx > 0) {
    p.vx = Math.max(0, p.vx - FRICTION);
  } else if (p.vx < 0) {
    p.vx = Math.min(0, p.vx + FRICTION);
  }

  // Skid: turning against fast ground momentum kicks up a backward dust spray
  // (throttled). The matching body lean is render-only (squash.skidLean).
  if (p.onGround && dir !== 0 && Math.abs(p.vx) > SKID_MIN && Math.sign(p.vx) === -dir) {
    if (state.frame % 3 === 0) spawnSkidDust(state, p.x + p.w / 2, p.y + p.h, Math.sign(p.vx));
  }

  // Dash overrides horizontal velocity while active (cancels into a jump).
  updateDash(state, pawn);

  // Jump: fire when a buffered press meets available coyote time. A ground jump
  // takes priority; otherwise a buffered press while clinging (or within the
  // wall-coyote window) kicks Pip diagonally off the wall.
  if (pawn.jumpBuffer > 0 && pawn.coyote > 0 && !keys.lock) {
    p.vy = JUMP;
    p.onGround = false;
    pawn.jumpBuffer = 0;
    pawn.coyote = 0;
    pawn.jumping = true;
    spawnJumpDust(state, p.x + p.w / 2, p.y + p.h);
    sfx('jump');
  } else if (pawn.jumpBuffer > 0 && (p.wallSlide || p.wallCoyote > 0) && !p.onGround && !keys.lock) {
    p.vy = JUMP * WALL_JUMP_V_MULT;
    p.vx = -p.wallDir * WALL_JUMP_H;
    p.face = p.wallDir > 0 ? -1 : 1; // launch away from the wall
    pawn.wallJumpLock = WALL_JUMP_LOCK;
    pawn.jumpBuffer = 0;
    pawn.jumping = true;
    p.wallSlide = false;
    p.wallCoyote = 0;
    spawnJumpDust(state, p.x + p.w / 2, p.y + p.h);
    sfx('jump');
  }

  // Gravity, clamped.
  p.vy += GRAVITY;
  if (p.vy > MAXFALL) p.vy = MAXFALL;

  // Wall cling: caps descent to a slow slide and arms the wall jump. Runs after
  // gravity so the slide speed wins over the fall; the wall jump itself was
  // fired above off the previous frame's cling state.
  updateWall(state, pawn);

  // Variable jump height: while still rising from a jump, releasing the button
  // cuts upward velocity once for a short hop. Reaching the apex ends the jump.
  if (pawn.jumping) {
    if (p.vy >= 0) {
      pawn.jumping = false;
    } else if (!keys.jump) {
      p.vy *= JUMP_CUT_MULT;
      pawn.jumping = false;
    }
  }

  // Down in the air: fast-fall (ground ducking is handled in the crawl above).
  if (keys.down && !p.onGround && p.vy > 0) {
    p.vy = Math.min(FASTFALL_CAP, p.vy + GRAVITY * FASTFALL_MULT);
  }

  // Horizontal move + clamp to world + tile collision.
  p.x += p.vx;
  if (p.x < 0) {
    p.x = 0;
    p.vx = 0;
  }
  if (p.x > level.worldW - p.w) {
    p.x = level.worldW - p.w;
    p.vx = 0;
  }
  collideX(level, p);

  // Vertical move + tile collision (sets onGround). A head-bump on a question
  // block (rising, then stopped without landing) pops its reward.
  const risingBefore = p.vy < 0;
  const airBefore = !p.onGround;
  const fallSpeed = p.vy;
  p.y += p.vy;
  collideY(level, p);
  if (!predicting && risingBefore && p.vy === 0 && !p.onGround) bumpBlocks(state, pawn);

  // Touchdown: a hard enough landing squashes Pip and kicks up a dust fan.
  if (airBefore && p.onGround && fallSpeed > LAND_DUST_MIN) {
    const impact = Math.min(1, fallSpeed / MAXFALL);
    p.landSquash = 0.5 + impact * 0.5;
    spawnLandDust(state, p.x + p.w / 2, p.y + p.h, impact);
  }
  if (p.landSquash > 0) p.landSquash = Math.max(0, p.landSquash - LAND_SQUASH_DECAY);

  // Landing ends a stomp-chain combo.
  if (p.onGround) pawn.combo = 0;

  if (p.hurt > 0) p.hurt -= 1;

  // Fire: the equipped weapon decides rate, spread, arc, homing, and charge.
  // Skipped entirely while predicting (the host fires + owns projectiles).
  if (predicting) return;
  if (pawn.shootCd > 0) pawn.shootCd -= 1;
  const weapon = currentWeapon(pawn);
  // Auto-fire treats the trigger as held but, unlike a manual hold, re-arms each
  // time the weapon comes off cooldown (below) so it repeats at the fire rate.
  // Charge weapons are exempt — they need a real press-and-release to charge.
  const autoFire = state.autoFire && !weapon.charge;
  if (weapon.charge) {
    updateCharge(state, pawn, weapon);
  } else if ((keys.shoot || autoFire) && !pawn.shootLatch) {
    pawn.shootLatch = true;
    if (p.armed && pawn.shootCd <= 0) {
      fireWeapon(state, pawn, weapon, weapon.damage, weapon.sizeMult, weapon.pierce ?? false);
      pawn.shootCd = weapon.fireRate;
      sfx('shoot');
    }
  } else if (!keys.shoot) {
    pawn.shootLatch = false;
  }
  // Auto-fire: clear the latch once the cooldown is ready so the held trigger
  // re-triggers next frame (manual fire stays semi-auto — one shot per press).
  if (autoFire && pawn.shootCd <= 0) pawn.shootLatch = false;
}

/**
 * Resize Pip's collision box for ducking. Crouch (Down on the ground) shrinks
 * him to CROUCH_H, keeping his feet planted by lowering the box top. He only
 * stands back up when the full-height box has clear headroom — otherwise he
 * stays crouched (e.g. while still under a low brick).
 */
function updateCrouch(state: GameState, pawn: Pawn): void {
  const p = pawn.player;
  resizeCrouch(state.level, p, pawn.keys.down && p.onGround);
}

/**
 * Apply a crouch resize to Pip's box. Entering a crouch shrinks him to CROUCH_H
 * with his feet planted; leaving one restores full height only when the space
 * overhead is clear. Pure (mutates `p`) so it can be unit-tested directly.
 */
export function resizeCrouch(level: Level, p: Player, wantCrouch: boolean): void {
  const isCrouched = p.h < PLAYER_H;
  if (wantCrouch && !isCrouched) {
    p.y += PLAYER_H - CROUCH_H;
    p.h = CROUCH_H;
  } else if (!wantCrouch && isCrouched && canStandUp(level, p)) {
    p.y -= PLAYER_H - CROUCH_H;
    p.h = PLAYER_H;
  }
  p.crouch = p.h < PLAYER_H;
}

/** True when the space above a crouched Pip is clear enough to stand up into. */
function canStandUp(level: Level, p: Player): boolean {
  const newTop = p.y - (PLAYER_H - CROUCH_H);
  const lft = Math.floor(p.x / TILE);
  const rgt = Math.floor((p.x + p.w - 1) / TILE);
  const rTop = Math.floor(newTop / TILE);
  const rBot = Math.floor((p.y - 1) / TILE);
  for (let r = rTop; r <= rBot; r++) {
    for (let c = lft; c <= rgt; c++) {
      if (solid(level, c, r)) return false;
    }
  }
  return true;
}

/**
 * Spawn the weapon's bolt(s) along the 8-direction aim. Spread guns fire a cone
 * of pellets; arc guns get an upward lift so they lob; homing guns steer later.
 */
function fireWeapon(
  state: GameState,
  pawn: Pawn,
  weapon: Weapon,
  damage: number,
  sizeMult: number,
  pierce: boolean,
): void {
  const p = pawn.player;
  const { ax, ay } = aimVector(state, pawn);
  const base = Math.atan2(ay, ax);
  const pellets = weapon.pellets ?? 1;
  const cone = weapon.spread ?? 0;
  const w = BOLT_W * sizeMult;
  const h = BOLT_H * sizeMult;
  const cx = p.x + p.w / 2 - w / 2 + Math.cos(base) * (p.w / 2 + 4);
  const cy = p.y + p.h * 0.42 - h / 2 + Math.sin(base) * (p.h * 0.32);
  for (let i = 0; i < pellets; i++) {
    const t = pellets === 1 ? 0 : i / (pellets - 1) - 0.5; // -0.5 .. 0.5
    const ang = base + t * cone;
    const vy = Math.sin(ang) * weapon.speed - (weapon.arc ? ARC_LIFT : 0);
    state.projectiles.push({
      x: cx,
      y: cy,
      w,
      h,
      vx: Math.cos(ang) * weapon.speed,
      vy,
      alive: true,
      from: 'player',
      damage,
      pierce: pierce || undefined,
      grav: weapon.arc || undefined,
      homing: weapon.homing || undefined,
      ttl: weapon.range,
    });
  }
}

/** Charge gun: build charge while fire is held, release a scaled shot. */
function updateCharge(state: GameState, pawn: Pawn, weapon: Weapon): void {
  if (pawn.keys.shoot) {
    pawn.shootLatch = true;
    if (pawn.charge < CHARGE_MAX) pawn.charge += 1;
  } else if (pawn.charge > 0) {
    const ratio = pawn.charge / CHARGE_MAX; // 0..1
    const full = ratio >= 1;
    const damage = Math.max(1, Math.round(weapon.damage * (1 + ratio * (CHARGE_DMG_MULT - 1))));
    const size = weapon.sizeMult * (1 + ratio * (CHARGE_SIZE_MULT - 1));
    fireWeapon(state, pawn, weapon, damage, size, full);
    sfx(full ? 'super' : 'shoot');
    pawn.charge = 0;
    pawn.shootLatch = false;
  }
}
