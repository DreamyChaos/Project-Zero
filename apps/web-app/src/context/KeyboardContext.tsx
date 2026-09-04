import React, { createContext, useContext, useEffect } from 'react';
import { useCommandPalette } from './CommandPaletteContext';
import { useWorkspace } from './WorkspaceContext';
import { useGraph } from './GraphContext';

interface KeyboardContextType {
  lastShortcutPressed: string | null;
}

const KeyboardContext = createContext<KeyboardContextType | undefined>(undefined);

export const KeyboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { togglePalette, closePalette, isOpen } = useCommandPalette();
  const {
    toggleSidebar,
    toggleInspector,
    toggleFocusMode,
    exitFocusMode,
    focusMode,
    aiWorkspaceOpen,
    closeAIWorkspace,
  } = useWorkspace();
  const { setTool, undo, redo, copySelection, pasteSelection, deleteSelected } = useGraph();
  const [lastShortcutPressed, setLastShortcutPressed] = React.useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key shortcuts if typing in text inputs or textareas or editable fields
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        if (e.key === 'Escape' && isOpen) {
          closePalette();
        }
        return;
      }

      // Check for Ctrl/Cmd shortcuts
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();

        // Ctrl+Z / Ctrl+Shift+Z: Undo / Redo
        if (key === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
            setLastShortcutPressed('Ctrl+Shift+Z');
          } else {
            undo();
            setLastShortcutPressed('Ctrl+Z');
          }
          return;
        }

        // Ctrl+C: Copy Selection
        if (key === 'c' && !e.shiftKey) {
          e.preventDefault();
          copySelection();
          setLastShortcutPressed('Ctrl+C');
          return;
        }

        // Ctrl+V: Paste Selection
        if (key === 'v' && !e.shiftKey) {
          e.preventDefault();
          pasteSelection();
          setLastShortcutPressed('Ctrl+V');
          return;
        }

        // Ctrl+B: Toggle Sidebar
        if (key === 'b' && !e.shiftKey) {
          e.preventDefault();
          toggleSidebar();
          setLastShortcutPressed('Ctrl+B');
          return;
        }

        // Ctrl+Shift+P: Toggle Property Inspector
        if (key === 'p' && e.shiftKey) {
          e.preventDefault();
          toggleInspector();
          setLastShortcutPressed('Ctrl+Shift+P');
          return;
        }

        // Ctrl+K: Open Command Palette
        if (key === 'k') {
          e.preventDefault();
          togglePalette();
          setLastShortcutPressed('Ctrl+K');
          return;
        }

        // Ctrl+Shift+F: Toggle Focus Mode
        if (key === 'f' && e.shiftKey) {
          e.preventDefault();
          toggleFocusMode();
          setLastShortcutPressed('Ctrl+Shift+F');
          return;
        }
      }

      // Delete / Backspace: Remove selection
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
        setLastShortcutPressed('Delete');
        return;
      }

      // Tool Quick-Switch Shortcuts (V, S, T, E) when no modifier keys are pressed
      if (!e.ctrlKey && !e.metaKey && !e.altKey && !isOpen) {
        const key = e.key.toLowerCase();
        switch (key) {
          case 'v':
            if (e.shiftKey) {
              setTool('box');
              setLastShortcutPressed('Shift+V');
            } else {
              setTool('select');
              setLastShortcutPressed('V');
            }
            return;
          case 's':
            setTool('add-state');
            setLastShortcutPressed('S');
            return;
          case 't':
            setTool('add-transition');
            setLastShortcutPressed('T');
            return;
          case 'e':
            setTool('erase');
            setLastShortcutPressed('E');
            return;
        }
      }

      // Escape: Close Command Palette, AI Workspace, or Exit Focus Mode
      if (e.key === 'Escape') {
        if (isOpen) {
          closePalette();
        } else if (aiWorkspaceOpen) {
          closeAIWorkspace();
        } else if (focusMode) {
          exitFocusMode();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePalette, closePalette, isOpen, toggleSidebar, toggleInspector, toggleFocusMode, exitFocusMode, focusMode, aiWorkspaceOpen, closeAIWorkspace, setTool, undo, redo, copySelection, pasteSelection, deleteSelected]);

  return (
    <KeyboardContext.Provider value={{ lastShortcutPressed }}>
      {children}
    </KeyboardContext.Provider>
  );
};

export const useKeyboard = (): KeyboardContextType => {
  const context = useContext(KeyboardContext);
  if (!context) {
    throw new Error('useKeyboard must be used within a KeyboardProvider');
  }
  return context;
};
