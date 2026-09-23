import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DrumSoundId, audioEngine } from '../lib/audioEngine';

interface DrumKitVisualProps {
  onHit: (soundId: DrumSoundId, velocity?: number) => void;
  activePads: Set<string>;
}

export const DrumKitVisual: React.FC<DrumKitVisualProps> = ({ onHit, activePads }) => {
  const [cymbalWobble, setCymbalWobble] = useState<{ [key: string]: number }>({});

  const triggerHit = (
    soundId: DrumSoundId, 
    e?: React.MouseEvent | React.TouchEvent, 
    customVel?: number
  ) => {
    let velocity = customVel ?? 1.0;

    // If dynamic velocity is enabled, compute velocity based on hit location
    if (e && 'clientX' in e && e.currentTarget) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dist = Math.hypot(e.clientX - centerX, e.clientY - centerY);
      const maxDist = rect.width / 2;
      // Hitting near center is punchier, edge is softer
      const factor = 1 - Math.min(1, dist / maxDist);
      velocity = 0.65 + factor * 0.45;
    }

    onHit(soundId, velocity);

    // Trigger cymbal wobble physics
    if (soundId === 'crash' || soundId === 'ride' || soundId.startsWith('hihat')) {
      setCymbalWobble((prev) => ({
        ...prev,
        [soundId]: (prev[soundId] || 0) + 1,
      }));
    }
  };

  const handleChoke = (type: 'crash' | 'hihat', e: React.MouseEvent) => {
    e.stopPropagation();
    audioEngine.chokeCymbal(type);
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto py-6 px-3 select-none">
      
      {/* Background Rack Frame (Sleek Matte Black Anodized Aluminum Tubes) */}
      <div className="relative bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 rounded-3xl p-6 md:p-8 border border-slate-800 shadow-2xl overflow-hidden min-h-[520px] flex flex-col justify-between">
        
        {/* Subtle hardware grid ambience */}
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#38bdf8 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />

        {/* Rack Hardware Pipes / Clamps (SVG overlay) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30 stroke-slate-600" strokeWidth="6" strokeLinecap="round">
          {/* Left cymbal boom arm */}
          <line x1="20%" y1="10%" x2="35%" y2="40%" />
          {/* Horizontal crossbar */}
          <line x1="25%" y1="40%" x2="75%" y2="40%" strokeWidth="8" stroke="#334155" />
          {/* Right cymbal boom arm */}
          <line x1="80%" y1="12%" x2="65%" y2="40%" />
          {/* Vertical rack legs */}
          <line x1="28%" y1="40%" x2="25%" y2="92%" strokeWidth="8" stroke="#334155" />
          <line x1="72%" y1="40%" x2="75%" y2="92%" strokeWidth="8" stroke="#334155" />
        </svg>

        {/* Top Row: Cymbals (Crash, Hi-Hat, Cowbell, Ride) */}
        <div className="relative z-10 flex flex-wrap items-start justify-around gap-4 mb-4">
          
          {/* CRASH CYMBAL */}
          <div className="flex flex-col items-center">
            <motion.div
              key={`crash-${cymbalWobble['crash'] || 0}`}
              animate={activePads.has('crash') ? { rotateX: [0, -15, 12, -8, 4, 0] } : {}}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              onClick={(e) => triggerHit('crash', e)}
              className="relative w-32 h-32 md:w-36 md:h-36 rounded-full cursor-pointer flex items-center justify-center shadow-xl group"
              style={{
                background: 'radial-gradient(circle at 35% 35%, #fde047 0%, #ca8a04 45%, #854d0e 85%, #451a03 100%)',
                boxShadow: activePads.has('crash') 
                  ? '0 0 35px rgba(250, 204, 21, 0.7), inset 0 0 15px rgba(255, 255, 255, 0.8)' 
                  : '0 8px 24px rgba(0,0,0,0.5)',
              }}
            >
              {/* Concentric Lathed Sound Grooves */}
              <div className="absolute inset-2 rounded-full border border-yellow-200/30 pointer-events-none" />
              <div className="absolute inset-5 rounded-full border border-yellow-100/20 pointer-events-none" />
              <div className="absolute inset-9 rounded-full border border-yellow-300/30 pointer-events-none" />

              {/* Cymbal Bell */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-700 via-yellow-400 to-yellow-200 shadow-md border border-yellow-200/40 flex items-center justify-center">
                <span className="font-mono text-[10px] font-bold text-yellow-950">1</span>
              </div>

              {/* Choke Strip Button */}
              <button
                onClick={(e) => handleChoke('crash', e)}
                className="absolute bottom-1 bg-slate-900/80 hover:bg-red-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full border border-yellow-500/40 transition-colors pointer-events-auto"
                title="Grab cymbal edge to choke sound"
              >
                CHOKE
              </button>
            </motion.div>
            <span className="text-xs font-bold text-yellow-400 mt-1">Crash [1]</span>
          </div>

          {/* HI-HAT CYMBAL WITH OPEN / CLOSED SPLIT */}
          <div className="flex flex-col items-center">
            <div className="relative flex items-center gap-2">
              {/* Closed Hi-Hat Pad */}
              <motion.div
                onClick={(e) => triggerHit('hihat-closed', e)}
                whileTap={{ scale: 0.95 }}
                className={`w-28 h-28 md:w-32 md:h-32 rounded-full cursor-pointer flex flex-col items-center justify-center relative shadow-lg ${
                  activePads.has('hihat-closed') ? 'ring-4 ring-yellow-400 brightness-125' : ''
                }`}
                style={{
                  background: 'radial-gradient(circle at 40% 40%, #fef08a 0%, #eab308 50%, #713f12 100%)',
                }}
              >
                <div className="w-8 h-8 rounded-full bg-yellow-300 border border-yellow-500 shadow-inner flex items-center justify-center mb-1">
                  <span className="font-mono text-[10px] font-bold text-yellow-950">3</span>
                </div>
                <span className="text-[10px] font-black text-yellow-950 tracking-wider">CLOSED</span>
              </motion.div>

              {/* Open Hi-Hat Side Trigger */}
              <motion.button
                onClick={(e) => triggerHit('hihat-open', e)}
                whileTap={{ scale: 0.93 }}
                className={`w-16 h-24 md:w-18 md:h-28 rounded-r-full cursor-pointer flex flex-col items-center justify-center border-l-2 border-yellow-950/40 shadow-md ${
                  activePads.has('hihat-open') ? 'ring-4 ring-amber-400 brightness-125' : ''
                }`}
                style={{
                  background: 'radial-gradient(circle at 20% 50%, #fef08a 0%, #d97706 60%, #451a03 100%)',
                }}
              >
                <span className="font-mono text-[10px] font-bold text-yellow-950">2</span>
                <span className="text-[9px] font-black text-yellow-950 -rotate-90 mt-1">OPEN</span>
              </motion.button>
            </div>
            <span className="text-xs font-bold text-yellow-400 mt-1">Hi-Hat [2/3]</span>
          </div>

          {/* PERCUSSION: COWBELL */}
          <div className="flex flex-col items-center">
            <motion.div
              onClick={(e) => triggerHit('cowbell', e)}
              whileTap={{ scale: 0.94 }}
              className={`w-18 h-26 md:w-20 md:h-30 rounded-t-lg rounded-b-2xl cursor-pointer flex flex-col items-center justify-center shadow-lg border-2 border-slate-600 ${
                activePads.has('cowbell') ? 'ring-4 ring-slate-300 brightness-125 bg-slate-500' : 'bg-slate-700'
              }`}
              style={{
                background: 'linear-gradient(135deg, #475569 0%, #1e293b 80%, #0f172a 100%)',
              }}
            >
              <span className="font-mono text-[11px] font-bold text-slate-300">5</span>
              <span className="text-[9px] font-bold text-slate-300 tracking-wider mt-1">COWBELL</span>
            </motion.div>
            <span className="text-xs font-bold text-slate-400 mt-1">Cowbell [5]</span>
          </div>

          {/* RIDE CYMBAL (DUAL ZONE: BOW & BELL) */}
          <div className="flex flex-col items-center">
            <motion.div
              key={`ride-${cymbalWobble['ride'] || 0}`}
              animate={activePads.has('ride') || activePads.has('ride-bell') ? { rotateX: [0, -12, 10, -6, 2, 0] } : {}}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              onClick={(e) => triggerHit('ride', e)}
              className="relative w-34 h-34 md:w-40 md:h-40 rounded-full cursor-pointer flex items-center justify-center shadow-xl"
              style={{
                background: 'radial-gradient(circle at 45% 45%, #fdba74 0%, #ea580c 45%, #9a3412 80%, #431407 100%)',
                boxShadow: activePads.has('ride') 
                  ? '0 0 35px rgba(249, 115, 22, 0.7), inset 0 0 15px rgba(255, 255, 255, 0.8)' 
                  : '0 8px 24px rgba(0,0,0,0.5)',
              }}
            >
              <div className="absolute inset-3 rounded-full border border-orange-200/20 pointer-events-none" />
              <div className="absolute inset-7 rounded-full border border-orange-300/20 pointer-events-none" />

              {/* Ride Bell Zone */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHit('ride-bell', e, 1.2);
                }}
                className={`w-12 h-12 rounded-full bg-gradient-to-tr from-amber-600 via-amber-300 to-amber-100 shadow-md border border-amber-200/40 flex flex-col items-center justify-center z-10 transition-transform active:scale-95 ${
                  activePads.has('ride-bell') ? 'ring-4 ring-amber-200 brightness-125' : ''
                }`}
                title="Strike Ride Bell"
              >
                <span className="font-mono text-[9px] font-black text-amber-950">BELL</span>
              </button>

              <span className="absolute bottom-2 font-mono text-[10px] font-bold text-amber-950 bg-amber-400/80 px-2 py-0.5 rounded-full">
                BOW [4]
              </span>
            </motion.div>
            <span className="text-xs font-bold text-orange-400 mt-1">Ride Cymbal [4]</span>
          </div>

        </div>

        {/* Middle Row: Toms (High Tom & Mid Tom mounted, plus Hand Clap) */}
        <div className="relative z-10 flex items-center justify-center gap-6 md:gap-10 my-2">
          
          {/* HIGH TOM */}
          <div className="flex flex-col items-center">
            <motion.div
              onClick={(e) => triggerHit('tom-high', e)}
              whileTap={{ scale: 0.94 }}
              className={`relative w-28 h-28 md:w-32 md:h-32 rounded-full cursor-pointer flex items-center justify-center border-4 border-slate-700 shadow-2xl ${
                activePads.has('tom-high') ? 'ring-4 ring-sky-400 shadow-[0_0_30px_rgba(56,189,248,0.5)]' : ''
              }`}
              style={{
                background: 'radial-gradient(circle at 45% 45%, #38bdf8 0%, #0284c7 60%, #0c4a6e 100%)',
              }}
            >
              {/* Chrome Tension Rim */}
              <div className="absolute inset-1 rounded-full border border-sky-300/40 pointer-events-none" />
              <div className="w-16 h-16 rounded-full bg-sky-950/40 border border-sky-400/30 flex flex-col items-center justify-center pointer-events-none">
                <span className="font-mono text-sm font-bold text-white">Q</span>
                <span className="text-[9px] font-bold text-sky-200 uppercase">Hi Tom</span>
              </div>
            </motion.div>
          </div>

          {/* MID TOM */}
          <div className="flex flex-col items-center">
            <motion.div
              onClick={(e) => triggerHit('tom-mid', e)}
              whileTap={{ scale: 0.94 }}
              className={`relative w-30 h-30 md:w-34 md:h-34 rounded-full cursor-pointer flex items-center justify-center border-4 border-slate-700 shadow-2xl ${
                activePads.has('tom-mid') ? 'ring-4 ring-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.5)]' : ''
              }`}
              style={{
                background: 'radial-gradient(circle at 45% 45%, #60a5fa 0%, #2563eb 60%, #1e3a8a 100%)',
              }}
            >
              <div className="absolute inset-1 rounded-full border border-blue-300/40 pointer-events-none" />
              <div className="w-18 h-18 rounded-full bg-blue-950/40 border border-blue-400/30 flex flex-col items-center justify-center pointer-events-none">
                <span className="font-mono text-sm font-bold text-white">W</span>
                <span className="text-[9px] font-bold text-blue-200 uppercase">Mid Tom</span>
              </div>
            </motion.div>
          </div>

          {/* HAND CLAP TRIGGER */}
          <div className="flex flex-col items-center">
            <motion.div
              onClick={(e) => triggerHit('clap', e)}
              whileTap={{ scale: 0.93 }}
              className={`relative w-16 h-16 md:w-20 md:h-20 rounded-2xl cursor-pointer flex flex-col items-center justify-center border-2 border-pink-500 shadow-lg ${
                activePads.has('clap') ? 'ring-4 ring-pink-400 bg-pink-500 text-white' : 'bg-pink-950/60 text-pink-300'
              }`}
            >
              <span className="font-mono text-xs font-bold">R</span>
              <span className="text-[9px] font-bold">CLAP</span>
            </motion.div>
            <span className="text-[11px] font-bold text-pink-400 mt-1">Clap [R]</span>
          </div>

        </div>

        {/* Bottom Row: Snare Drum (Dual Zone), Kick Drum (with Spring Beater), and Floor Tom */}
        <div className="relative z-10 flex flex-wrap items-end justify-around gap-6 pt-4">
          
          {/* DUAL-ZONE SNARE DRUM (Center Mesh & Outer Rimshot) */}
          <div className="flex flex-col items-center">
            <div className="relative flex items-center justify-center">
              {/* Outer Rim Trigger */}
              <div
                onClick={(e) => triggerHit('snare-rim', e)}
                className={`relative w-38 h-38 md:w-44 md:h-44 rounded-full p-2.5 cursor-pointer flex items-center justify-center transition-all ${
                  activePads.has('snare-rim') ? 'ring-4 ring-red-400 bg-red-800' : 'bg-slate-700 hover:bg-slate-600'
                }`}
                style={{
                  boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                }}
                title="Click outer edge for Rimshot [S]"
              >
                {/* Tension Lugs on Chrome Rim */}
                <div className="absolute top-1 w-3 h-2 bg-slate-300 rounded-sm" />
                <div className="absolute bottom-1 w-3 h-2 bg-slate-300 rounded-sm" />
                <div className="absolute left-1 w-2 h-3 bg-slate-300 rounded-sm" />
                <div className="absolute right-1 w-2 h-3 bg-slate-300 rounded-sm" />

                {/* Inner Snare Mesh Head */}
                <motion.div
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHit('snare', e);
                  }}
                  whileTap={{ scale: 0.94 }}
                  className={`w-full h-full rounded-full cursor-pointer flex flex-col items-center justify-center relative overflow-hidden ${
                    activePads.has('snare') ? 'ring-4 ring-red-500 shadow-[0_0_35px_rgba(239,68,68,0.7)]' : ''
                  }`}
                  style={{
                    background: 'radial-gradient(circle at 45% 45%, #ffffff 0%, #f87171 40%, #dc2626 75%, #7f1d1d 100%)',
                  }}
                >
                  {/* Mesh head texture weave overlay */}
                  <div 
                    className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                      backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
                      backgroundSize: '4px 4px'
                    }}
                  />

                  {/* Strike ripple */}
                  <AnimatePresence>
                    {activePads.has('snare') && (
                      <motion.div
                        initial={{ scale: 0.2, opacity: 1 }}
                        animate={{ scale: 1.5, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 rounded-full border-4 border-white pointer-events-none"
                      />
                    )}
                  </AnimatePresence>

                  <span className="font-mono text-base font-black text-slate-950 z-10">A</span>
                  <span className="text-[11px] font-black text-slate-950 tracking-wider z-10">SNARE</span>
                </motion.div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2 text-xs">
              <span className="font-bold text-red-400">Center [A]</span>
              <span className="text-slate-500">·</span>
              <span className="font-bold text-red-300">Rimshot [S]</span>
            </div>
          </div>

          {/* BASS KICK DRUM TOWER & SPRING PEDAL */}
          <div className="flex flex-col items-center">
            <div className="relative flex flex-col items-center">
              
              {/* Upright Bass Drum Head */}
              <motion.div
                onClick={(e) => triggerHit('kick', e)}
                whileTap={{ scale: 0.95 }}
                className={`relative w-36 h-36 md:w-42 md:h-42 rounded-full cursor-pointer flex flex-col items-center justify-center border-4 border-slate-800 shadow-2xl ${
                  activePads.has('kick') ? 'ring-6 ring-purple-500 shadow-[0_0_40px_rgba(168,85,247,0.7)]' : ''
                }`}
                style={{
                  background: 'radial-gradient(circle at 50% 50%, #c084fc 0%, #9333ea 50%, #581c87 85%, #2e1065 100%)',
                }}
              >
                {/* Resonant Rings */}
                <div className="absolute inset-3 rounded-full border border-purple-300/30 pointer-events-none" />
                <div className="absolute inset-8 rounded-full border border-purple-200/20 pointer-events-none" />

                <span className="font-mono text-xl font-black text-white drop-shadow-md">SPACE</span>
                <span className="text-xs font-black text-purple-200 tracking-wider mt-0.5">BASS KICK</span>

                {/* Animated Spring Beater */}
                <motion.div
                  animate={activePads.has('kick') ? { y: [-15, 0], scale: [0.8, 1.2, 1] } : { y: 0 }}
                  transition={{ duration: 0.18 }}
                  className="absolute -bottom-4 w-6 h-10 bg-slate-300 rounded-full border-2 border-slate-900 shadow-lg pointer-events-none"
                />
              </motion.div>

              {/* Pedal Base Plate */}
              <div 
                onClick={(e) => triggerHit('kick', e)}
                className="w-24 h-12 bg-gradient-to-b from-slate-700 to-slate-900 border-2 border-slate-600 rounded-b-xl mt-2 cursor-pointer flex items-center justify-center shadow-lg active:translate-y-0.5 transition-transform"
              >
                <div className="w-16 h-2 bg-purple-500/60 rounded-full" />
              </div>
            </div>
            <span className="text-xs font-bold text-purple-400 mt-1">Kick Drum [Spacebar]</span>
          </div>

          {/* FLOOR TOM (Deep low pitch) */}
          <div className="flex flex-col items-center">
            <motion.div
              onClick={(e) => triggerHit('tom-low', e)}
              whileTap={{ scale: 0.94 }}
              className={`relative w-36 h-36 md:w-42 md:h-42 rounded-full cursor-pointer flex items-center justify-center border-4 border-slate-700 shadow-2xl ${
                activePads.has('tom-low') ? 'ring-4 ring-indigo-500 shadow-[0_0_35px_rgba(99,102,241,0.6)]' : ''
              }`}
              style={{
                background: 'radial-gradient(circle at 45% 45%, #818cf8 0%, #4f46e5 60%, #312e81 100%)',
              }}
            >
              <div className="absolute inset-2 rounded-full border border-indigo-300/40 pointer-events-none" />
              <div className="w-20 h-20 rounded-full bg-indigo-950/40 border border-indigo-400/30 flex flex-col items-center justify-center pointer-events-none">
                <span className="font-mono text-base font-bold text-white">E</span>
                <span className="text-[10px] font-bold text-indigo-200 uppercase">Floor Tom</span>
              </div>
            </motion.div>
            <span className="text-xs font-bold text-indigo-400 mt-2">Floor Tom [E]</span>
          </div>

        </div>

      </div>
    </div>
  );
};
