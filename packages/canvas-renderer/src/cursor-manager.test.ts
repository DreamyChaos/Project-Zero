import { describe, it, expect, vi } from 'vitest';
import { CursorManager } from './interaction/cursor-manager';
import { InteractionState } from './interaction/interaction-state';

describe('CursorManager Subsystem', () => {
  it('initializes to default cursor and updates on explicit set', () => {
    const onCursorChange = vi.fn();
    const cursorMgr = new CursorManager(onCursorChange);

    expect(cursorMgr.getCursor()).toBe('default');

    cursorMgr.setCursor('grab');
    expect(cursorMgr.getCursor()).toBe('grab');
    expect(onCursorChange).toHaveBeenCalledWith('grab');
  });

  it('maps interaction states to proper visual cursor styles', () => {
    const cursorMgr = new CursorManager();

    cursorMgr.updateCursorForState(InteractionState.Panning, false, false);
    expect(cursorMgr.getCursor()).toBe('grabbing');

    cursorMgr.updateCursorForState(InteractionState.DraggingNode, true, true);
    expect(cursorMgr.getCursor()).toBe('move');

    cursorMgr.updateCursorForState(InteractionState.CreatingEdge, false, false);
    expect(cursorMgr.getCursor()).toBe('crosshair');

    cursorMgr.updateCursorForState(InteractionState.MarqueeSelection, false, false);
    expect(cursorMgr.getCursor()).toBe('crosshair');

    cursorMgr.updateCursorForState(InteractionState.Hover, true, true);
    expect(cursorMgr.getCursor()).toBe('grab');

    cursorMgr.updateCursorForState(InteractionState.Hover, true, false);
    expect(cursorMgr.getCursor()).toBe('pointer');

    cursorMgr.updateCursorForState(InteractionState.Idle, false, false);
    expect(cursorMgr.getCursor()).toBe('grab');
  });
});
