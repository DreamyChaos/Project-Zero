/**
 * Formal Decoupled Renderer Interfaces and Headless Lifecycle Contracts.
 * Formally specified in docs/09_Canvas_Engine_Specification.md (Section 19).
 */

import { StateNode } from './state/state-node';
import { TransitionEdge } from './edge/edge-transition';
import { Viewport } from './camera/viewport';
import { Camera } from './camera/camera';
import { CanvasThemeTokens, ThemeMode } from './theme/theme-bridge';
import { CanvasTool } from './interaction/tool-controller';
import { FrameTelemetry } from './pipeline/telemetry-collector';
import { RemoteCursor } from './overlay/remote-cursor-renderer';

export type CanvasEngineLifecycleState = 'uninitialized' | 'attached' | 'suspended' | 'destroyed';

export interface ICanvasLifecycle {
  attach(canvas: HTMLCanvasElement, container?: HTMLElement): void;
  detach(): void;
  suspend(): void;
  resume(): void;
  destroy(): void;
  getLifecycleState(): CanvasEngineLifecycleState;
  isAttached(): boolean;
  isSuspended(): boolean;
}

export interface ICanvasStateProvider {
  getStateNodes(): ReadonlyArray<StateNode>;
  getTransitionEdges(): ReadonlyArray<TransitionEdge>;
  getViewport(): Viewport;
  getCamera(): Camera;
  getTheme(): CanvasThemeTokens;
  getThemeMode(): ThemeMode;
  getTool(): CanvasTool;
  isTelemetryEnabled(): boolean;
  getTelemetry(): FrameTelemetry;
  getRemoteCursors(): ReadonlyArray<RemoteCursor>;
}

export interface ICanvasEventSink {
  subscribeSelection(callback: (selectedNodeIds: ReadonlyArray<string>, selectedEdgeIds: ReadonlyArray<string>) => void): () => void;
  subscribeNodeMoved(callback: (id: string, newX: number, newY: number) => void): () => void;
  subscribeEdgeCreated(callback: (sourceId: string, targetId: string) => void): () => void;
  subscribeToolChanged(callback: (tool: CanvasTool) => void): () => void;
  subscribeNodeAdded?(callback: (node: StateNode) => void): () => void;
  subscribeNodeRemoved?(callback: (id: string) => void): () => void;
  subscribeEdgeAdded?(callback: (edge: TransitionEdge) => void): () => void;
  subscribeEdgeRemoved?(callback: (id: string) => void): () => void;
  subscribeEdgeDoubleClicked?(callback: (edge: TransitionEdge) => void): () => void;
}

export interface ICanvasEngine extends ICanvasLifecycle, ICanvasStateProvider, ICanvasEventSink {
  setStateNodes(nodes: ReadonlyArray<StateNode>): void;
  addStateNode(node: StateNode): void;
  removeStateNode(id: string): boolean;

  setTransitionEdges(edges: ReadonlyArray<TransitionEdge>): void;
  addTransitionEdge(edge: TransitionEdge): void;
  removeTransitionEdge(id: string): boolean;

  setTheme(theme: ThemeMode | CanvasThemeTokens): void;
  setTool(tool: CanvasTool): void;
  setTelemetryEnabled(enabled: boolean): void;

  setRemoteCursors(cursors: ReadonlyArray<RemoteCursor>): void;
  updateRemoteCursor(cursor: RemoteCursor): void;
  removeRemoteCursor(id: string): boolean;

  resize(width: number, height: number, dpr?: number): void;
  fitView(immediate?: boolean): void;
  renderFrame(): void;
  invalidate(): void;
}
