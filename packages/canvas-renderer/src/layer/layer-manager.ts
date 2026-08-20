/**
 * 11-Layer Depth Hierarchy and Compositing Manager.
 * Formally specified in docs/09_Canvas_Engine_Specification.md (Section 5).
 */

export enum RenderLayer {
  Grid = 0,
  Background = 1,
  Edges = 2,
  EdgeLabels = 3,
  States = 4,
  StateLabels = 5,
  Selection = 6,
  Hover = 7,
  TemporaryPreview = 8,
  DebugOverlay = 9,
  AccessibilityOverlay = 10,
}

export interface LayerState {
  readonly layer: RenderLayer;
  readonly name: string;
  readonly visible: boolean;
  readonly opacity: number;
  readonly blendMode: GlobalCompositeOperation;
}

export class LayerManager {
  private readonly layers: Map<RenderLayer, LayerState>;

  constructor() {
    this.layers = new Map<RenderLayer, LayerState>();
    this.initializeDefaultLayers();
  }

  private initializeDefaultLayers(): void {
    const layerDefinitions: ReadonlyArray<[RenderLayer, string, GlobalCompositeOperation]> = [
      [RenderLayer.Grid, 'Grid', 'source-over'],
      [RenderLayer.Background, 'Background', 'source-over'],
      [RenderLayer.Edges, 'Edges', 'source-over'],
      [RenderLayer.EdgeLabels, 'Edge Labels', 'source-over'],
      [RenderLayer.States, 'States', 'source-over'],
      [RenderLayer.StateLabels, 'State Labels', 'source-over'],
      [RenderLayer.Selection, 'Selection', 'source-over'],
      [RenderLayer.Hover, 'Hover', 'source-over'],
      [RenderLayer.TemporaryPreview, 'Temporary Preview', 'source-over'],
      [RenderLayer.DebugOverlay, 'Debug Overlay', 'source-over'],
      [RenderLayer.AccessibilityOverlay, 'Accessibility Overlay', 'source-over'],
    ];

    for (const [layer, name, blendMode] of layerDefinitions) {
      this.layers.set(layer, {
        layer,
        name,
        visible: true,
        opacity: 1.0,
        blendMode,
      });
    }
  }

  public getLayerState(layer: RenderLayer): LayerState {
    const state = this.layers.get(layer);
    if (!state) {
      throw new Error(`Invalid render layer index: ${layer}`);
    }
    return state;
  }

  public setLayerVisible(layer: RenderLayer, visible: boolean): void {
    const current = this.getLayerState(layer);
    this.layers.set(layer, { ...current, visible });
  }

  public setLayerOpacity(layer: RenderLayer, opacity: number): void {
    const clampedOpacity = Math.min(1.0, Math.max(0.0, opacity));
    const current = this.getLayerState(layer);
    this.layers.set(layer, { ...current, opacity: clampedOpacity });
  }

  public setLayerBlendMode(layer: RenderLayer, blendMode: GlobalCompositeOperation): void {
    const current = this.getLayerState(layer);
    this.layers.set(layer, { ...current, blendMode });
  }

  /**
   * Returns all active layers in strict ascending z-index depth order (0 to 10).
   */
  public getOrderedLayers(): ReadonlyArray<LayerState> {
    const keys = Array.from(this.layers.keys()).sort((a, b) => a - b);
    return keys.map((key) => this.layers.get(key)!);
  }

  /**
   * Returns only visible layers in strict ascending z-index order.
   */
  public getVisibleOrderedLayers(): ReadonlyArray<LayerState> {
    return this.getOrderedLayers().filter((l) => l.visible);
  }
}
