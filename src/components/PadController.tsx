import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DrumSoundId, DRUM_PAD_CONFIGS } from '../lib/audioEngine';

interface PadControllerProps {
  onHit: (soundId: DrumSoundId, velocity?: number) => void;
  activePads: Set<string>;
}

export const PadController: React.FC<PadControllerProps> = ({ onHit, activePads }) => {
  return (
    <div className="w-full max-w-4xl mx-auto py-6 px-4 select-none">
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 md:p-8 shadow-2xl">
        
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-slate-300 tracking-wider">RGB PAD CONTROLLER MATRIX</span>
          </div>
          <span className="text-slate-400">Finger Drumming Mode · Touch & Click Sensitive</span>
        </div>

        {/* 4x3 Launchpad Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
          {DRUM_PAD_CONFIGS.map((pad) => {
            const isActive = activePads.has(pad.id);
            return (
              <motion.button
                key={pad.id}
                onPointerDown={(e) => {
                  // Dynamic velocity based on Y coordinate within pad
                  const rect = e.currentTarget.getBoundingClientRect();
                  const relY = (e.clientY - rect.top) / rect.height;
                  // Tapping upper area is full velocity, lower area is softer
                  const vel = 0.5 + (1 - relY) * 0.6;
                  onHit(pad.id, vel);
                }}
                whileTap={{ scale: 0.94 }}
                className={`relative h-28 sm:h-32 rounded-2xl flex flex-col justify-between p-3.5 border text-left transition-all duration-75 overflow-hidden group ${
                  isActive
                    ? 'border-white brightness-125 shadow-lg'
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                }`}
                style={{
                  boxShadow: isActive ? `0 0 30px ${pad.glowColor}` : 'none',
                }}
              >
                {/* Active Strike Flash Overlay */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0.6 }}
                      animate={{ opacity: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-white pointer-events-none"
                    />
                  )}
                </AnimatePresence>

                {/* Accent Corner LED Stripe */}
                <div 
                  className="w-8 h-1 rounded-full mb-1 transition-all"
                  style={{ backgroundColor: pad.color }}
                />

                <div className="flex flex-col z-10 pointer-events-none">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{pad.category}</span>
                  <span className="text-sm md:text-base font-black text-slate-100 truncate">{pad.name}</span>
                </div>

                <div className="flex items-center justify-between z-10 pointer-events-none mt-auto pt-2">
                  <span 
                    className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-black/50 border border-slate-700 text-slate-200"
                  >
                    {pad.keyMap === 'Space' ? 'SPACE' : pad.keyMap}
                  </span>
                  
                  {/* Subtle level meter bars */}
                  <div className="flex gap-0.5 items-end h-3">
                    <div className="w-1 h-1 bg-slate-700 rounded-sm group-hover:bg-slate-500" />
                    <div className="w-1 h-2 bg-slate-700 rounded-sm group-hover:bg-slate-500" />
                    <div className="w-1 h-3 bg-slate-700 rounded-sm group-hover:bg-slate-500" />
                  </div>
                </div>

                {/* Glowing bottom edge */}
                <div 
                  className="absolute inset-x-0 bottom-0 h-1 opacity-60"
                  style={{ backgroundColor: pad.color }}
                />
              </motion.button>
            );
          })}
        </div>

      </div>
    </div>
  );
};
