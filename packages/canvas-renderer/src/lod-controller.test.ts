import { describe, it, expect, beforeEach } from 'vitest';
import { LODController } from './camera/lod-controller';

describe('LODController & Frame Budget Monitor (Sections 1, 6, 7 & 17)', () => {
  let controller: LODController;

  beforeEach(() => {
    controller = new LODController({
      highThreshold: 0.8,
      mediumThreshold: 0.3,
      targetFrameTimeMs: 16.66,
      maxOverrunFrames: 3,
    });
  });

  it('evaluates High LOD tier at zoom >= 0.8', () => {
    const state = controller.evaluateLOD(1.2);
    expect(state.tier).toBe('high');
    expect(state.renderLabels).toBe(true);
    expect(state.renderDecorations).toBe(true);
    expect(state.renderSubMinorGrid).toBe(false);
  });

  it('evaluates Medium LOD tier at 0.3 <= zoom < 0.8', () => {
    const state = controller.evaluateLOD(0.5);
    expect(state.tier).toBe('medium');
    expect(state.renderLabels).toBe(true);
    expect(state.renderDecorations).toBe(false);
  });

  it('evaluates Low LOD tier at zoom < 0.3', () => {
    const state = controller.evaluateLOD(0.2);
    expect(state.tier).toBe('low');
    expect(state.renderLabels).toBe(false);
    expect(state.renderDecorations).toBe(false);
  });

  it('enables sub-minor grid lines only at extreme magnification (zoom >= 2.5)', () => {
    expect(controller.evaluateLOD(1.5).renderSubMinorGrid).toBe(false);
    expect(controller.evaluateLOD(2.5).renderSubMinorGrid).toBe(true);
    expect(controller.evaluateLOD(4.0).renderSubMinorGrid).toBe(true);
  });

  it('triggers quality degradation upon 3 consecutive frame budget overruns (> 16.66ms)', () => {
    expect(controller.isQualityDegraded()).toBe(false);

    // Frame 1 overrun
    expect(controller.recordFrameTime(20.0)).toBe(false);
    expect(controller.isQualityDegraded()).toBe(false);

    // Frame 2 overrun
    expect(controller.recordFrameTime(22.0)).toBe(false);
    expect(controller.isQualityDegraded()).toBe(false);

    // Frame 3 overrun -> triggers degradation
    expect(controller.recordFrameTime(25.0)).toBe(true);
    expect(controller.isQualityDegraded()).toBe(true);

    // In degraded mode, labels and decorations are suppressed to restore frame budget
    const degradedState = controller.evaluateLOD(1.0);
    expect(degradedState.renderLabels).toBe(false);
    expect(degradedState.renderDecorations).toBe(false);
    expect(degradedState.isDegraded).toBe(true);
  });

  it('recovers normal quality after 10 consecutive under-budget frames', () => {
    // Overrun to trigger degradation
    controller.recordFrameTime(20.0);
    controller.recordFrameTime(20.0);
    controller.recordFrameTime(20.0);
    expect(controller.isQualityDegraded()).toBe(true);

    // 9 under-budget frames (10ms)
    for (let i = 0; i < 9; i++) {
      expect(controller.recordFrameTime(10.0)).toBe(false);
      expect(controller.isQualityDegraded()).toBe(true);
    }

    // 10th under-budget frame -> restores quality
    expect(controller.recordFrameTime(10.0)).toBe(true);
    expect(controller.isQualityDegraded()).toBe(false);
  });

  it('rejects isolated 1-frame and 2-frame spikes without triggering degradation', () => {
    // 1-frame spike
    controller.recordFrameTime(25.0);
    expect(controller.isQualityDegraded()).toBe(false);
    controller.recordFrameTime(10.0);
    expect(controller.isQualityDegraded()).toBe(false);

    // 2-frame spike
    controller.recordFrameTime(25.0);
    controller.recordFrameTime(25.0);
    expect(controller.isQualityDegraded()).toBe(false);
    controller.recordFrameTime(12.0); // Reset
    expect(controller.isQualityDegraded()).toBe(false);
  });

  it('prevents thrashing on alternating over/under budget frames', () => {
    for (let i = 0; i < 10; i++) {
      controller.recordFrameTime(20.0); // Overrun
      controller.recordFrameTime(10.0); // Reset
      expect(controller.isQualityDegraded()).toBe(false);
    }
  });

  it('handles hysteresis deadband frames (14.0ms - 16.66ms) without premature recovery', () => {
    // Force degradation
    controller.recordFrameTime(20.0);
    controller.recordFrameTime(20.0);
    controller.recordFrameTime(20.0);
    expect(controller.isQualityDegraded()).toBe(true);

    // Frames in deadband (15ms) do not increment recovery count
    for (let i = 0; i < 10; i++) {
      expect(controller.recordFrameTime(15.0)).toBe(false);
      expect(controller.isQualityDegraded()).toBe(true);
    }

    // Now 10 frames strictly below recovery threshold (12ms <= 14ms)
    for (let i = 0; i < 9; i++) {
      expect(controller.recordFrameTime(12.0)).toBe(false);
      expect(controller.isQualityDegraded()).toBe(true);
    }
    expect(controller.recordFrameTime(12.0)).toBe(true);
    expect(controller.isQualityDegraded()).toBe(false);
  });
});
