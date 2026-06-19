// Co-op lobby: drives the #ov-lobby DOM overlay and owns the live NetSession.
// Single entry points: initLobby() wires the buttons once at boot; openLobby()
// shows the lobby from the title screen. Gameplay wiring (starting the co-op
// match on connect) is layered on in a later phase via setOnReady().

import { hostGame, joinGame, makeCode } from './net';
import type { NetMessage, NetSession, Role } from './net';
import type { GameState } from '../game/state';

/** Gameplay-layer hooks; installed by game/coop.ts via setCoopHooks(). */
export interface CoopHooks {
  onReady?: (session: NetSession, role: Role) => void;
  onMessage?: (msg: NetMessage) => void;
  onClose?: (reason: string) => void;
}

/** DOM handle or throw — the lobby markup must exist in index.html. */
function el<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing lobby element #${id}`);
  return node as T;
}

let state: GameState | null = null;
let session: NetSession | null = null;
/** Gameplay-layer glue, installed once by game/coop.ts. */
let hooks: CoopHooks = {};

// Cached nodes (grabbed in initLobby).
let secChoice: HTMLElement;
let secHosting: HTMLElement;
let secJoining: HTMLElement;
let codeOut: HTMLElement;
let codeInput: HTMLInputElement;
let statusOut: HTMLElement;

function show(section: HTMLElement | null): void {
  for (const s of [secChoice, secHosting, secJoining]) {
    s.classList.toggle('hidden', s !== section);
  }
}

function setStatus(text: string): void {
  statusOut.textContent = text;
}

/** Drop any live connection and clear the session. */
function teardown(): void {
  session?.close();
  session = null;
}

/** Install the gameplay-layer glue (connection + message handling). */
export function setCoopHooks(h: CoopHooks): void {
  hooks = h;
}

/** Begin hosting: register a fresh code and wait for player 2. */
function startHosting(): void {
  teardown();
  const code = makeCode();
  codeOut.textContent = code;
  show(secHosting);
  setStatus('Starting…');
  session = hostGame(code, {
    onStatus: setStatus,
    onReady: (role) => hooks.onReady?.(session!, role),
    onMessage: (msg) => hooks.onMessage?.(msg),
    onCodeTaken: () => startHosting(), // collision: pick a new code and retry
    onClose: (reason) => {
      setStatus(reason);
      teardown();
      hooks.onClose?.(reason);
    },
  });
}

/** Begin joining: dial the typed code through the broker. */
function startJoining(): void {
  const code = codeInput.value.trim().toUpperCase();
  if (code.length < 4) {
    setStatus('Enter the 4-letter code.');
    return;
  }
  teardown();
  setStatus('Starting…');
  session = joinGame(code, {
    onStatus: setStatus,
    onReady: (role) => hooks.onReady?.(session!, role),
    onMessage: (msg) => hooks.onMessage?.(msg),
    onClose: (reason) => {
      setStatus(reason);
      teardown();
      hooks.onClose?.(reason);
    },
  });
}

/** Return to the title screen, closing any pending connection. */
function back(): void {
  teardown();
  if (state) state.screen = 'title';
}

/** Wire the lobby buttons + Escape-to-back once, at boot. */
export function initLobby(gs: GameState): void {
  state = gs;
  secChoice = el('lobby-choice');
  secHosting = el('lobby-hosting');
  secJoining = el('lobby-joining');
  codeOut = el('lobby-code');
  codeInput = el<HTMLInputElement>('lobby-input');
  statusOut = el('lobby-status');

  const stop = (fn: () => void) => (e: Event) => {
    e.stopPropagation(); // don't let the cabinet "tap to advance" fire
    fn();
  };

  el('lobby-host').addEventListener('click', stop(startHosting));
  el('lobby-join').addEventListener('click', stop(() => {
    show(secJoining);
    setStatus('');
    codeInput.value = '';
    codeInput.focus();
  }));
  el('lobby-connect').addEventListener('click', stop(startJoining));
  codeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.stopPropagation();
      startJoining();
    }
  });

  // Escape backs out of the lobby (its own listener so flow.ts stays clean).
  window.addEventListener('keydown', (e) => {
    if (state?.screen === 'lobby' && e.key === 'Escape') {
      e.preventDefault();
      back();
    }
  });
}

/** Open the lobby from the title screen, reset to the role-choice step. */
export function openLobby(gs: GameState): void {
  state = gs;
  teardown();
  show(secChoice);
  setStatus('');
  gs.screen = 'lobby';
}
