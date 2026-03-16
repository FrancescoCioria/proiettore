import * as Tone from "tone";

type MusicMode = "piano" | "space";

let currentMode: MusicMode | null = null;
let started = false;
let stopFn: (() => void) | null = null;

// Pentatonic scale notes for gentle, consonant melodies
const PIANO_NOTES = [
  "C3", "D3", "E3", "G3", "A3",
  "C4", "D4", "E4", "G4", "A4",
  "C5", "D5", "E5", "G5",
];

// Deep chords for space ambient
const SPACE_CHORDS = [
  ["C2", "G2", "E3"],
  ["A1", "E2", "C3"],
  ["F2", "C3", "A3"],
  ["G2", "D3", "B3"],
  ["D2", "A2", "F3"],
  ["E2", "B2", "G3"],
];

function startPiano(): () => void {
  const reverb = new Tone.Reverb({ decay: 6, wet: 0.7 }).toDestination();
  const delay = new Tone.FeedbackDelay({ delayTime: "4n", feedback: 0.2, wet: 0.3 }).connect(reverb);

  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: {
      attack: 0.05,
      decay: 1.5,
      sustain: 0.1,
      release: 3,
    },
    volume: -14,
  }).connect(delay);

  let alive = true;

  function playNote() {
    if (!alive) return;

    const note = PIANO_NOTES[Math.floor(Math.random() * PIANO_NOTES.length)];
    const velocity = 0.15 + Math.random() * 0.25;
    synth.triggerAttackRelease(note, "2n", Tone.now(), velocity);

    // Sometimes play a second note for harmony
    if (Math.random() < 0.3) {
      const note2 = PIANO_NOTES[Math.floor(Math.random() * PIANO_NOTES.length)];
      synth.triggerAttackRelease(note2, "2n", Tone.now() + 0.05, velocity * 0.7);
    }

    // Next note in 2-6 seconds
    const next = 2000 + Math.random() * 4000;
    setTimeout(playNote, next);
  }

  // Start after a short delay
  setTimeout(playNote, 500);

  return () => {
    alive = false;
    synth.releaseAll();
    setTimeout(() => {
      synth.dispose();
      delay.dispose();
      reverb.dispose();
    }, 3000);
  };
}

function startSpace(): () => void {
  const reverb = new Tone.Reverb({ decay: 12, wet: 0.85 }).toDestination();
  const delay = new Tone.FeedbackDelay({ delayTime: "2n", feedback: 0.35, wet: 0.4 }).connect(reverb);

  // Pad synth for drones
  const pad = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "sine" },
    envelope: {
      attack: 4,
      decay: 2,
      sustain: 0.8,
      release: 8,
    },
    volume: -18,
  }).connect(delay);

  // High ethereal synth
  const shimmer = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "sine" },
    envelope: {
      attack: 3,
      decay: 1,
      sustain: 0.3,
      release: 6,
    },
    volume: -24,
  }).connect(reverb);

  // Filtered noise layer
  const noise = new Tone.Noise("pink").start();
  const noiseFilter = new Tone.AutoFilter({
    frequency: 0.05,
    baseFrequency: 100,
    octaves: 3,
  }).connect(reverb).start();
  const noiseGain = new Tone.Gain(0.03).connect(noiseFilter);
  noise.connect(noiseGain);

  let alive = true;
  let chordIndex = 0;

  function playChord() {
    if (!alive) return;

    const chord = SPACE_CHORDS[chordIndex % SPACE_CHORDS.length];
    chordIndex++;

    // Play drone chord
    pad.triggerAttackRelease(chord, "4m", Tone.now(), 0.2);

    // Occasional shimmer note
    if (Math.random() < 0.5) {
      const highNotes = ["E5", "G5", "A5", "C6", "D6"];
      const note = highNotes[Math.floor(Math.random() * highNotes.length)];
      shimmer.triggerAttackRelease(note, "2m", Tone.now() + 1, 0.1 + Math.random() * 0.1);
    }

    // Next chord in 8-15 seconds
    const next = 8000 + Math.random() * 7000;
    setTimeout(playChord, next);
  }

  setTimeout(playChord, 1000);

  return () => {
    alive = false;
    pad.releaseAll();
    shimmer.releaseAll();
    noise.stop();
    setTimeout(() => {
      pad.dispose();
      shimmer.dispose();
      noise.dispose();
      noiseGain.dispose();
      noiseFilter.dispose();
      delay.dispose();
      reverb.dispose();
    }, 8000);
  };
}

export async function setMusic(mode: MusicMode | "off") {
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

  // Ensure Tone.js audio context is started (requires user gesture)
  if (!started) {
    await Tone.start();
    started = true;
  }

  Tone.getTransport().bpm.value = 60;

  if (mode === "piano") {
    stopFn = startPiano();
  } else {
    stopFn = startSpace();
  }
}
