// Online co-op glue — host-authoritative shared world.
//
// The host runs the single simulation for BOTH pawns: players[0] is the host's
// own player (local input), players[1] is the guest's (input relayed over the
// wire). Each net tick the host ships a full-world Snapshot; the guest applies
// it to its render state and does NOT simulate. The guest streams only its
// input back. This module owns the live NetSession and bridges it to GameState.

import { setCoopHooks } from '../engine/lobby';
import type { NetMessage, NetSession, Role } from '../engine/net';
import { addPawn } from './state';
import type { GameState } from './state';
import type { Snapshot } from '../types';

/** Send input / snapshot every Nth fixed tick (~30 Hz at 60 fps). */
const SEND_EVERY = 2;

let session: NetSession | null = null;
let role: Role | null = null;
/** Begins a campaign stage locally; injected from main.ts (avoids a flow↔coop cycle). */
let beginStage: ((stage: number) => void) | null = null;
let tick = 0;

// Opt-in net diagnostics: open the page with ?netlog=1 to trace the handshake,
// the first snapshot/input, and any apply error in the browser console.
const NETLOG = typeof location !== 'undefined' && location.search.includes('netlog');
let loggedSnap = false;
let loggedInput = false;
function dlog(...args: unknown[]): void {
  if (NETLOG) console.info('[coop]', ...args);
}

/** True while an online co-op session is connected. */
export function coopActive(): boolean {
  return session !== null;
}

/** True when this client is the non-authoritative guest (renders host snapshots). */
export function coopIsGuest(): boolean {
  return role === 'guest';
}

/** Clear all co-op state on this client (peer left, or we backed out). */
function reset(state: GameState): void {
  session = null;
  role = null;
  state.coop.active = false;
  state.coop.role = null;
  state.players.length = 1; // back to solo
}

/** Drop the connection and return to solo (called from the pause "Quit"). */
export function endCoop(state: GameState): void {
  session?.close();
  reset(state);
}

// ---- Snapshot (host builds, guest applies) ----

/** Capture the host's authoritative world into a wire snapshot. (Exported for tests.) */
export function buildSnapshot(state: GameState): Snapshot {
  const coinsGot: number[] = [];
  state.level.coins.forEach((c, i) => {
    if (c.got) coinsGot.push(i);
  });
  return {
    players: state.players.map((pw) => pw.player),
    enemies: state.enemies,
    projectiles: state.projectiles,
    mushrooms: state.mushrooms,
    boss: state.boss,
    hazards: state.hazards,
    movers: state.movers,
    crumbles: state.crumbles,
    parryOrbs: state.parryOrbs,
    checkpoints: state.checkpoints,
    coinsGot,
    camX: state.camX,
    score: state.score,
    coins: state.coins,
    lives: state.lives,
    timeLeft: state.timeLeft,
    comboFlash: state.comboFlash,
    comboShown: state.comboShown,
    flash: state.flash,
    bossIntro: state.bossIntro,
    bossKo: state.bossKo,
    screen: state.screen,
    levelIndex: state.levelIndex,
    stageIndex: state.stageIndex,
  };
}

/** Overwrite the guest's render state from a host snapshot. (Exported for tests.) */
export function applySnapshot(state: GameState, s: Snapshot): void {
  // Follow the host across stage changes (rebuilds local level geometry).
  if (s.stageIndex !== state.stageIndex) beginStage?.(s.stageIndex);

  while (state.players.length < s.players.length) addPawn(state);
  for (let i = 0; i < s.players.length; i++) state.players[i].player = s.players[i];

  state.enemies = s.enemies;
  state.projectiles = s.projectiles;
  state.mushrooms = s.mushrooms;
  state.boss = s.boss;
  state.hazards = s.hazards;
  state.movers = s.movers;
  state.crumbles = s.crumbles;
  state.parryOrbs = s.parryOrbs;
  state.checkpoints = s.checkpoints;

  for (const c of state.level.coins) c.got = false;
  for (const i of s.coinsGot) {
    const c = state.level.coins[i];
    if (c) c.got = true;
  }

  state.camX = s.camX;
  state.score = s.score;
  state.coins = s.coins;
  state.lives = s.lives;
  state.timeLeft = s.timeLeft;
  state.comboFlash = s.comboFlash;
  state.comboShown = s.comboShown;
  state.flash = s.flash;
  state.bossIntro = s.bossIntro;
  state.bossKo = s.bossKo;
  state.screen = s.screen;
}

// ---- Message handling ----

function handleMessage(state: GameState, msg: NetMessage): void {
  try {
    if (msg.t === 'begin') {
      dlog('begin received, stage', msg.stage);
      if (role === 'guest') beginStage?.(msg.stage); // host drove the start
      return;
    }
    if (msg.t === 'input') {
      if (!loggedInput) {
        dlog('first guest input received');
        loggedInput = true;
      }
      // Host: apply the guest's relayed input to players[1].
      const guest = state.players[1];
      if (guest) {
        guest.keys = msg.keys;
        guest.aimX = msg.aimX;
        guest.aimY = msg.aimY;
      }
      return;
    }
    if (msg.t === 'snapshot') {
      if (!loggedSnap) {
        dlog('first snapshot received', { players: msg.s.players?.length, screen: msg.s.screen });
        loggedSnap = true;
      }
      applySnapshot(state, msg.s);
    }
  } catch (err) {
    // A single malformed packet must never permanently freeze the guest.
    console.error('[coop] failed to handle message', msg.t, err);
  }
}

/** Wire the lobby hooks once at boot. `begin` starts a campaign stage locally. */
export function installCoop(state: GameState, begin: (stage: number) => void): void {
  beginStage = begin;
  setCoopHooks({
    onReady: (s, r) => {
      session = s;
      role = r;
      tick = 0;
      loggedSnap = false;
      loggedInput = false;
      state.coop.active = true;
      state.coop.role = r;
      addPawn(state); // both clients hold two pawns; [0] host, [1] guest
      dlog('connected as', r);
      if (r === 'host') {
        begin(0);
        s.send({ t: 'begin', stage: 0 });
      }
    },
    onMessage: (msg) => handleMessage(state, msg),
    onClose: () => reset(state),
  });
}

/**
 * Per-tick co-op upkeep at 60 Hz (called before the screen guard in main).
 * Guest: stream local input. Host: stream the world snapshot. Throttled to
 * ~30 Hz. No-op when solo.
 */
export function coopTick(state: GameState): void {
  if (!session) return;
  tick += 1;
  if (tick % SEND_EVERY !== 0) return;

  if (role === 'guest') {
    // The guest's local keyboard/gamepad lands in players[0].keys (via input.ts
    // proxies); ship it for the host to drive players[1].
    const local = state.players[0];
    session.send({ t: 'input', keys: { ...local.keys }, aimX: local.aimX, aimY: local.aimY });
  } else {
    if (tick === SEND_EVERY) dlog('host sending snapshots');
    session.send({ t: 'snapshot', s: buildSnapshot(state) });
  }
}
