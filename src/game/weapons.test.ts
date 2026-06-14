import { describe, it, expect } from 'vitest';
import { WEAPONS, WEAPON_ORDER, currentWeapon } from './weapons';
import type { GameState } from './state';
import type { WeaponId } from '../types';

describe('WEAPONS roster', () => {
  it('keys each weapon by its own id', () => {
    for (const [key, w] of Object.entries(WEAPONS)) {
      expect(w.id).toBe(key);
    }
  });

  it('has positive damage and a sane fire rate for every gun', () => {
    for (const w of Object.values(WEAPONS)) {
      expect(w.damage).toBeGreaterThan(0);
      expect(w.fireRate).toBeGreaterThanOrEqual(0);
      expect(w.speed).toBeGreaterThan(0);
    }
  });

  it('lists each unlock-order entry once, with no duplicates', () => {
    const unique = new Set(WEAPON_ORDER);
    expect(unique.size).toBe(WEAPON_ORDER.length);
  });

  it('only unlocks real weapons, and starts with the peashot', () => {
    const ids = new Set(Object.keys(WEAPONS));
    for (const id of WEAPON_ORDER) expect(ids.has(id)).toBe(true);
    expect(WEAPON_ORDER[0]).toBe('peashot');
  });

  it('retires SPREAD from the rotation (replaced by the HOMING follow-shot)', () => {
    expect(WEAPON_ORDER).not.toContain('spread');
    expect(WEAPON_ORDER).toContain('homing');
  });
});

describe('currentWeapon', () => {
  const stub = (weapons: WeaponId[], weaponIdx: number): GameState =>
    ({ weapons, weaponIdx }) as unknown as GameState;

  it('returns the equipped weapon', () => {
    expect(currentWeapon(stub(['spread'], 0)).id).toBe('spread');
    expect(currentWeapon(stub(['peashot', 'homing'], 1)).id).toBe('homing');
  });

  it('falls back to peashot when the index is out of range', () => {
    expect(currentWeapon(stub([], 0)).id).toBe('peashot');
    expect(currentWeapon(stub(['spread'], 9)).id).toBe('peashot');
  });
});
