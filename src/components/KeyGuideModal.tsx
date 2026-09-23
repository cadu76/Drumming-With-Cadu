import React from 'react';
import { X, Keyboard, Sparkles, BookOpen, Music } from 'lucide-react';
import { DRUM_PAD_CONFIGS } from '../lib/audioEngine';

interface KeyGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyGuideModal: React.FC<KeyGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-3xl p-6 shadow-2xl relative text-slate-100 max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-cyan-950/80 border border-cyan-500/40 rounded-xl text-cyan-400">
            <Keyboard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-display">Drummer's Keyboard & Quick Guide</h2>
            <p className="text-xs text-slate-400">Play like a real drummer using your keyboard or touch screen</p>
          </div>
        </div>

        {/* Key Mappings Grid */}
        <div className="mb-6">
          <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Music className="w-3.5 h-3.5" />
            <span>Keyboard Shortcuts Map</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {DRUM_PAD_CONFIGS.map((pad) => (
              <div 
                key={pad.id}
                className="flex items-center justify-between p-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl"
              >
                <div className="flex items-center gap-2 truncate">
                  <div 
                    className="w-2.5 h-2.5 rounded-full shrink-0" 
                    style={{ backgroundColor: pad.color }}
                  />
                  <span className="font-semibold text-slate-200 truncate">{pad.name}</span>
                </div>
                <kbd className="px-2 py-0.5 font-mono text-[11px] font-bold bg-slate-950 border border-slate-700 text-cyan-300 rounded shadow-sm">
                  {pad.keyMap === 'Space' ? 'SPACE' : pad.keyMap}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        {/* Grade 5 Music Curriculum Tips */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 flex flex-col gap-2.5">
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Grade 5 Drummer Secret: The "Backbeat"</span>
          </h3>
          <p className="leading-relaxed">
            In almost every rock and pop song in the world, the drum groove follows a 4-beat rhythm pattern:
          </p>
          <div className="grid grid-cols-4 gap-2 text-center font-mono my-1">
            <div className="bg-purple-950/60 border border-purple-800 rounded-lg p-2">
              <div className="text-purple-300 font-black text-sm">Beat 1</div>
              <div className="text-[10px] text-slate-400">KICK [Space]</div>
            </div>
            <div className="bg-red-950/60 border border-red-800 rounded-lg p-2">
              <div className="text-red-300 font-black text-sm">Beat 2</div>
              <div className="text-[10px] text-slate-400">SNARE [A]</div>
            </div>
            <div className="bg-purple-950/60 border border-purple-800 rounded-lg p-2">
              <div className="text-purple-300 font-black text-sm">Beat 3</div>
              <div className="text-[10px] text-slate-400">KICK [Space]</div>
            </div>
            <div className="bg-red-950/60 border border-red-800 rounded-lg p-2">
              <div className="text-red-300 font-black text-sm">Beat 4</div>
              <div className="text-[10px] text-slate-400">SNARE [A]</div>
            </div>
          </div>
          <p className="text-slate-400">
            Keep your right hand tapping the <strong className="text-yellow-400">Hi-Hat [Key 3]</strong> steadily, and you've got a genuine rock beat!
          </p>
        </div>

        {/* Pro features tip */}
        <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tip: Grab the Crash cymbal edge or click "Choke" to instantly silence it!</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition-colors"
          >
            Got it!
          </button>
        </div>

      </div>
    </div>
  );
};
