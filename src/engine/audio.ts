// All sound is synthesized at runtime (Web Audio oscillators) — no audio files.
// One lazily-created AudioContext, resumed on first user gesture. Master ~0.5.

type SfxName = 'jump' | 'coin' | 'stomp' | 'die' | 'levelup' | 'win' | 'shoot' | 'power' | 'powerdown';

let actx: AudioContext | null = null;
let master: GainNode | null = null;
let musicTimer: ReturnType<typeof setInterval> | null = null;

/** Create the AudioContext on first gesture, or resume if suspended. */
export function initAudio(): void {
  if (actx) {
    if (actx.state === 'suspended') void actx.resume();
    return;
  }
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    actx = new AC();
    master = actx.createGain();
    master.gain.value = 0.5;
    master.connect(actx.destination);
  } catch {
    actx = null;
  }
}

/** A single oscillator blip with a short attack/decay envelope. */
function beep(freq: number, dur: number, type: OscillatorType, vol: number, when = 0): void {
  if (!actx) return;
  const t = actx.currentTime + when;
  const o = actx.createOscillator();
  const g = actx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(master ?? actx.destination);
  o.start(t);
  o.stop(t + dur + 0.03);
}

export function sfx(name: SfxName): void {
  if (!actx) return;
  if (actx.state === 'suspended') void actx.resume();
  switch (name) {
    case 'jump':
      beep(440, 0.12, 'square', 0.2);
      beep(700, 0.1, 'square', 0.14, 0.07);
      break;
    case 'coin':
      beep(988, 0.06, 'square', 0.18);
      beep(1319, 0.13, 'square', 0.15, 0.06);
      break;
    case 'stomp':
      beep(220, 0.09, 'square', 0.22);
      beep(110, 0.16, 'square', 0.18, 0.05);
      break;
    case 'die':
      beep(392, 0.14, 'sawtooth', 0.2);
      beep(330, 0.14, 'sawtooth', 0.2, 0.14);
      beep(247, 0.3, 'sawtooth', 0.2, 0.28);
      break;
    case 'levelup':
      [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.16, 'square', 0.18, i * 0.12));
      break;
    case 'win':
      [523, 659, 784, 1047, 1319].forEach((f, i) => beep(f, 0.2, 'square', 0.18, i * 0.13));
      break;
    case 'shoot':
      beep(880, 0.05, 'square', 0.12);
      beep(1245, 0.07, 'square', 0.1, 0.03);
      break;
    case 'power':
      [659, 880, 1047, 1319].forEach((f, i) => beep(f, 0.1, 'square', 0.16, i * 0.07));
      break;
    case 'powerdown':
      beep(440, 0.12, 'sawtooth', 0.18);
      beep(294, 0.18, 'sawtooth', 0.18, 0.1);
      break;
  }
}

// ---- Background music: a step sequencer, one track per level ----
const TRACKS: number[][] = [
  [523, 659, 784, 659, 587, 698, 659, 587],
  [440, 523, 659, 587, 523, 440, 415, 392],
  [330, 392, 494, 392, 466, 587, 466, 392],
];

/**
 * Start the per-level loop. `isPlaying` is checked each step so music only
 * sounds during play; always call stopMusic() on a screen change.
 */
export function startMusic(levelIndex: number, isPlaying: () => boolean): void {
  stopMusic();
  if (!actx) return;
  const seq = TRACKS[levelIndex] ?? TRACKS[0];
  const stepMs = levelIndex === 2 ? 200 : levelIndex === 1 ? 220 : 260;
  let i = 0;
  musicTimer = setInterval(() => {
    if (!actx || !isPlaying()) return;
    const f = seq[i % seq.length];
    beep(f, 0.16, 'triangle', 0.05);
    if (i % 2 === 0) beep(f / 2, 0.22, 'sine', 0.06);
    i++;
  }, stepMs);
}

export function stopMusic(): void {
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
}
