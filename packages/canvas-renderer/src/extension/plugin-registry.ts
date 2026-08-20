/**
 * Extension Plugin Registry for Custom Node Shapes and Extension Passes.
 * Formally specified in docs/09_Canvas_Engine_Specification.md (Section 21).
 */

import { StateNode } from '../state/state-node';
import { Point2D } from '../math/point2d';
import { CanvasThemeTokens } from '../theme/theme-bridge';

export interface CustomNodeShapePlugin {
  readonly type: string;
  render(
    ctx: CanvasRenderingContext2D,
    node: StateNode,
    tokens: CanvasThemeTokens
  ): void;
  hitTest?(point: Point2D, node: StateNode): boolean;
}

export class PluginRegistry {
  private readonly nodeShapePlugins: Map<string, CustomNodeShapePlugin> = new Map();

  public registerNodeShapePlugin(plugin: CustomNodeShapePlugin): void {
    this.nodeShapePlugins.set(plugin.type, plugin);
  }

  public getNodeShapePlugin(type: string): CustomNodeShapePlugin | undefined {
    return this.nodeShapePlugins.get(type);
  }

  public removeNodeShapePlugin(type: string): boolean {
    return this.nodeShapePlugins.delete(type);
  }

  public hasNodeShapePlugin(type: string): boolean {
    return this.nodeShapePlugins.has(type);
  }

  public clear(): void {
    this.nodeShapePlugins.clear();
  }
}
