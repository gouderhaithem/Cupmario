// Bootstrap: build the game, wire input + scaling, and run the loop.
// update() (fixed step) composes the gameplay systems; render() draws + syncs HUD.

import './style.css';

import { updateCamera } from './engine/camera';
import { decayShake } from './engine/effects';
import { setupInput } from './engine/input';
import { startLoop } from './engine/loop';
import { PIT_MARGIN, VIEW_H, VIEW_W } from './game/constants';
import { updateCoins } from './game/coin';
import { updateEnemies } from './game/enemy';
import { onAction, reachFlag, loseLife } from './game/flow';
import { updateMovers } from './game/mover';
import { updateMushrooms } from './game/mushroom';
import { updatePlayer } from './game/player';
import { updateProjectiles } from './game/projectile';
import { createState } from './game/state';
import { draw } from './render/render';
import { updateHud } from './render/hud';

function getContext(): CanvasRenderingContext2D {
  const canvas = document.getElementById('game');
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Missing <canvas id="game">');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  return ctx;
}

/** Scale the cabinet to fit the window, preserving aspect ratio. */
function setupScale(): void {
  const scaler = document.getElementById('scaler');
  if (!scaler) return;
  // Frame is 960x592 plus ~32px of border/box-shadow chrome on each axis.
  const FRAME_W = VIEW_W + 32;
  const FRAME_H = VIEW_H + 52 + 32;

  const apply = (): void => {
    const w = window.innerWidth || document.documentElement.clientWidth || 0;
    const h = window.innerHeight || document.documentElement.clientHeight || 0;
    if (w < 50 || h < 50) return; // ignore bogus near-zero reads on mount
    const scale = Math.min(w / FRAME_W, h / FRAME_H, 1.2);
    scaler.style.transform = `scale(${scale})`;
  };

  apply();
  requestAnimationFrame(apply);
  setTimeout(apply, 200);
  window.addEventListener('resize', apply);
  if ('ResizeObserver' in window) {
    new ResizeObserver(apply).observe(document.documentElement);
  }
}

function main(): void {
  const ctx = getContext();
  const state = createState();

  setupInput(state, () => onAction(state));
  setupScale();

  // ---- Fixed-step gameplay update ----
  const update = (): void => {
    if (state.screen !== 'play') return;

    // Settle the screen shake every tick, even while frozen.
    decayShake(state);

    // Impact freeze: hold gameplay still for a few frames after a stomp.
    if (state.hitstop > 0) {
      state.hitstop -= 1;
      return;
    }

    updatePlayer(state);
    updateMovers(state); // move platforms + carry the player before other checks
    updateCoins(state);
    updateMushrooms(state); // drift dropped power-ups + handle pickup
    if (updateProjectiles(state)) return; // a bolt cost a life this frame
    if (updateEnemies(state)) return; // lost a life this frame

    // Fell into a pit.
    if (state.player.y > state.level.worldH + PIT_MARGIN) {
      loseLife(state);
      return;
    }

    // Reached the goal flag.
    if (state.player.x + state.player.w / 2 >= state.level.flagX) {
      reachFlag(state);
      return;
    }

    // Decay floating score pops.
    for (let i = state.pops.length - 1; i >= 0; i--) {
      const po = state.pops[i];
      po.life -= 1;
      po.y -= 1;
      if (po.life <= 0) state.pops.splice(i, 1);
    }

    updateCamera(state);
  };

  // ---- Render (per animation frame): animation clock, world, HUD ----
  const render = (): void => {
    state.frame++;
    draw(ctx, state);
    updateHud(state);
  };

  startLoop(update, render);
}

main();
