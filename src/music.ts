import * as Tone from "tone";

type MusicMode = "piano" | "space";

let currentMode: MusicMode | null = null;
let started = false;
let stopFn: (() => void) | null = null;

// Debussy-inspired: Db major / Ab major / whole-tone fragments
// Rich arpeggiated patterns with 9ths and suspensions
const PIANO_PHRASES = [
  // Clair de Lune-style descending arpeggios
  ["Db4", "Ab4", "F5", "Ab4", "Db5", "F4"],
  ["Eb4", "Bb4", "Gb5", "Bb4", "Eb5", "Gb4"],
  ["Ab3", "Eb4", "C5", "Eb4", "Ab4", "C4"],
  ["Bb3", "F4", "Db5", "F4", "Bb4", "Db4"],
  // Gentle ascending runs
  ["Db4", "F4", "Ab4", "C5", "Db5", "F5"],
  ["Gb3", "Bb3", "Db4", "F4", "Ab4", "Bb4"],
  // Suspended chords broken
  ["Ab3", "Db4", "Eb4", "Ab4", "Db5"],
  ["F3", "Ab3", "C4", "F4", "Ab4"],
  // Whole-tone color moments
  ["C4", "D4", "E4", "Gb4", "Ab4", "Bb4"],
  ["Db4", "Eb4", "F4", "G4", "A4", "B4"],
  // Low bass + high melody
  ["Db3", "Ab4", "F5", "Db5"],
  ["Ab2", "Eb4", "C5", "Ab4"],
  // Simple two-note sighs
  ["F5", "Eb5"],
  ["Db5", "C5"],
  ["Ab4", "Gb4"],
];

// Chords for bass accompaniment
const PIANO_BASS = [
  ["Db2", "Ab2"],
  ["Ab1", "Eb2"],
  ["Gb2", "Db3"],
  ["Eb2", "Bb2"],
  ["F2", "C3"],
  ["Bb1", "F2"],
];

// Space mode: ethereal melodies over drones
const SPACE_CHORDS = [
  ["C2", "G2", "E3", "B3"],
  ["A1", "E2", "C3", "G3"],
  ["F2", "C3", "A3", "E4"],
  ["G2", "D3", "B3", "F4"],
  ["D2", "A2", "F3", "C4"],
  ["E2", "B2", "G3", "D4"],
];

const SPACE_MELODY = [
  ["E5", "G5", "A5", "G5", "E5"],
  ["C5", "D5", "E5", "D5"],
  ["A4", "C5", "E5", "C5", "A4"],
  ["D5", "F5", "G5", "F5"],
  ["G4", "B4", "D5", "E5"],
  ["B4", "A4", "G4", "E4"],
];

function startPiano(): () => void {
  const reverb = new Tone.Reverb({ decay: 8, wet: 0.75 }).toDestination();
  const delay = new Tone.FeedbackDelay({ delayTime: "8n.", feedback: 0.15, wet: 0.25 }).connect(reverb);

  // Main piano voice — warm and expressive
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: {
      attack: 0.02,
      decay: 2,
      sustain: 0.15,
      release: 4,
    },
    volume: -12,
  }).connect(delay);

  // Soft bass layer
  const bass = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "sine" },
    envelope: {
      attack: 0.1,
      decay: 3,
      sustain: 0.3,
      release: 5,
    },
    volume: -20,
  }).connect(reverb);

  let alive = true;
  let phraseIndex = 0;
  let bassIndex = 0;

  function playPhrase() {
    if (!alive) return;

    const phrase = PIANO_PHRASES[phraseIndex % PIANO_PHRASES.length];
    phraseIndex++;

    // Play notes as an arpeggio with expressive timing
    const baseTime = Tone.now();
    const noteSpacing = 0.18 + Math.random() * 0.12; // Rubato feel

    phrase.forEach((note, i) => {
      const time = baseTime + i * noteSpacing;
      // Velocity curve: start soft, swell in middle, fade at end
      const pos = i / (phrase.length - 1);
      const curve = 0.2 + 0.3 * Math.sin(pos * Math.PI);
      const velocity = curve + Math.random() * 0.08;
      synth.triggerAttackRelease(note, "2n", time, velocity);
    });

    // Bass note every other phrase
    if (phraseIndex % 2 === 0) {
      const bassChord = PIANO_BASS[bassIndex % PIANO_BASS.length];
      bassIndex++;
      bass.triggerAttackRelease(bassChord, "1m", baseTime, 0.2);
    }

    // Next phrase in 3-7 seconds (like breathing between phrases)
    const next = 3000 + Math.random() * 4000;
    setTimeout(playPhrase, next);
  }

  setTimeout(playPhrase, 800);

  return () => {
    alive = false;
    synth.releaseAll();
    bass.releaseAll();
    setTimeout(() => {
      synth.dispose();
      bass.dispose();
      delay.dispose();
      reverb.dispose();
    }, 5000);
  };
}

function startSpace(): () => void {
  const reverb = new Tone.Reverb({ decay: 14, wet: 0.85 }).toDestination();
  const delay = new Tone.FeedbackDelay({ delayTime: "4n.", feedback: 0.4, wet: 0.35 }).connect(reverb);

  // Pad synth for drones
  const pad = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "sine" },
    envelope: {
      attack: 5,
      decay: 2,
      sustain: 0.8,
      release: 10,
    },
    volume: -18,
  }).connect(reverb);

  // Melodic synth — bell-like tones
  const melody = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "sine" },
    envelope: {
      attack: 0.3,
      decay: 2,
      sustain: 0.2,
      release: 5,
    },
    volume: -16,
  }).connect(delay);

  // High shimmer layer
  const shimmer = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: {
      attack: 2,
      decay: 1,
      sustain: 0.2,
      release: 6,
    },
    volume: -26,
  }).connect(reverb);

  // Filtered noise layer
  const noise = new Tone.Noise("pink").start();
  const noiseFilter = new Tone.AutoFilter({
    frequency: 0.05,
    baseFrequency: 100,
    octaves: 3,
  }).connect(reverb).start();
  const noiseGain = new Tone.Gain(0.02).connect(noiseFilter);
  noise.connect(noiseGain);

  let alive = true;
  let chordIndex = 0;
  let melodyIndex = 0;

  function playChord() {
    if (!alive) return;

    const chord = SPACE_CHORDS[chordIndex % SPACE_CHORDS.length];
    chordIndex++;

    pad.triggerAttackRelease(chord, "4m", Tone.now(), 0.18);

    // Next chord in 10-16 seconds
    const next = 10000 + Math.random() * 6000;
    setTimeout(playChord, next);
  }

  function playMelody() {
    if (!alive) return;

    const phrase = SPACE_MELODY[melodyIndex % SPACE_MELODY.length];
    melodyIndex++;

    const baseTime = Tone.now();
    const noteSpacing = 0.8 + Math.random() * 0.6;

    phrase.forEach((note, i) => {
      const time = baseTime + i * noteSpacing;
      const velocity = 0.12 + Math.random() * 0.12;
      melody.triggerAttackRelease(note, "1m", time, velocity);
    });

    // Occasional shimmer high note
    if (Math.random() < 0.4) {
      const highNotes = ["E6", "G5", "A5", "C6", "D6", "B5"];
      const note = highNotes[Math.floor(Math.random() * highNotes.length)];
      shimmer.triggerAttackRelease(note, "2m", baseTime + phrase.length * noteSpacing, 0.08);
    }

    // Next melody in 6-12 seconds
    const next = 6000 + Math.random() * 6000;
    setTimeout(playMelody, next);
  }

  setTimeout(playChord, 1000);
  setTimeout(playMelody, 3000);

  return () => {
    alive = false;
    pad.releaseAll();
    melody.releaseAll();
    shimmer.releaseAll();
    noise.stop();
    setTimeout(() => {
      pad.dispose();
      melody.dispose();
      shimmer.dispose();
      noise.dispose();
      noiseGain.dispose();
      noiseFilter.dispose();
      delay.dispose();
      reverb.dispose();
    }, 10000);
  };
}

/** Must be called from a user gesture (click/tap) to unlock audio. */
export async function initAudio() {
  if (started) return;
  await Tone.start();
  started = true;
}

export function setMusic(mode: MusicMode | "off") {
  // Stop current music
  if (stopFn) {
    stopFn();
    stopFn = null;
  }

  if (mode === "off") {
    currentMode = null;
    return;
  }

  if (mode === currentMode) return;
  currentMode = mode;

  if (!started) return;

  Tone.getTransport().bpm.value = 60;

  if (mode === "piano") {
    stopFn = startPiano();
  } else {
    stopFn = startSpace();
  }
}
