/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  audioEngine, 
  DrumSoundId, 
  DrumKitType, 
  DRUM_PAD_CONFIGS 
} from './lib/audioEngine';
import { sequencerEngine } from './lib/sequencerEngine';
import { GROOVE_PRESETS } from './lib/presets';
import { RecordedHit } from './types/drums';
import { SoundModule } from './components/SoundModule';
import { DrumKitVisual } from './components/DrumKitVisual';
import { PadController } from './components/PadController';
import { StepSequencer } from './components/StepSequencer';
import { RhythmCoach } from './components/RhythmCoach';
import { KeyGuideModal } from './components/KeyGuideModal';
import { HelpCircle, Disc3 } from 'lucide-react';

type ViewMode = 'kit' | 'pads' | 'sequencer' | 'coach';

export default function App() {
  // Navigation & View Mode
  const [viewMode, setViewMode] = useState<ViewMode>('kit');
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  // Audio & Module State
  const [currentKit, setCurrentKit] = useState<DrumKitType>('rock');
  const [bpm, setBpm] = useState<number>(110);
  const [isMetronomeOn, setIsMetronomeOn] = useState<boolean>(false);
  const [masterVolume, setMasterVolume] = useState<number>(0.85);
  const [reverbAmount, setReverbAmount] = useState<number>(0.2);
  const [velocityMode, setVelocityMode] = useState<'dynamic' | 'fixed'>('dynamic');
  const [lastHitName, setLastHitName] = useState<string>('');
  const [activePads, setActivePads] = useState<Set<string>>(new Set());

  // Step Sequencer State
  const [isSequencerPlaying, setIsSequencerPlaying] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [sequencerPattern, setSequencerPattern] = useState<{ [key in DrumSoundId]?: boolean[] }>({
    ...sequencerEngine.pattern,
  });

  // Recording State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedHits, setRecordedHits] = useState<RecordedHit[]>([]);
  const [isPlayingRecording, setIsPlayingRecording] = useState<boolean>(false);
  const recordStartTimeRef = useRef<number>(0);
  const playbackTimersRef = useRef<number[]>([]);

  // Metronome Timer
  const metronomeIntervalRef = useRef<number | null>(null);
  const metronomeBeatRef = useRef<number>(0);

  // Handle drum strike (from keyboard, visual kit, pads, or playback)
  const handleHit = useCallback((soundId: DrumSoundId, velocity: number = 1.0) => {
    audioEngine.init();

    const actualVel = velocityMode === 'fixed' ? 1.0 : velocity;
    audioEngine.playSound(soundId, actualVel);

    const padConfig = DRUM_PAD_CONFIGS.find((p) => p.id === soundId);
    setLastHitName(padConfig ? padConfig.shortName : soundId.toUpperCase());

    // Trigger visual pad glow
    setActivePads((prev) => {
      const next = new Set(prev);
      next.add(soundId);
      return next;
    });

    setTimeout(() => {
      setActivePads((prev) => {
        const next = new Set(prev);
        next.delete(soundId);
        return next;
      });
    }, 140);

    // Record hit if recording is armed
    if (isRecording) {
      const timeMs = performance.now() - recordStartTimeRef.current;
      setRecordedHits((prev) => [...prev, { soundId, timeMs, velocity: actualVel }]);
    }
  }, [velocityMode, isRecording]);

  // Global Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept typing in inputs or selects
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleHit('kick', 1.0);
        return;
      }

      const key = e.key.toUpperCase();
      const pad = DRUM_PAD_CONFIGS.find((p) => p.keyMap.toUpperCase() === key);
      
      if (pad && !e.repeat) {
        // If Shift is pressed while hitting Crash, choke it!
        if (e.shiftKey && pad.id === 'crash') {
          audioEngine.chokeCymbal('crash');
        } else {
          handleHit(pad.id, 1.0);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleHit]);

  // Metronome tick effect
  useEffect(() => {
    if (isMetronomeOn) {
      audioEngine.init();
      const intervalMs = (60 / bpm) * 1000;
      metronomeBeatRef.current = 0;

      // First beat immediate
      audioEngine.playMetronomeClick(true);

      metronomeIntervalRef.current = window.setInterval(() => {
        metronomeBeatRef.current = (metronomeBeatRef.current + 1) % 4;
        const isDownbeat = metronomeBeatRef.current === 0;
        audioEngine.playMetronomeClick(isDownbeat);
      }, intervalMs);
    } else {
      if (metronomeIntervalRef.current !== null) {
        clearInterval(metronomeIntervalRef.current);
        metronomeIntervalRef.current = null;
      }
    }

    return () => {
      if (metronomeIntervalRef.current !== null) {
        clearInterval(metronomeIntervalRef.current);
      }
    };
  }, [isMetronomeOn, bpm]);

  // Sequencer Engine Step Listener
  useEffect(() => {
    sequencerEngine.setBpm(bpm);
    sequencerEngine.onStepChange = (step: number) => {
      setCurrentStep(step);
    };
  }, [bpm]);

  // Handle Kit Change
  const handleSelectKit = (kit: DrumKitType) => {
    audioEngine.init();
    setCurrentKit(kit);
    audioEngine.setKit(kit);
  };

  // Handle Master Volume
  const handleChangeMasterVolume = (vol: number) => {
    setMasterVolume(vol);
    audioEngine.setMasterVolume(vol);
  };

  // Toggle Metronome
  const handleToggleMetronome = () => {
    audioEngine.init();
    setIsMetronomeOn((prev) => !prev);
  };

  // Toggle Recording
  const handleToggleRecord = () => {
    audioEngine.init();
    if (!isRecording) {
      // Start recording
      setRecordedHits([]);
      recordStartTimeRef.current = performance.now();
      setIsRecording(true);
    } else {
      // Stop recording
      setIsRecording(false);
    }
  };

  // Playback Recording
  const handlePlayRecording = () => {
    if (recordedHits.length === 0 || isPlayingRecording) return;
    audioEngine.init();
    setIsPlayingRecording(true);

    const totalDuration = recordedHits[recordedHits.length - 1].timeMs + 400;

    recordedHits.forEach((hit) => {
      const timer = window.setTimeout(() => {
        handleHit(hit.soundId, hit.velocity);
      }, hit.timeMs);
      playbackTimersRef.current.push(timer);
    });

    const endTimer = window.setTimeout(() => {
      setIsPlayingRecording(false);
      playbackTimersRef.current = [];
    }, totalDuration);

    playbackTimersRef.current.push(endTimer);
  };

  const handleClearRecording = () => {
    playbackTimersRef.current.forEach(clearTimeout);
    playbackTimersRef.current = [];
    setIsPlayingRecording(false);
    setIsRecording(false);
    setRecordedHits([]);
  };

  // Step Sequencer Handlers
  const handleToggleSequencerPlay = () => {
    audioEngine.init();
    if (isSequencerPlaying) {
      sequencerEngine.stop();
      setIsSequencerPlaying(false);
      setCurrentStep(0);
    } else {
      sequencerEngine.pattern = sequencerPattern;
      sequencerEngine.setBpm(bpm);
      sequencerEngine.start();
      setIsSequencerPlaying(true);
    }
  };

  const handleToggleStep = (soundId: DrumSoundId, stepIndex: number) => {
    setSequencerPattern((prev) => {
      const currentTrack = prev[soundId] || Array(16).fill(false);
      const updatedTrack = [...currentTrack];
      updatedTrack[stepIndex] = !updatedTrack[stepIndex];

      const updated = {
        ...prev,
        [soundId]: updatedTrack,
      };
      sequencerEngine.pattern = updated;
      return updated;
    });
  };

  const handleClearSequencerPattern = () => {
    const empty: { [key in DrumSoundId]?: boolean[] } = {};
    (Object.keys(sequencerPattern) as DrumSoundId[]).forEach((id) => {
      empty[id] = Array(16).fill(false);
    });
    setSequencerPattern(empty);
    sequencerEngine.pattern = empty;
  };

  const handleRandomizeSequencerPattern = () => {
    const random: { [key in DrumSoundId]?: boolean[] } = {};
    const tracks: DrumSoundId[] = ['kick', 'snare', 'hihat-closed', 'hihat-open', 'tom-high', 'tom-low', 'clap'];
    
    tracks.forEach((track) => {
      random[track] = Array.from({ length: 16 }, () => Math.random() > 0.78);
    });
    
    // Ensure at least basic kick & snare structure
    random['kick']![0] = true;
    random['kick']![8] = true;
    random['snare']![4] = true;
    random['snare']![12] = true;

    setSequencerPattern(random);
    sequencerEngine.pattern = random;
  };

  const handleLoadPreset = (presetId: string) => {
    const preset = GROOVE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setBpm(preset.bpm);
    const newPattern: { [key in DrumSoundId]?: boolean[] } = {};
    preset.tracks.forEach((t) => {
      newPattern[t.id] = [...t.steps];
    });

    setSequencerPattern(newPattern);
    sequencerEngine.pattern = newPattern;
    sequencerEngine.setBpm(preset.bpm);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500/30">
      
      {/* 
        TOP BAR CONTRACT (Strict 3-Zone Architecture):
        Zone 1: Brand Wordmark
        Zone 2: View Mode Nav Links
        Zone 3: Primary Action (Guide & Shortcuts)
      */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 md:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          
          {/* Zone 1: Wordmark */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 via-cyan-400 to-amber-300 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Disc3 className="w-4 h-4 text-cyan-400 animate-[spin_10s_linear_infinite]" />
              </div>
            </div>
            <span className="text-lg md:text-xl font-black font-display tracking-tight text-white">
              PulseKit
            </span>
          </div>

          {/* Zone 2: Navigation Links / View Switchers (Segmented Controls) */}
          <nav className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              onClick={() => setViewMode('kit')}
              className={`px-3 md:px-4 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                viewMode === 'kit'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Drum Kit
            </button>

            <button
              onClick={() => setViewMode('pads')}
              className={`px-3 md:px-4 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                viewMode === 'pads'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Pad Matrix
            </button>

            <button
              onClick={() => setViewMode('sequencer')}
              className={`px-3 md:px-4 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                viewMode === 'sequencer'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Beat Lab
            </button>

            <button
              onClick={() => setViewMode('coach')}
              className={`px-3 md:px-4 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                viewMode === 'coach'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Rhythm Coach
            </button>
          </nav>

          {/* Zone 3: Primary Action */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsGuideOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors whitespace-nowrap"
              title="View Drumming Guide & Keyboard Map"
            >
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">Guide & Keys</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Studio Viewport */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6">
        
        {/* Sound Module Digital Brain (LCD, Oscilloscope, Kits, BPM, Rec) */}
        <SoundModule
          currentKit={currentKit}
          onSelectKit={handleSelectKit}
          bpm={bpm}
          onChangeBpm={setBpm}
          isMetronomeOn={isMetronomeOn}
          onToggleMetronome={handleToggleMetronome}
          isRecording={isRecording}
          recordedHitsCount={recordedHits.length}
          isPlayingRecording={isPlayingRecording}
          onToggleRecord={handleToggleRecord}
          onPlayRecording={handlePlayRecording}
          onClearRecording={handleClearRecording}
          masterVolume={masterVolume}
          onChangeMasterVolume={handleChangeMasterVolume}
          reverbAmount={reverbAmount}
          onChangeReverb={setReverbAmount}
          velocityMode={velocityMode}
          onToggleVelocityMode={() => setVelocityMode((m) => (m === 'dynamic' ? 'fixed' : 'dynamic'))}
          lastHitName={lastHitName}
        />

        {/* Dynamic View Mode Switching */}
        {viewMode === 'kit' && (
          <DrumKitVisual
            onHit={handleHit}
            activePads={activePads}
          />
        )}

        {viewMode === 'pads' && (
          <PadController
            onHit={handleHit}
            activePads={activePads}
          />
        )}

        {viewMode === 'sequencer' && (
          <StepSequencer
            isPlaying={isSequencerPlaying}
            onTogglePlay={handleToggleSequencerPlay}
            currentStep={currentStep}
            pattern={sequencerPattern}
            onToggleStep={handleToggleStep}
            onClearPattern={handleClearSequencerPattern}
            onRandomizePattern={handleRandomizeSequencerPattern}
            onLoadPreset={handleLoadPreset}
          />
        )}

        {viewMode === 'coach' && (
          <RhythmCoach
            onHit={handleHit}
            activePads={activePads}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>PulseKit Studio · High-Performance Web Audio Drum Synthesizer</span>
          <div className="flex items-center gap-2">
            <span>Grade 5 Music Education</span>
            <span aria-hidden="true">·</span>
            <span>Zero-Latency Audio</span>
            <span aria-hidden="true">·</span>
            <button 
              onClick={() => setIsGuideOpen(true)}
              className="text-cyan-400 hover:underline"
            >
              Keyboard Shortcuts
            </button>
          </div>
        </div>
      </footer>

      {/* Keyboard Shortcuts & Curriculum Modal */}
      <KeyGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

    </div>
  );
}
