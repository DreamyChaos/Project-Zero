import React, { useEffect, useRef } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ContextMenuContext = 'empty' | 'node' | 'edge';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  danger?: boolean;
  disabled?: boolean;
  dividerAbove?: boolean;
}

export interface CanvasContextMenuProps {
  /** Screen X position where the menu should appear */
  x: number;
  /** Screen Y position where the menu should appear */
  y: number;
  items: ContextMenuItem[];
  onAction: (itemId: string) => void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Styling helpers — no Tailwind dependency; zero external CSS
// ---------------------------------------------------------------------------

const MENU_STYLE: React.CSSProperties = {
  position: 'fixed',
  zIndex: 9999,
  minWidth: 188,
  maxWidth: 260,
  background: 'var(--color-bg-surface1, #1e2128)',
  border: '1px solid var(--color-border-subtle, #2d3140)',
  borderRadius: 10,
  boxShadow: '0 8px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.25)',
  padding: '4px 0',
  userSelect: 'none',
  pointerEvents: 'auto',
  fontFamily: 'inherit',
  fontSize: 13,
};

const ITEM_BASE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '7px 14px',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  lineHeight: '1.4',
  transition: 'background 0.1s',
  borderRadius: 0,
  background: 'transparent',
  border: 'none',
  width: '100%',
  textAlign: 'left',
};

const DIVIDER_STYLE: React.CSSProperties = {
  margin: '4px 0',
  border: 'none',
  borderTop: '1px solid var(--color-border-subtle, #2d3140)',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const CanvasContextMenu: React.FC<CanvasContextMenuProps> = ({
  x,
  y,
  items,
  onAction,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Clamp position to viewport so menu never clips
  const menuWidth = 200;
  const menuHeight = items.length * 34 + 10;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const left = Math.min(x, vw - menuWidth - 8);
  const top = Math.min(y, vh - menuHeight - 8);

  // Escape closes menu
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [onClose]);

  // Click outside closes menu
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Use capture so we catch it before other handlers
    window.addEventListener('mousedown', handleMouseDown, true);
    return () => window.removeEventListener('mousedown', handleMouseDown, true);
  }, [onClose]);

  // Right-click elsewhere replaces menu (close current one, parent will open new)
  useEffect(() => {
    const handleContext = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('contextmenu', handleContext, true);
    return () => window.removeEventListener('contextmenu', handleContext, true);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Canvas context menu"
      data-testid="canvas-context-menu"
      style={{ ...MENU_STYLE, left, top }}
    >
      {items.map((item) => (
        <React.Fragment key={item.id}>
          {item.dividerAbove && <hr style={DIVIDER_STYLE} />}
          <button
            role="menuitem"
            data-testid={`ctx-menu-item-${item.id}`}
            disabled={item.disabled}
            style={{
              ...ITEM_BASE,
              color: item.danger
                ? 'var(--color-accent-error, #f87171)'
                : item.disabled
                ? 'var(--color-txt-muted, #6b7280)'
                : 'var(--color-txt-primary, #e5e7eb)',
              opacity: item.disabled ? 0.5 : 1,
              cursor: item.disabled ? 'default' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!item.disabled) {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'var(--color-bg-surface2, #252830)';
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
            onClick={() => {
              if (!item.disabled) {
                onAction(item.id);
                onClose();
              }
            }}
          >
            {item.icon && (
              <span
                style={{ fontSize: 15, width: 18, textAlign: 'center', flexShrink: 0 }}
                aria-hidden="true"
              >
                {item.icon}
              </span>
            )}
            <span>{item.label}</span>
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};
