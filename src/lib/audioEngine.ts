/**
 * High-Precision Web Audio Drum Synthesis Engine
 * Zero external sample dependencies, 0ms latency, authentic sound design.
 */

export type DrumSoundId = 
  | 'kick' 
  | 'snare' 
  | 'snare-rim'
  | 'hihat-closed' 
  | 'hihat-open' 
  | 'tom-high' 
  | 'tom-mid' 
  | 'tom-low' 
  | 'crash' 
  | 'ride' 
  | 'ride-bell'
  | 'cowbell' 
  | 'clap' 
  | 'shaker';

export type DrumKitType = 'rock' | 'electronic' | 'cyber' | 'jazz';

interface DrumPadConfig {
  id: DrumSoundId;
  name: string;
  shortName: string;
  category: 'kick' | 'snare' | 'hihat' | 'tom' | 'cymbal' | 'percussion';
  keyMap: string;
  color: string;
  glowColor: string;
}

export const DRUM_PAD_CONFIGS: DrumPadConfig[] = [
  { id: 'crash', name: 'Crash Cymbal', shortName: 'CRASH', category: 'cymbal', keyMap: '1', color: '#f59e0b', glowColor: 'rgba(245, 158, 11, 0.4)' },
  { id: 'hihat-open', name: 'Open Hi-Hat', shortName: 'O-HAT', category: 'hihat', keyMap: '2', color: '#eab308', glowColor: 'rgba(234, 179, 8, 0.4)' },
  { id: 'hihat-closed', name: 'Closed Hi-Hat', shortName: 'C-HAT', category: 'hihat', keyMap: '3', color: '#ca8a04', glowColor: 'rgba(202, 138, 4, 0.4)' },
  { id: 'ride', name: 'Ride Cymbal', shortName: 'RIDE', category: 'cymbal', keyMap: '4', color: '#f97316', glowColor: 'rgba(249, 115, 22, 0.4)' },
  { id: 'cowbell', name: 'Rock Cowbell', shortName: 'COWBELL', category: 'percussion', keyMap: '5', color: '#64748b', glowColor: 'rgba(100, 116, 139, 0.4)' },
  
  { id: 'tom-high', name: 'High Rack Tom', shortName: 'H-TOM', category: 'tom', keyMap: 'Q', color: '#0284c7', glowColor: 'rgba(2, 132, 199, 0.4)' },
  { id: 'tom-mid', name: 'Mid Rack Tom', shortName: 'M-TOM', category: 'tom', keyMap: 'W', color: '#2563eb', glowColor: 'rgba(37, 99, 235, 0.4)' },
  { id: 'tom-low', name: 'Floor Tom', shortName: 'F-TOM', category: 'tom', keyMap: 'E', color: '#4f46e5', glowColor: 'rgba(79, 70, 229, 0.4)' },
  { id: 'clap', name: 'Hand Clap', shortName: 'CLAP', category: 'percussion', keyMap: 'R', color: '#ec4899', glowColor: 'rgba(236, 72, 153, 0.4)' },

  { id: 'snare', name: 'Snare Center', shortName: 'SNARE', category: 'snare', keyMap: 'A', color: '#ef4444', glowColor: 'rgba(239, 68, 68, 0.4)' },
  { id: 'snare-rim', name: 'Snare Rimshot', shortName: 'RIMSHOT', category: 'snare', keyMap: 'S', color: '#f87171', glowColor: 'rgba(248, 113, 113, 0.4)' },
  { id: 'kick', name: 'Bass Kick Drum', shortName: 'KICK', category: 'kick', keyMap: 'Space', color: '#8b5cf6', glowColor: 'rgba(139, 92, 246, 0.5)' },
  { id: 'shaker', name: 'Groove Shaker', shortName: 'SHAKER', category: 'percussion', keyMap: 'D', color: '#10b981', glowColor: 'rgba(16, 185, 129, 0.4)' },
];

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  public analyser: AnalyserNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private pinkNoiseBuffer: AudioBuffer | null = null;

  // Active ringing nodes to support cymbal choking
  private activeCrashNodes: { gain: GainNode; stop: () => void }[] = [];
  private activeOpenHatNodes: { gain: GainNode; stop: () => void }[] = [];

  public currentKit: DrumKitType = 'rock';
  public masterVolume: number = 0.85;
  public reverbEnabled: boolean = true;
  private reverbNode: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;

  public init(): AudioContext {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();

      // Master bus
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);

      // Dynamics Compressor (Studio glue & punch, prevents harsh clipping)
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(6, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.15, this.ctx.currentTime);

      // Studio Analyser for real-time oscilloscope / visualizer
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      // Routing
      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      // Setup algorithmic reverb room impulse
      this.setupReverb();

      // Pre-render noise buffers
      this.generateNoiseBuffers();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    return this.ctx;
  }

  public getContext(): AudioContext | null {
    return this.ctx;
  }

  public isReady(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  public setMasterVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.02);
    }
  }

  public setKit(kit: DrumKitType) {
    this.currentKit = kit;
  }

  private setupReverb() {
    if (!this.ctx || !this.masterGain) return;
    try {
      this.reverbNode = this.ctx.createConvolver();
      this.reverbGain = this.ctx.createGain();
      this.reverbGain.gain.value = 0.15; // subtle room depth

      // Generate synthetic room impulse response
      const rate = this.ctx.sampleRate;
      const length = rate * 1.2; // 1.2s room tail
      const decay = 2.5;
      const impulse = this.ctx.createBuffer(2, length, rate);
      const left = impulse.getChannelData(0);
      const right = impulse.getChannelData(1);

      for (let i = 0; i < length; i++) {
        const factor = Math.exp(-i / (rate * (1.2 / decay)));
        left[i] = (Math.random() * 2 - 1) * factor;
        right[i] = (Math.random() * 2 - 1) * factor;
      }

      this.reverbNode.buffer = impulse;
      this.reverbNode.connect(this.reverbGain);
      this.reverbGain.connect(this.masterGain);
    } catch {
      // Graceful fallback if convolver fails on any platform
    }
  }

  private generateNoiseBuffers() {
    if (!this.ctx) return;
    const rate = this.ctx.sampleRate;
    const bufferSize = rate * 2; // 2 seconds

    // White noise
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, rate);
    const output = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    // Pink noise (softer low-pass filtered noise)
    this.pinkNoiseBuffer = this.ctx.createBuffer(1, bufferSize, rate);
    const pOutput = this.pinkNoiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      pOutput[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  }

  // Choke ringing cymbals (just like a real drummer grabbing the edge)
  public chokeCymbal(type: 'crash' | 'hihat') {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (type === 'crash') {
      this.activeCrashNodes.forEach(({ gain, stop }) => {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
        setTimeout(stop, 50);
      });
      this.activeCrashNodes = [];
    } else if (type === 'hihat') {
      this.activeOpenHatNodes.forEach(({ gain, stop }) => {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);
        setTimeout(stop, 30);
      });
      this.activeOpenHatNodes = [];
    }
  }

  public playSound(soundId: DrumSoundId, velocity: number = 1.0, time?: number) {
    if (!this.ctx || !this.masterGain) {
      this.init();
    }
    if (!this.ctx || !this.masterGain) return;

    const t = time ?? this.ctx.currentTime;
    const vel = Math.max(0.1, Math.min(1.2, velocity));

    // If hihat-closed is played, immediately choke any currently ringing open hi-hat
    if (soundId === 'hihat-closed') {
      this.chokeCymbal('hihat');
    }

    switch (soundId) {
      case 'kick':
        this.synthKick(t, vel);
        break;
      case 'snare':
        this.synthSnare(t, vel, false);
        break;
      case 'snare-rim':
        this.synthSnare(t, vel, true);
        break;
      case 'hihat-closed':
        this.synthHiHat(t, vel, false);
        break;
      case 'hihat-open':
        this.synthHiHat(t, vel, true);
        break;
      case 'tom-high':
        this.synthTom(t, vel, 210, 0.42);
        break;
      case 'tom-mid':
        this.synthTom(t, vel, 155, 0.5);
        break;
      case 'tom-low':
        this.synthTom(t, vel, 98, 0.65);
        break;
      case 'crash':
        this.synthCrash(t, vel);
        break;
      case 'ride':
        this.synthRide(t, vel, false);
        break;
      case 'ride-bell':
        this.synthRide(t, vel, true);
        break;
      case 'cowbell':
        this.synthCowbell(t, vel);
        break;
      case 'clap':
        this.synthClap(t, vel);
        break;
      case 'shaker':
        this.synthShaker(t, vel);
        break;
    }
  }

  // --- INDIVIDUAL INSTRUMENT SYNTHESIZERS ---

  private synthKick(t: number, vel: number) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.masterGain);

    clickOsc.connect(clickGain);
    clickGain.connect(this.masterGain);

    if (this.currentKit === 'electronic') {
      // 808 Style Sub Kick
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(42, t + 0.09);
      gain.gain.setValueAtTime(1.1 * vel, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);
      osc.start(t);
      osc.stop(t + 0.76);
    } else if (this.currentKit === 'cyber') {
      // Punchy Synth Laser Kick
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.exponentialRampToValueAtTime(35, t + 0.07);
      gain.gain.setValueAtTime(1.0 * vel, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.start(t);
      osc.stop(t + 0.46);
    } else if (this.currentKit === 'jazz') {
      // Warm Wood Jazz Bass Drum
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(55, t + 0.12);
      gain.gain.setValueAtTime(0.85 * vel, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.start(t);
      osc.stop(t + 0.52);
    } else {
      // Standard Rock Kick: Dual stage frequency envelope with beater punch
      osc.type = 'sine';
      osc.frequency.setValueAtTime(175, t);
      osc.frequency.exponentialRampToValueAtTime(75, t + 0.04);
      osc.frequency.exponentialRampToValueAtTime(48, t + 0.38);

      gain.gain.setValueAtTime(1.2 * vel, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);

      // Beater click (plastic/felt strike on head)
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(400, t);
      clickOsc.frequency.exponentialRampToValueAtTime(80, t + 0.02);
      clickGain.gain.setValueAtTime(0.5 * vel, t);
      clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

      clickOsc.start(t);
      clickOsc.stop(t + 0.03);

      osc.start(t);
      osc.stop(t + 0.44);
    }
  }

  private synthSnare(t: number, vel: number, rimshot: boolean) {
    if (!this.ctx || !this.masterGain) return;

    // Body tone (drum shell resonance)
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = rimshot ? 'triangle' : 'sine';

    const baseFreq = rimshot ? 320 : (this.currentKit === 'electronic' ? 190 : 220);
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.1);

    oscGain.gain.setValueAtTime(rimshot ? 0.9 * vel : 0.7 * vel, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + (rimshot ? 0.14 : 0.18));
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.2);

    // Snare wires rattle (filtered noise)
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = rimshot ? 'bandpass' : 'highpass';
      filter.frequency.setValueAtTime(rimshot ? 3500 : 1800, t);
      filter.Q.value = rimshot ? 4.0 : 1.2;

      const noiseGain = this.ctx.createGain();
      const snareTail = this.currentKit === 'cyber' ? 0.35 : (rimshot ? 0.12 : 0.24);
      noiseGain.gain.setValueAtTime(1.0 * vel, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + snareTail);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      // Route to reverb for ambient crack
      if (this.reverbNode) {
        noiseGain.connect(this.reverbNode);
      }

      noise.start(t);
      noise.stop(t + snareTail + 0.05);
    }
  }

  private synthHiHat(t: number, vel: number, open: boolean) {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;

    const duration = open ? 0.45 : 0.07;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(this.currentKit === 'electronic' ? 8500 : 10000, t);
    bandpass.Q.value = 4.0;

    const highpass = this.ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(7000, t);

    const gain = this.ctx.createGain();
    const peakGain = (open ? 0.7 : 0.85) * vel;
    gain.gain.setValueAtTime(peakGain, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(bandpass);
    bandpass.connect(highpass);
    highpass.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + duration + 0.02);

    if (open) {
      this.activeOpenHatNodes.push({
        gain,
        stop: () => {
          try {
            noise.stop();
          } catch {
            // ignore
          }
        },
      });
    }
  }

  private synthTom(t: number, vel: number, pitch: number, duration: number) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = this.currentKit === 'cyber' ? 'sawtooth' : 'sine';
    const targetPitch = this.currentKit === 'cyber' ? pitch * 0.8 : pitch;

    osc.frequency.setValueAtTime(targetPitch * 1.6, t);
    osc.frequency.exponentialRampToValueAtTime(targetPitch, t + 0.08);

    gain.gain.setValueAtTime(0.9 * vel, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    // Subtle skin slap noise
    if (this.noiseBuffer) {
      const slap = this.ctx.createBufferSource();
      slap.buffer = this.noiseBuffer;
      const slapFilter = this.ctx.createBiquadFilter();
      slapFilter.type = 'lowpass';
      slapFilter.frequency.setValueAtTime(1400, t);
      const slapGain = this.ctx.createGain();
      slapGain.gain.setValueAtTime(0.2 * vel, t);
      slapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      slap.connect(slapFilter);
      slapFilter.connect(slapGain);
      slapGain.connect(this.masterGain);
      slap.start(t);
      slap.stop(t + 0.05);
    }

    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  private synthCrash(t: number, vel: number) {
    if (!this.ctx || !this.masterGain) return;

    const duration = 1.8;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.85 * vel, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    gain.connect(this.masterGain);

    // Multi-metallic cluster oscillator
    const metallicFreqs = [312, 427, 545, 680, 890, 1140];
    const oscillators: OscillatorNode[] = [];

    metallicFreqs.forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t);

      const oscFilter = this.ctx!.createBiquadFilter();
      oscFilter.type = 'bandpass';
      oscFilter.frequency.setValueAtTime(freq * 1.5, t);

      osc.connect(oscFilter);
      oscFilter.connect(gain);
      osc.start(t);
      osc.stop(t + duration);
      oscillators.push(osc);
    });

    // Shimmer noise
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.setValueAtTime(4500, t);
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.7 * vel, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.masterGain);
      noise.start(t);
      noise.stop(t + duration);
    }

    if (this.reverbNode) {
      gain.connect(this.reverbNode);
    }

    this.activeCrashNodes.push({
      gain,
      stop: () => {
        oscillators.forEach((o) => {
          try {
            o.stop();
          } catch {
            // ignore
          }
        });
      },
    });
  }

  private synthRide(t: number, vel: number, bell: boolean) {
    if (!this.ctx || !this.masterGain) return;

    const duration = bell ? 0.9 : 1.3;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'square';

    const freq1 = bell ? 1040 : 580;
    const freq2 = bell ? 1680 : 830;

    osc1.frequency.setValueAtTime(freq1, t);
    osc2.frequency.setValueAtTime(freq2, t);

    const filter = this.ctx.createBiquadFilter();
    filter.type = bell ? 'bandpass' : 'highpass';
    filter.frequency.setValueAtTime(bell ? 1300 : 3500, t);
    filter.Q.value = bell ? 6 : 1.5;

    gain.gain.setValueAtTime((bell ? 0.9 : 0.6) * vel, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + duration);
    osc2.stop(t + duration);
  }

  private synthCowbell(t: number, vel: number) {
    if (!this.ctx || !this.masterGain) return;

    const t0 = t;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc1.type = 'square';
    osc2.type = 'square';

    osc1.frequency.setValueAtTime(800, t0);
    osc2.frequency.setValueAtTime(540, t0);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(950, t0);
    filter.Q.value = 3.5;

    gain.gain.setValueAtTime(0.9 * vel, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.32);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(t0);
    osc2.start(t0);
    osc1.stop(t0 + 0.35);
    osc2.stop(t0 + 0.35);
  }

  private synthClap(t: number, vel: number) {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;

    // Classic 3 micro-bursts + 1 tail
    const bursts = [0, 0.012, 0.024];
    bursts.forEach((offset) => {
      const source = this.ctx!.createBufferSource();
      source.buffer = this.noiseBuffer;
      const bFilter = this.ctx!.createBiquadFilter();
      bFilter.type = 'bandpass';
      bFilter.frequency.setValueAtTime(1200, t + offset);
      bFilter.Q.value = 2.0;

      const bGain = this.ctx!.createGain();
      bGain.gain.setValueAtTime(0.7 * vel, t + offset);
      bGain.gain.exponentialRampToValueAtTime(0.01, t + offset + 0.015);

      source.connect(bFilter);
      bFilter.connect(bGain);
      bGain.connect(this.masterGain!);

      source.start(t + offset);
      source.stop(t + offset + 0.02);
    });

    // Main body & tail
    const mainSource = this.ctx.createBufferSource();
    mainSource.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1100, t + 0.036);
    filter.Q.value = 1.8;

    const mainGain = this.ctx.createGain();
    mainGain.gain.setValueAtTime(0.9 * vel, t + 0.036);
    mainGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    mainSource.connect(filter);
    filter.connect(mainGain);
    mainGain.connect(this.masterGain);

    if (this.reverbNode) {
      mainGain.connect(this.reverbNode);
    }

    mainSource.start(t + 0.036);
    mainSource.stop(t + 0.3);
  }

  private synthShaker(t: number, vel: number) {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(6500, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.5 * vel, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + 0.09);
  }

  // Metronome click (High tone on downbeat 1, medium on beats 2, 3, 4)
  public playMetronomeClick(isDownbeat: boolean, time?: number) {
    if (!this.ctx || !this.masterGain) return;
    const t = time ?? this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(isDownbeat ? 1200 : 800, t);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.06);
  }
}

export const audioEngine = new AudioEngine();
