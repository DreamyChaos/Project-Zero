/**
 * High-performance Render Loop with frame delta time clamping and idle sleep policy.
 * Formally specified in docs/09_Canvas_Engine_Specification.md (Section 14).
 */

export interface RenderLoopMetrics {
  readonly fps: number;
  readonly frameTimeMs: number;
  readonly isRunning: boolean;
  readonly isSleeping: boolean;
  readonly totalFrames: number;
}

export type FrameCallback = (deltaTimeMs: number) => boolean;

export class RenderLoop {
  public static readonly MAX_DELTA_TIME_MS = 33.33; // 30 FPS floor threshold clamp
  public static readonly IDLE_THRESHOLD_FRAMES = 3;

  private isRunning: boolean = false;
  private isSleeping: boolean = false;
  private animFrameId: number | null = null;
  private timerId: ReturnType<typeof setTimeout> | null = null;

  private lastTimestamp: number = 0;
  private idleFrameCounter: number = 0;
  private totalFrames: number = 0;

  private currentFps: number = 60;
  private lastFrameTimeMs: number = 0;

  private readonly callback: FrameCallback;

  constructor(callback: FrameCallback) {
    this.callback = callback;
  }

  public start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.isSleeping = false;
    this.idleFrameCounter = 0;
    this.lastTimestamp = this.now();

    this.scheduleNextFrame();
  }

  public stop(): void {
    this.isRunning = false;
    this.isSleeping = false;

    if (this.animFrameId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  public invalidate(): void {
    this.idleFrameCounter = 0;
    if (this.isRunning && this.isSleeping) {
      this.isSleeping = false;
      this.lastTimestamp = this.now();
      this.scheduleNextFrame();
    }
  }

  public getMetrics(): RenderLoopMetrics {
    return {
      fps: Math.round(this.currentFps),
      frameTimeMs: this.lastFrameTimeMs,
      isRunning: this.isRunning,
      isSleeping: this.isSleeping,
      totalFrames: this.totalFrames,
    };
  }

  private scheduleNextFrame(): void {
    if (!this.isRunning || this.isSleeping) return;

    if (typeof requestAnimationFrame !== 'undefined') {
      this.animFrameId = requestAnimationFrame((timestamp) => this.tick(timestamp));
    } else {
      // Headless / Node.js fallback timer tick (~60 FPS)
      this.timerId = setTimeout(() => this.tick(this.now()), 16);
    }
  }

  private tick(timestamp: number): void {
    if (!this.isRunning) return;

    const rawDeltaMs = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;

    // Clamp delta time to prevent physics explosions after tab reactivation
    const clampedDeltaMs = Math.min(RenderLoop.MAX_DELTA_TIME_MS, Math.max(0.1, rawDeltaMs));

    const startTime = this.now();

    // Execute frame callback; returns true if frame required re-render / continuous motion
    const isActive = this.callback(clampedDeltaMs);

    const endTime = this.now();
    this.lastFrameTimeMs = endTime - startTime;
    this.totalFrames++;

    // Calculate rolling FPS metrics
    if (rawDeltaMs > 0) {
      const instantFps = 1000.0 / rawDeltaMs;
      this.currentFps = this.currentFps * 0.9 + instantFps * 0.1;
    }

    if (isActive) {
      this.idleFrameCounter = 0;
    } else {
      this.idleFrameCounter++;
    }

    // Check idle sleep policy threshold
    if (this.idleFrameCounter >= RenderLoop.IDLE_THRESHOLD_FRAMES) {
      this.isSleeping = true;
      return; // Suspend loop ticks until invalidate() is called
    }

    this.scheduleNextFrame();
  }

  private now(): number {
    if (typeof performance !== 'undefined' && performance.now) {
      return performance.now();
    }
    return Date.now();
  }
}
