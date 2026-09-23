/**
 * Basic Drum Synthesizer using Web Audio API
 */

let audioCtx: AudioContext | null = null;

export const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

// Helper to create white noise buffer
const createNoiseBuffer = () => {
  if (!audioCtx) return null;
  const bufferSize = audioCtx.sampleRate * 2; // 2 seconds of noise
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const output = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  return buffer;
};

let noiseBuffer: AudioBuffer | null = null;

export const playKick = () => {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.5);

  gain.gain.setValueAtTime(1, t);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

  osc.start(t);
  osc.stop(t + 0.5);
};

export const playSnare = () => {
  if (!audioCtx) return;
  if (!noiseBuffer) noiseBuffer = createNoiseBuffer();
  
  const t = audioCtx.currentTime;

  // Tone
  const osc = audioCtx.createOscillator();
  const oscGain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.connect(oscGain);
  oscGain.connect(audioCtx.destination);
  
  osc.frequency.setValueAtTime(250, t);
  oscGain.gain.setValueAtTime(0.5, t);
  oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
  osc.start(t);
  osc.stop(t + 0.2);

  // Noise
  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  const noiseFilter = audioCtx.createBiquadFilter();
  const noiseGain = audioCtx.createGain();

  noiseFilter.type = 'highpass';
  noiseFilter.frequency.value = 1000;
  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(audioCtx.destination);

  noiseGain.gain.setValueAtTime(1, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
  noiseSource.start(t);
  noiseSource.stop(t + 0.2);
};

export const playHiHat = (open: boolean = false) => {
  if (!audioCtx) return;
  if (!noiseBuffer) noiseBuffer = createNoiseBuffer();
  
  const t = audioCtx.currentTime;
  const duration = open ? 0.4 : 0.1;

  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  const bandpass = audioCtx.createBiquadFilter();
  const highpass = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();

  bandpass.type = 'bandpass';
  bandpass.frequency.value = 10000;
  highpass.type = 'highpass';
  highpass.frequency.value = 7000;

  noiseSource.connect(bandpass);
  bandpass.connect(highpass);
  highpass.connect(gain);
  gain.connect(audioCtx.destination);

  gain.gain.setValueAtTime(0.5, t);
  gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

  noiseSource.start(t);
  noiseSource.stop(t + duration);
};

export const playTom = (high: boolean = true) => {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  const freq = high ? 250 : 120;
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.4);

  gain.gain.setValueAtTime(0.8, t);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

  osc.start(t);
  osc.stop(t + 0.4);
};

export const playCrash = () => {
  if (!audioCtx) return;
  if (!noiseBuffer) noiseBuffer = createNoiseBuffer();
  
  const t = audioCtx.currentTime;
  const duration = 1.5;

  // Multiple oscillators for a metallic sound
  const freqs = [300, 400, 500, 600, 700, 1000];
  const oscGain = audioCtx.createGain();
  oscGain.gain.value = 0.2; // overall volume
  oscGain.connect(audioCtx.destination);

  freqs.forEach(freq => {
    const osc = audioCtx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = freq;
    osc.connect(oscGain);
    osc.start(t);
    osc.stop(t + duration);
  });

  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 4000;
  
  const noiseGain = audioCtx.createGain();
  noiseSource.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(audioCtx.destination);

  // Envelope
  oscGain.gain.setValueAtTime(0.1, t);
  oscGain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  
  noiseGain.gain.setValueAtTime(0.5, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

  noiseSource.start(t);
  noiseSource.stop(t + duration);
};

export const playCowbell = () => {
   if (!audioCtx) return;
   const t = audioCtx.currentTime;
   const osc1 = audioCtx.createOscillator();
   const osc2 = audioCtx.createOscillator();
   const gain = audioCtx.createGain();
   const filter = audioCtx.createBiquadFilter();

   osc1.type = 'square';
   osc2.type = 'square';
   
   osc1.frequency.value = 800;
   osc2.frequency.value = 540;

   osc1.connect(gain);
   osc2.connect(gain);
   
   filter.type = 'bandpass';
   filter.frequency.value = 1000;

   gain.connect(filter);
   filter.connect(audioCtx.destination);

   gain.gain.setValueAtTime(1, t);
   gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

   osc1.start(t);
   osc2.start(t);
   osc1.stop(t + 0.3);
   osc2.stop(t + 0.3);
}
