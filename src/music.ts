import * as Tone from "tone";
import { Midi } from "@tonejs/midi";

type MusicMode = "piano" | "space";

let started = false;
let stopFn: (() => void) | null = null;
let pendingMode: MusicMode | null = null;

// --- MIDI Piano Playlist ---

const PIANO_TRACKS = [
  "/midi/clairdelune.mid",    // Debussy - Clair de Lune
  "/midi/arabesqu.mid",       // Debussy - Arabesque No.1
  "/midi/gymnop01.mid",       // Satie - Gymnopédie No.1
  "/midi/chno0902.mid",       // Chopin - Nocturne Op.9 No.2
  "/midi/chno1501.mid",       // Chopin - Nocturne Op.15 No.1
];

let midiCache: Map<string, Midi> = new Map();

async function loadMidi(url: string): Promise<Midi> {
  const cached = midiCache.get(url);
  if (cached) return cached;

  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const midi = new Midi(arrayBuffer);
  midiCache.set(url, midi);
  return midi;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startPiano(): () => void {
  const reverb = new Tone.Reverb({ decay: 5, wet: 0.5 }).toDestination();

  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: { attack: 0.02, decay: 1.5, sustain: 0.2, release: 3 },
    volume: -10,
  }).connect(reverb);

  let alive = true;
  let playlist = shuffle(PIANO_TRACKS);
  let trackIndex = 0;

  async function playNext() {
    if (!alive) return;

    if (trackIndex >= playlist.length) {
      playlist = shuffle(PIANO_TRACKS);
      trackIndex = 0;
    }

    const url = playlist[trackIndex++];
    let midi: Midi;
    try {
      midi = await loadMidi(url);
    } catch {
      // Skip failed loads
      setTimeout(playNext, 1000);
      return;
    }

    if (!alive) return;

    // Find the track with the most notes (main melody)
    const tracks = midi.tracks.filter(t => t.notes.length > 0);
    if (tracks.length === 0) {
      setTimeout(playNext, 1000);
      return;
    }

    // Sort tracks by note count, play top 2 (melody + accompaniment)
    tracks.sort((a, b) => b.notes.length - a.notes.length);
    const playTracks = tracks.slice(0, 2);

    const now = Tone.now() + 0.5;
    let maxEndTime = 0;

    for (const track of playTracks) {
      for (const note of track.notes) {
        if (!alive) return;
        const time = now + note.time;
        const duration = Math.max(0.1, note.duration);
        const velocity = note.velocity * 0.6;
        maxEndTime = Math.max(maxEndTime, note.time + note.duration);

        synth.triggerAttackRelease(
          note.name,
          duration,
          time,
          velocity,
        );
      }
    }

    // Wait for the piece to finish + pause, then play next
    const waitMs = (maxEndTime + 4) * 1000;
    setTimeout(playNext, waitMs);
  }

  playNext();

  return () => {
    alive = false;
    synth.releaseAll();
    setTimeout(() => {
      synth.dispose();
      reverb.dispose();
    }, 4000);
  };
}

// --- Space Ambient (generative, kept from before) ---

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

function startSpace(): () => void {
  const reverb = new Tone.Reverb({ decay: 14, wet: 0.85 }).toDestination();
  const delay = new Tone.FeedbackDelay({ delayTime: 0.75, feedback: 0.4, wet: 0.35 }).connect(reverb);

  const pad = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "sine" },
    envelope: { attack: 5, decay: 2, sustain: 0.8, release: 10 },
    volume: -18,
  }).connect(reverb);

  const melody = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "sine" },
    envelope: { attack: 0.3, decay: 2, sustain: 0.2, release: 5 },
    volume: -16,
  }).connect(delay);

  const shimmer = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: { attack: 2, decay: 1, sustain: 0.2, release: 6 },
    volume: -26,
  }).connect(reverb);

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
    pad.triggerAttackRelease(chord, 16, Tone.now(), 0.18);
    setTimeout(playChord, 10000 + Math.random() * 6000);
  }

  function playMelody() {
    if (!alive) return;
    const phrase = SPACE_MELODY[melodyIndex % SPACE_MELODY.length];
    melodyIndex++;

    const baseTime = Tone.now();
    const noteSpacing = 0.8 + Math.random() * 0.6;

    phrase.forEach((note, i) => {
      melody.triggerAttackRelease(note, 4, baseTime + i * noteSpacing, 0.12 + Math.random() * 0.12);
    });

    if (Math.random() < 0.4) {
      const highNotes = ["E6", "G5", "A5", "C6", "D6", "B5"];
      const note = highNotes[Math.floor(Math.random() * highNotes.length)];
      shimmer.triggerAttackRelease(note, 8, baseTime + phrase.length * noteSpacing, 0.08);
    }

    setTimeout(playMelody, 6000 + Math.random() * 6000);
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

// --- Public API ---

function doStart(mode: MusicMode) {
  if (mode === "piano") {
    stopFn = startPiano();
  } else {
    stopFn = startSpace();
  }
}

export function initAudio() {
  if (started) return;
  Tone.start().then(() => {
    started = true;
    if (pendingMode) {
      doStart(pendingMode);
      pendingMode = null;
    }
  });
}

export function setMusic(mode: MusicMode | "off") {
  if (stopFn) {
    stopFn();
    stopFn = null;
  }

  if (mode === "off") {
    pendingMode = null;
    return;
  }

  if (!started) {
    pendingMode = mode;
    return;
  }

  doStart(mode);
}
