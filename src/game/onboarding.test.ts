// Onboarding hints: the banner counts down + clears, and each hint shows only
// once ever (persisted). Order matters here — the module's "seen" cache loads on
// the first showHint call, so the count-down test (which never shows a hint)
// runs first, then the once-only test starts from a clean slate.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { maybeOnboard, tickHint } from './onboarding';
import { createState } from './state';

// The default test env is node (no DOM); stub the browser globals the persisted
// hint set + settings read, like settings.test.ts does.
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

describe('onboarding hints', () => {
  it('tickHint ages the banner and clears it at zero', () => {
    const s = createState();
    s.hint = { text: 'X', life: 2, max: 2 };
    tickHint(s);
    expect(s.hint?.life).toBe(1);
    tickHint(s);
    expect(s.hint).toBeNull();
  });

  it('shows the move/jump hint on first play, then never again', () => {
    const s = createState();
    s.screen = 'play';

    maybeOnboard(s);
    expect(s.hint?.text).toMatch(/MOVE/);

    // Dismiss the banner and re-evaluate several times: the move hint must never
    // come back (a different contextual hint is fine — it just can't be move).
    for (let i = 0; i < 5; i++) {
      s.hint = null;
      maybeOnboard(s);
      const shown = (s.hint as { text: string } | null)?.text ?? '';
      expect(shown).not.toMatch(/MOVE/);
    }
  });
});
