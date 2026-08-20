import { describe, it, expect } from 'vitest';
import { CanvasGrid } from './grid/canvas-grid';
import { Viewport } from './camera/viewport';
import { Camera } from './camera/camera';

describe('CanvasGrid Subsystem', () => {
  const grid = new CanvasGrid({ majorStep: 100, minorStep: 20, subMinorStep: 4 });
  const viewport = new Viewport(800, 600, 1.0);
  const camera = new Camera(viewport);

  it('evaluates Band 1 LOD scale opacities (zoom < 0.4)', () => {
    const opacities = grid.evaluateLODOpacities(0.2);
    expect(opacities.majorAlpha).toBeGreaterThan(0);
    expect(opacities.minorAlpha).toBe(0.0);
    expect(opacities.subMinorAlpha).toBe(0.0);
  });

  it('evaluates Band 2 LOD scale opacities (0.4 <= zoom <= 2.5)', () => {
    const opacities = grid.evaluateLODOpacities(1.0);
    expect(opacities.majorAlpha).toBe(0.8);
    expect(opacities.minorAlpha).toBe(0.5);
    expect(opacities.subMinorAlpha).toBe(0.0);
  });

  it('evaluates Band 3 LOD scale opacities (zoom > 2.5)', () => {
    const opacities = grid.evaluateLODOpacities(3.0);
    expect(opacities.majorAlpha).toBe(0.8);
    expect(opacities.minorAlpha).toBe(0.5);
    expect(opacities.subMinorAlpha).toBeGreaterThan(0.0);
  });

  it('generates discrete grid line definitions inside visible world bounds', () => {
    camera.setPosition(0, 0, true);
    camera.setZoom(1.0, true);

    const lines = grid.generateGridLines(camera);
    expect(lines.length).toBeGreaterThan(0);

    const majorLines = lines.filter((l) => l.type === 'major');
    const minorLines = lines.filter((l) => l.type === 'minor');

    expect(majorLines.length).toBeGreaterThan(0);
    expect(minorLines.length).toBeGreaterThan(0);
  });

  it('bypasses line generation when line opacities fade to zero', () => {
    camera.setZoom(0.05, true);
    const lines = grid.generateGridLines(camera);
    const subMinorLines = lines.filter((l) => l.type === 'subminor');
    expect(subMinorLines.length).toBe(0);
  });
});
