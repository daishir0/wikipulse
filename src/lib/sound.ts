import { LANGUAGE_SOUND_MAP } from './constants';
import { SoundPreset } from './types';

let audioContext: AudioContext | null = null;
let reverbNode: ConvolverNode | null = null;
let delayNode: DelayNode | null = null;
let delayFeedback: GainNode | null = null;
let masterGain: GainNode | null = null;

// Pentatonic scale intervals for harmonious random notes (C major pentatonic)
const PENTATONIC_RATIOS = [1, 9/8, 5/4, 3/2, 5/3]; // C D E G A

// Chord voicings - each is a set of frequency ratios forming a pleasant chord
const CHORD_VOICINGS = [
  // Major triad (root, maj3, p5)
  [1, 5/4, 3/2],
  // Major 7th (root, maj3, p5, maj7)
  [1, 5/4, 3/2, 15/8],
  // Add9 (root, maj3, p5, maj9)
  [1, 5/4, 3/2, 9/4],
  // Sus2 (root, maj2, p5)
  [1, 9/8, 3/2],
  // Minor triad (root, min3, p5)
  [1, 6/5, 3/2],
  // Minor 7th (root, min3, p5, min7)
  [1, 6/5, 3/2, 9/5],
  // Major 6th (root, maj3, p5, maj6)
  [1, 5/4, 3/2, 5/3],
  // Power + octave (root, p5, octave) - open, spacious
  [1, 3/2, 2],
];

// Chord root notes per language - tuned to work well together across languages
// Using intervals from C major / A minor scale to avoid dissonance between simultaneous edits
const CHORD_ROOT_MAP: Record<string, number> = {
  en: 261.63,  // C4
  ja: 293.66,  // D4
  zh: 329.63,  // E4
  de: 349.23,  // F4
  fr: 392.00,  // G4
  es: 440.00,  // A4
  ru: 261.63,  // C4
  ko: 329.63,  // E4
  ar: 392.00,  // G4
  hi: 293.66,  // D4
  nl: 349.23,  // F4
  pl: 440.00,  // A4
  sv: 261.63,  // C4
  vi: 329.63,  // E4
  uk: 392.00,  // G4
  cs: 293.66,  // D4
  id: 349.23,  // F4
  th: 440.00,  // A4
  fa: 261.63,  // C4
  he: 329.63,  // E4
  tr: 392.00,  // G4
  default: 261.63,
};

// Each language gets a preferred voicing index for variety
const LANG_VOICING_MAP: Record<string, number[]> = {
  en: [0, 1, 6],     // Major, Maj7, Maj6
  ja: [2, 3, 7],     // Add9, Sus2, Power+Oct
  zh: [1, 6, 0],     // Maj7, Maj6, Major
  de: [3, 7, 2],     // Sus2, Power+Oct, Add9
  fr: [0, 2, 1],     // Major, Add9, Maj7
  es: [6, 0, 3],     // Maj6, Major, Sus2
  ru: [4, 5, 7],     // Minor, Min7, Power+Oct
  ko: [2, 0, 6],     // Add9, Major, Maj6
  default: [0, 1, 3], // Major, Maj7, Sus2
};

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
    setupEffects(audioContext);
  }
  return audioContext;
}

function setupEffects(ctx: AudioContext) {
  // Master gain
  masterGain = ctx.createGain();
  masterGain.gain.value = 1.0;
  masterGain.connect(ctx.destination);

  // Lush reverb (longer, brighter for piano sparkle)
  reverbNode = ctx.createConvolver();
  reverbNode.buffer = createReverbImpulse(ctx, 3.0, 2.5);
  reverbNode.connect(masterGain);

  // Delay for gentle echo
  delayNode = ctx.createDelay(1.0);
  delayNode.delayTime.value = 0.3;
  delayNode.connect(masterGain);

  delayFeedback = ctx.createGain();
  delayFeedback.gain.value = 0.2;
  delayNode.connect(delayFeedback);
  delayFeedback.connect(delayNode);
}

// Generate a reverb impulse response
function createReverbImpulse(ctx: AudioContext, duration: number, decay: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const impulse = ctx.createBuffer(2, length, sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

export function resumeAudioContext() {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
}

// Play a sound for an edit event
export function playEditSound(
  lang: string,
  byteDiff: number,
  isNew: boolean,
  volume: number,
  preset: SoundPreset = 'piano'
) {
  if (volume <= 0) return;

  const ctx = getAudioContext();
  if (ctx.state === 'suspended') return;

  const now = ctx.currentTime;

  switch (preset) {
    case 'piano':
      playPresetPiano(ctx, lang, byteDiff, isNew, volume, now);
      break;
    case 'chord':
      playPresetChord(ctx, lang, byteDiff, isNew, volume, now);
      break;
    case 'ambient':
      playPresetAmbient(ctx, lang, byteDiff, isNew, volume, now);
      break;
    case 'minimal':
      playPresetMinimal(ctx, lang, byteDiff, isNew, volume, now);
      break;
    case 'raindrop':
      playPresetRaindrop(ctx, lang, byteDiff, isNew, volume, now);
      break;
    case 'kalimba':
      playPresetKalimba(ctx, lang, byteDiff, isNew, volume, now);
      break;
    case 'ocean':
      playPresetOcean(ctx, lang, byteDiff, isNew, volume, now);
      break;
  }
}

// ============================================================
// Preset: Piano (original)
// ============================================================
function playPresetPiano(
  ctx: AudioContext, lang: string, byteDiff: number, isNew: boolean,
  volume: number, now: number
) {
  const soundConfig = LANGUAGE_SOUND_MAP[lang] || LANGUAGE_SOUND_MAP.default;

  const pentatonicIndex = Math.floor(Math.random() * PENTATONIC_RATIOS.length);
  const pentatonicRatio = PENTATONIC_RATIOS[pentatonicIndex];

  const absDiff = Math.abs(byteDiff);
  let freqMultiplier = pentatonicRatio;
  if (absDiff > 1000) freqMultiplier *= 0.5;
  else if (absDiff > 500) freqMultiplier *= 0.75;
  else if (absDiff < 50) freqMultiplier *= 2.0;
  else if (absDiff < 200) freqMultiplier *= 1.5;

  const frequency = soundConfig.baseFreq * freqMultiplier;
  const gain = volume * 0.08;

  if (isNew) {
    playSparkleChime(ctx, frequency, gain, now);
  } else {
    playPianoTone(ctx, frequency, gain, now);
  }
}

// ============================================================
// Preset: Chord (和音) - pleasant chords per edit
// ============================================================
function playPresetChord(
  ctx: AudioContext, lang: string, byteDiff: number, isNew: boolean,
  volume: number, now: number
) {
  if (!reverbNode || !masterGain) return;

  const rootFreq = CHORD_ROOT_MAP[lang] || CHORD_ROOT_MAP.default;
  const voicingIndices = LANG_VOICING_MAP[lang] || LANG_VOICING_MAP.default;

  // Pick voicing based on edit characteristics
  const absDiff = Math.abs(byteDiff);
  let voicingIdx: number;
  if (isNew) {
    voicingIdx = voicingIndices[0]; // Brightest voicing for new articles
  } else if (absDiff > 500) {
    voicingIdx = voicingIndices[1]; // Second voicing for major edits
  } else {
    voicingIdx = voicingIndices[2]; // Third for minor edits
  }
  const voicing = CHORD_VOICINGS[voicingIdx];

  // Octave shift based on edit size
  let octaveShift = 1;
  if (absDiff > 1000) octaveShift = 0.5;   // Lower octave for very large edits
  else if (absDiff < 50) octaveShift = 2;   // Higher octave for tiny edits
  else if (absDiff < 200) octaveShift = 1.5;

  const gain = volume * (isNew ? 0.07 : 0.055);

  const wetGain = ctx.createGain();
  wetGain.gain.value = 0.7;
  wetGain.connect(reverbNode);

  const dryGain = ctx.createGain();
  dryGain.gain.value = 0.3;
  dryGain.connect(masterGain);

  const duration = isNew ? 3.0 : 2.0 + Math.random() * 0.5;

  // Play each note of the chord with slight staggering for a "strummed" feel
  voicing.forEach((ratio, i) => {
    const freq = rootFreq * ratio * octaveShift;
    const stagger = isNew ? i * 0.06 : i * 0.015; // New articles get arpeggio feel
    const startTime = now + stagger;
    const noteGain = gain * (i === 0 ? 1.0 : 0.7); // Root is slightly louder

    // Main tone
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    g.gain.setValueAtTime(0, startTime);
    g.gain.linearRampToValueAtTime(noteGain, startTime + 0.008);
    g.gain.exponentialRampToValueAtTime(noteGain * 0.3, startTime + 0.12);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(g);
    g.connect(dryGain);
    g.connect(wetGain);
    osc.start(startTime);
    osc.stop(startTime + duration);

    // Detuned copy for warmth
    const oscD = ctx.createOscillator();
    const gD = ctx.createGain();
    oscD.type = 'sine';
    oscD.frequency.setValueAtTime(freq * 1.002, startTime);
    gD.gain.setValueAtTime(0, startTime);
    gD.gain.linearRampToValueAtTime(noteGain * 0.25, startTime + 0.008);
    gD.gain.exponentialRampToValueAtTime(0.001, startTime + duration * 0.6);

    oscD.connect(gD);
    gD.connect(wetGain);
    oscD.start(startTime);
    oscD.stop(startTime + duration * 0.6);
  });

  // For new articles, add a high shimmer overtone
  if (isNew) {
    const shimmer = ctx.createOscillator();
    const sG = ctx.createGain();
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(rootFreq * 4 * octaveShift, now);
    sG.gain.setValueAtTime(0, now);
    sG.gain.linearRampToValueAtTime(gain * 0.03, now + 0.003);
    sG.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    shimmer.connect(sG);
    sG.connect(wetGain);
    shimmer.start(now);
    shimmer.stop(now + 0.8);
  }
}

// ============================================================
// Preset: Ambient - soft pad-like sustained tones
// ============================================================
function playPresetAmbient(
  ctx: AudioContext, lang: string, byteDiff: number, isNew: boolean,
  volume: number, now: number
) {
  if (!reverbNode || !masterGain) return;

  const rootFreq = CHORD_ROOT_MAP[lang] || CHORD_ROOT_MAP.default;
  // Use lower octave for ambient warmth
  const freq = rootFreq * (isNew ? 1 : 0.5);
  const gain = volume * 0.04;
  const duration = 4.0 + Math.random() * 2.0;

  const wetGain = ctx.createGain();
  wetGain.gain.value = 0.9; // Heavy reverb for ambient
  wetGain.connect(reverbNode);

  const dryGain = ctx.createGain();
  dryGain.gain.value = 0.1;
  dryGain.connect(masterGain);

  // Slow-attack pad tone with perfect 5th
  const notes = isNew ? [1, 3/2, 2] : [1, 3/2];

  notes.forEach((ratio) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * ratio, now);
    // Slow attack for pad feel
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(gain, now + 0.3);
    g.gain.setValueAtTime(gain, now + duration * 0.4);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(g);
    g.connect(dryGain);
    g.connect(wetGain);
    osc.start(now);
    osc.stop(now + duration);

    // Slight detune for chorus/width
    const oscD = ctx.createOscillator();
    const gD = ctx.createGain();
    oscD.type = 'sine';
    oscD.frequency.setValueAtTime(freq * ratio * 0.998, now);
    gD.gain.setValueAtTime(0, now);
    gD.gain.linearRampToValueAtTime(gain * 0.5, now + 0.4);
    gD.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.8);

    oscD.connect(gD);
    gD.connect(wetGain);
    oscD.start(now);
    oscD.stop(now + duration * 0.8);
  });
}

// ============================================================
// Preset: Minimal - clean, simple single tones
// ============================================================
function playPresetMinimal(
  ctx: AudioContext, lang: string, byteDiff: number, isNew: boolean,
  volume: number, now: number
) {
  if (!masterGain) return;

  const rootFreq = CHORD_ROOT_MAP[lang] || CHORD_ROOT_MAP.default;
  const absDiff = Math.abs(byteDiff);

  // Simple octave mapping based on size
  let freq = rootFreq;
  if (absDiff > 1000) freq *= 0.5;
  else if (absDiff < 50) freq *= 2;

  const gain = volume * (isNew ? 0.06 : 0.04);
  const duration = isNew ? 0.8 : 0.4;

  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, now);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(gain, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(g);
  g.connect(masterGain);
  osc.start(now);
  osc.stop(now + duration);

  // New articles get a soft octave above
  if (isNew) {
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, now + 0.05);
    g2.gain.setValueAtTime(0, now + 0.05);
    g2.gain.linearRampToValueAtTime(gain * 0.3, now + 0.06);
    g2.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.6);

    osc2.connect(g2);
    g2.connect(masterGain);
    osc2.start(now + 0.05);
    osc2.stop(now + duration * 0.6);
  }
}

// ============================================================
// Preset: Raindrop - water drop pluck with pitched resonance
// ============================================================
function playPresetRaindrop(
  ctx: AudioContext, lang: string, byteDiff: number, isNew: boolean,
  volume: number, now: number
) {
  if (!reverbNode || !masterGain) return;

  const rootFreq = CHORD_ROOT_MAP[lang] || CHORD_ROOT_MAP.default;
  const absDiff = Math.abs(byteDiff);

  // Higher pitch = smaller edit (like small raindrops)
  let freq = rootFreq;
  if (absDiff > 1000) freq *= 0.5;
  else if (absDiff > 500) freq *= 0.75;
  else if (absDiff < 50) freq *= 2.5;
  else if (absDiff < 200) freq *= 1.5;

  // Add pentatonic variation
  const pentatonic = PENTATONIC_RATIOS[Math.floor(Math.random() * PENTATONIC_RATIOS.length)];
  freq *= pentatonic;

  const gain = volume * (isNew ? 0.07 : 0.05);
  const duration = isNew ? 1.8 : 0.8 + Math.random() * 0.4;

  const wetGain = ctx.createGain();
  wetGain.gain.value = 0.8;
  wetGain.connect(reverbNode);

  const dryGain = ctx.createGain();
  dryGain.gain.value = 0.2;
  dryGain.connect(masterGain);

  // Main "plop" — sharp attack sine that quickly decays
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  // Pitch drops slightly on attack (water drop effect)
  osc.frequency.setValueAtTime(freq * 1.5, now);
  osc.frequency.exponentialRampToValueAtTime(freq, now + 0.03);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(gain, now + 0.002);
  g.gain.exponentialRampToValueAtTime(gain * 0.2, now + 0.06);
  g.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(g);
  g.connect(dryGain);
  g.connect(wetGain);
  osc.start(now);
  osc.stop(now + duration);

  // Resonance ring (octave above, quieter, longer tail)
  const osc2 = ctx.createOscillator();
  const g2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * 2, now);
  g2.gain.setValueAtTime(0, now);
  g2.gain.linearRampToValueAtTime(gain * 0.15, now + 0.005);
  g2.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.7);

  osc2.connect(g2);
  g2.connect(wetGain);
  osc2.start(now);
  osc2.stop(now + duration * 0.7);

  // New articles get a second drop (echo)
  if (isNew) {
    const delay = 0.15;
    const osc3 = ctx.createOscillator();
    const g3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(freq * 1.5 * (3/2), now + delay);
    osc3.frequency.exponentialRampToValueAtTime(freq * (3/2), now + delay + 0.03);
    g3.gain.setValueAtTime(0, now + delay);
    g3.gain.linearRampToValueAtTime(gain * 0.6, now + delay + 0.002);
    g3.gain.exponentialRampToValueAtTime(0.001, now + delay + duration * 0.8);

    osc3.connect(g3);
    g3.connect(dryGain);
    g3.connect(wetGain);
    osc3.start(now + delay);
    osc3.stop(now + delay + duration * 0.8);
  }
}

// ============================================================
// Preset: Kalimba - metallic thumb piano with bright overtones
// ============================================================
function playPresetKalimba(
  ctx: AudioContext, lang: string, byteDiff: number, isNew: boolean,
  volume: number, now: number
) {
  if (!reverbNode || !masterGain) return;

  const rootFreq = CHORD_ROOT_MAP[lang] || CHORD_ROOT_MAP.default;
  const absDiff = Math.abs(byteDiff);

  // Kalimba plays in a higher register
  let freq = rootFreq * 2;
  if (absDiff > 1000) freq *= 0.5;
  else if (absDiff < 50) freq *= 1.5;

  const pentatonic = PENTATONIC_RATIOS[Math.floor(Math.random() * PENTATONIC_RATIOS.length)];
  freq *= pentatonic;

  const gain = volume * (isNew ? 0.06 : 0.045);
  const duration = isNew ? 2.5 : 1.5 + Math.random() * 0.5;

  const wetGain = ctx.createGain();
  wetGain.gain.value = 0.6;
  wetGain.connect(reverbNode);

  const dryGain = ctx.createGain();
  dryGain.gain.value = 0.4;
  dryGain.connect(masterGain);

  // Fundamental — sharp percussive attack
  const osc1 = ctx.createOscillator();
  const g1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(freq, now);
  g1.gain.setValueAtTime(0, now);
  g1.gain.linearRampToValueAtTime(gain, now + 0.001);
  g1.gain.exponentialRampToValueAtTime(gain * 0.5, now + 0.02);
  g1.gain.exponentialRampToValueAtTime(gain * 0.15, now + 0.3);
  g1.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc1.connect(g1);
  g1.connect(dryGain);
  g1.connect(wetGain);
  osc1.start(now);
  osc1.stop(now + duration);

  // Strong 3rd harmonic (characteristic kalimba metallic buzz)
  const osc3 = ctx.createOscillator();
  const g3 = ctx.createGain();
  osc3.type = 'sine';
  osc3.frequency.setValueAtTime(freq * 3, now);
  g3.gain.setValueAtTime(0, now);
  g3.gain.linearRampToValueAtTime(gain * 0.25, now + 0.001);
  g3.gain.exponentialRampToValueAtTime(gain * 0.05, now + 0.05);
  g3.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.3);

  osc3.connect(g3);
  g3.connect(wetGain);
  osc3.start(now);
  osc3.stop(now + duration * 0.3);

  // 5th harmonic (bright shimmer)
  const osc5 = ctx.createOscillator();
  const g5 = ctx.createGain();
  osc5.type = 'sine';
  osc5.frequency.setValueAtTime(freq * 5, now);
  g5.gain.setValueAtTime(0, now);
  g5.gain.linearRampToValueAtTime(gain * 0.08, now + 0.001);
  g5.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  osc5.connect(g5);
  g5.connect(wetGain);
  osc5.start(now);
  osc5.stop(now + 0.15);

  // Slight detune for metallic warmth
  const oscD = ctx.createOscillator();
  const gD = ctx.createGain();
  oscD.type = 'sine';
  oscD.frequency.setValueAtTime(freq * 1.005, now);
  gD.gain.setValueAtTime(0, now);
  gD.gain.linearRampToValueAtTime(gain * 0.2, now + 0.001);
  gD.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.5);

  oscD.connect(gD);
  gD.connect(wetGain);
  oscD.start(now);
  oscD.stop(now + duration * 0.5);

  // New articles: add a second kalimba note (perfect 5th above)
  if (isNew) {
    const delay = 0.08;
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 3/2, now + delay);
    g2.gain.setValueAtTime(0, now + delay);
    g2.gain.linearRampToValueAtTime(gain * 0.7, now + delay + 0.001);
    g2.gain.exponentialRampToValueAtTime(gain * 0.1, now + delay + 0.3);
    g2.gain.exponentialRampToValueAtTime(0.001, now + delay + duration * 0.8);

    osc2.connect(g2);
    g2.connect(dryGain);
    g2.connect(wetGain);
    osc2.start(now + delay);
    osc2.stop(now + delay + duration * 0.8);
  }
}

// ============================================================
// Preset: Ocean - soft wave-like swells with filtered noise
// ============================================================
function playPresetOcean(
  ctx: AudioContext, lang: string, byteDiff: number, isNew: boolean,
  volume: number, now: number
) {
  if (!reverbNode || !masterGain) return;

  const rootFreq = CHORD_ROOT_MAP[lang] || CHORD_ROOT_MAP.default;
  const absDiff = Math.abs(byteDiff);

  // Lower frequency range for ocean depth
  let freq = rootFreq * 0.5;
  if (absDiff > 1000) freq *= 0.75;
  else if (absDiff < 50) freq *= 1.5;

  const gain = volume * (isNew ? 0.05 : 0.035);
  const duration = isNew ? 5.0 : 3.0 + Math.random() * 1.5;

  const wetGain = ctx.createGain();
  wetGain.gain.value = 0.85;
  wetGain.connect(reverbNode);

  const dryGain = ctx.createGain();
  dryGain.gain.value = 0.15;
  dryGain.connect(masterGain);

  // Filtered noise "wave" — white noise through bandpass filter
  const bufferSize = ctx.sampleRate * Math.min(duration, 5);
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    noiseData[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.setValueAtTime(freq * 2, now);
  bandpass.Q.value = 0.5;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0, now);
  // Swell in, swell out (wave shape)
  noiseGain.gain.linearRampToValueAtTime(gain * 0.3, now + duration * 0.3);
  noiseGain.gain.linearRampToValueAtTime(gain * 0.15, now + duration * 0.6);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  noise.connect(bandpass);
  bandpass.connect(noiseGain);
  noiseGain.connect(wetGain);
  noise.start(now);
  noise.stop(now + duration);

  // Tonal undertone — deep sine with slow swell
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, now);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(gain, now + duration * 0.25);
  g.gain.setValueAtTime(gain, now + duration * 0.4);
  g.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(g);
  g.connect(dryGain);
  g.connect(wetGain);
  osc.start(now);
  osc.stop(now + duration);

  // Perfect 5th harmonic for depth
  const osc2 = ctx.createOscillator();
  const g2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * 3/2, now);
  g2.gain.setValueAtTime(0, now);
  g2.gain.linearRampToValueAtTime(gain * 0.4, now + duration * 0.3);
  g2.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.8);

  osc2.connect(g2);
  g2.connect(wetGain);
  osc2.start(now);
  osc2.stop(now + duration * 0.8);

  // New articles: add a bright "surface sparkle"
  if (isNew) {
    const sparkle = ctx.createOscillator();
    const sG = ctx.createGain();
    sparkle.type = 'sine';
    sparkle.frequency.setValueAtTime(freq * 4, now + 0.5);
    sG.gain.setValueAtTime(0, now + 0.5);
    sG.gain.linearRampToValueAtTime(gain * 0.08, now + 0.6);
    sG.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

    sparkle.connect(sG);
    sG.connect(wetGain);
    sparkle.start(now + 0.5);
    sparkle.stop(now + 1.5);
  }
}

// ============================================================
// Original helper functions (used by Piano preset)
// ============================================================

// Piano-like tone: quick hammer attack, harmonic decay, sparkle overtones
function playPianoTone(
  ctx: AudioContext,
  frequency: number,
  gain: number,
  now: number
) {
  if (!reverbNode || !delayNode || !masterGain) return;

  const dryGain = ctx.createGain();
  dryGain.gain.value = 0.25;
  dryGain.connect(masterGain);

  const wetGain = ctx.createGain();
  wetGain.gain.value = 0.75;
  wetGain.connect(reverbNode);

  const delaySend = ctx.createGain();
  delaySend.gain.value = 0.12;
  delaySend.connect(delayNode);

  const duration = 1.5 + Math.random() * 1.0;

  // Fundamental
  const osc1 = ctx.createOscillator();
  const g1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(frequency, now);
  g1.gain.setValueAtTime(0, now);
  g1.gain.linearRampToValueAtTime(gain, now + 0.005);
  g1.gain.exponentialRampToValueAtTime(gain * 0.4, now + 0.08);
  g1.gain.exponentialRampToValueAtTime(gain * 0.15, now + 0.5);
  g1.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc1.connect(g1);
  g1.connect(dryGain);
  g1.connect(wetGain);
  g1.connect(delaySend);
  osc1.start(now);
  osc1.stop(now + duration);

  // 2nd harmonic
  const osc2 = ctx.createOscillator();
  const g2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(frequency * 2, now);
  g2.gain.setValueAtTime(0, now);
  g2.gain.linearRampToValueAtTime(gain * 0.2, now + 0.005);
  g2.gain.exponentialRampToValueAtTime(gain * 0.05, now + 0.15);
  g2.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.6);

  osc2.connect(g2);
  g2.connect(wetGain);
  osc2.start(now);
  osc2.stop(now + duration * 0.6);

  // 3rd harmonic
  const osc3 = ctx.createOscillator();
  const g3 = ctx.createGain();
  osc3.type = 'sine';
  osc3.frequency.setValueAtTime(frequency * 3, now);
  g3.gain.setValueAtTime(0, now);
  g3.gain.linearRampToValueAtTime(gain * 0.08, now + 0.003);
  g3.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

  osc3.connect(g3);
  g3.connect(wetGain);
  osc3.start(now);
  osc3.stop(now + 0.4);

  // 5th harmonic
  const osc5 = ctx.createOscillator();
  const g5 = ctx.createGain();
  osc5.type = 'sine';
  osc5.frequency.setValueAtTime(frequency * 5, now);
  g5.gain.setValueAtTime(0, now);
  g5.gain.linearRampToValueAtTime(gain * 0.03, now + 0.003);
  g5.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

  osc5.connect(g5);
  g5.connect(wetGain);
  osc5.start(now);
  osc5.stop(now + 0.2);

  // Detuned copy for chorus
  const oscDetune = ctx.createOscillator();
  const gDetune = ctx.createGain();
  oscDetune.type = 'sine';
  oscDetune.frequency.setValueAtTime(frequency * 1.002, now);
  gDetune.gain.setValueAtTime(0, now);
  gDetune.gain.linearRampToValueAtTime(gain * 0.3, now + 0.005);
  gDetune.gain.exponentialRampToValueAtTime(gain * 0.1, now + 0.1);
  gDetune.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.8);

  oscDetune.connect(gDetune);
  gDetune.connect(wetGain);
  oscDetune.start(now);
  oscDetune.stop(now + duration * 0.8);
}

// Sparkle chime for new articles (Piano preset)
function playSparkleChime(
  ctx: AudioContext,
  baseFreq: number,
  gain: number,
  now: number
) {
  if (!reverbNode || !delayNode || !masterGain) return;

  const wetGain = ctx.createGain();
  wetGain.gain.value = 0.85;
  wetGain.connect(reverbNode);

  const delaySend = ctx.createGain();
  delaySend.gain.value = 0.25;
  delaySend.connect(delayNode);

  const dryGain = ctx.createGain();
  dryGain.gain.value = 0.15;
  dryGain.connect(masterGain);

  const notes = [1, 5/4, 3/2, 2, 5/2];
  const totalDuration = 3.0;

  notes.forEach((mult, i) => {
    const startTime = now + i * 0.1;
    const noteDuration = totalDuration - i * 0.1;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * mult, startTime);
    g.gain.setValueAtTime(0, startTime);
    g.gain.linearRampToValueAtTime(gain * 0.6, startTime + 0.005);
    g.gain.exponentialRampToValueAtTime(gain * 0.15, startTime + 0.2);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + noteDuration);

    osc.connect(g);
    g.connect(dryGain);
    g.connect(wetGain);
    if (i <= 1) g.connect(delaySend);

    osc.start(startTime);
    osc.stop(startTime + noteDuration);

    const oscD = ctx.createOscillator();
    const gD = ctx.createGain();
    oscD.type = 'sine';
    oscD.frequency.setValueAtTime(baseFreq * mult * 1.003, startTime);
    gD.gain.setValueAtTime(0, startTime);
    gD.gain.linearRampToValueAtTime(gain * 0.25, startTime + 0.005);
    gD.gain.exponentialRampToValueAtTime(0.001, startTime + noteDuration * 0.7);

    oscD.connect(gD);
    gD.connect(wetGain);
    oscD.start(startTime);
    oscD.stop(startTime + noteDuration * 0.7);

    const sparkle = ctx.createOscillator();
    const sG = ctx.createGain();
    sparkle.type = 'sine';
    sparkle.frequency.setValueAtTime(baseFreq * mult * 4, startTime);
    sG.gain.setValueAtTime(0, startTime);
    sG.gain.linearRampToValueAtTime(gain * 0.04, startTime + 0.003);
    sG.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

    sparkle.connect(sG);
    sG.connect(wetGain);
    sparkle.start(startTime);
    sparkle.stop(startTime + 0.5);
  });
}
