// Bootstrap: build the game, wire input + scaling, and run the loop.
// update() (fixed step) composes the gameplay systems; render() draws + syncs HUD.

import './style.css';

import { updateCamera } from './engine/camera';
import { decayShake } from './engine/effects';
import { applyColorblind, applyTouchControls, pollGamepad, setupInput } from './engine/input';
import { initLobby } from './engine/lobby';
import { startLoop } from './engine/loop';
import { PIT_MARGIN, VIEW_H, VIEW_W } from './game/constants';
import { updateBoss } from './game/boss';
import { updateCheckpoints } from './game/checkpoint';
import { updateCoins } from './game/coin';
import { updateCrumbles } from './game/crumble';
import { updateEnemies } from './game/enemy';
import { handleMenuKey, reachFlag, loseLife, startStage } from './game/flow';
import { coopIsGuest, coopTick, installCoop } from './game/coop';
import { updateHazards } from './game/hazard';
import { updateMovers } from './game/mover';
import { updateMushrooms } from './game/mushroom';
import { updateOrbs } from './game/orbs';
import { tryParry } from './game/parry';
import { updatePlayer } from './game/player';
import { updatePuffs } from './game/puff';
import { updateSparkles } from './game/sparkle';
import { updateProjectiles } from './game/projectile';
import { updateSuper } from './game/super';
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

  setupInput(state, (key) => handleMenuKey(state, key));
  applyTouchControls(state.showTouchControls);
  applyColorblind(state.colorblind);
  initLobby(state);
  installCoop(state, (stage) => startStage(state, stage));
  setupScale();

  // ---- Boss-arena update: locked camera, boss patterns, instant retry ----
  const updateBossArena = (): void => {
    for (const pawn of state.players) if (!pawn.down) updatePlayer(state, pawn);
    if (updateBoss(state)) return; // contact/KO ended the frame (retry or win)
    for (const pawn of state.players) if (!pawn.down) tryParry(state, pawn);
    for (const pawn of state.players) if (!pawn.down) updateSuper(state, pawn);
    if (updateProjectiles(state)) return; // a bolt forced a retry
    if (updateEnemies(state)) return; // a summoned add forced a retry
    if (updateHazards(state)) return; // a root pillar / floor zap forced a retry

    const fellBoss = state.players.find(
      (pw) => !pw.down && pw.player.y > state.level.worldH + PIT_MARGIN,
    );
    if (fellBoss) {
      loseLife(state, fellBoss); // on the boss screen this is an instant retry
      return;
    }

    for (let i = state.pops.length - 1; i >= 0; i--) {
      const po = state.pops[i];
      po.life -= 1;
      po.y -= 1;
      if (po.life <= 0) state.pops.splice(i, 1);
    }

    updatePuffs(state); // advance + fade dust clouds
    updateSparkles(state); // advance + fade coin twinkles
    updateCamera(state); // clamps to 0 in the tight arena
  };

  // ---- Fixed-step gameplay update ----
  const update = (): void => {
    coopTick(state); // stream input (guest) or world snapshot (host), every screen
    // The co-op guest is non-authoritative: it renders host snapshots and never
    // simulates, so skip the entire gameplay step on the guest.
    if (coopIsGuest()) return;
    if (state.screen !== 'play' && state.screen !== 'boss') return;
    if (state.paused) return; // frozen behind the pause menu

    // Settle the screen shake every tick, even while frozen.
    decayShake(state);
    // Fade the combo banner alongside the shake (same cosmetic cadence).
    if (state.comboFlash > 0) state.comboFlash -= 1;

    // Impact freeze: hold gameplay still for a few frames after a stomp.
    if (state.hitstop > 0) {
      state.hitstop -= 1;
      return;
    }

    state.runTicks += 1; // run timer for the letter grade

    if (state.screen === 'boss') {
      updateBossArena();
      return;
    }

    if (state.timeLeft > 0) state.timeLeft -= 1; // per-level time budget

    for (const pawn of state.players) if (!pawn.down) updatePlayer(state, pawn);
    updateMovers(state); // move platforms + carry the player before other checks
    updateCrumbles(state); // crumbling platforms (also carry/snap the player)
    updateCoins(state);
    updateCheckpoints(state); // light posts Pip passes; move the respawn point
    updateMushrooms(state); // drift dropped power-ups + handle pickup
    for (const pawn of state.players) if (!pawn.down) tryParry(state, pawn); // deflect before a hit resolves
    if (updateOrbs(state)) return; // unparried orb contact cost a life
    for (const pawn of state.players) if (!pawn.down) updateSuper(state, pawn); // EX shot or MEGABLAST
    if (updateProjectiles(state)) return; // a bolt cost a life this frame
    if (updateEnemies(state)) return; // lost a life this frame

    // Fell into a pit — the pawn that dropped below spends one of its lives.
    const fell = state.players.find(
      (pw) => !pw.down && pw.player.y > state.level.worldH + PIT_MARGIN,
    );
    if (fell) {
      loseLife(state, fell);
      return;
    }

    // Reached the goal flag — either active pawn touching it clears it for both.
    if (state.players.some((pw) => !pw.down && pw.player.x + pw.player.w / 2 >= state.level.flagX)) {
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

    updatePuffs(state); // advance + fade dust clouds
    updateSparkles(state); // advance + fade coin twinkles
    updateCamera(state);
  };

  // ---- Render (per animation frame): animation clock, world, HUD ----
  const render = (): void => {
    state.frame++;
    // Age the cosmetic film-burn here (not in draw, which stays read-only) so it
    // animates even on the frozen gameover screen.
    if (state.burn > 0) state.burn--;
    pollGamepad(state, (key) => handleMenuKey(state, key));
    draw(ctx, state);
    updateHud(state);
  };

  startLoop(update, render);
}

main();
