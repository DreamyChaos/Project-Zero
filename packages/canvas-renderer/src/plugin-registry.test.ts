import { describe, it, expect, vi } from 'vitest';
import { PluginRegistry, CustomNodeShapePlugin } from './extension/plugin-registry';

describe('PluginRegistry Subsystem (Section 21)', () => {
  it('registers and retrieves custom node shape plugins', () => {
    const registry = new PluginRegistry();
    const mockPlugin: CustomNodeShapePlugin = {
      type: 'diamond-state',
      render: vi.fn(),
      hitTest: vi.fn().mockReturnValue(true),
    };

    registry.registerNodeShapePlugin(mockPlugin);
    expect(registry.hasNodeShapePlugin('diamond-state')).toBe(true);
    expect(registry.getNodeShapePlugin('diamond-state')).toBe(mockPlugin);

    expect(registry.removeNodeShapePlugin('diamond-state')).toBe(true);
    expect(registry.hasNodeShapePlugin('diamond-state')).toBe(false);
  });

  it('clears all registered plugins on reset', () => {
    const registry = new PluginRegistry();
    registry.registerNodeShapePlugin({ type: 'shape_a', render: vi.fn() });
    registry.registerNodeShapePlugin({ type: 'shape_b', render: vi.fn() });

    expect(registry.hasNodeShapePlugin('shape_a')).toBe(true);
    registry.clear();
    expect(registry.hasNodeShapePlugin('shape_a')).toBe(false);
    expect(registry.hasNodeShapePlugin('shape_b')).toBe(false);
  });
});
