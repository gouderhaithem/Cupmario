// Player update: input -> velocity, jump (with held-latch), gravity, duck and
// fast-fall, then AABB collision. Mutates state.player.

import { sfx } from '../engine/audio';
import {
  ACCEL,
  BOLT_H,
  BOLT_W,
  COYOTE_FRAMES,
  CROUCH_SPEED_MULT,
  FASTFALL_CAP,
  FASTFALL_MULT,
  FRICTION,
  GRAVITY,
  JUMP,
  JUMP_BUFFER_FRAMES,
  JUMP_CUT_MULT,
  MAXFALL,
  PLAYER_BOLT_SPEED,
  PLAYER_SHOOT_COOLDOWN,
  SPEED,
} from './constants';
import { collideX, collideY } from './physics';
import type { GameState } from './state';

export function updatePlayer(state: GameState): void {
  const p = state.player;
  const keys = state.keys;
  const level = state.level;

  // Coyote time: refresh while grounded, count down once airborne so a jump
  // still fires for a few frames after stepping off a ledge.
  if (p.onGround) state.coyote = COYOTE_FRAMES;
  else if (state.coyote > 0) state.coyote -= 1;

  // Jump buffer: remember a fresh press (rising edge) for a few frames so a
  // jump tapped just before landing still fires on touchdown. The latch keeps
  // a held button from refilling the buffer (no auto-rejump).
  if (keys.jump && !state.jumpLatch) {
    state.jumpBuffer = JUMP_BUFFER_FRAMES;
    state.jumpLatch = true;
  } else if (!keys.jump) {
    state.jumpLatch = false;
  }
  if (state.jumpBuffer > 0) state.jumpBuffer -= 1;

  // Horizontal: accelerate toward the target speed, decelerate via friction
  // when there's no input. Gives weighty, non-binary control.
  let dir = 0;
  if (keys.left) dir -= 1;
  if (keys.right) dir += 1;
  if (dir !== 0) {
    const target = dir * SPEED;
    if (p.vx < target) p.vx = Math.min(target, p.vx + ACCEL);
    else if (p.vx > target) p.vx = Math.max(target, p.vx - ACCEL);
    p.face = dir < 0 ? -1 : 1;
  } else if (p.vx > 0) {
    p.vx = Math.max(0, p.vx - FRICTION);
  } else if (p.vx < 0) {
    p.vx = Math.min(0, p.vx + FRICTION);
  }

  // Jump: fire when a buffered press meets available coyote time.
  if (state.jumpBuffer > 0 && state.coyote > 0) {
    p.vy = JUMP;
    p.onGround = false;
    state.jumpBuffer = 0;
    state.coyote = 0;
    state.jumping = true;
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

  // Down button: duck on the ground, fast-fall in the air.
  p.crouch = false;
  if (keys.down) {
    if (p.onGround) {
      p.crouch = true;
      p.vx *= CROUCH_SPEED_MULT;
    } else if (p.vy > 0) {
      p.vy = Math.min(FASTFALL_CAP, p.vy + GRAVITY * FASTFALL_MULT);
    }
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

  // Vertical move + tile collision (sets onGround).
  p.y += p.vy;
  collideY(level, p);

  if (p.hurt > 0) p.hurt -= 1;

  // Fire a bolt when armed: rising-edge latch + cooldown (no auto-repeat burst).
  if (state.shootCd > 0) state.shootCd -= 1;
  if (keys.shoot && !state.shootLatch) {
    state.shootLatch = true;
    if (p.armed && state.shootCd <= 0) {
      // Holding Down aims the bolt lower (near knee height) instead of chest.
      const aimY = p.y + p.h * (keys.down ? 0.68 : 0.42);
      state.projectiles.push({
        x: p.face > 0 ? p.x + p.w : p.x - BOLT_W,
        y: aimY,
        w: BOLT_W,
        h: BOLT_H,
        vx: p.face * PLAYER_BOLT_SPEED,
        vy: 0,
        alive: true,
        from: 'player',
      });
      state.shootCd = PLAYER_SHOOT_COOLDOWN;
      sfx('shoot');
    }
  } else if (!keys.shoot) {
    state.shootLatch = false;
  }
}
