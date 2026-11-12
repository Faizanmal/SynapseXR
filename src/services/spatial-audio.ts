/**
 * Web Audio Spatial Sound System for AgentSphere.
 * Provides subtle, non-intrusive futuristic audio feedback for:
 * - Hand pinch & node grab
 * - Node release & snap
 * - Connection established / broken
 * - Execution started
 * - Step completed
 * - Human approval requested (chime)
 * - Approval granted (triumph chord)
 * - Execution cancelled / rejected (subtle descending tone)
 * - Completion celebration fanfare
 */

import { config } from '../core/config.js';
import { logger } from '../core/logger.js';

export type SoundEffectType =
  | 'grab'
  | 'release'
  | 'connect'
  | 'disconnect'
  | 'start'
  | 'step_complete'
  | 'approval_needed'
  | 'approved'
  | 'rejected'
  | 'celebration'
  | 'error'
  | 'tap';

export class SpatialAudioService {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    this.enabled = config.features.soundEffects;
  }

  private initContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  play(type: SoundEffectType, volume = 0.25): void {
    if (!this.enabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      switch (type) {
        case 'tap': {
          this.playTone(ctx, 800, now, 0.05, 'sine', volume * 0.4);
          break;
        }

        case 'grab': {
          this.playTone(ctx, 420, now, 0.08, 'triangle', volume * 0.5);
          break;
        }

        case 'release': {
          this.playTone(ctx, 320, now, 0.07, 'sine', volume * 0.4);
          break;
        }

        case 'connect': {
          // Ascending two-tone chime
          this.playTone(ctx, 523.25, now, 0.09, 'sine', volume * 0.5); // C5
          this.playTone(ctx, 659.25, now + 0.08, 0.12, 'sine', volume * 0.6); // E5
          break;
        }

        case 'disconnect': {
          // Descending soft tones
          this.playTone(ctx, 493.88, now, 0.08, 'sine', volume * 0.4); // B4
          this.playTone(ctx, 369.99, now + 0.07, 0.1, 'sine', volume * 0.35); // F#4
          break;
        }

        case 'start': {
          // Futuristic power-up sweep
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.25);
          gain.gain.setValueAtTime(volume * 0.5, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.32);
          break;
        }

        case 'step_complete': {
          // High crisp confirmation blip
          this.playTone(ctx, 1046.5, now, 0.1, 'sine', volume * 0.5); // C6
          break;
        }

        case 'approval_needed': {
          // Harmonic warm notification alert
          this.playTone(ctx, 587.33, now, 0.15, 'sine', volume * 0.6); // D5
          this.playTone(ctx, 880.0, now + 0.12, 0.22, 'sine', volume * 0.7); // A5
          break;
        }

        case 'approved': {
          // Major chord triumph
          this.playTone(ctx, 523.25, now, 0.18, 'sine', volume * 0.6); // C5
          this.playTone(ctx, 659.25, now + 0.07, 0.18, 'sine', volume * 0.6); // E5
          this.playTone(ctx, 783.99, now + 0.14, 0.25, 'sine', volume * 0.7); // G5
          break;
        }

        case 'rejected': {
          // Descending warning
          this.playTone(ctx, 349.23, now, 0.12, 'sawtooth', volume * 0.4);
          this.playTone(ctx, 220.0, now + 0.1, 0.18, 'sawtooth', volume * 0.35);
          break;
        }

        case 'celebration': {
          // Arpeggiated completion celebration
          const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
          notes.forEach((freq, idx) => {
            this.playTone(ctx, freq, now + idx * 0.09, 0.25, 'triangle', volume * 0.65);
          });
          break;
        }

        case 'error': {
          this.playTone(ctx, 164.81, now, 0.25, 'sawtooth', volume * 0.45);
          break;
        }
      }
    } catch (err) {
      logger.debug('SpatialAudioService', `Audio playback suppressed: ${(err as Error).message}`);
    }
  }

  private playTone(
    ctx: AudioContext,
    frequency: number,
    startTime: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.3,
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, startTime);
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }
}

export const spatialAudioService = new SpatialAudioService();

