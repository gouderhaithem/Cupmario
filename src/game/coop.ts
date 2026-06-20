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
import { updatePlayer } from './player';
import type { Player, Snapshot } from '../types';

/** Send input / snapshot every Nth fixed tick (~30 Hz at 60 fps). */
const SEND_EVERY = 2;

/** The guest's own avatar lives in players[1] (players[0] renders the host). */
const SELF_INDEX = 1;
/** Reconciliation thresholds: snap the predicted self to the host when the
 *  position error (px) or velocity error exceeds these (see {@link shouldSnapSelf}). */
const SNAP_DIST = 24;
const SNAP_VEL = 6;

// Host freeze signals carried in the latest snapshot, so the guest's prediction
// can idle in lockstep instead of drifting ahead while the host is frozen.
let hostPaused = false;
let hostHitstop = 0;

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
  hostPaused = false;
  hostHitstop = 0;
  state.netPredict = 'off';
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
    pawns: state.players.map((pw) => ({
      lives: pw.lives,
      superCards: pw.superCards,
      weapons: pw.weapons,
      weaponIdx: pw.weaponIdx,
      down: pw.down,
    })),
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
    paused: state.paused,
    hitstop: state.hitstop,
  };
}

/**
 * Decide whether the guest's locally-predicted self avatar must snap to the
 * host's authoritative transform, rather than keeping the prediction. Snaps on a
 * large position/velocity error, a ground-contact mismatch (the cheapest signal
 * that the host moved the pawn in a way we couldn't predict — mover carry, parry
 * bounce, a camera-tether shove), or a host event (took damage / knockback /
 * spectator toggle). Pure, for unit testing.
 */
export function shouldSnapSelf(pred: Player, auth: Player, prevDown: boolean, authDown: boolean): boolean {
  if (prevDown !== authDown) return true; // entered/left the spectator state
  if (auth.hp < pred.hp) return true; // took damage on the host
  if (auth.hurt > 0) return true; // in knockback / hit i-frames
  if (auth.onGround !== pred.onGround) return true; // ground contact diverged
  if (Math.abs(auth.x - pred.x) + Math.abs(auth.y - pred.y) > SNAP_DIST) return true;
  if (Math.abs(auth.vx - pred.vx) + Math.abs(auth.vy - pred.vy) > SNAP_VEL) return true;
  return false;
}

/** Overwrite the guest's render state from a host snapshot. (Exported for tests.) */
export function applySnapshot(state: GameState, s: Snapshot): void {
  // Capture change flags before we mutate local state below: a stage/screen
  // change always forces the predicted self to snap (geometry was rebuilt).
  const stageChanged = s.stageIndex !== state.stageIndex;
  const screenChanged = s.screen !== state.screen;
  // Follow the host across stage changes (rebuilds local level geometry).
  if (stageChanged) beginStage?.(s.stageIndex);

  // Remember the host's freeze state so prediction can pause in lockstep.
  hostPaused = s.paused;
  hostHitstop = s.hitstop;

  while (state.players.length < s.players.length) addPawn(state);
  // On the guest, players[SELF_INDEX] is locally predicted: keep its predicted
  // kinematics (adopting only host-owned hp/armed/hurt) unless a snap is needed.
  const predictSelf = state.coop.role === 'guest' && !stageChanged && !screenChanged;
  for (let i = 0; i < s.players.length; i++) {
    const pw = state.players[i];
    const auth = s.players[i];
    const meta = s.pawns?.[i];
    const authDown = meta?.down ?? pw.down;
    if (predictSelf && i === SELF_INDEX && pw.player && !pw.down && !authDown &&
        !shouldSnapSelf(pw.player, auth, pw.down, authDown)) {
      // Trust the prediction: keep local transform, take host gameplay fields.
      pw.player = { ...pw.player, hp: auth.hp, armed: auth.armed, hurt: auth.hurt };
    } else {
      pw.player = auth; // partner, or a self-snap / transition: full overwrite
    }
    if (meta) {
      pw.lives = meta.lives;
      pw.superCards = meta.superCards;
      pw.weapons = meta.weapons;
      pw.weaponIdx = meta.weaponIdx;
      pw.down = meta.down;
    }
  }

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

/**
 * Co-op guest: locally simulate the guest's OWN avatar (players[1]) each fixed
 * tick so movement responds instantly instead of waiting a network round-trip.
 * Drives it from the local input held in players[0], with host-authoritative side
 * effects suppressed (state.netPredict='live'). Idles when the host is frozen
 * (paused / hitstop) or this pawn is spectating. The host stays authoritative;
 * applySnapshot reconciles via {@link shouldSnapSelf}. No-op unless guest + playing.
 */
export function predictGuest(state: GameState): void {
  if (role !== 'guest') return;
  if (state.screen !== 'play' && state.screen !== 'boss') return;
  if (state.paused || hostPaused || hostHitstop > 0) return;
  const self = state.players[SELF_INDEX];
  const src = state.players[0];
  if (!self || !src || self.down) return;

  // Feed the local input into the predicted pawn. dashTap is a one-shot pulse:
  // consume it on the source (players[0] is never simulated on the guest, so
  // nothing else would clear it — left set, it would dash every frame).
  self.keys = { ...src.keys };
  self.aimX = src.aimX;
  self.aimY = src.aimY;
  self.dashTap = src.dashTap;
  src.dashTap = false;

  state.netPredict = 'live';
  try {
    updatePlayer(state, self);
  } finally {
    state.netPredict = 'off';
  }
}
