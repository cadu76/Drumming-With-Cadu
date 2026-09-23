import React, { useEffect, useRef } from 'react';
import { DrumKitType, audioEngine } from '../lib/audioEngine';
import { 
  Volume2, 
  Sparkles, 
  Circle, 
  Square, 
  Play, 
  RefreshCw, 
  Clock, 
  Radio
} from 'lucide-react';

interface SoundModuleProps {
  currentKit: DrumKitType;
  onSelectKit: (kit: DrumKitType) => void;
  bpm: number;
  onChangeBpm: (bpm: number) => void;
  isMetronomeOn: boolean;
  onToggleMetronome: () => void;
  isRecording: boolean;
  recordedHitsCount: number;
  isPlayingRecording: boolean;
  onToggleRecord: () => void;
  onPlayRecording: () => void;
  onClearRecording: () => void;
  masterVolume: number;
  onChangeMasterVolume: (vol: number) => void;
  reverbAmount: number;
  onChangeReverb: (val: number) => void;
  velocityMode: 'dynamic' | 'fixed';
  onToggleVelocityMode: () => void;
  lastHitName: string;
}

export const SoundModule: React.FC<SoundModuleProps> = ({
  currentKit,
  onSelectKit,
  bpm,
  onChangeBpm,
  isMetronomeOn,
  onToggleMetronome,
  isRecording,
  recordedHitsCount,
  isPlayingRecording,
  onToggleRecord,
  onPlayRecording,
  onClearRecording,
  masterVolume,
  onChangeMasterVolume,
  velocityMode,
  onToggleVelocityMode,
  lastHitName,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tapTimesRef = useRef<number[]>([]);

  // Real-time Web Audio Oscilloscope Canvas
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = audioEngine.analyser;
    const bufferLength = analyser ? analyser.frequencyBinCount : 128;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameId = requestAnimationFrame(draw);

      const width = canvas.width;
      const height = canvas.height;

      // Dark CRT screen background with scanlines
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, width, height);

      // Grid lines
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      if (!analyser) {
        // Flat line idle state
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        return;
      }

      analyser.getByteTimeDomainData(dataArray);

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#38bdf8';
      ctx.shadowColor = '#0284c7';
      ctx.shadowBlur = 6;
      ctx.beginPath();

      const sliceWidth = width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(width, height / 2);
      ctx.stroke();
      ctx.shadowBlur = 0; // reset shadow
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Tap Tempo calculation
  const handleTapTempo = () => {
    const now = performance.now();
    const taps = tapTimesRef.current;
    
    // Reset if last tap was more than 2.5 seconds ago
    if (taps.length > 0 && now - taps[taps.length - 1] > 2500) {
      taps.length = 0;
    }

    taps.push(now);

    if (taps.length > 4) {
      taps.shift();
    }

    if (taps.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < taps.length; i++) {
        intervals.push(taps[i] - taps[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      if (calculatedBpm >= 40 && calculatedBpm <= 240) {
        onChangeBpm(calculatedBpm);
      }
    }
  };

  const kits: { id: DrumKitType; name: string; tag: string }[] = [
    { id: 'rock', name: 'Studio Rock', tag: 'Acoustic Punch' },
    { id: 'electronic', name: '808 Electro', tag: 'Deep Sub & Snap' },
    { id: 'cyber', name: 'Cyber Synth', tag: 'Futuristic Lasers' },
    { id: 'jazz', name: 'Jazz & Wood', tag: 'Warm Resonant' },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5 shadow-2xl flex flex-col gap-4 text-slate-100">
      
      {/* Top Section: LCD Matrix & Kit Selector */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        
        {/* LCD Screen Display */}
        <div className="md:col-span-5 bg-black/90 border border-cyan-900/60 rounded-xl p-3 relative overflow-hidden shadow-inner font-mono">
          <div className="flex items-center justify-between text-xs text-cyan-400 mb-1">
            <span className="tracking-widest flex items-center gap-1.5 font-bold">
              <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
              DIGITAL SOUND MODULE
            </span>
            <span className="tabular-nums text-cyan-300 font-semibold">{bpm} BPM · 4/4</span>
          </div>

          <div className="grid grid-cols-2 gap-2 my-2 text-xs">
            <div>
              <div className="text-slate-400 text-[10px] tracking-wide">ACTIVE KIT</div>
              <div className="text-emerald-400 font-bold uppercase truncate">{currentKit} KIT</div>
            </div>
            <div>
              <div className="text-slate-400 text-[10px] tracking-wide">TRIGGER SENSOR</div>
              <div className="text-amber-300 font-bold truncate">
                {lastHitName || 'WAITING STRIKE'}
              </div>
            </div>
          </div>

          {/* Real-time Oscilloscope Canvas */}
          <div className="rounded border border-cyan-950 overflow-hidden mt-1">
            <canvas 
              ref={canvasRef} 
              width={260} 
              height={52} 
              className="w-full h-12 block bg-black"
            />
          </div>
        </div>

        {/* Kit Presets Segmented Buttons */}
        <div className="md:col-span-7 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 tracking-wider">SELECT DRUM KIT</span>
            <span className="text-xs text-slate-400">Zero Latency Web Audio</span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {kits.map((kit) => (
              <button
                key={kit.id}
                onClick={() => onSelectKit(kit.id)}
                className={`flex flex-col text-left p-2.5 rounded-lg border transition-all ${
                  currentKit === kit.id
                    ? 'bg-cyan-950/70 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700/60 hover:text-white'
                }`}
              >
                <span className="font-bold text-xs truncate">{kit.name}</span>
                <span className="text-[10px] text-slate-400 truncate mt-0.5">{kit.tag}</span>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Bottom Section: Controls, Metronome & Recorder Studio */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2 border-t border-slate-800 items-center text-xs">
        
        {/* Metronome & Tap Tempo */}
        <div className="md:col-span-5 flex items-center gap-3 bg-slate-800/60 p-2 rounded-xl border border-slate-700/60">
          <button
            onClick={onToggleMetronome}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold transition-all ${
              isMetronomeOn
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            title="Toggle Metronome Click"
          >
            <Clock className={`w-3.5 h-3.5 ${isMetronomeOn ? 'animate-spin' : ''}`} />
            <span>CLICK</span>
          </button>

          {/* BPM Slider */}
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex justify-between items-center text-[10px] text-slate-400">
              <span>TEMPO</span>
              <span className="font-mono font-bold text-slate-200 tabular-nums">{bpm} BPM</span>
            </div>
            <input
              type="range"
              min="50"
              max="200"
              value={bpm}
              onChange={(e) => onChangeBpm(Number(e.target.value))}
              className="w-full accent-amber-500 h-1.5 bg-slate-700 rounded cursor-pointer"
            />
          </div>

          {/* Tap Tempo Button */}
          <button
            onClick={handleTapTempo}
            className="px-2.5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-bold active:scale-95 transition-transform"
            title="Tap repeatedly to set tempo"
          >
            TAP
          </button>
        </div>

        {/* Recording Studio Controls */}
        <div className="md:col-span-4 flex items-center gap-2 bg-slate-800/60 p-2 rounded-xl border border-slate-700/60">
          <button
            onClick={onToggleRecord}
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg font-bold transition-all ${
              isRecording
                ? 'bg-red-600 text-white animate-pulse shadow-md shadow-red-600/30'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {isRecording ? <Square className="w-3.5 h-3.5 fill-current" /> : <Circle className="w-3.5 h-3.5 fill-current text-red-400" />}
            <span>{isRecording ? 'STOP' : 'REC'}</span>
          </button>

          <button
            onClick={onPlayRecording}
            disabled={recordedHitsCount === 0 || isRecording}
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg font-bold transition-all ${
              isPlayingRecording
                ? 'bg-emerald-600 text-white animate-pulse'
                : recordedHitsCount > 0
                ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
            }`}
            title="Play back your recorded drumming"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>PLAY</span>
          </button>

          {recordedHitsCount > 0 && (
            <button
              onClick={onClearRecording}
              className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
              title="Clear recorded take"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}

          <span className="text-[11px] text-slate-400 font-mono tabular-nums ml-auto">
            {recordedHitsCount} {recordedHitsCount === 1 ? 'hit' : 'hits'}
          </span>
        </div>

        {/* Volume & Velocity Trigger Mode */}
        <div className="md:col-span-3 flex items-center gap-3 bg-slate-800/60 p-2 rounded-xl border border-slate-700/60">
          <div className="flex-1 flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={masterVolume}
              onChange={(e) => onChangeMasterVolume(Number(e.target.value))}
              className="w-full accent-cyan-400 h-1.5 bg-slate-700 rounded cursor-pointer"
              title={`Master Volume: ${Math.round(masterVolume * 100)}%`}
            />
          </div>

          <button
            onClick={onToggleVelocityMode}
            className={`px-2 py-1.5 rounded text-[10px] font-bold border transition-colors ${
              velocityMode === 'dynamic'
                ? 'bg-cyan-950 border-cyan-400 text-cyan-300'
                : 'bg-slate-700 border-slate-600 text-slate-400'
            }`}
            title="Dynamic velocity varies volume based on strike position"
          >
            <span className="flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              {velocityMode === 'dynamic' ? 'TOUCH VEL' : 'FIXED VEL'}
            </span>
          </button>
        </div>

      </div>

    </div>
  );
};
