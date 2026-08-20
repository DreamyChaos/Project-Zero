import { describe, it, expect, beforeEach } from 'vitest';
import { TelemetryCollector } from './pipeline/telemetry-collector';

describe('TelemetryCollector Subsystem (Section 17 & 20)', () => {
  let collector: TelemetryCollector;

  beforeEach(() => {
    collector = new TelemetryCollector();
  });

  it('initializes disabled by default', () => {
    expect(collector.isTelemetryEnabled()).toBe(false);
    collector.setEnabled(true);
    expect(collector.isTelemetryEnabled()).toBe(true);
  });

  it('records frame execution stats and calculates rolling FPS', () => {
    collector.setEnabled(true);

    // Record 16.6ms frames (60 FPS)
    for (let i = 0; i < 10; i++) {
      collector.recordFrame(16.66, 12, 5, 3, 1, false);
    }

    const tel = collector.getTelemetry();
    expect(tel.frameTimeMs).toBe(16.66);
    expect(tel.fps).toBe(60);
    expect(tel.drawCommandCount).toBe(12);
    expect(tel.culledNodeCount).toBe(5);
    expect(tel.culledEdgeCount).toBe(3);
    expect(tel.dirtyRegionCount).toBe(1);
    expect(tel.isLODDegraded).toBe(false);
  });

  it('records high-frequency frames and caps rolling FPS at 120 target', () => {
    collector.setEnabled(true);

    // 5ms frames (200 FPS raw, capped at 120)
    for (let i = 0; i < 10; i++) {
      collector.recordFrame(5.0, 8, 2, 1, 0, false);
    }

    const tel = collector.getTelemetry();
    expect(tel.fps).toBe(120);
  });

  it('resets stats to clean zero state', () => {
    collector.recordFrame(20.0, 10, 2, 2, 1, true);
    collector.reset();

    const tel = collector.getTelemetry();
    expect(tel.frameTimeMs).toBe(0);
    expect(tel.drawCommandCount).toBe(0);
    expect(tel.isLODDegraded).toBe(false);
  });
});
