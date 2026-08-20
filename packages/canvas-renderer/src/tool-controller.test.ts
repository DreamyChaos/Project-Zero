import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolController, CanvasTool } from './interaction/tool-controller';

describe('ToolController & Canvas Tool State Machine (Section 13 & 08_UI_UX)', () => {
  let controller: ToolController;
  let onToolChanged: (tool: CanvasTool) => void;
  let onAddStateRequest: (x: number, y: number) => void;
  let onEraseNodeRequest: (id: string) => void;
  let onEraseEdgeRequest: (id: string) => void;

  const createKeyEvent = (key: string, overrides: Partial<KeyboardEvent> = {}): KeyboardEvent =>
    ({
      key,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      metaKey: false,
      ...overrides,
    } as unknown as KeyboardEvent);

  beforeEach(() => {
    onToolChanged = vi.fn();
    onAddStateRequest = vi.fn();
    onEraseNodeRequest = vi.fn();
    onEraseEdgeRequest = vi.fn();

    controller = new ToolController({
      onToolChanged,
      onAddStateRequest,
      onEraseNodeRequest,
      onEraseEdgeRequest,
    });
  });

  it('initializes with select tool mode by default', () => {
    expect(controller.getTool()).toBe('select');
  });

  it('switches tool modes via setTool and triggers callback', () => {
    controller.setTool('add-state');
    expect(controller.getTool()).toBe('add-state');
    expect(onToolChanged).toHaveBeenCalledWith('add-state');

    controller.setTool('add-transition');
    expect(controller.getTool()).toBe('add-transition');

    controller.setTool('erase');
    expect(controller.getTool()).toBe('erase');
  });

  it('switches tool modes via keyboard shortcuts (V, S, T, E)', () => {
    expect(controller.handleKeyDown(createKeyEvent('s'))).toBe(true);
    expect(controller.getTool()).toBe('add-state');

    expect(controller.handleKeyDown(createKeyEvent('t'))).toBe(true);
    expect(controller.getTool()).toBe('add-transition');

    expect(controller.handleKeyDown(createKeyEvent('e'))).toBe(true);
    expect(controller.getTool()).toBe('erase');

    expect(controller.handleKeyDown(createKeyEvent('v'))).toBe(true);
    expect(controller.getTool()).toBe('select');
  });

  it('ignores hotkeys when modifier keys (Ctrl / Cmd / Alt) are pressed', () => {
    const ctrlS = createKeyEvent('s', { ctrlKey: true });
    expect(controller.handleKeyDown(ctrlS)).toBe(false);
    expect(controller.getTool()).toBe('select');
  });

  it('dispatches creation and deletion requests to callbacks', () => {
    controller.requestAddState(150, 250);
    expect(onAddStateRequest).toHaveBeenCalledWith(150, 250);

    controller.requestEraseNode('node_q0');
    expect(onEraseNodeRequest).toHaveBeenCalledWith('node_q0');

    controller.requestEraseEdge('edge_e0');
    expect(onEraseEdgeRequest).toHaveBeenCalledWith('edge_e0');
  });
});
