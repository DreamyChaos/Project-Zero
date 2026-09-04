/**
 * useCanvasContextMenu
 *
 * Manages canvas right-click context menu state.
 * Resolves the context (empty / node / edge) using the existing CanvasEngine
 * hit-testing infrastructure (no direct spatial math here — delegates to engine).
 *
 * Returns menu state and an open handler to attach to the canvas contextmenu event.
 */

import { useState, useCallback } from 'react';
import type { StateNode } from '@project-zero/canvas-renderer';
import type { ContextMenuContext, ContextMenuItem } from '../components/CanvasContextMenu';

// ---------------------------------------------------------------------------
// Menu state
// ---------------------------------------------------------------------------

export interface ContextMenuState {
  open: boolean;
  x: number;
  y: number;
  context: ContextMenuContext;
  targetNodeId: string | null;
  targetEdgeId: string | null;
}

const CLOSED: ContextMenuState = {
  open: false,
  x: 0,
  y: 0,
  context: 'empty',
  targetNodeId: null,
  targetEdgeId: null,
};

// ---------------------------------------------------------------------------
// Item builders (pure functions — easy to unit test)
// ---------------------------------------------------------------------------

/**
 * Returns context menu items for an empty canvas right-click.
 */
export function buildEmptyCanvasMenuItems(hasClipboard: boolean): ContextMenuItem[] {
  return [
    { id: 'create-state', label: 'Create State', icon: '⊕' },
    { id: 'select-all', label: 'Select All', icon: '⬚', dividerAbove: true },
    { id: 'clear-selection', label: 'Clear Selection', icon: '✕' },
    { id: 'paste', label: 'Paste', icon: '⎘', disabled: !hasClipboard },
  ];
}

/**
 * Returns context menu items for a right-clicked state node.
 */
export function buildNodeMenuItems(node: StateNode): ContextMenuItem[] {
  return [
    { id: 'set-initial', label: 'Set as Initial State', icon: '▶', disabled: !!node.isInitial },
    { id: 'toggle-accepting', label: node.isAccepting ? 'Unset Accepting State' : 'Set as Accepting State', icon: '◎' },
    { id: 'delete-node', label: 'Delete State', icon: '🗑', danger: true, dividerAbove: true },
  ];
}

/**
 * Returns context menu items for a right-clicked transition edge.
 */
export function buildEdgeMenuItems(): ContextMenuItem[] {
  return [
    { id: 'edit-transition', label: 'Edit Transition', icon: '✏' },
    { id: 'delete-edge', label: 'Delete Transition', icon: '🗑', danger: true, dividerAbove: true },
  ];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCanvasContextMenu() {
  const [menuState, setMenuState] = useState<ContextMenuState>(CLOSED);

  const openMenu = useCallback(
    (
      x: number,
      y: number,
      context: ContextMenuContext,
      targetNodeId: string | null,
      targetEdgeId: string | null
    ) => {
      setMenuState({ open: true, x, y, context, targetNodeId, targetEdgeId });
    },
    []
  );

  const closeMenu = useCallback(() => {
    setMenuState(CLOSED);
  }, []);

  return { menuState, openMenu, closeMenu };
}
