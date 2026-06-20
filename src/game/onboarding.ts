// First-run onboarding: short control hints shown the first time the player can
// use each verb (move/jump, dash, shoot, parry-bounce). Each id shows once ever
// — "seen" is persisted to localStorage, so veterans never see them again. Only
// one banner shows at a time; a blocked hint stays unseen and fires later.
//
// Pure-ish: the active banner lives on state.hint (read by the renderer); the
// seen-set is the only side channel (localStorage), loaded lazily.

import { BEST_KEY, TILE } from './constants';
import type { GameState } from './state';

const SEEN_KEY = `${BEST_KEY}-onboarded`;
const HINT_LIFE = 200; // ~3.3s at 60fps

let seen: Set<string> | null = null;

/** Lazily load the persisted set of hint ids the player has already seen. */
function seenSet(): Set<string> {
  if (seen) return seen;
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    seen = new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    seen = new Set();
  }
  return seen;
}

function persist(s: Set<string>): void {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...s]));
  } catch {
    /* ignore storage errors */
  }
}

/**
 * Show hint `id` once ever. No-op if already seen or if a banner is already on
 * screen (so hints queue rather than overwrite); marks it seen only when shown.
 */
function showHint(state: GameState, id: string, text: string): void {
  const s = seenSet();
  if (s.has(id)) return;
  if (state.hint && state.hint.life > 0) return; // one at a time
  state.hint = { text, life: HINT_LIFE, max: HINT_LIFE };
  s.add(id);
  persist(s);
}

/** Count down the active banner; clear it when it expires. Call once per tick. */
export function tickHint(state: GameState): void {
  if (!state.hint) return;
  state.hint.life -= 1;
  if (state.hint.life <= 0) state.hint = null;
}

/**
 * Evaluate the contextual triggers this tick and surface the right first-run
 * hint. Called from the play update only (never on the boss screen).
 */
export function maybeOnboard(state: GameState): void {
  const p = state.players[0]?.player;
  if (!p) return;

  // Move/jump — the very first moment of play.
  showHint(state, 'move', '← →  MOVE      SPACE  JUMP');

  // Dash — once Pip has walked a little way in.
  if (p.x > 10 * TILE) showHint(state, 'dash', 'DOUBLE-TAP ← / →  OR  SHIFT  =  DASH');

  // Shoot — armed, with a live foe within sight ahead.
  if (p.armed && state.enemies.some((e) => e.alive && Math.abs(e.x - p.x) < 420)) {
    showHint(state, 'shoot', 'F / X  SHOOT');
  }

  // Bounce — standing near an armed pink orb over a chasm.
  const nearOrb = state.parryOrbs.some(
    (o) => o.cooldown <= 0 && Math.abs(o.x - p.x) < 150 && Math.abs(o.y - p.y) < 170,
  );
  if (nearOrb) showHint(state, 'bounce', 'TOUCH THE PINK ORB TO BOUNCE ACROSS');
}
