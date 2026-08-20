import React from 'react';
import { ITreeItem } from './types';
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileCode, CheckCircle2, Box } from 'lucide-react';

interface SidebarTreeItemProps {
  item: ITreeItem;
  level?: number;
  activeId: string | null;
  onSelect: (item: ITreeItem) => void;
  onToggleExpand: (id: string) => void;
}

export const SidebarTreeItem: React.FC<SidebarTreeItemProps> = ({
  item,
  level = 0,
  activeId,
  onSelect,
  onToggleExpand,
}) => {
  const isSelected = activeId === item.id;
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = !!item.isExpanded;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(item);
      if (hasChildren) {
        onToggleExpand(item.id);
      }
    } else if (e.key === 'ArrowRight' && hasChildren && !isExpanded) {
      e.preventDefault();
      onToggleExpand(item.id);
    } else if (e.key === 'ArrowLeft' && hasChildren && isExpanded) {
      e.preventDefault();
      onToggleExpand(item.id);
    }
  };

  const getIcon = () => {
    switch (item.type) {
      case 'folder':
        return isExpanded ? (
          <FolderOpen size={14} className="text-accent-primary shrink-0" />
        ) : (
          <Folder size={14} className="text-txt-muted shrink-0" />
        );
      case 'project':
        return <FileCode size={14} className="text-accent-primary shrink-0" />;
      case 'model':
        return <Box size={14} className="text-semantic-info shrink-0" />;
      case 'exercise':
        return <CheckCircle2 size={14} className="text-semantic-accept shrink-0" />;
      default:
        return <FileCode size={14} className="text-txt-muted shrink-0" />;
    }
  };

  return (
    <div role="treeitem" aria-expanded={hasChildren ? isExpanded : undefined} aria-selected={isSelected}>
      <div
        tabIndex={0}
        onClick={() => {
          onSelect(item);
          if (hasChildren) {
            onToggleExpand(item.id);
          }
        }}
        onKeyDown={handleKeyDown}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        className={`group flex items-center justify-between py-1.5 pr-2 rounded-md text-xs cursor-pointer select-none outline-none transition-all ${
          isSelected
            ? 'bg-accent-primary/15 text-accent-primary font-medium border border-accent-primary/30 shadow-sm'
            : 'text-txt-secondary hover:text-txt-primary hover:bg-bg-surface2'
        } focus-visible:ring-2 focus-visible:ring-border-focus`}
      >
        <div className="flex items-center space-x-1.5 min-w-0">
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(item.id);
              }}
              className="p-0.5 rounded hover:bg-bg-surface3 text-txt-muted hover:text-txt-primary"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>
          ) : (
            <span className="w-4" />
          )}

          {getIcon()}
          <span className="truncate">{item.label}</span>
        </div>

        {item.badge && (
          <span className="text-[10px] px-1.5 py-0.2 font-mono rounded bg-bg-surface3 text-txt-muted border border-border-subtle shrink-0">
            {item.badge}
          </span>
        )}
      </div>

      {/* Render Sub-Tree Children */}
      {hasChildren && isExpanded && (
        <div role="group" className="space-y-0.5 mt-0.5">
          {item.children!.map((child) => (
            <SidebarTreeItem
              key={child.id}
              item={child}
              level={level + 1}
              activeId={activeId}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
};
