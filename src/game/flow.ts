// Screen transitions and life handling. The only place `screen` changes.

import { setMasterVolume, sfx, startBossMusic, startMusic, stopMusic } from '../engine/audio';
import { shakeScreen } from '../engine/effects';
import { applyTouchControls } from '../engine/input';
import { openLobby } from '../engine/lobby';
import { endCoop } from './coop';
import {
  BEST_KEY,
  BOSS_INTRO,
  BOSS_SCORE,
  BURN_FRAMES,
  CLEAR_BONUS,
  FLASH_FRAMES,
  GRADE_FAST_TICKS,
  GRADE_FAST_TICKS_BOSS,
  HURT_FRAMES,
  PALETTE,
  SHAKE_HURT,
  START_LIVES,
  TIME_BONUS_PER_SEC,
} from './constants';
import { BOSSES, BOSS_RUSH, CAMPAIGN } from './levels';
import type { Stage } from './levels';
import { makeBoss, resetBoss } from './boss';
import { gradeStage } from './grade';
import { buildSelectEntries } from './select';
import { loadLevel, makeKeys, respawnExtraPawns, spawnPlayer } from './state';
import { saveSettings } from './settings';
import { cycleDifficulty, isAssist } from './difficulty';
import { ASSIST_BONUS_HP, MAX_HP } from './constants';
import type { Difficulty } from '../types';
import type { GameState, Pawn } from './state';
import { buildBossArena, spawnCrumbles, spawnEnemies, spawnMovers, spawnOrbs } from './level';

const isPlaying = (state: GameState) => () => state.screen === 'play';

const PROGRESS_KEY = `${BEST_KEY}-progress`;
const CLEARED_KEY = `${BEST_KEY}-cleared`;

/** The active stage sequence: the full campaign or a bosses-only rush. */
function sequenceOf(state: GameState): readonly Stage[] {
  return state.mode === 'bossrush' ? BOSS_RUSH : CAMPAIGN;
}

/** True once the player has cleared the full campaign (unlocks Expert). */
export function expertUnlocked(): boolean {
  try {
    return localStorage.getItem(CLEARED_KEY) === '1';
  } catch {
    return false;
  }
}

function markCleared(): void {
  try {
    localStorage.setItem(CLEARED_KEY, '1');
  } catch {
    /* ignore storage errors */
  }
}

/** Short stage name for a breather card (drops a boss's comma subtitle). */
function stageLabel(stage: Stage): string {
  if (stage.kind === 'boss') {
    return BOSSES[Math.min(stage.boss, BOSSES.length - 1)].name.split(',')[0];
  }
  return `LEVEL ${stage.level + 1}`;
}

/** The "NEXT · …" line on a breather card, read from the upcoming stage. */
function nextStageLine(state: GameState): string {
  const seq = sequenceOf(state);
  const next = state.stageIndex + 1;
  if (next >= seq.length) return 'FINAL CHALLENGE AHEAD';
  const s = seq[next];
  return `NEXT · ${s.kind === 'boss' ? `BOSS · ${stageLabel(s)}` : stageLabel(s)}`;
}

/** Highest campaign stage the player has reached (unlocks stage select). */
export function loadProgress(): number {
  try {
    return parseInt(localStorage.getItem(PROGRESS_KEY) || '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveProgress(i: number): void {
  try {
    if (i > loadProgress()) localStorage.setItem(PROGRESS_KEY, String(i));
  } catch {
    /* ignore storage errors */
  }
}

/** Reset the run economy (score/lives/weapons/grade) for a fresh start. */
function resetRun(state: GameState): void {
  state.coins = 0;
  state.score = 0;
  state.lives = START_LIVES;
  state.weapons = ['peashot'];
  state.weaponIdx = 0;
  state.lastGrade = '';
  state.bestGrade = '';
  state.maxHp = MAX_HP + (isAssist(state.difficulty) ? ASSIST_BONUS_HP : 0);
  state.paused = false;
  setMasterVolume(state.volume);
}

/** New game from the first campaign stage with fresh score/lives/weapons. */
export function start(state: GameState): void {
  state.mode = 'campaign';
  resetRun(state);
  enterStage(state, 0);
}

/** Replay a single campaign stage (stage select) with a fresh run economy. */
export function startStage(state: GameState, i: number): void {
  state.mode = 'campaign';
  resetRun(state);
  enterStage(state, i);
}

/** Start a Boss Rush: every boss back-to-back, fresh run economy. */
export function startBossRush(state: GameState): void {
  state.mode = 'bossrush';
  resetRun(state);
  enterStage(state, 0);
}

/** Enter stage `i` of the active sequence — a run level or a boss arena. */
function enterStage(state: GameState, i: number): void {
  state.stageIndex = i;
  if (state.mode === 'campaign') saveProgress(i);
  const stage = sequenceOf(state)[i];
  if (stage.kind === 'boss') {
    enterBoss(state, stage.boss);
  } else {
    enterRunLevel(state, stage.level);
  }
}

/** Load a run level into play (coins reset; score + weapons carry over). */
function enterRunLevel(state: GameState, levelIndex: number): void {
  const keptArmed = state.player.armed;
  loadLevel(state, levelIndex);
  state.player.armed = keptArmed;
  respawnExtraPawns(state); // co-op: place player 2+ at the new level's spawn
  state.coins = 0;
  state.screen = 'play';
  startMusic(state.levelIndex, isPlaying(state));
}

/** Advance to the next stage of the active sequence, or win after the last. */
export function advanceStage(state: GameState): void {
  const seq = sequenceOf(state);
  const next = state.stageIndex + 1;
  if (next >= seq.length) {
    win(state);
    return;
  }
  if (seq[next].kind === 'level') sfx('levelup');
  enterStage(state, next);
}

/** Lose a life; respawn in place, or end the game at 0 lives. */
export function loseLife(state: GameState): void {
  // The film "catches fire" on every death — boss retry or life lost.
  state.burn = BURN_FRAMES;
  // On a boss, death is an instant retry (infinite tries, no life cost).
  if (state.screen === 'boss') {
    bossRetry(state);
    return;
  }
  state.lives -= 1;
  shakeScreen(state, SHAKE_HURT);
  sfx('die');
  if (state.lives <= 0) {
    state.screen = 'gameover';
    stopMusic();
    return;
  }
  // Respawn at the last lit checkpoint (or the level start). Checkpoints
  // themselves persist — we don't rebuild them, so lit posts stay lit.
  state.player = spawnPlayer(state.level, state.maxHp);
  state.player.x = state.respawnX;
  state.player.y = state.respawnY;
  respawnExtraPawns(state); // co-op: bring player 2+ back at the respawn point too
  state.enemies = spawnEnemies(state.level);
  state.movers = spawnMovers(state.level);
  state.crumbles = spawnCrumbles(state.level);
  state.parryOrbs = spawnOrbs(state.level);
  state.mushrooms = [];
  state.projectiles = [];
  state.puffs = [];
  state.keys = makeKeys();
  state.jumpLatch = false;
  state.shootLatch = false;
  state.shootCd = 0;
  state.dashLatch = false;
  state.combo = 0;
  state.comboFlash = 0;
}

/**
 * Pip took a hit from an enemy (contact or a bolt). Health tiers: a hit costs
 * 1 HP and grants invulnerability frames; only at 0 HP does Pip lose a life.
 * Returns true if a life was lost (caller should stop the frame).
 */
export function hitPlayer(state: GameState, pawn: Pawn = state.players[0]): boolean {
  const p = pawn.player;
  state.runHits += 1;
  p.hp -= 1;
  shakeScreen(state, SHAKE_HURT);
  if (p.hp <= 0) {
    loseLife(state);
    return true;
  }
  p.hurt = HURT_FRAMES;
  sfx('powerdown');
  return false;
}

/** Reached the flag: grade the level, then funnel into the next campaign stage. */
export function reachFlag(state: GameState): void {
  // Leftover time converts to a clear bonus.
  state.score += CLEAR_BONUS + Math.floor(state.timeLeft / 60) * TIME_BONUS_PER_SEC;
  gradeStage(state, `lv${state.levelIndex}`, GRADE_FAST_TICKS);

  const seq = sequenceOf(state);
  const next = state.stageIndex + 1;
  if (next < seq.length && seq[next].kind === 'boss') {
    // Two-faced level (§0): funnel straight into the arena, no menu.
    enterStage(state, next);
  } else {
    state.clearTitle = `${stageLabel(seq[state.stageIndex])} CLEAR!`;
    state.nextLabel = nextStageLine(state);
    state.screen = 'levelup';
    stopMusic();
    sfx('win');
  }
}

/** Boss KO: award score, grade the fight, then advance the sequence. */
export function bossDefeated(state: GameState): void {
  const stage = sequenceOf(state)[state.stageIndex];
  const bossIdx = stage.kind === 'boss' ? stage.boss : 0;
  state.score += BOSS_SCORE;
  gradeStage(state, `boss${bossIdx}`, GRADE_FAST_TICKS_BOSS);
  const next = state.stageIndex + 1;
  if (next >= sequenceOf(state).length) {
    win(state);
    return;
  }
  // A breather card before the next stage (grade shown); onAction advances.
  state.clearTitle = `${stageLabel(stage)} DOWN!`;
  state.nextLabel = nextStageLine(state);
  state.boss = null; // clear the felled boss so its HP bar isn't drawn behind the card
  state.screen = 'levelup';
  stopMusic();
  sfx('win');
}

/** Lock the camera, drop into the arena, and spawn the boss. */
export function enterBoss(state: GameState, bossIndex: number): void {
  const cfg = BOSSES[Math.min(bossIndex, BOSSES.length - 1)];
  state.level = buildBossArena(cfg);
  state.boss = makeBoss(cfg, state.level, bossIndex);
  state.player = spawnPlayer(state.level, state.maxHp);
  respawnExtraPawns(state); // co-op: both players drop into the arena together
  state.enemies = [];
  state.movers = [];
  state.crumbles = [];
  state.parryOrbs = [];
  state.mushrooms = [];
  state.projectiles = [];
  state.hazards = [];
  state.pops = [];
  state.puffs = [];
  state.keys = makeKeys();
  state.jumpLatch = false;
  state.shootLatch = false;
  state.shootCd = 0;
  state.dashLatch = false;
  state.superLatch = false;
  state.parryLatch = false;
  state.superCards = 0;
  state.bossKo = 0;
  state.camX = 0;
  state.charge = 0;
  state.runTicks = 0;
  state.runHits = 0;
  state.runParries = 0;
  state.runSupers = 0;
  state.combo = 0;
  state.bossIntro = BOSS_INTRO;
  state.score += CLEAR_BONUS;
  state.screen = 'boss';
  state.flash = FLASH_FRAMES;
  sfx('bossPhase');
  startBossMusic(() => state.screen === 'boss');
}

/** Instant retry: reset boss + Pip + projectiles, stay in the fight. */
export function bossRetry(state: GameState): void {
  if (state.boss) resetBoss(state.boss);
  state.player = spawnPlayer(state.level, state.maxHp);
  respawnExtraPawns(state); // co-op: both players retry the arena together
  state.enemies = [];
  state.projectiles = [];
  state.hazards = [];
  state.mushrooms = [];
  state.pops = [];
  state.puffs = [];
  state.keys = makeKeys();
  state.jumpLatch = false;
  state.shootLatch = false;
  state.shootCd = 0;
  state.dashLatch = false;
  state.superLatch = false;
  state.parryLatch = false;
  state.bossKo = 0;
  state.camX = 0;
  shakeScreen(state, SHAKE_HURT);
  sfx('die');
  state.pops.push({
    x: state.player.x,
    y: state.player.y - 16,
    life: 50,
    text: 'RETRY!',
    color: PALETTE.parry,
  });
}

/** Final clear: bonus, persist best score, show win screen. */
export function win(state: GameState): void {
  state.score += CLEAR_BONUS;
  state.screen = 'win';
  stopMusic();
  sfx('win');
  if (state.mode === 'campaign') markCleared(); // unlock Expert difficulty
  if (state.score > state.best) {
    state.best = state.score;
    try {
      localStorage.setItem(BEST_KEY, String(state.best));
    } catch {
      /* ignore storage errors */
    }
  }
}

// ---- Menu / stage-select input dispatch ----

const UP_KEYS = new Set(['ArrowUp', 'w', 'W']);
const DOWN_KEYS = new Set(['ArrowDown', 's', 'S']);
const LEFT_KEYS = new Set(['ArrowLeft', 'a', 'A']);
const RIGHT_KEYS = new Set(['ArrowRight', 'd', 'D']);
const CONFIRM_KEYS = new Set([' ', 'Enter']);
const ADVANCE_KEYS = new Set([' ', 'Enter', 'ArrowRight', 'ArrowUp', 'w', 'W']);
const PAUSE_KEYS = new Set(['Escape', 'p', 'P']);

/** Pause-menu rows: Resume / Difficulty / Volume / Reduced Motion / Touch Controls / Style / Quit. */
export const PAUSE_ITEMS = 7;

/** Open the stage-select screen (from title / gameover / win). */
export function openSelect(state: GameState): void {
  state.screen = 'select';
  state.menuIndex = 0;
  stopMusic();
}

/** Toggle the pause menu (only meaningful during play / a boss fight). */
function togglePause(state: GameState): void {
  if (state.screen !== 'play' && state.screen !== 'boss') return;
  state.paused = !state.paused;
  state.pauseIndex = 0;
  state.keys = makeKeys(); // drop held inputs so Pip doesn't drift on resume
}

/**
 * Single entry point for keys on any non-gameplay screen (and the pause menu).
 * Pause takes priority; then stage-select; then advance (levelup → next stage,
 * title/gameover/win → new game), with a Down press opening stage select.
 */
export function handleMenuKey(state: GameState, key: string): void {
  if (PAUSE_KEYS.has(key) && (state.paused || state.screen === 'play' || state.screen === 'boss')) {
    togglePause(state);
    return;
  }
  if (state.paused) {
    pauseKey(state, key);
    return;
  }
  // Co-op lobby drives itself via DOM buttons + its own Escape handler.
  if (state.screen === 'lobby') return;
  // 'C' on the title opens the 2-player online lobby.
  if ((key === 'c' || key === 'C') && state.screen === 'title') {
    openLobby(state);
    return;
  }
  if (state.screen === 'select') {
    menuKey(state, key);
    return;
  }
  if (DOWN_KEYS.has(key) && state.screen !== 'levelup') {
    openSelect(state);
    return;
  }
  if (!ADVANCE_KEYS.has(key)) return;
  if (state.screen === 'levelup') advanceStage(state);
  else start(state);
}

/** Persist the current option set (difficulty / volume / reduced motion). */
function persist(state: GameState): void {
  saveSettings({
    difficulty: state.difficulty,
    volume: state.volume,
    reducedMotion: state.reducedMotion,
    showTouchControls: state.showTouchControls,
    style: state.style,
  });
}

/** Cycle difficulty (Expert gated behind a clear); re-derive HP and persist. */
function changeDifficulty(state: GameState, dir: number): void {
  const before: Difficulty = state.difficulty;
  state.difficulty = cycleDifficulty(state.difficulty, dir, expertUnlocked());
  if (state.difficulty === before) return;
  state.maxHp = MAX_HP + (isAssist(state.difficulty) ? ASSIST_BONUS_HP : 0);
  // Entering assist tops up by the bonus; leaving it clamps back under the cap.
  state.player.hp = isAssist(state.difficulty)
    ? Math.min(state.player.hp + ASSIST_BONUS_HP, state.maxHp)
    : Math.min(state.player.hp, state.maxHp);
  persist(state);
}

/** Nudge master volume in 0.1 steps, apply it live, and persist. */
function changeVolume(state: GameState, delta: number): void {
  state.volume = Math.round(Math.min(1, Math.max(0, state.volume + delta)) * 10) / 10;
  setMasterVolume(state.volume);
  persist(state);
}

/** Flip the reduced-motion option (shake + grain/vignette) and persist. */
function toggleReducedMotion(state: GameState): void {
  state.reducedMotion = !state.reducedMotion;
  persist(state);
}

/** Flip the on-screen touch controls, apply it to the DOM, and persist. */
function toggleTouchControls(state: GameState): void {
  state.showTouchControls = !state.showTouchControls;
  applyTouchControls(state.showTouchControls);
  persist(state);
}

/** Flip the art style (cuphead vintage ↔ mario clean) live and persist. */
function toggleStyle(state: GameState): void {
  state.style = state.style === 'cuphead' ? 'mario' : 'cuphead';
  persist(state);
}

/** Navigate + act within the pause menu. */
function pauseKey(state: GameState, key: string): void {
  if (UP_KEYS.has(key)) {
    state.pauseIndex = (state.pauseIndex - 1 + PAUSE_ITEMS) % PAUSE_ITEMS;
  } else if (DOWN_KEYS.has(key)) {
    state.pauseIndex = (state.pauseIndex + 1) % PAUSE_ITEMS;
  } else if (LEFT_KEYS.has(key) || RIGHT_KEYS.has(key)) {
    const dir = RIGHT_KEYS.has(key) ? 1 : -1;
    if (state.pauseIndex === 1) changeDifficulty(state, dir);
    else if (state.pauseIndex === 2) changeVolume(state, dir * 0.1);
    else if (state.pauseIndex === 3) toggleReducedMotion(state);
    else if (state.pauseIndex === 4) toggleTouchControls(state);
    else if (state.pauseIndex === 5) toggleStyle(state);
  } else if (CONFIRM_KEYS.has(key)) {
    if (state.pauseIndex === 0) {
      state.paused = false; // Resume
    } else if (state.pauseIndex === 1) {
      changeDifficulty(state, 1);
    } else if (state.pauseIndex === 3) {
      toggleReducedMotion(state);
    } else if (state.pauseIndex === 4) {
      toggleTouchControls(state);
    } else if (state.pauseIndex === 5) {
      toggleStyle(state);
    } else if (state.pauseIndex === 6) {
      state.paused = false; // Quit to title
      stopMusic();
      endCoop(state); // drop any online co-op link
      state.screen = 'title';
    }
  }
}

/** Navigate + confirm within the stage-select list. */
function menuKey(state: GameState, key: string): void {
  const entries = buildSelectEntries(loadProgress());
  const n = entries.length;
  if (UP_KEYS.has(key)) {
    state.menuIndex = (state.menuIndex - 1 + n) % n;
    return;
  }
  if (DOWN_KEYS.has(key)) {
    state.menuIndex = (state.menuIndex + 1) % n;
    return;
  }
  if (LEFT_KEYS.has(key) || RIGHT_KEYS.has(key)) {
    changeDifficulty(state, RIGHT_KEYS.has(key) ? 1 : -1); // ← → set difficulty
    return;
  }
  if (!CONFIRM_KEYS.has(key)) return;
  const e = entries[state.menuIndex];
  if (e.kind === 'back') {
    state.screen = 'title';
  } else if (e.locked) {
    sfx('powerdown'); // gentle "nope" on a locked stage
  } else if (e.kind === 'bossrush') {
    startBossRush(state);
  } else {
    startStage(state, e.index);
  }
}
