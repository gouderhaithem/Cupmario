// Keyboard + on-screen touch buttons -> the shared Keys object. Never read DOM
// events inside update(); listeners only mutate state.keys (or fire onAction).

import { initAudio } from './audio';
import type { GameState } from '../game/state';

const PREVENT = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ']);
const LEFT = new Set(['ArrowLeft', 'a', 'A']);
const RIGHT = new Set(['ArrowRight', 'd', 'D']);
const UP = new Set(['ArrowUp', 'w', 'W']);
const DOWN = new Set(['ArrowDown', 's', 'S']);
const JUMP = new Set([' ', 'ArrowUp', 'w', 'W']);
const SHOOT = new Set(['f', 'F', 'x', 'X']);
const DASH = new Set(['Shift']);
const LOCK = new Set(['k', 'K']);
const SUPER = new Set(['j', 'J']);
const SWITCH = new Set(['q', 'Q', 'e', 'E']);
const PAUSE = new Set(['Escape', 'p', 'P']);

/**
 * Wire input. `onMenuKey(key)` handles any key on a non-gameplay screen
 * (advance, or navigate/confirm in stage select); it also initializes audio
 * (browsers require a user gesture).
 */
export function setupInput(state: GameState, onMenuKey: (key: string) => void): void {
  const action = (key: string): void => {
    initAudio();
    onMenuKey(key);
  };

  // ---- Keyboard ----
  window.addEventListener('keydown', (e) => {
    const k = e.key;
    if (PREVENT.has(k)) e.preventDefault();

    if (state.screen !== 'play' && state.screen !== 'boss') {
      action(k); // flow decides: advance, open select, or navigate the menu
      return;
    }
    // In-game: pause toggle and (while paused) pause-menu navigation.
    if (PAUSE.has(k)) {
      action(k);
      return;
    }
    if (state.paused) {
      onMenuKey(k);
      return;
    }
    if (LEFT.has(k)) state.keys.left = true;
    if (RIGHT.has(k)) state.keys.right = true;
    if (UP.has(k)) state.keys.up = true;
    if (DOWN.has(k)) state.keys.down = true;
    if (JUMP.has(k)) state.keys.jump = true;
    if (SHOOT.has(k)) state.keys.shoot = true;
    if (DASH.has(k)) state.keys.dash = true;
    if (LOCK.has(k)) state.keys.lock = true;
    if (SUPER.has(k)) state.keys.super = true;
    if (SWITCH.has(k)) state.keys.switchWeapon = true;
  });

  window.addEventListener('keyup', (e) => {
    const k = e.key;
    if (LEFT.has(k)) state.keys.left = false;
    if (RIGHT.has(k)) state.keys.right = false;
    if (UP.has(k)) state.keys.up = false;
    if (DOWN.has(k)) state.keys.down = false;
    if (JUMP.has(k)) {
      state.keys.jump = false;
      state.jumpLatch = false;
    }
    if (SHOOT.has(k)) {
      state.keys.shoot = false;
      state.shootLatch = false;
    }
    if (DASH.has(k)) {
      state.keys.dash = false;
      state.dashLatch = false;
    }
    if (LOCK.has(k)) state.keys.lock = false;
    if (SUPER.has(k)) {
      state.keys.super = false;
      state.superLatch = false;
    }
    if (SWITCH.has(k)) {
      state.keys.switchWeapon = false;
      state.switchLatch = false;
    }
  });

  // ---- Touch buttons ----
  bindHold('btn-left', () => (state.keys.left = true), () => (state.keys.left = false));
  bindHold('btn-right', () => (state.keys.right = true), () => (state.keys.right = false));
  bindHold('btn-down', () => (state.keys.down = true), () => (state.keys.down = false));
  bindHold(
    'btn-jump',
    () => {
      if (state.screen !== 'play' && state.screen !== 'boss') {
        action('Enter');
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
  bindHold(
    'btn-dash',
    () => (state.keys.dash = true),
    () => {
      state.keys.dash = false;
      state.dashLatch = false;
    },
  );
  bindHold(
    'btn-super',
    () => (state.keys.super = true),
    () => {
      state.keys.super = false;
      state.superLatch = false;
    },
  );
  bindHold(
    'btn-swap',
    () => (state.keys.switchWeapon = true),
    () => {
      state.keys.switchWeapon = false;
      state.switchLatch = false;
    },
  );

  // ---- Tap anywhere on the cabinet advances non-play screens ----
  const cabinet = document.getElementById('cabinet');
  cabinet?.addEventListener('click', () => {
    if (state.screen !== 'play' && state.screen !== 'boss') action('Enter');
  });
}

// ---- Gamepad (§12.4) ----
// Polled each frame from the render loop. Left stick / d-pad move, A jumps,
// X shoots, B dashes, Y switches, LB locks, RB supers, Start pauses, and the
// RIGHT STICK is a true twin-stick aim (feeds state.aimX/aimY, see player.ts).

type PadFlags = Partial<Record<keyof GameState['keys'], boolean>>;
const GP_KEYS: (keyof GameState['keys'])[] = [
  'left', 'right', 'up', 'down', 'jump', 'shoot', 'dash', 'lock', 'super', 'switchWeapon',
];
const padPrev: Record<string, boolean> = {};
const menuPrev: Record<string, boolean> = {};

/** Apply held pad inputs, releasing (and unlatching) only what the pad set. */
function applyPad(state: GameState, pad: PadFlags): void {
  const keys = state.keys;
  for (const k of GP_KEYS) {
    const on = !!pad[k];
    if (on) keys[k] = true;
    else if (padPrev[k]) {
      keys[k] = false;
      if (k === 'jump') state.jumpLatch = false;
      if (k === 'shoot') state.shootLatch = false;
      if (k === 'dash') state.dashLatch = false;
      if (k === 'super') state.superLatch = false;
      if (k === 'switchWeapon') state.switchLatch = false;
    }
    padPrev[k] = on;
  }
}

/** Poll the first connected gamepad and translate it to keys / aim / menu input. */
export function pollGamepad(state: GameState, onMenuKey: (key: string) => void): void {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const gp = Array.from(pads).find((p) => p) ?? null;
  if (!gp) {
    state.aimX = 0;
    state.aimY = 0;
    return;
  }
  const btn = (i: number): boolean => !!gp.buttons[i]?.pressed;
  const ax = (i: number): number => gp.axes[i] ?? 0;
  const inGame = (state.screen === 'play' || state.screen === 'boss') && !state.paused;

  if (inGame) {
    applyPad(state, {
      left: ax(0) < -0.4 || btn(14),
      right: ax(0) > 0.4 || btn(15),
      up: ax(1) < -0.5 || btn(12),
      down: ax(1) > 0.5 || btn(13),
      jump: btn(0),
      shoot: btn(2),
      dash: btn(1),
      lock: btn(4),
      super: btn(5),
      switchWeapon: btn(3),
    });
    const rx = ax(2);
    const ry = ax(3);
    const mag = Math.hypot(rx, ry);
    if (mag > 0.5) {
      state.aimX = rx / mag;
      state.aimY = ry / mag;
    } else {
      state.aimX = 0;
      state.aimY = 0;
    }
  } else {
    applyPad(state, {}); // release pad-held keys when not in active play
    state.aimX = 0;
    state.aimY = 0;
  }

  // Edge-triggered: Start toggles pause anywhere; in menus the d-pad navigates
  // and A confirms (Start is reserved for pause so it doesn't double as select).
  const edge = (name: string, pressed: boolean, key: string): void => {
    if (pressed && !menuPrev[name]) onMenuKey(key);
    menuPrev[name] = pressed;
  };
  edge('pause', btn(9), 'Escape');
  if (!inGame) {
    edge('up', ax(1) < -0.5 || btn(12), 'ArrowUp');
    edge('down', ax(1) > 0.5 || btn(13), 'ArrowDown');
    edge('left', ax(0) < -0.4 || btn(14), 'ArrowLeft');
    edge('right', ax(0) > 0.4 || btn(15), 'ArrowRight');
    edge('confirm', btn(0), 'Enter');
  }
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
