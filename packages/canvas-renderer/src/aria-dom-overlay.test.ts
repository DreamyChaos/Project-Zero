import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AriaDomOverlaySync } from './accessibility/aria-dom-overlay';
import { StateNode } from './state/state-node';
import { TransitionEdge } from './edge/edge-transition';

interface DOMEventLike {
  readonly type: string;
}

class MockElement {
  public tagName: string;
  public attributes: Map<string, string> = new Map();
  public style: Record<string, string> = {};
  public children: MockElement[] = [];
  public parentNode: MockElement | null = null;
  public textContent: string = '';
  public tabIndex: number = -1;
  public eventListeners: Map<string, Array<(event: DOMEventLike) => void>> = new Map();

  constructor(tagName: string) {
    this.tagName = tagName;
  }

  public setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  public getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  public appendChild(child: MockElement): MockElement {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  public removeChild(child: MockElement): MockElement {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }

  public addEventListener(event: string, handler: (e: DOMEventLike) => void): void {
    const list = this.eventListeners.get(event) ?? [];
    list.push(handler);
    this.eventListeners.set(event, list);
  }

  public dispatchEvent(event: DOMEventLike): boolean {
    const list = this.eventListeners.get(event.type) ?? [];
    for (let i = 0; i < list.length; i++) {
      list[i](event);
    }
    return true;
  }

  public focus(): void {
    this.dispatchEvent({ type: 'focus' });
  }

  public querySelector(selector: string): MockElement | null {
    if (selector.startsWith('[role="')) {
      const role = selector.slice(7, -2);
      if (this.getAttribute('role') === role) return this;
      for (const child of this.children) {
        const found = child.querySelector(selector);
        if (found) return found;
      }
    } else if (selector.startsWith('button[data-node-id="')) {
      const id = selector.slice(21, -2);
      if (this.tagName === 'button' && this.getAttribute('data-node-id') === id) return this;
      for (const child of this.children) {
        const found = child.querySelector(selector);
        if (found) return found;
      }
    } else if (selector.startsWith('div[data-edge-id="')) {
      const id = selector.slice(18, -2);
      if (this.tagName === 'div' && this.getAttribute('data-edge-id') === id) return this;
      for (const child of this.children) {
        const found = child.querySelector(selector);
        if (found) return found;
      }
    }
    return null;
  }
}

describe('AriaDomOverlaySync & Screen Reader Accessibility (Section 18)', () => {
  let overlay: AriaDomOverlaySync;
  let container: MockElement;
  let originalDocument: unknown;

  const nodeQ0: StateNode = { id: 'q0', label: 'q0', x: 100, y: 100, radius: 32, isInitial: true };
  const nodeQ1: StateNode = { id: 'q1', label: 'q1', x: 300, y: 100, radius: 32, isAccepting: true };
  const edge0: TransitionEdge = { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a' };

  beforeEach(() => {
    const globalContext = globalThis as unknown as { document: unknown };
    originalDocument = globalContext.document;
    globalContext.document = {
      createElement: (tag: string) => new MockElement(tag),
    };

    container = new MockElement('div');
    overlay = new AriaDomOverlaySync();
    overlay.attach(container as unknown as HTMLElement);
  });

  afterEach(() => {
    overlay.detach();
    const globalContext = globalThis as unknown as { document: unknown };
    globalContext.document = originalDocument;
  });

  it('attaches semantic ARIA container and live announcement region to DOM', () => {
    const region = container.querySelector('[role="region"]');
    expect(region).not.toBeNull();
    expect(region?.getAttribute('aria-label')).toBe('Finite Automata Interactive Graph Canvas');

    const live = container.querySelector('[role="status"]');
    expect(live).not.toBeNull();
    expect(live?.getAttribute('aria-live')).toBe('polite');
  });

  it('synchronizes StateNode interactive button elements with WCAG 2.1 AA labels', () => {
    overlay.syncNodes([nodeQ0, nodeQ1], [edge0]);

    const btnQ0 = container.querySelector('button[data-node-id="q0"]');
    expect(btnQ0).not.toBeNull();
    expect(btnQ0?.getAttribute('aria-label')).toBe('State q0, Initial State, 1 outgoing transition');
    expect(btnQ0?.getAttribute('aria-selected')).toBe('false');

    const btnQ1 = container.querySelector('button[data-node-id="q1"]');
    expect(btnQ1).not.toBeNull();
    expect(btnQ1?.getAttribute('aria-label')).toBe('State q1, Accepting State, 0 outgoing transitions');
  });

  it('synchronizes TransitionEdge list items with semantic descriptions', () => {
    const map = new Map<string, StateNode>([
      ['q0', nodeQ0],
      ['q1', nodeQ1],
    ]);
    overlay.syncEdges([edge0], map);

    const edgeEl = container.querySelector('div[data-edge-id="e0"]');
    expect(edgeEl).not.toBeNull();
    expect(edgeEl?.getAttribute('aria-label')).toBe("Transition from q0 to q1 on symbol 'a'");
  });

  it('announces graph state updates to screen readers via aria-live polite region', () => {
    overlay.announce('State q0 selected.');
    const live = container.querySelector('[role="status"]');
    expect(live?.textContent).toBe('State q0 selected.');
  });

  it('auto-recovers spatial keyboard focus to nearest connected or spatial node when focused node is deleted', () => {
    const nodeQ2: StateNode = { id: 'q2', label: 'q2', x: 120, y: 100, radius: 32 };
    // Connect q0 to q2 via edge
    const edgeConnected: TransitionEdge = { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q2', label: 'b' };
    overlay.syncNodes([nodeQ0, nodeQ1, nodeQ2], [edgeConnected]);

    // Set focus to q0 at (100, 100)
    overlay.setFocusedNode('q0');
    expect(overlay.getFocusedNodeId()).toBe('q0');

    // Delete q0; nearest connected remaining node is q2 at (120, 100)
    overlay.syncNodes([nodeQ1, nodeQ2], []);
    expect(overlay.getFocusedNodeId()).toBe('q2');

    const live = container.querySelector('[role="status"]');
    expect(live?.textContent).toContain('Focused state deleted. Focus shifted to nearest State q2.');
  });

  it('prioritizes connected candidates and breaks distance ties deterministically', () => {
    // q0 at (100, 100)
    // q_disc at (110, 100) -> distance 10, but disconnected
    // q_conn_b at (150, 100) -> distance 50, connected
    // q_conn_a at (150, 100) -> distance 50, connected (same distance as q_conn_b)
    const qDisc: StateNode = { id: 'q_disc', label: 'Disc', x: 110, y: 100 };
    const qConnB: StateNode = { id: 'q_conn_b', label: 'B', x: 150, y: 100 };
    const qConnA: StateNode = { id: 'q_conn_a', label: 'A', x: 150, y: 100 };
    const edgeToA: TransitionEdge = { id: 'e_a', sourceNodeId: 'q0', targetNodeId: 'q_conn_a', label: 'a' };
    const edgeToB: TransitionEdge = { id: 'e_b', sourceNodeId: 'q0', targetNodeId: 'q_conn_b', label: 'b' };

    overlay.syncNodes([nodeQ0, qDisc, qConnA, qConnB], [edgeToA, edgeToB]);
    overlay.setFocusedNode('q0');

    // Delete q0. Even though q_disc is spatially closer, connected nodes are prioritized.
    // Between q_conn_a and q_conn_b (equal distance 50), q_conn_a wins lexicographical tie-break.
    overlay.syncNodes([qDisc, qConnA, qConnB], []);
    expect(overlay.getFocusedNodeId()).toBe('q_conn_a');
  });

  it('handles focus recovery when deleting the only node in the graph', () => {
    overlay.syncNodes([nodeQ0], []);
    overlay.setFocusedNode('q0');
    expect(overlay.getFocusedNodeId()).toBe('q0');

    // Delete only node -> canvas empty
    overlay.syncNodes([], []);
    expect(overlay.getFocusedNodeId()).toBeNull();
    const live = container.querySelector('[role="status"]');
    expect(live?.textContent).toBe('Focused state deleted. Canvas empty.');
  });

  it('dispatches callbacks on focus and activation', () => {
    const onFocused = vi.fn();
    const onActivated = vi.fn();
    const activeOverlay = new AriaDomOverlaySync({
      onNodeFocused: onFocused,
      onNodeActivated: onActivated,
    });
    activeOverlay.attach(container as unknown as HTMLElement);
    activeOverlay.syncNodes([nodeQ0], []);

    const btn = container.querySelector('button[data-node-id="q0"]') as unknown as MockElement;
    btn.dispatchEvent({ type: 'focus' });
    expect(onFocused).toHaveBeenCalledWith('q0');

    btn.dispatchEvent({ type: 'click' });
    expect(onActivated).toHaveBeenCalledWith('q0');

    activeOverlay.detach();
  });
});
