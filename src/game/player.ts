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
  SPEED,
  TILE,
} from './constants';
import { bumpBlocks } from './blocks';
import { updateDash } from './dash';
import { collideX, collideY, solid } from './physics';
import { spawnJumpDust, spawnLandDust } from './puff';
import { LAND_DUST_MIN, LAND_SQUASH_DECAY } from './constants';
import type { GameState } from './state';
import type { Level, Player, Weapon } from '../types';
import { currentWeapon } from './weapons';

/** Diagonal velocity normalizer so diagonal bolts aren't faster than cardinal. */
const DIAG = Math.SQRT1_2;

/**
 * The 8-direction aim vector for a fired bolt. Holding Lock roots Pip and lets
 * the direction keys choose any of 8 directions; otherwise bolts fly straight
 * ahead, except a Down press in mid-air fires straight down (a pogo shot).
 */
function aimVector(state: GameState, p: Player): { ax: number; ay: number } {
  const keys = state.keys;
  // Gamepad right-stick (twin-stick) aim overrides, already normalized.
  if (state.aimX !== 0 || state.aimY !== 0) {
    return { ax: state.aimX, ay: state.aimY };
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

export function updatePlayer(state: GameState): void {
  const p = state.player;
  const keys = state.keys;
  const level = state.level;

  // Weapon switch (rising edge): cycle through the unlocked guns.
  if (keys.switchWeapon && !state.switchLatch) {
    state.switchLatch = true;
    if (state.weapons.length > 1) {
      state.weaponIdx = (state.weaponIdx + 1) % state.weapons.length;
      state.charge = 0;
      sfx('swap');
    }
  } else if (!keys.switchWeapon) {
    state.switchLatch = false;
  }

  // Coyote time: refresh while grounded, count down once airborne so a jump
  // still fires for a few frames after stepping off a ledge.
  if (p.onGround) state.coyote = COYOTE_FRAMES;
  else if (state.coyote > 0) state.coyote -= 1;

  // Jump buffer: remember a fresh press (rising edge) for a few frames so a
  // jump tapped just before landing still fires on touchdown. The latch keeps
  // a held button from refilling the buffer (no auto-rejump).
  // (Lock roots Pip for free-aim, so it suppresses both jump and movement.)
  if (keys.jump && !state.jumpLatch && !keys.lock) {
    state.jumpBuffer = JUMP_BUFFER_FRAMES;
    state.jumpLatch = true;
  } else if (!keys.jump) {
    state.jumpLatch = false;
  }
  if (state.jumpBuffer > 0) state.jumpBuffer -= 1;

  // Ducking on the ground: a real hitbox shrink (58→30) so Pip can crawl under
  // low platforms. Feet stay planted (we grow/shrink from the head). Standing
  // back up is blocked while a solid tile is directly overhead, so a crouch held
  // under a brick stays a crouch instead of clipping Pip into it.
  updateCrouch(state);

  // Horizontal: accelerate toward the target speed, decelerate via friction
  // when there's no input. Gives weighty, non-binary control.
  let dir = 0;
  if (!keys.lock) {
    if (keys.left) dir -= 1;
    if (keys.right) dir += 1;
  }
  if (dir !== 0) {
    const target = dir * SPEED * (p.crouch ? CROUCH_SPEED_MULT : 1);
    if (p.vx < target) p.vx = Math.min(target, p.vx + ACCEL);
    else if (p.vx > target) p.vx = Math.max(target, p.vx - ACCEL);
    p.face = dir < 0 ? -1 : 1;
  } else if (p.vx > 0) {
    p.vx = Math.max(0, p.vx - FRICTION);
  } else if (p.vx < 0) {
    p.vx = Math.min(0, p.vx + FRICTION);
  }

  // Dash overrides horizontal velocity while active (cancels into a jump).
  updateDash(state);

  // Jump: fire when a buffered press meets available coyote time.
  if (state.jumpBuffer > 0 && state.coyote > 0 && !keys.lock) {
    p.vy = JUMP;
    p.onGround = false;
    state.jumpBuffer = 0;
    state.coyote = 0;
    state.jumping = true;
    spawnJumpDust(state, p.x + p.w / 2, p.y + p.h);
    sfx('jump');
  }

  // Gravity, clamped.
  p.vy += GRAVITY;
  if (p.vy > MAXFALL) p.vy = MAXFALL;

  // Variable jump height: while still rising from a jump, releasing the button
  // cuts upward velocity once for a short hop. Reaching the apex ends the jump.
  if (state.jumping) {
    if (p.vy >= 0) {
      state.jumping = false;
    } else if (!keys.jump) {
      p.vy *= JUMP_CUT_MULT;
      state.jumping = false;
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
  if (risingBefore && p.vy === 0 && !p.onGround) bumpBlocks(state);

  // Touchdown: a hard enough landing squashes Pip and kicks up a dust fan.
  if (airBefore && p.onGround && fallSpeed > LAND_DUST_MIN) {
    const impact = Math.min(1, fallSpeed / MAXFALL);
    p.landSquash = 0.5 + impact * 0.5;
    spawnLandDust(state, p.x + p.w / 2, p.y + p.h, impact);
  }
  if (p.landSquash > 0) p.landSquash = Math.max(0, p.landSquash - LAND_SQUASH_DECAY);

  // Landing ends a stomp-chain combo.
  if (p.onGround) state.combo = 0;

  if (p.hurt > 0) p.hurt -= 1;

  // Fire: the equipped weapon decides rate, spread, arc, homing, and charge.
  if (state.shootCd > 0) state.shootCd -= 1;
  const weapon = currentWeapon(state);
  if (weapon.charge) {
    updateCharge(state, p, weapon);
  } else if (keys.shoot && !state.shootLatch) {
    state.shootLatch = true;
    if (p.armed && state.shootCd <= 0) {
      fireWeapon(state, p, weapon, weapon.damage, weapon.sizeMult, weapon.pierce ?? false);
      state.shootCd = weapon.fireRate;
      sfx('shoot');
    }
  } else if (!keys.shoot) {
    state.shootLatch = false;
  }
}

/**
 * Resize Pip's collision box for ducking. Crouch (Down on the ground) shrinks
 * him to CROUCH_H, keeping his feet planted by lowering the box top. He only
 * stands back up when the full-height box has clear headroom — otherwise he
 * stays crouched (e.g. while still under a low brick).
 */
function updateCrouch(state: GameState): void {
  const p = state.player;
  resizeCrouch(state.level, p, state.keys.down && p.onGround);
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
  p: Player,
  weapon: Weapon,
  damage: number,
  sizeMult: number,
  pierce: boolean,
): void {
  const { ax, ay } = aimVector(state, p);
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
function updateCharge(state: GameState, p: Player, weapon: Weapon): void {
  if (state.keys.shoot) {
    state.shootLatch = true;
    if (state.charge < CHARGE_MAX) state.charge += 1;
  } else if (state.charge > 0) {
    const ratio = state.charge / CHARGE_MAX; // 0..1
    const full = ratio >= 1;
    const damage = Math.max(1, Math.round(weapon.damage * (1 + ratio * (CHARGE_DMG_MULT - 1))));
    const size = weapon.sizeMult * (1 + ratio * (CHARGE_SIZE_MULT - 1));
    fireWeapon(state, p, weapon, damage, size, full);
    sfx(full ? 'super' : 'shoot');
    state.charge = 0;
    state.shootLatch = false;
  }
}
