// DOM HUD + overlays, synced from state each frame. The canvas draws the world;
// the framed HUD bar and the title/levelup/gameover/win overlays are DOM.

import { SUPER_MAX } from '../game/constants';
import { fmtTime } from '../game/grade';
import { currentWeapon } from '../game/weapons';
import type { GameState, Pawn } from '../game/state';
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
const hudHp = el('hud-hp');
const hudSuper = el('hud-super');
const hudHearts = el('hud-hearts');
const hudWeapon = el('hud-weapon');
const hudTime = el('hud-time');
const hudGunGroup = el('hud-gun-group');

// Co-op two-player HUD.
const hudCoop = el('hud-coop');
const p1Hp = el('p1-hp');
const p1Hearts = el('p1-hearts');
const p2Hp = el('p2-hp');
const p2Hearts = el('p2-hearts');

const goCoins = el('go-coins');
const goScore = el('go-score');

const luTitle = el('lu-title');
const luCoins = el('lu-coins');
const luScore = el('lu-score');
const luNext = el('lu-next');
const luGrade = el('lu-grade');
const luGradeBest = el('lu-grade-best');
const luTime = el('lu-time');
const luTimeBest = el('lu-time-best');

const winCoins = el('win-coins');
const winScore = el('win-score');
const winBest = el('win-best');
const winGrade = el('win-grade');
const winGradeBest = el('win-grade-best');
const winTime = el('win-time');
const winTimeBest = el('win-time-best');

// Screens with a DOM overlay. 'play'/'boss'/'select' render only on the canvas.
type OverlayScreen = Exclude<Screen, 'play' | 'boss' | 'select'>;

const overlays: Record<OverlayScreen, HTMLElement> = {
  title: el('ov-title'),
  gameover: el('ov-gameover'),
  levelup: el('ov-levelup'),
  win: el('ov-win'),
  lobby: el('ov-lobby'),
};

function setText(node: HTMLElement, value: string): void {
  if (node.textContent !== value) node.textContent = value;
}

/** Set a grade badge's text + a data-grade attribute so CSS can color it. */
function setGrade(node: HTMLElement, grade: string): void {
  const value = grade || '—';
  setText(node, value);
  if (node.dataset.grade !== value) node.dataset.grade = value;
}

function renderHp(node: HTMLElement, hp: number, max: number): void {
  const want = `${hp}/${max}`;
  if (node.dataset.state === want) return;
  node.dataset.state = want;
  node.replaceChildren();
  for (let i = 0; i < max; i++) {
    const span = document.createElement('span');
    span.className = `hp-pip ${i < hp ? 'hp-on' : 'hp-off'}`;
    node.appendChild(span);
  }
}

function renderSuper(cards: number): void {
  const full = cards >= SUPER_MAX;
  const want = `${cards}/${SUPER_MAX}${full ? '!' : ''}`;
  if (hudSuper.dataset.state === want) return;
  hudSuper.dataset.state = want;
  hudSuper.replaceChildren();
  for (let i = 0; i < SUPER_MAX; i++) {
    const span = document.createElement('span');
    const on = i < cards;
    span.className = `super-pip ${on ? 'super-on' : 'super-off'}${full ? ' super-ready' : ''}`;
    hudSuper.appendChild(span);
  }
}

function renderHearts(node: HTMLElement, lives: number): void {
  const slots = Math.max(3, lives);
  const want = Array.from({ length: slots }, (_, i) => (i < lives ? 'on' : 'off')).join(',');
  if (node.dataset.state === want) return;
  node.dataset.state = want;
  node.replaceChildren();
  for (let i = 0; i < slots; i++) {
    const span = document.createElement('span');
    span.className = `heart ${i < lives ? 'heart-on' : 'heart-off'}`;
    span.textContent = '♥';
    node.appendChild(span);
  }
}

/** Render one co-op player's mini HP + lives card (faded while spectating). */
function renderCoopPlayer(hpNode: HTMLElement, heartsNode: HTMLElement, pawn: Pawn | undefined, maxHp: number): void {
  if (!pawn) return;
  hpNode.parentElement?.classList.toggle('down', pawn.down);
  renderHp(hpNode, pawn.down ? 0 : pawn.player.hp, maxHp);
  renderHearts(heartsNode, Math.max(0, pawn.lives));
}

export function updateHud(state: GameState): void {
  const total = state.level.coins.length;
  const levelNum = state.levelIndex + 1;

  // Top bar.
  setText(hudCoins, `${state.coins}/${total}`);
  setText(hudScore, String(state.score));
  setText(hudLevel, String(levelNum));

  const coop = state.coop.active && state.players.length > 1;
  hudCoop.classList.toggle('hidden', !coop);
  // The single-player HP/super/hearts/weapon widgets are hidden in co-op, which
  // instead shows a compact per-player card for P1 and P2.
  for (const node of [hudHp, hudSuper, hudHearts, hudGunGroup]) node.classList.toggle('hidden', coop);

  if (coop) {
    renderCoopPlayer(p1Hp, p1Hearts, state.players[0], state.maxHp);
    renderCoopPlayer(p2Hp, p2Hearts, state.players[1], state.maxHp);
  } else {
    renderHp(hudHp, state.player.hp, state.maxHp);
    renderSuper(state.superCards);
    renderHearts(hudHearts, state.lives);
    const wpn = currentWeapon(state.players[0]);
    const more = state.weapons.length > 1 ? ` ${state.weaponIdx + 1}/${state.weapons.length}` : '';
    setText(hudWeapon, `${wpn.name}${more}`);
  }

  const secs = Math.ceil(state.timeLeft / 60);
  setText(hudTime, state.screen === 'boss' ? '--:--' : `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`);

  // Overlay values.
  setText(goCoins, String(state.coins));
  setText(goScore, String(state.score));

  setText(luTitle, state.clearTitle);
  setText(luCoins, `${state.coins}/${total}`);
  setText(luScore, String(state.score));
  setText(luNext, state.nextLabel);
  setGrade(luGrade, state.lastGrade);
  setGrade(luGradeBest, state.bestGrade);
  setText(luTime, fmtTime(state.lastTime));
  setText(luTimeBest, fmtTime(state.bestTime));

  setText(winCoins, `${state.coins}/${total}`);
  setText(winScore, String(state.score));
  setText(winBest, String(state.best));
  setGrade(winGrade, state.lastGrade);
  setGrade(winGradeBest, state.bestGrade);
  setText(winTime, fmtTime(state.lastTime));
  setText(winTimeBest, fmtTime(state.bestTime));

  // Toggle overlays (none show during play or the boss fight).
  (Object.keys(overlays) as OverlayScreen[]).forEach((key) => {
    overlays[key].classList.toggle('hidden', state.screen !== key);
  });
}
