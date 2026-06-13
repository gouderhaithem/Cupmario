// DOM HUD + overlays, synced from state each frame. The canvas draws the world;
// the framed HUD bar and the title/levelup/gameover/win overlays are DOM.

import { LEVELS } from '../game/levels';
import type { GameState } from '../game/state';
import type { Screen } from '../types';

function el(id: string): HTMLElement {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing HUD element #${id}`);
  return node;
}

// Cache nodes once.
const hudCoins = el('hud-coins');
const hudScore = el('hud-score');
const hudLevel = el('hud-level');
const hudHearts = el('hud-hearts');

const goCoins = el('go-coins');
const goScore = el('go-score');

const luLevel = el('lu-level');
const luCoins = el('lu-coins');
const luScore = el('lu-score');
const luNext = el('lu-next');

const winCoins = el('win-coins');
const winScore = el('win-score');
const winBest = el('win-best');

const overlays: Record<Exclude<Screen, 'play'>, HTMLElement> = {
  title: el('ov-title'),
  gameover: el('ov-gameover'),
  levelup: el('ov-levelup'),
  win: el('ov-win'),
};

function setText(node: HTMLElement, value: string): void {
  if (node.textContent !== value) node.textContent = value;
}

function renderHearts(lives: number): void {
  const want = Array.from({ length: 3 }, (_, i) => (i < lives ? 'on' : 'off')).join(',');
  if (hudHearts.dataset.state === want) return;
  hudHearts.dataset.state = want;
  hudHearts.replaceChildren();
  for (let i = 0; i < 3; i++) {
    const span = document.createElement('span');
    span.className = `heart ${i < lives ? 'heart-on' : 'heart-off'}`;
    span.textContent = '♥';
    hudHearts.appendChild(span);
  }
}

export function updateHud(state: GameState): void {
  const total = state.level.coins.length;
  const levelNum = state.levelIndex + 1;

  // Top bar.
  setText(hudCoins, `${state.coins}/${total}`);
  setText(hudScore, String(state.score));
  setText(hudLevel, String(levelNum));
  renderHearts(state.lives);

  // Overlay values.
  setText(goCoins, String(state.coins));
  setText(goScore, String(state.score));

  setText(luLevel, String(levelNum));
  setText(luCoins, `${state.coins}/${total}`);
  setText(luScore, String(state.score));
  setText(luNext, String(Math.min(levelNum + 1, LEVELS.length)));

  setText(winCoins, `${state.coins}/${total}`);
  setText(winScore, String(state.score));
  setText(winBest, String(state.best));

  // Toggle overlays.
  (Object.keys(overlays) as Array<Exclude<Screen, 'play'>>).forEach((key) => {
    overlays[key].classList.toggle('hidden', state.screen !== key);
  });
}
