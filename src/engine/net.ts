// WebRTC co-op transport. Wraps PeerJS so the rest of the game speaks in
// `NetMessage` envelopes and never touches a raw DataConnection. PeerJS's free
// public broker is used for *signaling only* (the initial handshake); once the
// peers connect, all gameplay data flows directly peer-to-peer. No game server.
//
// Phase 1 establishes the connection and a `hello` handshake. Later phases add
// the `input` (guest→host) and `snapshot` (host→guest) message kinds.

import { Peer } from 'peerjs';
import type { DataConnection } from 'peerjs';
import type { Keys, Snapshot } from '../types';

export type Role = 'host' | 'guest';

/** App namespace prefix so our short join codes don't collide with other
 *  PeerJS apps sharing the public broker's id space. */
const NS = 'lifequest-pipsrun';

/** Human-typable alphabet — no 0/O/1/I to avoid "is that a one or an ell?". */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LEN = 4;

/** A fresh 4-character join code (e.g. "K7QF"). */
export function makeCode(): string {
  let s = '';
  for (let i = 0; i < CODE_LEN; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return s;
}

/** The broker peer id we register/dial for a given join code. */
const peerId = (code: string): string => `${NS}-${code.toUpperCase()}`;

/** Messages exchanged over the data channel. Discriminated by `t`. */
export type NetMessage =
  | { t: 'hello'; role: Role }
  /** Host → guest: both begin the same campaign stage together. */
  | { t: 'begin'; stage: number }
  /** Guest → host: the guest's live input, applied to the host's players[1]. */
  | { t: 'input'; keys: Keys; aimX: number; aimY: number }
  /** Host → guest: the authoritative world state to render this net tick. */
  | { t: 'snapshot'; s: Snapshot }
  | { t: 'bye' };

export interface NetHandlers {
  /** Human-readable progress for the lobby ("Waiting for player 2…"). */
  onStatus?: (text: string) => void;
  /** Data channel is open both ways; safe to `send`. */
  onReady?: (role: Role) => void;
  /** A decoded message arrived from the peer. */
  onMessage?: (msg: NetMessage) => void;
  /** Connection ended (peer left, error, or local close). `reason` is for the UI. */
  onClose?: (reason: string) => void;
  /** The chosen host code was already taken — caller should re-host with a new one. */
  onCodeTaken?: () => void;
}

export interface NetSession {
  readonly role: Role;
  readonly code: string;
  /** Send a message if the channel is open; a no-op otherwise. */
  send: (msg: NetMessage) => void;
  /** True once the data channel is open both ways. */
  isOpen: () => boolean;
  /** Tear down the connection and the broker peer. */
  close: () => void;
}

/** Shared session machinery for both host and guest roles. */
function createSession(role: Role, code: string, handlers: NetHandlers): NetSession {
  const status = (t: string): void => handlers.onStatus?.(t);
  let conn: DataConnection | null = null;
  let open = false;
  let closed = false;

  // Host registers under the code's id; guest lets the broker assign a random id.
  const peer = role === 'host' ? new Peer(peerId(code), { debug: 0 }) : new Peer({ debug: 0 });

  /** Wire a data connection's lifecycle to our handler callbacks. */
  const bind = (c: DataConnection): void => {
    conn = c;
    c.on('open', () => {
      open = true;
      c.send({ t: 'hello', role } satisfies NetMessage);
      status('Connected!');
      handlers.onReady?.(role);
    });
    c.on('data', (d) => handlers.onMessage?.(d as NetMessage));
    c.on('close', () => {
      open = false;
      if (!closed) handlers.onClose?.('Player disconnected.');
    });
    c.on('error', () => {
      if (!closed) handlers.onClose?.('Connection error.');
    });
  };

  peer.on('error', (err: { type?: string } & Error) => {
    if (err.type === 'unavailable-id') {
      handlers.onCodeTaken?.();
      return;
    }
    if (err.type === 'peer-unavailable') {
      status('No game found for that code.');
      return;
    }
    if (!closed) handlers.onClose?.('Network error — check your connection.');
  });

  if (role === 'host') {
    peer.on('open', () => status('Waiting for player 2…'));
    peer.on('connection', (c) => bind(c));
  } else {
    peer.on('open', () => {
      status('Connecting…');
      bind(peer.connect(peerId(code), { reliable: true }));
    });
  }

  return {
    role,
    code,
    send: (msg) => {
      if (open && conn) conn.send(msg);
    },
    isOpen: () => open,
    close: () => {
      closed = true;
      try {
        conn?.close();
      } catch {
        /* already gone */
      }
      peer.destroy();
    },
  };
}

/** Host a game: register the code with the broker and await a guest. */
export function hostGame(code: string, handlers: NetHandlers): NetSession {
  return createSession('host', code, handlers);
}

/** Join a game by dialing the host's code through the broker. */
export function joinGame(code: string, handlers: NetHandlers): NetSession {
  return createSession('guest', code, handlers);
}
