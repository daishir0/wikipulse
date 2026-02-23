import { LANGUAGE_SOUND_MAP } from './constants';

let audioContext: AudioContext | null = null;
let reverbNode: ConvolverNode | null = null;
let delayNode: DelayNode | null = null;
let delayFeedback: GainNode | null = null;
let masterGain: GainNode | null = null;

// Pentatonic scale intervals for harmonious random notes (C major pentatonic)
const PENTATONIC_RATIOS = [1, 9/8, 5/4, 3/2, 5/3]; // C D E G A

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
  volume: number
) {
  if (volume <= 0) return;

  const ctx = getAudioContext();
  if (ctx.state === 'suspended') return;

  const soundConfig = LANGUAGE_SOUND_MAP[lang] || LANGUAGE_SOUND_MAP.default;
  const now = ctx.currentTime;

  // Pick a pentatonic note for variety
  const pentatonicIndex = Math.floor(Math.random() * PENTATONIC_RATIOS.length);
  const pentatonicRatio = PENTATONIC_RATIOS[pentatonicIndex];

  // Pitch based on edit size
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

  const duration = 1.5 + Math.random() * 1.0; // 1.5-2.5s

  // Fundamental — piano hammer strike: sharp attack, fast initial decay, slow sustain
  const osc1 = ctx.createOscillator();
  const g1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(frequency, now);
  g1.gain.setValueAtTime(0, now);
  g1.gain.linearRampToValueAtTime(gain, now + 0.005); // Very fast attack (hammer)
  g1.gain.exponentialRampToValueAtTime(gain * 0.4, now + 0.08); // Fast initial decay
  g1.gain.exponentialRampToValueAtTime(gain * 0.15, now + 0.5); // Sustain
  g1.gain.exponentialRampToValueAtTime(0.001, now + duration); // Long release

  osc1.connect(g1);
  g1.connect(dryGain);
  g1.connect(wetGain);
  g1.connect(delaySend);
  osc1.start(now);
  osc1.stop(now + duration);

  // 2nd harmonic (octave above) — brightness
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

  // 3rd harmonic (sparkle) — gives the "キラキラ" quality
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

  // 5th harmonic (shimmer) — subtle high sparkle
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

  // Slight detuned copy for piano string chorus effect
  const oscDetune = ctx.createOscillator();
  const gDetune = ctx.createGain();
  oscDetune.type = 'sine';
  oscDetune.frequency.setValueAtTime(frequency * 1.002, now); // ~3 cent sharp
  gDetune.gain.setValueAtTime(0, now);
  gDetune.gain.linearRampToValueAtTime(gain * 0.3, now + 0.005);
  gDetune.gain.exponentialRampToValueAtTime(gain * 0.1, now + 0.1);
  gDetune.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.8);

  oscDetune.connect(gDetune);
  gDetune.connect(wetGain);
  oscDetune.start(now);
  oscDetune.stop(now + duration * 0.8);
}

// Sparkle chime for new articles — cascading piano arpeggios with shimmer
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

  // Ascending pentatonic arpeggio: root, 3rd, 5th, octave, octave+3rd
  const notes = [1, 5/4, 3/2, 2, 5/2];
  const totalDuration = 3.0;

  notes.forEach((mult, i) => {
    const startTime = now + i * 0.1;
    const noteDuration = totalDuration - i * 0.1;

    // Main piano note
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

    // Detuned copy for richness
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

    // Sparkle overtone (3rd harmonic — high shimmer)
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
