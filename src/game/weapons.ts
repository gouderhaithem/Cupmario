// The weapon roster as data (§3). A new gun is a config entry here — the firing
// code in player.ts reads these fields, so no new code is needed to add one.
// Mushrooms unlock the next weapon in WEAPON_ORDER (see mushroom.ts).

import type { Weapon, WeaponId } from '../types';
import type { GameState } from './state';

export const WEAPONS: Record<WeaponId, Weapon> = {
  peashot: { id: 'peashot', name: 'PEASHOT', damage: 1, fireRate: 14, speed: 9, sizeMult: 1 },
  spread: {
    id: 'spread',
    name: 'SPREAD',
    damage: 1,
    fireRate: 22,
    speed: 7.5,
    sizeMult: 0.85,
    pellets: 4,
    spread: 0.7,
    range: 17, // ~130px: a close-range shotgun, weak at distance (retired from rotation)
  },
  lobber: {
    id: 'lobber',
    name: 'LOBBER',
    damage: 3,
    fireRate: 30,
    speed: 7,
    sizeMult: 1.6,
    arc: true,
  },
  charge: {
    id: 'charge',
    name: 'CHARGE',
    damage: 1,
    fireRate: 0,
    speed: 11,
    sizeMult: 1.2,
    charge: true,
  },
  homing: {
    id: 'homing',
    name: 'HOMING',
    damage: 1,
    fireRate: 20,
    speed: 6,
    sizeMult: 1,
    homing: true,
  },
};

/**
 * Unlock order: mushrooms grant the next not-yet-owned weapon in this list.
 * 2nd pickup is HOMING (the boss-style "follow the enemy" shot); the old SPREAD
 * is retired from rotation (kept in WEAPONS only for type completeness + Super).
 */
export const WEAPON_ORDER: WeaponId[] = ['peashot', 'homing', 'lobber', 'charge'];

/** The weapon Pip currently has equipped. */
export function currentWeapon(state: GameState): Weapon {
  return WEAPONS[state.weapons[state.weaponIdx] ?? 'peashot'];
}
