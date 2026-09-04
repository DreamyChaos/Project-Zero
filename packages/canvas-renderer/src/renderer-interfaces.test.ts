import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CanvasEngine } from './canvas-engine';
import { ICanvasEngine } from './renderer-interfaces';

describe('Renderer Interfaces & Headless Lifecycle Contracts (Section 19)', () => {
  let engine: ICanvasEngine;

  beforeEach(() => {
    engine = new CanvasEngine({
      width: 800,
      height: 600,
    });
  });

  afterEach(() => {
    engine.destroy();
  });

  it('transitions through uninitialized -> attached -> suspended -> destroyed lifecycle states', () => {
    expect(engine.getLifecycleState()).toBe('uninitialized');
    expect(engine.isAttached()).toBe(false);
    expect(engine.isSuspended()).toBe(false);

    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      setTransform: vi.fn(),
      clearRect: vi.fn(),
      scale: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    const mockCanvas = {
      width: 0,
      height: 0,
      style: { width: '', height: '' },
      getContext: vi.fn().mockReturnValue(mockCtx),
      getBoundingClientRect: vi.fn().mockReturnValue({ left: 0, top: 0, width: 800, height: 600 }),
    } as unknown as HTMLCanvasElement;

    engine.attach(mockCanvas);
    expect(engine.getLifecycleState()).toBe('attached');
    expect(engine.isAttached()).toBe(true);

    engine.suspend();
    expect(engine.getLifecycleState()).toBe('suspended');
    expect(engine.isSuspended()).toBe(true);

    engine.resume();
    expect(engine.getLifecycleState()).toBe('attached');

    engine.destroy();
    expect(engine.getLifecycleState()).toBe('destroyed');
  });

  it('supports event sink subscriptions for selection, node move, and edge creation', () => {
    const selectionCb = vi.fn();
    const nodeMovedCb = vi.fn();
    const edgeCreatedCb = vi.fn();

    const unsubSel = engine.subscribeSelection(selectionCb);
    const unsubMove = engine.subscribeNodeMoved(nodeMovedCb);
    const unsubEdge = engine.subscribeEdgeCreated(edgeCreatedCb);

    engine.setStateNodes([
      { id: 'q0', label: 'q0', x: 0, y: 0 },
      { id: 'q1', label: 'q1', x: 100, y: 0 },
    ]);

    expect(unsubSel).toBeInstanceOf(Function);
    expect(unsubMove).toBeInstanceOf(Function);
    expect(unsubEdge).toBeInstanceOf(Function);

    unsubSel();
    unsubMove();
    unsubEdge();
  });

  it('functions headlessly without attached canvas for testing and math simulation passes', () => {
    expect(engine.getLifecycleState()).toBe('uninitialized');

    engine.setStateNodes([
      { id: 'q0', label: 'q0', x: 0, y: 0 },
      { id: 'q1', label: 'q1', x: 100, y: 0 },
    ]);
    engine.addTransitionEdge({ id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: '0' });

    expect(engine.getStateNodes().length).toBe(2);
    expect(engine.getTransitionEdges().length).toBe(1);

    // Headless render pass safely no-ops without throwing
    expect(() => engine.renderFrame()).not.toThrow();
  });
});
