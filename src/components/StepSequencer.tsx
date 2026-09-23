import React from 'react';
import { Play, Square, RotateCcw, Shuffle, Sparkles, Music2 } from 'lucide-react';
import { DrumSoundId, audioEngine } from '../lib/audioEngine';
import { GROOVE_PRESETS } from '../lib/presets';

interface StepSequencerProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentStep: number;
  pattern: { [key in DrumSoundId]?: boolean[] };
  onToggleStep: (soundId: DrumSoundId, stepIndex: number) => void;
  onClearPattern: () => void;
  onRandomizePattern: () => void;
  onLoadPreset: (presetId: string) => void;
}

const TRACK_ORDER: { id: DrumSoundId; label: string; color: string }[] = [
  { id: 'crash', label: 'Crash', color: '#f59e0b' },
  { id: 'hihat-open', label: 'Open Hat', color: '#eab308' },
  { id: 'hihat-closed', label: 'Closed Hat', color: '#ca8a04' },
  { id: 'tom-high', label: 'High Tom', color: '#0284c7' },
  { id: 'tom-low', label: 'Floor Tom', color: '#4f46e5' },
  { id: 'snare', label: 'Snare', color: '#ef4444' },
  { id: 'kick', label: 'Bass Kick', color: '#8b5cf6' },
  { id: 'clap', label: 'Clap', color: '#ec4899' },
];

export const StepSequencer: React.FC<StepSequencerProps> = ({
  isPlaying,
  onTogglePlay,
  currentStep,
  pattern,
  onToggleStep,
  onClearPattern,
  onRandomizePattern,
  onLoadPreset,
}) => {
  return (
    <div className="w-full max-w-5xl mx-auto py-6 px-3 select-none">
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-2xl flex flex-col gap-5">
        
        {/* Header Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          
          <div className="flex items-center gap-3">
            <button
              onClick={onTogglePlay}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg ${
                isPlaying
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-amber-500/20'
                  : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-emerald-500/20'
              }`}
            >
              {isPlaying ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isPlaying ? 'STOP LOOP' : 'PLAY LOOP'}</span>
            </button>

            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 pl-2">
              <Music2 className="w-4 h-4 text-cyan-400" />
              <span>16-Step Pattern Sequencer</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Presets Dropdown */}
            <select
              onChange={(e) => {
                if (e.target.value) onLoadPreset(e.target.value);
              }}
              defaultValue=""
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none cursor-pointer"
            >
              <option value="" disabled>Load Groove Lesson...</option>
              {GROOVE_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.bpm} BPM)
                </option>
              ))}
            </select>

            {/* Randomize */}
            <button
              onClick={onRandomizePattern}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
              title="Generate a fun beat automatically"
            >
              <Shuffle className="w-3.5 h-3.5 text-purple-400" />
              <span>Surprise Beat</span>
            </button>

            {/* Clear */}
            <button
              onClick={onClearPattern}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
              title="Clear all steps"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Clear</span>
            </button>
          </div>

        </div>

        {/* Step Numbers Header (Counting: 1 & 2 & 3 & 4 &) */}
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[700px] flex flex-col gap-1.5">
            
            {/* Measure Bar Numbers */}
            <div className="flex items-center text-xs font-mono font-bold text-slate-400 pl-28 pr-2">
              {[0, 1, 2, 3].map((quarter) => (
                <div 
                  key={quarter} 
                  className={`flex-1 grid grid-cols-4 text-center py-1 rounded ${
                    quarter % 2 === 0 ? 'bg-slate-900/50' : 'bg-slate-800/30'
                  }`}
                >
                  <span className="text-cyan-400">{quarter + 1}</span>
                  <span className="text-slate-600">e</span>
                  <span className="text-slate-400">&</span>
                  <span className="text-slate-600">a</span>
                </div>
              ))}
            </div>

            {/* Drum Tracks Grid */}
            {TRACK_ORDER.map((track) => {
              const trackSteps = pattern[track.id] || Array(16).fill(false);

              return (
                <div key={track.id} className="flex items-center gap-2">
                  
                  {/* Track Label & Audition Button */}
                  <button
                    onClick={() => audioEngine.playSound(track.id, 0.9)}
                    className="w-26 flex items-center justify-between px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-left transition-colors shrink-0 group"
                    title={`Click to test ${track.label}`}
                  >
                    <span className="text-xs font-bold text-slate-300 group-hover:text-white truncate">
                      {track.label}
                    </span>
                    <div 
                      className="w-2 h-2 rounded-full shrink-0" 
                      style={{ backgroundColor: track.color }}
                    />
                  </button>

                  {/* 16 Step Buttons */}
                  <div className="flex-1 grid grid-cols-16 gap-1 sm:gap-1.5">
                    {Array.from({ length: 16 }).map((_, stepIdx) => {
                      const isActive = trackSteps[stepIdx];
                      const isCurrentStep = isPlaying && currentStep === stepIdx;
                      const isQuarterBeat = stepIdx % 4 === 0;

                      return (
                        <button
                          key={stepIdx}
                          onClick={() => onToggleStep(track.id, stepIdx)}
                          className={`h-9 sm:h-10 rounded-md sm:rounded-lg border transition-all duration-75 relative flex items-center justify-center ${
                            isActive
                              ? 'border-white/80 shadow-md brightness-110'
                              : isQuarterBeat
                              ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-700'
                              : 'bg-slate-900/80 border-slate-800/80 hover:bg-slate-800'
                          } ${
                            isCurrentStep ? 'ring-2 ring-cyan-400 ring-offset-1 ring-offset-slate-950 scale-105 z-10' : ''
                          }`}
                          style={{
                            backgroundColor: isActive ? track.color : undefined,
                          }}
                          title={`Beat ${Math.floor(stepIdx / 4) + 1}.${(stepIdx % 4) + 1} - ${track.label}`}
                        >
                          {/* Indicator dot when active */}
                          {isActive && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                          )}

                          {/* Step Playhead Sweep Highlight */}
                          {isCurrentStep && (
                            <div className="absolute inset-0 bg-white/30 rounded-md sm:rounded-lg pointer-events-none" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                </div>
              );
            })}

          </div>
        </div>

        {/* Educational Tip for Grade 5 */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-start gap-2.5 text-xs text-slate-300">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-400">Rhythm Tip: </span>
            Notice each measure has 4 main beats (1, 2, 3, 4). Try putting the <strong className="text-purple-400">Kick</strong> on 1 & 3, the <strong className="text-red-400">Snare</strong> on 2 & 4, and the <strong className="text-yellow-400">Closed Hat</strong> on all steps to hear how modern songs are structured!
          </div>
        </div>

      </div>
    </div>
  );
};
