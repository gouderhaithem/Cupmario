// Stage-select data (§11.1). Pure helpers that build the menu entries and read
// the persisted best grade/time per stage. Used by flow.ts (navigation/confirm)
// and render.ts (drawing) — no state mutation here.

import { readBestGrade, readBestTime } from './grade';
import { BOSSES, CAMPAIGN } from './levels';

export type SelectEntry =
  | { kind: 'stage'; index: number; label: string; gradeKey: string; locked: boolean }
  | { kind: 'back'; label: string; locked: boolean };

/** Build the stage-select list: campaign stages (locked past `unlocked`) + Back. */
export function buildSelectEntries(unlocked: number): SelectEntry[] {
  const stages: SelectEntry[] = CAMPAIGN.map((s, i) => ({
    kind: 'stage',
    index: i,
    label: s.kind === 'boss' ? BOSSES[s.boss].name : `LEVEL ${s.level + 1}`,
    gradeKey: s.kind === 'boss' ? `boss${s.boss}` : `lv${s.level}`,
    locked: i > unlocked,
  }));
  return [...stages, { kind: 'back', label: 'BACK TO TITLE', locked: false }];
}

/** Best grade recorded for an entry's stage (empty when not a stage / unplayed). */
export function entryGrade(e: SelectEntry): string {
  return e.kind === 'stage' ? readBestGrade(e.gradeKey) : '';
}

/** Best time (ticks) recorded for an entry's stage (0 when not a stage / unplayed). */
export function entryTime(e: SelectEntry): number {
  return e.kind === 'stage' ? readBestTime(e.gradeKey) : 0;
}
