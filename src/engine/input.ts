// Keyboard + on-screen touch buttons -> the shared Keys object. Never read DOM
// events inside update(); listeners only mutate state.keys (or fire onAction).

import { initAudio } from './audio';
import type { GameState } from '../game/state';

const PREVENT = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ']);
const LEFT = new Set(['ArrowLeft', 'a', 'A']);
const RIGHT = new Set(['ArrowRight', 'd', 'D']);
const DOWN = new Set(['ArrowDown', 's', 'S']);
const JUMP = new Set([' ', 'ArrowUp', 'w', 'W']);
const SHOOT = new Set(['f', 'F', 'x', 'X']);
const ADVANCE = new Set([' ', 'Enter', 'ArrowRight', 'ArrowUp', 'w', 'W']);

/**
 * Wire input. `advance` is the title/levelup/gameover/win action; it also
 * initializes audio (browsers require a user gesture).
 */
export function setupInput(state: GameState, advance: () => void): void {
  const action = (): void => {
    initAudio();
    advance();
  };

  // ---- Keyboard ----
  window.addEventListener('keydown', (e) => {
    const k = e.key;
    if (PREVENT.has(k)) e.preventDefault();

    if (state.screen !== 'play') {
      if (ADVANCE.has(k)) action();
      return;
    }
    if (LEFT.has(k)) state.keys.left = true;
    if (RIGHT.has(k)) state.keys.right = true;
    if (DOWN.has(k)) state.keys.down = true;
    if (JUMP.has(k)) state.keys.jump = true;
    if (SHOOT.has(k)) state.keys.shoot = true;
  });

  window.addEventListener('keyup', (e) => {
    const k = e.key;
    if (LEFT.has(k)) state.keys.left = false;
    if (RIGHT.has(k)) state.keys.right = false;
    if (DOWN.has(k)) state.keys.down = false;
    if (JUMP.has(k)) {
      state.keys.jump = false;
      state.jumpLatch = false;
    }
    if (SHOOT.has(k)) {
      state.keys.shoot = false;
      state.shootLatch = false;
    }
  });

  // ---- Touch buttons ----
  bindHold('btn-left', () => (state.keys.left = true), () => (state.keys.left = false));
  bindHold('btn-right', () => (state.keys.right = true), () => (state.keys.right = false));
  bindHold('btn-down', () => (state.keys.down = true), () => (state.keys.down = false));
  bindHold(
    'btn-jump',
    () => {
      if (state.screen !== 'play') {
        action();
        return;
      }
      state.keys.jump = true;
    },
    () => {
      state.keys.jump = false;
      state.jumpLatch = false;
    },
  );
  bindHold(
    'btn-fire',
    () => (state.keys.shoot = true),
    () => {
      state.keys.shoot = false;
      state.shootLatch = false;
    },
  );

  // ---- Tap anywhere on the cabinet advances non-play screens ----
  const cabinet = document.getElementById('cabinet');
  cabinet?.addEventListener('click', () => {
    if (state.screen !== 'play') action();
  });
}

/** Press-and-hold pointer wiring for a touch button, with visual feedback. */
function bindHold(id: string, onDown: () => void, onUp: () => void): void {
  const el = document.getElementById(id);
  if (!el) return;

  const press = (e: Event): void => {
    e.preventDefault();
    e.stopPropagation(); // don't trigger the cabinet "tap to advance" click
    el.classList.add('active');
    onDown();
  };
  const release = (): void => {
    el.classList.remove('active');
    onUp();
  };

  el.addEventListener('pointerdown', press);
  el.addEventListener('pointerup', release);
  el.addEventListener('pointerleave', release);
  el.addEventListener('pointercancel', release);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  // Swallow the button's own click so it never bubbles to the cabinet.
  el.addEventListener('click', (e) => e.stopPropagation());
}
