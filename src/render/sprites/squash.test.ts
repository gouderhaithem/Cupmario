import { describe, it, expect } from 'vitest';
import { isSkidding, playerSquash, skidLean } from './squash';
import type { Player } from '../../types';

// playerSquash reads only vx/vy/onGround/crouch/landSquash; cast a minimal shape.
function p(over: Partial<Player>): Player {
  return { vx: 0, vy: 0, onGround: true, crouch: false, landSquash: 0, face: 1, ...over } as Player;
}

describe('playerSquash', () => {
  it('squashes flat-and-wide on a landing impact', () => {
    const s = playerSquash(p({ landSquash: 1 }), 0);
    expect(s.sy).toBeLessThan(1);
    expect(s.sx).toBeGreaterThan(1);
  });

  it('stretches tall on takeoff (fast rise)', () => {
    const s = playerSquash(p({ onGround: false, vy: -14 }), 0);
    expect(s.sy).toBeGreaterThan(1);
    expect(s.sx).toBeLessThan(1);
  });

  it('pops the takeoff stretch harder than an equal-speed dive', () => {
    const up = playerSquash(p({ onGround: false, vy: -14 }), 0);
    const down = playerSquash(p({ onGround: false, vy: 14 }), 0);
    expect(up.sy).toBeGreaterThan(down.sy);
  });

  it('rounds out into a hang at the apex (wide + short)', () => {
    const s = playerSquash(p({ onGround: false, vy: 0 }), 0);
    expect(s.sy).toBeLessThan(1);
    expect(s.sx).toBeGreaterThan(1);
  });

  it('is neutral when standing still at the breath midpoint', () => {
    const s = playerSquash(p({ onGround: true, vx: 0 }), 0); // sin(0) = 0
    expect(s.sx).toBeCloseTo(1, 5);
    expect(s.sy).toBeCloseTo(1, 5);
  });
});

describe('skid lean', () => {
  it('detects a skid when facing against fast ground momentum', () => {
    // Sliding right (vx > 0) but already facing left (turned) → skid.
    expect(isSkidding(p({ onGround: true, vx: 5, face: -1 }))).toBe(true);
  });

  it('is not a skid when facing the way you are moving', () => {
    expect(isSkidding(p({ onGround: true, vx: 5, face: 1 }))).toBe(false);
  });

  it('is not a skid in the air or at low speed', () => {
    expect(isSkidding(p({ onGround: false, vx: 5, face: -1 }))).toBe(false);
    expect(isSkidding(p({ onGround: true, vx: 0.5, face: -1 }))).toBe(false);
  });

  it('leans toward the new facing direction (sign matches face)', () => {
    expect(skidLean(p({ onGround: true, vx: 5, face: -1 }))).toBeLessThan(0); // face left → lean left
    expect(skidLean(p({ onGround: true, vx: -5, face: 1 }))).toBeGreaterThan(0); // face right → lean right
    expect(skidLean(p({ onGround: true, vx: 5, face: 1 }))).toBe(0); // not skidding
  });
});
