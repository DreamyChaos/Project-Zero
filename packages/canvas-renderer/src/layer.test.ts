import { describe, it, expect, beforeEach } from 'vitest';
import { LayerManager, RenderLayer } from './layer/layer-manager';

describe('LayerManager Subsystem', () => {
  let layerManager: LayerManager;

  beforeEach(() => {
    layerManager = new LayerManager();
  });

  it('initializes all 11 default layers in strict z-index depth order', () => {
    const layers = layerManager.getOrderedLayers();
    expect(layers.length).toBe(11);

    expect(layers[0].layer).toBe(RenderLayer.Grid);
    expect(layers[1].layer).toBe(RenderLayer.Background);
    expect(layers[2].layer).toBe(RenderLayer.Edges);
    expect(layers[3].layer).toBe(RenderLayer.EdgeLabels);
    expect(layers[4].layer).toBe(RenderLayer.States);
    expect(layers[5].layer).toBe(RenderLayer.StateLabels);
    expect(layers[6].layer).toBe(RenderLayer.Selection);
    expect(layers[7].layer).toBe(RenderLayer.Hover);
    expect(layers[8].layer).toBe(RenderLayer.TemporaryPreview);
    expect(layers[9].layer).toBe(RenderLayer.DebugOverlay);
    expect(layers[10].layer).toBe(RenderLayer.AccessibilityOverlay);
  });

  it('allows toggling layer visibility', () => {
    layerManager.setLayerVisible(RenderLayer.DebugOverlay, false);
    expect(layerManager.getLayerState(RenderLayer.DebugOverlay).visible).toBe(false);

    const visibleLayers = layerManager.getVisibleOrderedLayers();
    expect(visibleLayers.length).toBe(10);
    expect(visibleLayers.some((l) => l.layer === RenderLayer.DebugOverlay)).toBe(false);
  });

  it('clamps layer opacity to [0.0, 1.0] range', () => {
    layerManager.setLayerOpacity(RenderLayer.Hover, 0.5);
    expect(layerManager.getLayerState(RenderLayer.Hover).opacity).toBe(0.5);

    layerManager.setLayerOpacity(RenderLayer.Hover, -0.5);
    expect(layerManager.getLayerState(RenderLayer.Hover).opacity).toBe(0.0);

    layerManager.setLayerOpacity(RenderLayer.Hover, 1.5);
    expect(layerManager.getLayerState(RenderLayer.Hover).opacity).toBe(1.0);
  });

  it('allows setting blend modes for composite rules', () => {
    layerManager.setLayerBlendMode(RenderLayer.Hover, 'multiply');
    expect(layerManager.getLayerState(RenderLayer.Hover).blendMode).toBe('multiply');
  });

  it('throws an error when querying an invalid layer index', () => {
    expect(() => layerManager.getLayerState(99 as RenderLayer)).toThrow();
  });
});
