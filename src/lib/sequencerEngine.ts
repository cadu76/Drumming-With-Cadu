import { audioEngine, DrumSoundId } from './audioEngine';

export class StepSequencerEngine {
  private isRunning: boolean = false;
  private bpm: number = 110;
  private currentStep: number = 0;
  private nextStepTime: number = 0;
  private timerId: number | null = null;
  private lookaheadMs: number = 25;
  private scheduleAheadSec: number = 0.1;

  public pattern: { [key in DrumSoundId]?: boolean[] } = {};
  public onStepChange: ((step: number) => void) | null = null;

  constructor() {
    this.resetPattern();
  }

  public resetPattern() {
    this.pattern = {
      'kick':         [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
      'snare':        [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
      'hihat-closed': [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
      'hihat-open':   [false, false, false, false, false, false, false, false, false, false, false, false, false, false, true, false],
      'crash':        [true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
      'tom-high':     [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
      'tom-low':      [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
      'clap':         [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
    };
  }

  public setBpm(newBpm: number) {
    this.bpm = Math.max(40, Math.min(240, newBpm));
  }

  public start() {
    const ctx = audioEngine.init();
    if (!ctx) return;

    this.isRunning = true;
    this.currentStep = 0;
    this.nextStepTime = ctx.currentTime;

    this.scheduler();
  }

  public stop() {
    this.isRunning = false;
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  private scheduler = () => {
    const ctx = audioEngine.getContext();
    if (!ctx || !this.isRunning) return;

    // While there are notes that will need to play before the next interval, schedule them and advance the pointer.
    while (this.nextStepTime < ctx.currentTime + this.scheduleAheadSec) {
      this.scheduleStep(this.currentStep, this.nextStepTime);
      this.advanceStep();
    }

    this.timerId = window.setTimeout(this.scheduler, this.lookaheadMs);
  };

  private advanceStep() {
    const secondsPer16th = (60 / this.bpm) / 4;
    this.nextStepTime += secondsPer16th;
    this.currentStep = (this.currentStep + 1) % 16;
  }

  private scheduleStep(stepIndex: number, time: number) {
    const ctx = audioEngine.getContext();
    if (!ctx) return;

    // Notify UI of current step (calculated slightly ahead to sync visually)
    const delayMs = Math.max(0, (time - ctx.currentTime) * 1000);
    setTimeout(() => {
      if (this.isRunning && this.onStepChange) {
        this.onStepChange(stepIndex);
      }
    }, delayMs);

    // Schedule all drum voices triggered on this step
    (Object.keys(this.pattern) as DrumSoundId[]).forEach((soundId) => {
      const track = this.pattern[soundId];
      if (track && track[stepIndex]) {
        audioEngine.playSound(soundId, 1.0, time);
      }
    });
  }
}

export const sequencerEngine = new StepSequencerEngine();
