/**
 * Level-Of-Detail (LOD) & Frame Budget Degradation Controller.
 * Formally specified in docs/09_Canvas_Engine_Specification.md (Sections 1, 6, 7 & 17).
 */

export type LODTier = 'high' | 'medium' | 'low';

export interface LODControllerOptions {
  readonly highThreshold?: number; // Default: 0.8x zoom
  readonly mediumThreshold?: number; // Default: 0.3x zoom
  readonly targetFrameTimeMs?: number; // Default: 16.66ms (60 FPS)
  readonly recoveryFrameTimeMs?: number; // Default: 14.0ms (safety hysteresis margin)
  readonly maxOverrunFrames?: number; // Default: 3 frames
  readonly requiredRecoveryFrames?: number; // Default: 10 frames
}

export interface LODState {
  readonly tier: LODTier;
  readonly zoom: number;
  readonly renderLabels: boolean;
  readonly renderDecorations: boolean;
  readonly renderSubMinorGrid: boolean;
  readonly isDegraded: boolean;
}

export class LODController {
  public static readonly DEFAULT_HIGH_THRESHOLD = 0.8;
  public static readonly DEFAULT_MEDIUM_THRESHOLD = 0.3;
  public static readonly DEFAULT_TARGET_FRAME_TIME_MS = 16.66;
  public static readonly DEFAULT_RECOVERY_FRAME_TIME_MS = 14.0;
  public static readonly DEFAULT_MAX_OVERRUN_FRAMES = 3;
  public static readonly DEFAULT_REQUIRED_RECOVERY_FRAMES = 10;

  private readonly highThreshold: number;
  private readonly mediumThreshold: number;
  private readonly targetFrameTimeMs: number;
  private readonly recoveryFrameTimeMs: number;
  private readonly maxOverrunFrames: number;
  private readonly requiredRecoveryFrames: number;

  private consecutiveOverruns: number = 0;
  private consecutiveUnderBudget: number = 0;
  private isDegraded: boolean = false;

  constructor(options?: LODControllerOptions) {
    this.highThreshold = options?.highThreshold ?? LODController.DEFAULT_HIGH_THRESHOLD;
    this.mediumThreshold = options?.mediumThreshold ?? LODController.DEFAULT_MEDIUM_THRESHOLD;
    this.targetFrameTimeMs = options?.targetFrameTimeMs ?? LODController.DEFAULT_TARGET_FRAME_TIME_MS;
    this.recoveryFrameTimeMs = options?.recoveryFrameTimeMs ?? LODController.DEFAULT_RECOVERY_FRAME_TIME_MS;
    this.maxOverrunFrames = options?.maxOverrunFrames ?? LODController.DEFAULT_MAX_OVERRUN_FRAMES;
    this.requiredRecoveryFrames = options?.requiredRecoveryFrames ?? LODController.DEFAULT_REQUIRED_RECOVERY_FRAMES;
  }

  public evaluateLOD(zoom: number): LODState {
    let tier: LODTier = 'high';
    if (zoom < this.mediumThreshold) {
      tier = 'low';
    } else if (zoom < this.highThreshold) {
      tier = 'medium';
    }

    const renderLabels = tier !== 'low' && !this.isDegraded;
    const renderDecorations = tier === 'high' && !this.isDegraded;
    const renderSubMinorGrid = zoom >= 2.5 && !this.isDegraded;

    return {
      tier,
      zoom,
      renderLabels,
      renderDecorations,
      renderSubMinorGrid,
      isDegraded: this.isDegraded,
    };
  }

  /**
   * Records execution time of a rendered frame with damped hysteresis to prevent quality thrashing (Section 1 Rule 4).
   */
  public recordFrameTime(frameTimeMs: number): boolean {
    if (frameTimeMs > this.targetFrameTimeMs) {
      this.consecutiveOverruns++;
      this.consecutiveUnderBudget = 0;

      // Consecutive budget overruns (>= 3 frames) trigger automatic LOD reduction
      if (this.consecutiveOverruns >= this.maxOverrunFrames && !this.isDegraded) {
        this.isDegraded = true;
        return true; // Quality degraded
      }
    } else if (frameTimeMs <= this.recoveryFrameTimeMs) {
      this.consecutiveUnderBudget++;
      this.consecutiveOverruns = 0;

      // Recover quality after sustained smooth frames (>= 10 frames)
      if (this.consecutiveUnderBudget >= this.requiredRecoveryFrames && this.isDegraded) {
        this.isDegraded = false;
        return true; // Quality restored
      }
    } else {
      // In the hysteresis deadband (14.0ms - 16.66ms), do not increment recovery or overrun
      this.consecutiveOverruns = 0;
    }

    return false;
  }

  public isQualityDegraded(): boolean {
    return this.isDegraded;
  }

  public reset(): void {
    this.consecutiveOverruns = 0;
    this.consecutiveUnderBudget = 0;
    this.isDegraded = false;
  }
}
