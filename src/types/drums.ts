import { DrumSoundId, DrumKitType } from '../lib/audioEngine';

export interface SequencerTrack {
  id: DrumSoundId;
  name: string;
  steps: boolean[]; // 16 steps
}

export interface GroovePreset {
  id: string;
  name: string;
  bpm: number;
  description: string;
  tracks: {
    id: DrumSoundId;
    steps: boolean[];
  }[];
}

export interface CoachNote {
  id: string;
  soundId: 'hihat-closed' | 'snare' | 'kick';
  time: number; // in beats
  hit?: boolean;
  accuracy?: 'perfect' | 'good' | 'miss';
}

export interface CoachLesson {
  id: string;
  title: string;
  level: 'Beginner' | 'Intermediate' | 'Master';
  bpm: number;
  description: string;
  educationalTip: string;
  durationBeats: number;
  notes: {
    beat: number;
    soundId: 'hihat-closed' | 'snare' | 'kick';
  }[];
}

export interface RecordedHit {
  soundId: DrumSoundId;
  timeMs: number;
  velocity: number;
}
