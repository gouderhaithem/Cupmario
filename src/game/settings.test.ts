// Settings persistence guard: the colorblind option (and its peers) survive a
// save → load round-trip. Stubs the browser globals settings.ts reads, since the
// default test environment is node (where loadSettings otherwise falls back to
// defaults via its try/catch).

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadSettings, saveSettings, type Settings } from './settings';

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
  (globalThis as Record<string, unknown>).window = { location: { search: '' } };
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>).localStorage;
  delete (globalThis as Record<string, unknown>).window;
});

const base: Settings = {
  difficulty: 'normal',
  volume: 0.5,
  reducedMotion: false,
  showTouchControls: false,
  style: 'cuphead',
  colorblind: false,
};

describe('settings persistence', () => {
  it('defaults colorblind to off when nothing is stored', () => {
    expect(loadSettings().colorblind).toBe(false);
  });

  it('round-trips colorblind = on', () => {
    saveSettings({ ...base, colorblind: true });
    expect(loadSettings().colorblind).toBe(true);
  });

  it('round-trips colorblind = off explicitly', () => {
    saveSettings({ ...base, colorblind: false });
    expect(loadSettings().colorblind).toBe(false);
  });
});
