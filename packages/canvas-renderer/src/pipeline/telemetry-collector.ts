/**
 * Performance Telemetry Collector & Frame Statistics Engine.
 * Formally specified in docs/09_Canvas_Engine_Specification.md (Section 17 & 20).
 */

export interface FrameTelemetry {
  readonly frameTimeMs: number;
  readonly fps: number;
  readonly drawCommandCount: number;
  readonly culledNodeCount: number;
  readonly culledEdgeCount: number;
  readonly dirtyRegionCount: number;
  readonly isLODDegraded: boolean;
}

export class TelemetryCollector {
  private isEnabled: boolean = false;

  private currentFrameTimeMs: number = 0;
  private currentDrawCommandCount: number = 0;
  private currentCulledNodeCount: number = 0;
  private currentCulledEdgeCount: number = 0;
  private currentDirtyRegionCount: number = 0;
  private currentIsLODDegraded: boolean = false;

  // Rolling FPS calculation
  private readonly frameTimes: number[] = [];
  private readonly maxSampleCount = 30;
  private rollingFPS: number = 60;

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public isTelemetryEnabled(): boolean {
    return this.isEnabled;
  }

  public recordFrame(
    frameTimeMs: number,
    drawCommandCount: number,
    culledNodes: number,
    culledEdges: number,
    dirtyRegions: number,
    isLODDegraded: boolean
  ): void {
    this.currentFrameTimeMs = frameTimeMs;
    this.currentDrawCommandCount = drawCommandCount;
    this.currentCulledNodeCount = culledNodes;
    this.currentCulledEdgeCount = culledEdges;
    this.currentDirtyRegionCount = dirtyRegions;
    this.currentIsLODDegraded = isLODDegraded;

    this.frameTimes.push(frameTimeMs);
    if (this.frameTimes.length > this.maxSampleCount) {
      this.frameTimes.shift();
    }

    let sum = 0;
    for (let i = 0; i < this.frameTimes.length; i++) {
      sum += this.frameTimes[i];
    }
    const avg = sum / this.frameTimes.length;
    this.rollingFPS = avg > 0 ? Math.min(120, Math.round(1000 / avg)) : 60;
  }

  public getTelemetry(): FrameTelemetry {
    return {
      frameTimeMs: this.currentFrameTimeMs,
      fps: this.rollingFPS,
      drawCommandCount: this.currentDrawCommandCount,
      culledNodeCount: this.currentCulledNodeCount,
      culledEdgeCount: this.currentCulledEdgeCount,
      dirtyRegionCount: this.currentDirtyRegionCount,
      isLODDegraded: this.currentIsLODDegraded,
    };
  }

  public reset(): void {
    this.currentFrameTimeMs = 0;
    this.currentDrawCommandCount = 0;
    this.currentCulledNodeCount = 0;
    this.currentCulledEdgeCount = 0;
    this.currentDirtyRegionCount = 0;
    this.currentIsLODDegraded = false;
    this.frameTimes.length = 0;
    this.rollingFPS = 60;
  }
}
