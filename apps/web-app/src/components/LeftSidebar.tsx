import React from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { SidebarExplorer } from './sidebar/SidebarExplorer';
import { FolderTree } from 'lucide-react';

export const LeftSidebar: React.FC = () => {
  const { sidebarCollapsed, sidebarHidden, sidebarWidth } = useWorkspace();

  if (sidebarCollapsed || sidebarHidden) {
    return null;
  }

  return (
    <aside
      aria-label="Sidebar Navigation"
      id="sidebar-panel"
      style={{ width: `${sidebarWidth}px` }}
      className="bg-bg-surface1 border-r border-border-subtle flex flex-col select-none z-10 shrink-0 transition-all duration-150"
    >
      {/* Sidebar Header */}
      <div className="px-3 py-2 border-b border-border-subtle bg-bg-surface2/50 text-xs font-semibold tracking-wider text-txt-primary flex items-center space-x-2">
        <FolderTree size={14} className="text-accent-primary" />
        <span className="font-mono text-[11px] uppercase">Project Explorer</span>
      </div>

      {/* Explorer Body */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div id="explorer-panel" role="region" aria-label="Project Explorer" className="flex-1 flex flex-col overflow-hidden">
          <SidebarExplorer />
        </div>
      </div>
    </aside>
  );
};
