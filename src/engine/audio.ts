// All sound is synthesized at runtime (Web Audio oscillators) — no audio files.
// One lazily-created AudioContext, resumed on first user gesture. Master ~0.5.

type SfxName =
  | 'jump'
  | 'coin'
  | 'stomp'
  | 'die'
  | 'levelup'
  | 'win'
  | 'shoot'
  | 'power'
  | 'powerdown'
  | 'dash'
  | 'parry'
  | 'super'
  | 'swap'
  | 'bossHurt'
  | 'bossPhase'
  | 'koCard'
  | 'checkpoint';

let actx: AudioContext | null = null;
let master: GainNode | null = null;
// One self-rescheduling timer drives the whole combo; `musicGen` invalidates a
// pending beat after stopMusic() so a late callback can't resurrect the loop.
let musicTimer: ReturnType<typeof setTimeout> | null = null;
let musicGen = 0;

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

/** Set the master volume (0..1). No-op until the AudioContext exists. */
export function setMasterVolume(v: number): void {
  if (master) master.gain.value = Math.min(1, Math.max(0, v));
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

export function sfx(name: SfxName, step = 0): void {
  if (!actx) return;
  if (actx.state === 'suspended') void actx.resume();
  // Pitch shift in 3-semitone steps (used by the stomp combo ramp; 0 = base).
  const k = step > 0 ? Math.pow(2, (step * 3) / 12) : 1;
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
      beep(220 * k, 0.09, 'square', 0.22);
      beep(110 * k, 0.16, 'square', 0.18, 0.05);
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
    case 'dash':
      // Quick upward whoosh.
      beep(180, 0.06, 'sawtooth', 0.14);
      beep(420, 0.08, 'sawtooth', 0.1, 0.03);
      break;
    case 'parry':
      // Bright two-note "DING!".
      beep(1568, 0.07, 'square', 0.16);
      beep(2093, 0.12, 'square', 0.13, 0.05);
      break;
    case 'super':
      // Rising power chord into a sparkle.
      [392, 523, 659, 880, 1175].forEach((f, i) => beep(f, 0.16, 'square', 0.16, i * 0.05));
      break;
    case 'swap':
      // Quick two-note click for changing weapons.
      beep(660, 0.04, 'square', 0.12);
      beep(990, 0.05, 'square', 0.1, 0.03);
      break;
    case 'bossHurt':
      // Dull, low thud — the boss takes a hit.
      beep(160, 0.08, 'square', 0.18);
      beep(98, 0.12, 'sawtooth', 0.14, 0.04);
      break;
    case 'bossPhase':
      // Ominous descending sting on a phase change / boss intro.
      [330, 262, 196, 147].forEach((f, i) => beep(f, 0.18, 'sawtooth', 0.16, i * 0.08));
      break;
    case 'koCard':
      // Triumphant KO flourish.
      [523, 784, 1047, 1568].forEach((f, i) => beep(f, 0.22, 'square', 0.2, i * 0.1));
      break;
    case 'checkpoint':
      // Warm two-note "secured" chime.
      beep(659, 0.1, 'square', 0.16);
      beep(988, 0.16, 'square', 0.14, 0.09);
      break;
  }
}

// ---- Background music: a 1930s small-combo jazz engine ----
//
// A walking upright bass, swung "oom-pah" comping chords, a syncopated lead, and
// a brush-kit shuffle (kick / brushed snare / hi-hat), all synthesized. One
// self-rescheduling timer fires once per quarter-note beat and schedules that
// beat's voices ahead of time on the AudioContext clock; swing comes from
// placing the upbeat two-thirds of the way through the beat (triplet feel).

/** MIDI note number → frequency (A4 = 69 = 440 Hz). */
function mtof(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

type Quality = 'maj' | 'min' | 'dom7';
/** Chord interval stacks (semitones from root); comping uses the first three. */
const CHORD: Record<Quality, number[]> = {
  maj: [0, 4, 7, 11],
  min: [0, 3, 7, 10],
  dom7: [0, 4, 7, 10],
};

interface Track {
  bpm: number;
  /** Lead/comp key centre (MIDI) and the low bass octave root (MIDI). */
  keyRoot: number;
  bassRoot: number;
  /** One chord per bar: r = semitone offset from key root, q = quality. */
  prog: Array<{ r: number; q: Quality }>;
  /** Swung-eighth lead phrase over the whole progression (bars × 8); null = rest. */
  lead: Array<number | null>;
  bassType: OscillatorType;
  leadType: OscillatorType;
  compType: OscillatorType;
  /** Drum weight: 1 = soft brushes (levels), >1 = harder kit (boss). */
  punch: number;
}

const r = null; // rest, for terse lead phrases below

const LEVEL_TRACKS: Track[] = [
  // 1 — bright C-major ragtime (I–vi–IV–V).
  {
    bpm: 150,
    keyRoot: 60,
    bassRoot: 36,
    prog: [{ r: 0, q: 'maj' }, { r: 9, q: 'min' }, { r: 5, q: 'maj' }, { r: 7, q: 'dom7' }],
    lead: [
      4, r, 7, 4, r, 9, 7, r,
      9, r, 7, 9, 12, r, 9, 7,
      5, r, 9, 5, 4, r, 2, r,
      7, r, 2, 7, 11, r, 7, r,
    ],
    bassType: 'triangle',
    leadType: 'square',
    compType: 'triangle',
    punch: 1,
  },
  // 2 — jauntier F-major strut (I–vi–IV–V).
  {
    bpm: 168,
    keyRoot: 65,
    bassRoot: 41,
    prog: [{ r: 0, q: 'maj' }, { r: 9, q: 'min' }, { r: 5, q: 'maj' }, { r: 7, q: 'dom7' }],
    lead: [
      7, 7, r, 4, 5, r, 7, r,
      9, r, 12, 9, 7, r, 5, r,
      5, 7, r, 9, 7, r, 4, r,
      7, r, 11, 7, 12, r, 7, r,
    ],
    bassType: 'triangle',
    leadType: 'square',
    compType: 'triangle',
    punch: 1,
  },
  // 3 — bluesy A-minor (i–iv–V7–i).
  {
    bpm: 162,
    keyRoot: 69,
    bassRoot: 45,
    prog: [{ r: 0, q: 'min' }, { r: 5, q: 'min' }, { r: 7, q: 'dom7' }, { r: 0, q: 'min' }],
    lead: [
      0, r, 3, 5, r, 7, 5, 3,
      5, r, 3, 5, 7, r, 5, r,
      7, r, 10, 7, 6, r, 5, r,
      3, r, 0, 3, 5, r, 0, r,
    ],
    bassType: 'triangle',
    leadType: 'square',
    compType: 'triangle',
    punch: 1,
  },
  // 4 (TIDAL CAVERN) — lilting G-major waltz feel (I–IV–ii–V).
  {
    bpm: 156,
    keyRoot: 67,
    bassRoot: 43,
    prog: [{ r: 0, q: 'maj' }, { r: 5, q: 'maj' }, { r: 2, q: 'min' }, { r: 7, q: 'dom7' }],
    lead: [
      7, r, 11, 7, r, 9, 7, r,
      5, r, 9, 12, 9, r, 5, r,
      2, r, 5, 9, 7, r, 5, r,
      11, r, 7, 11, 14, r, 7, r,
    ],
    bassType: 'triangle',
    leadType: 'square',
    compType: 'triangle',
    punch: 1,
  },
  // 5 (EMBER FORGE) — hot, driving E-minor (i–VI–III–V).
  {
    bpm: 176,
    keyRoot: 64,
    bassRoot: 40,
    prog: [{ r: 0, q: 'min' }, { r: 8, q: 'maj' }, { r: 3, q: 'maj' }, { r: 7, q: 'dom7' }],
    lead: [
      0, 0, r, 7, 5, r, 3, r,
      8, r, 7, 5, 3, r, 0, r,
      3, r, 7, 10, 7, r, 3, r,
      7, r, 11, 7, 14, r, 7, r,
    ],
    bassType: 'sawtooth',
    leadType: 'square',
    compType: 'triangle',
    punch: 1.1,
  },
  // 6 (THE GLITCH GATE) — tense, chromatic B-minor (i–bII–i–V7).
  {
    bpm: 168,
    keyRoot: 71,
    bassRoot: 47,
    prog: [{ r: 0, q: 'min' }, { r: 1, q: 'maj' }, { r: 0, q: 'min' }, { r: 7, q: 'dom7' }],
    lead: [
      0, r, 3, 0, r, 6, 5, r,
      1, r, 5, 8, 6, r, 1, r,
      0, r, 3, 7, 6, r, 3, r,
      7, r, 10, 7, 11, r, 7, r,
    ],
    bassType: 'sawtooth',
    leadType: 'sawtooth',
    compType: 'triangle',
    punch: 1.1,
  },
];

// Driving D-minor boss combo (i–i–VI–V7) — sawtooth lead/bass, harder kit.
const BOSS_TRACK: Track = {
  bpm: 150,
  keyRoot: 62,
  bassRoot: 38,
  prog: [{ r: 0, q: 'min' }, { r: 0, q: 'min' }, { r: 8, q: 'maj' }, { r: 7, q: 'dom7' }],
  lead: [
    0, 12, 7, 12, 0, 12, 10, 12,
    0, 12, 7, 12, 5, 7, 5, 3,
    8, r, 5, 8, 10, r, 8, r,
    7, r, 4, 7, 5, r, 4, 2,
  ],
  bassType: 'sawtooth',
  leadType: 'sawtooth',
  compType: 'square',
  punch: 1.6,
};

// ---- Synth voices (all routed through the shared master gain) ----

/** A pitched voice with a pluck/decay envelope. */
function osc(midi: number, t: number, dur: number, type: OscillatorType, vol: number, atk = 0.008): void {
  if (!actx) return;
  const o = actx.createOscillator();
  const g = actx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(mtof(midi), t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(master ?? actx.destination);
  o.start(t);
  o.stop(t + dur + 0.03);
}

// One reusable white-noise buffer for the brush kit (created on first use).
let noiseBuf: AudioBuffer | null = null;
function noise(): AudioBuffer | null {
  if (!noiseBuf && actx) {
    const len = (actx.sampleRate * 0.4) | 0;
    noiseBuf = actx.createBuffer(1, len, actx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

/** A filtered noise burst — the brushed snare and hi-hat. */
function noiseHit(t: number, dur: number, vol: number, hp: number): void {
  if (!actx) return;
  const buf = noise();
  if (!buf) return;
  const src = actx.createBufferSource();
  src.buffer = buf;
  const f = actx.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = hp;
  const g = actx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f);
  f.connect(g);
  g.connect(master ?? actx.destination);
  src.start(t);
  src.stop(t + dur + 0.02);
}

/** A soft kick: a sine thump that drops in pitch. */
function kick(t: number, vol: number): void {
  if (!actx) return;
  const o = actx.createOscillator();
  const g = actx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(130, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.11);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.connect(g);
  g.connect(master ?? actx.destination);
  o.start(t);
  o.stop(t + 0.2);
}

/** The walking-bass note for one beat: root, third, fifth, then a chromatic
 *  approach into the next bar's root. */
function walkNote(track: Track, bar: number, beatInBar: number): number {
  const chord = track.prog[bar];
  const root = track.bassRoot + chord.r;
  if (beatInBar === 0) return root;
  if (beatInBar === 1) return root + (chord.q === 'min' ? 3 : 4);
  if (beatInBar === 2) return root + 7;
  const next = track.bassRoot + track.prog[(bar + 1) % track.prog.length].r;
  return next - 1; // lead a half-step into the next downbeat
}

/** Schedule every voice for one beat, `dur` seconds long, starting at `t0`. */
function scheduleBeat(track: Track, beat: number, t0: number, dur: number): void {
  const bars = track.prog.length;
  const bar = Math.floor(beat / 4) % bars;
  const bib = beat % 4;
  const swing = dur * 0.66; // upbeat lands two-thirds through the beat
  const chord = track.prog[bar];

  // Walking bass — a note every beat.
  osc(walkNote(track, bar, bib), t0, dur * 0.92, track.bassType, 0.1);

  // Drum shuffle: kick on 1 & 3, brushed snare backbeat on 2 & 4, swung hats.
  if (bib === 0 || bib === 2) kick(t0, 0.16 * track.punch);
  else noiseHit(t0, 0.13, 0.05 * track.punch, 1300);
  noiseHit(t0, 0.03, 0.022 * track.punch, 7000);
  noiseHit(t0 + swing, 0.03, 0.016 * track.punch, 7000);

  // "Pah" comp stab on the backbeats (2 & 4): the upper triad, short.
  if (bib === 1 || bib === 3) {
    const root = track.keyRoot + chord.r;
    for (const iv of CHORD[chord.q].slice(0, 3)) {
      osc(root + iv, t0, dur * 0.45, track.compType, 0.035);
    }
  }

  // Syncopated lead — two swung eighths per beat from the phrase.
  const idx = bar * 8 + bib * 2;
  const dn = track.lead[idx];
  const up = track.lead[idx + 1];
  if (dn != null) osc(track.keyRoot + dn, t0, swing * 0.95, track.leadType, 0.06);
  if (up != null) osc(track.keyRoot + up, t0 + swing, (dur - swing) * 0.95, track.leadType, 0.06);
}

/**
 * Drive a track on a self-rescheduling beat timer. `beatDur()` is re-read every
 * beat (so the boss tempo can ramp mid-song); `gate()` is checked each beat so
 * music only sounds on the right screen — when false the loop idles, ready to
 * resume. Always call stopMusic() on a screen change.
 */
function startLoop(track: Track, beatDur: () => number, gate: () => boolean): void {
  stopMusic();
  if (!actx) return;
  const myGen = ++musicGen;
  let beat = 0;
  const step = (): void => {
    if (myGen !== musicGen || !actx) return;
    if (gate()) scheduleBeat(track, beat, actx.currentTime + 0.04, beatDur());
    beat++;
    musicTimer = setTimeout(step, beatDur() * 1000);
  };
  step();
}

/** Start the per-level combo. `isPlaying` gates it to the play screen. */
export function startMusic(levelIndex: number, isPlaying: () => boolean): void {
  const track = LEVEL_TRACKS[levelIndex] ?? LEVEL_TRACKS[0];
  const beatDur = 60 / track.bpm;
  startLoop(track, () => beatDur, isPlaying);
}

// Boss tempo: the higher the phase, the smaller `bossTempoVal`, the faster the
// beat. setBossTempo() is called with 170, 145, 120, 95 across the phases.
const BOSS_TEMPO_BASE = 170;
let bossTempoVal = BOSS_TEMPO_BASE;

/** Beat length (s) for the boss combo, from the current tempo value. */
function bossBeatDur(): number {
  const bpm = Math.min(210, 150 + (BOSS_TEMPO_BASE - bossTempoVal) * 0.667);
  return 60 / bpm;
}

/** Start the boss-fight combo. `isPlaying` gates it to the boss screen. */
export function startBossMusic(isPlaying: () => boolean): void {
  bossTempoVal = BOSS_TEMPO_BASE;
  startLoop(BOSS_TRACK, bossBeatDur, isPlaying);
}

/** Drive the boss music harder (smaller value = faster). The loop picks up the
 *  new tempo on its next beat — no restart needed. */
export function setBossTempo(stepMs: number): void {
  bossTempoVal = Math.max(80, stepMs);
}

export function stopMusic(): void {
  musicGen++;
  if (musicTimer) {
    clearTimeout(musicTimer);
    musicTimer = null;
  }
}
