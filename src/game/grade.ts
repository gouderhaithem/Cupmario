// Letter grades (§7). A clear is scored on time, no-hit, parries, and coin
// collection → C / B / A / S / S+. S-ranks are gated behind a no-hit clear so
// the pink/parry mechanic is what earns the top grade. Best grade per stage is
// persisted alongside the best score.

import { BEST_KEY } from './constants';
import { isAssist } from './difficulty';
import type { GameState } from './state';

export interface RunStats {
  /** Fixed-step ticks the run took (≈ 60/s). */
  ticks: number;
  hits: number;
  parries: number;
  supers: number;
  /** Coin collection fraction, 0..1. */
  coinsPct: number;
}

const RANKS = ['C', 'B', 'A', 'S', 'S+'] as const;

/** Numeric rank for comparison; unknown/empty grades sort lowest. */
export function rank(grade: string): number {
  const i = RANKS.indexOf(grade as (typeof RANKS)[number]);
  return i < 0 ? -1 : i;
}

/** Score a run into a letter grade. `fastTicks` is the time-bonus threshold. */
export function computeGrade(s: RunStats, fastTicks: number): string {
  let pts = 0;
  if (s.hits === 0) pts += 4;
  else if (s.hits === 1) pts += 2;
  else if (s.hits === 2) pts += 1;
  pts += Math.min(3, s.parries * 0.6);
  if (s.coinsPct >= 0.999) pts += 1;
  if (s.ticks > 0 && s.ticks <= fastTicks) pts += 1;

  let grade = pts >= 7 ? 'S+' : pts >= 5.5 ? 'S' : pts >= 4 ? 'A' : pts >= 2.5 ? 'B' : 'C';
  // S / S+ require a flawless (no-hit) clear; a no-hit clear floors at A.
  if (s.hits > 0 && (grade === 'S' || grade === 'S+')) grade = 'A';
  if (s.hits === 0 && rank(grade) < rank('A')) grade = 'A';
  return grade;
}

/** Persist the best grade for a stage key, returning the new best. */
export function bestGradeFor(stageKey: string, grade: string): string {
  const storeKey = `${BEST_KEY}-grade-${stageKey}`;
  const prev = readBestGrade(stageKey);
  const best = rank(grade) >= rank(prev) ? grade : prev;
  try {
    localStorage.setItem(storeKey, best);
  } catch {
    /* ignore storage errors */
  }
  return best;
}

/** Read the stored best grade for a stage (empty string if none). */
export function readBestGrade(stageKey: string): string {
  try {
    return localStorage.getItem(`${BEST_KEY}-grade-${stageKey}`) || '';
  } catch {
    return '';
  }
}

/** Read the stored best time (ticks) for a stage, or 0 if none yet. */
export function readBestTime(stageKey: string): number {
  try {
    return parseInt(localStorage.getItem(`${BEST_KEY}-time-${stageKey}`) || '0', 10) || 0;
  } catch {
    return 0;
  }
}

/** Persist the best (lowest) clear time in ticks for a stage; returns the best. */
export function bestTimeFor(stageKey: string, ticks: number): number {
  const prev = readBestTime(stageKey);
  const best = prev === 0 ? ticks : Math.min(prev, ticks);
  try {
    localStorage.setItem(`${BEST_KEY}-time-${stageKey}`, String(best));
  } catch {
    /* ignore storage errors */
  }
  return best;
}

/** Format a tick count (≈60/s) as m:ss, or "—" when unset. */
export function fmtTime(ticks: number): string {
  if (ticks <= 0) return '—';
  const secs = Math.round(ticks / 60);
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
}

/** Grade the current run and stash last/best on state for the clear card. */
export function gradeStage(state: GameState, stageKey: string, fastTicks: number): void {
  const total = state.level.coins.length;
  const grade = computeGrade(
    {
      ticks: state.runTicks,
      hits: state.runHits,
      parries: state.runParries,
      supers: state.runSupers,
      coinsPct: total ? state.coins / total : 1,
    },
    fastTicks,
  );
  // Assist mode locks the top ranks: a great clear still tops out at A.
  const final = isAssist(state.difficulty) && rank(grade) > rank('A') ? 'A' : grade;
  state.lastGrade = final;
  state.bestGrade = bestGradeFor(stageKey, final);
  state.lastTime = state.runTicks;
  state.bestTime = bestTimeFor(stageKey, state.runTicks);
}
