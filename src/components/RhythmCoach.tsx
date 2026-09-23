import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, RotateCcw, Trophy, Award, Sparkles, CheckCircle2, ChevronRight } from 'lucide-react';
import { COACH_LESSONS } from '../lib/presets';
import { CoachLesson, CoachNote } from '../types/drums';
import { audioEngine, DrumSoundId } from '../lib/audioEngine';

interface RhythmCoachProps {
  onHit: (soundId: DrumSoundId, velocity?: number) => void;
  activePads: Set<string>;
}

export const RhythmCoach: React.FC<RhythmCoachProps> = ({ onHit, activePads }) => {
  const [selectedLessonIndex, setSelectedLessonIndex] = useState<number>(0);
  const currentLesson: CoachLesson = COACH_LESSONS[selectedLessonIndex];

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [perfectCount, setPerfectCount] = useState<number>(0);
  const [goodCount, setGoodCount] = useState<number>(0);
  const [missCount, setMissCount] = useState<number>(0);
  const [feedback, setFeedback] = useState<{ text: string; color: string } | null>(null);
  const [lessonFinished, setLessonFinished] = useState<boolean>(false);

  // Lesson runtime notes state
  const [liveNotes, setLiveNotes] = useState<CoachNote[]>([]);
  const currentBeatRef = useRef<number>(-2); // 2 beats count-in
  const startTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);

  // Reset lesson state
  const resetLesson = useCallback(() => {
    setIsPlaying(false);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setPerfectCount(0);
    setGoodCount(0);
    setMissCount(0);
    setFeedback(null);
    setLessonFinished(false);
    setLiveNotes(
      currentLesson.notes.map((n, i) => ({
        id: `${i}-${n.soundId}-${n.beat}`,
        soundId: n.soundId,
        time: n.beat,
        hit: false,
      }))
    );
  }, [currentLesson]);

  useEffect(() => {
    resetLesson();
  }, [selectedLessonIndex, resetLesson]);

  // Start Lesson
  const startLesson = () => {
    audioEngine.init();
    resetLesson();
    setIsPlaying(true);
    startTimeRef.current = performance.now();
    currentBeatRef.current = -2; // 2 beats count-in
  };

  // Main game animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const secondsPerBeat = 60 / currentLesson.bpm;
    let lastMetronomeBeat = -3;

    const loop = (timestamp: number) => {
      const elapsedSeconds = (timestamp - startTimeRef.current) / 1000;
      // Start with a 2-beat count in
      const currentBeat = (elapsedSeconds / secondsPerBeat) - 2;
      currentBeatRef.current = currentBeat;

      // Play count-in clicks and metronome
      const intBeat = Math.floor(currentBeat);
      if (intBeat > lastMetronomeBeat && intBeat <= currentLesson.durationBeats) {
        lastMetronomeBeat = intBeat;
        const isDownbeat = intBeat % 4 === 0;
        audioEngine.playMetronomeClick(isDownbeat);
      }

      // Check for missed notes
      setLiveNotes((prevNotes) =>
        prevNotes.map((note) => {
          if (!note.hit && note.time < currentBeat - 0.25) {
            // Note scrolled past target line without hit
            setMissCount((m) => m + 1);
            setCombo(0);
            setFeedback({ text: 'MISS', color: 'text-red-400' });
            return { ...note, hit: true, accuracy: 'miss' };
          }
          return note;
        })
      );

      // Check if song finished
      if (currentBeat > currentLesson.durationBeats + 1) {
        setIsPlaying(false);
        setLessonFinished(true);
        return;
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, currentLesson]);

  // Handle strike from user (via keyboard or drum pad click)
  const handleUserStrike = useCallback(
    (soundId: DrumSoundId) => {
      if (!isPlaying) return;

      const targetSoundId = soundId === 'hihat-open' ? 'hihat-closed' : soundId;
      const currentBeat = currentBeatRef.current;

      // Find closest unhit note in matching lane
      let bestNoteIndex = -1;
      let minDelta = Infinity;

      liveNotes.forEach((note, idx) => {
        if (!note.hit && note.soundId === targetSoundId) {
          const delta = Math.abs(note.time - currentBeat);
          if (delta < minDelta) {
            minDelta = delta;
            bestNoteIndex = idx;
          }
        }
      });

      // Accuracy evaluation (in beats)
      // At 90 BPM, 1 beat is 666ms. 0.12 beat is ~80ms (Perfect), 0.25 beat is ~166ms (Good)
      if (bestNoteIndex !== -1 && minDelta <= 0.25) {
        const isPerfect = minDelta <= 0.12;
        const pts = isPerfect ? 100 : 50;

        setLiveNotes((prev) => {
          const updated = [...prev];
          updated[bestNoteIndex] = {
            ...updated[bestNoteIndex],
            hit: true,
            accuracy: isPerfect ? 'perfect' : 'good',
          };
          return updated;
        });

        if (isPerfect) {
          setPerfectCount((p) => p + 1);
          setFeedback({ text: 'PERFECT! 🎯', color: 'text-amber-300' });
        } else {
          setGoodCount((g) => g + 1);
          setFeedback({ text: 'GOOD! ⚡', color: 'text-emerald-400' });
        }

        setCombo((c) => {
          const newC = c + 1;
          setMaxCombo((m) => Math.max(m, newC));
          return newC;
        });

        setScore((s) => s + pts * (1 + Math.floor(combo / 5) * 0.2));
      }
    },
    [isPlaying, liveNotes, combo]
  );

  // Sync with App's global onHit triggers
  useEffect(() => {
    activePads.forEach((padId) => {
      handleUserStrike(padId as DrumSoundId);
    });
  }, [activePads, handleUserStrike]);

  const totalNotes = currentLesson.notes.length;
  const hitSuccessCount = perfectCount + goodCount;
  const accuracyPercent = totalNotes > 0 ? Math.round((hitSuccessCount / totalNotes) * 100) : 0;

  return (
    <div className="w-full max-w-5xl mx-auto py-6 px-3 select-none">
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 md:p-8 shadow-2xl flex flex-col gap-6">
        
        {/* Lesson Header & Selector Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-amber-400 tracking-wider">GRADE 5 RHYTHM COACH</span>
              <span className="text-slate-500">·</span>
              <span className="text-xs text-slate-400">{currentLesson.level} Level</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-100">{currentLesson.title}</h2>
          </div>

          {/* Lesson Switcher Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
            {COACH_LESSONS.map((lesson, idx) => (
              <button
                key={lesson.id}
                onClick={() => setSelectedLessonIndex(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedLessonIndex === idx
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Lesson {idx + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Lesson Educational Tip Callout */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-start gap-3 text-xs md:text-sm text-slate-300">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-slate-100 mb-1">{currentLesson.description}</div>
            <p className="text-slate-400 leading-relaxed">{currentLesson.educationalTip}</p>
          </div>
        </div>

        {/* Score & Combo HUD */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">SCORE</span>
            <span className="text-xl font-bold font-mono text-amber-400 tabular-nums">
              {Math.round(score)}
            </span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">COMBO STREAK</span>
            <span className="text-xl font-bold font-mono text-cyan-400 tabular-nums">
              {combo}x
            </span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">PERFECT HITS</span>
            <span className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
              {perfectCount}
            </span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">RHYTHM ACCURACY</span>
            <span className="text-xl font-bold font-mono text-purple-400 tabular-nums">
              {accuracyPercent}%
            </span>
          </div>
        </div>

        {/* Rhythm Game Highway Canvas Area */}
        <div className="relative h-64 md:h-72 bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-inner flex flex-col justify-end">
          
          {/* Lanes Background (Hi-Hat, Snare, Kick) */}
          <div className="absolute inset-0 grid grid-cols-3 divide-x divide-slate-800 pointer-events-none">
            
            {/* Lane 1: Hi-Hat */}
            <div className="flex flex-col justify-between items-center py-3 bg-yellow-950/10">
              <span className="text-[11px] font-bold text-yellow-500/80">HI-HAT [3]</span>
            </div>

            {/* Lane 2: Snare */}
            <div className="flex flex-col justify-between items-center py-3 bg-red-950/10">
              <span className="text-[11px] font-bold text-red-500/80">SNARE [A]</span>
            </div>

            {/* Lane 3: Kick */}
            <div className="flex flex-col justify-between items-center py-3 bg-purple-950/10">
              <span className="text-[11px] font-bold text-purple-500/80">KICK [SPACE]</span>
            </div>

          </div>

          {/* Scrolling Falling Notes */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {liveNotes.map((note) => {
              // Position: note.time beats ahead of current beat
              // When note.time === currentBeat, note is exactly on strike line (bottom-8)
              // Look ahead: 3 beats visible
              const beatsAhead = note.time - currentBeatRef.current;
              if (beatsAhead < -0.4 || beatsAhead > 3.2) return null;

              // Top percentage (3 beats ahead = 0%, 0 beats ahead = 82%)
              const topPercent = (1 - (beatsAhead / 3.0)) * 82;

              let laneClass = 'left-[16%] -translate-x-1/2';
              let colorBg = 'bg-yellow-400 shadow-yellow-400/50';
              let label = 'HAT';

              if (note.soundId === 'snare') {
                laneClass = 'left-[50%] -translate-x-1/2';
                colorBg = 'bg-red-500 shadow-red-500/50';
                label = 'SNARE';
              } else if (note.soundId === 'kick') {
                laneClass = 'left-[83%] -translate-x-1/2';
                colorBg = 'bg-purple-500 shadow-purple-500/50';
                label = 'KICK';
              }

              if (note.hit && note.accuracy) {
                // If already hit, don't show or show faded
                return null;
              }

              return (
                <div
                  key={note.id}
                  className={`absolute ${laneClass} w-20 h-7 rounded-full flex items-center justify-center font-mono font-bold text-[10px] text-slate-950 shadow-lg transition-transform ${colorBg}`}
                  style={{ top: `${topPercent}%` }}
                >
                  {label}
                </div>
              );
            })}
          </div>

          {/* STRIKE TARGET LINE (Bottom Hit Zone) */}
          <div className="relative z-10 h-16 border-t-2 border-dashed border-cyan-400/70 bg-gradient-to-t from-cyan-950/40 to-transparent flex items-center justify-around px-4">
            
            {/* Lane 1 Target */}
            <button
              onClick={() => onHit('hihat-closed')}
              className={`w-20 h-10 rounded-xl border-2 flex items-center justify-center font-bold text-xs transition-all ${
                activePads.has('hihat-closed')
                  ? 'bg-yellow-400 border-white text-slate-950 scale-110 shadow-lg'
                  : 'bg-slate-900/90 border-yellow-500/60 text-yellow-300'
              }`}
            >
              Key 3
            </button>

            {/* Lane 2 Target */}
            <button
              onClick={() => onHit('snare')}
              className={`w-20 h-10 rounded-xl border-2 flex items-center justify-center font-bold text-xs transition-all ${
                activePads.has('snare')
                  ? 'bg-red-500 border-white text-slate-950 scale-110 shadow-lg'
                  : 'bg-slate-900/90 border-red-500/60 text-red-300'
              }`}
            >
              Key A
            </button>

            {/* Lane 3 Target */}
            <button
              onClick={() => onHit('kick')}
              className={`w-20 h-10 rounded-xl border-2 flex items-center justify-center font-bold text-xs transition-all ${
                activePads.has('kick')
                  ? 'bg-purple-500 border-white text-slate-950 scale-110 shadow-lg'
                  : 'bg-slate-900/90 border-purple-500/60 text-purple-300'
              }`}
            >
              Space
            </button>

          </div>

          {/* Real-time Hit Feedback Popup */}
          {feedback && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
              <span className={`text-2xl font-black font-mono tracking-wider drop-shadow-lg ${feedback.color}`}>
                {feedback.text}
              </span>
            </div>
          )}

          {/* Count-In Overlay */}
          {isPlaying && currentBeatRef.current < 0 && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 flex flex-col items-center justify-center">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">Get Ready</span>
              <span className="text-5xl font-black text-white font-mono animate-bounce">
                {Math.ceil(Math.abs(currentBeatRef.current))}
              </span>
            </div>
          )}

        </div>

        {/* Game State Overlay & Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            {!isPlaying ? (
              <button
                onClick={startLesson}
                className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all text-sm"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>START LESSON</span>
              </button>
            ) : (
              <button
                onClick={() => setIsPlaying(false)}
                className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-700 transition-colors text-sm"
              >
                <span>PAUSE LESSON</span>
              </button>
            )}

            <button
              onClick={resetLesson}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-xl border border-slate-700 transition-colors"
              title="Reset Lesson"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Lesson Completion Badge */}
          {lessonFinished && (
            <div className="flex items-center gap-3 bg-emerald-950/60 border border-emerald-500/60 rounded-xl px-4 py-2.5">
              <Trophy className="w-5 h-5 text-amber-400" />
              <div>
                <span className="text-xs font-bold text-emerald-300 block">Lesson Complete!</span>
                <span className="text-[11px] text-slate-300">
                  Accuracy: {accuracyPercent}% · Max Combo: {maxCombo}x
                </span>
              </div>
              {selectedLessonIndex < COACH_LESSONS.length - 1 && (
                <button
                  onClick={() => setSelectedLessonIndex((i) => i + 1)}
                  className="ml-2 flex items-center gap-1 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 py-1 rounded-lg"
                >
                  <span>Next Lesson</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Target: Hit the drum right when the note touches the bottom line!</span>
          </div>

        </div>

      </div>
    </div>
  );
};
