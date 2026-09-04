import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { WORKBENCH_CATEGORIES } from './tabRegistry';
import { BottomTabId } from './types';
import { ChevronDown, ChevronUp } from 'lucide-react';

export const DesktopBottomPanel: React.FC = () => {
  const {
    bottomPanelCollapsed,
    bottomPanelHidden,
    bottomPanelHeight,
    toggleBottomPanel,
    activeBottomTab,
    setActiveBottomTab,
  } = useWorkspace();

  const [activeCategoryId, setActiveCategoryId] = useState<string>('execution');

  // Sync active tab with context if provided
  const currentTabId = activeBottomTab || 'trace';

  // Find category containing active tab
  useEffect(() => {
    const matchingCat = WORKBENCH_CATEGORIES.find((c) =>
      c.tabs.some((t) => t.id === currentTabId)
    );
    if (matchingCat && matchingCat.id !== activeCategoryId) {
      setActiveCategoryId(matchingCat.id);
    }
  }, [currentTabId, activeCategoryId]);

  // Listen for programmatic tab navigation events
  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const customEvent = e as CustomEvent<{ categoryId?: string; tabId: string }>;
      if (customEvent.detail) {
        if (customEvent.detail.categoryId) {
          setActiveCategoryId(customEvent.detail.categoryId);
        }
        if (customEvent.detail.tabId) {
          setActiveBottomTab(customEvent.detail.tabId as BottomTabId);
        }
      }
    };
    window.addEventListener('navigate-to-tab', handleNavigate);
    return () => window.removeEventListener('navigate-to-tab', handleNavigate);
  }, [setActiveBottomTab]);

  if (bottomPanelHidden) {
    return null;
  }

  const activeCategory = WORKBENCH_CATEGORIES.find((c) => c.id === activeCategoryId) || WORKBENCH_CATEGORIES[0];
  const activeCategoryTabs = activeCategory.tabs;

  // Ensure active tab belongs to current active category
  const currentTabDef =
    activeCategoryTabs.find((t) => t.id === currentTabId) || activeCategoryTabs[0];
  const ActiveComponent = currentTabDef.component;

  const handleCategorySelect = (catId: string) => {
    setActiveCategoryId(catId);
    const cat = WORKBENCH_CATEGORIES.find((c) => c.id === catId);
    if (cat && cat.tabs.length > 0) {
      setActiveBottomTab(cat.tabs[0].id);
    }
  };

  return (
    <div
      aria-label="Bottom Telemetry & Verification Panel"
      id="bottom-panel"
      style={{ height: bottomPanelCollapsed ? '32px' : `${bottomPanelHeight}px` }}
      className="bg-bg-surface1 border-t border-border-subtle flex flex-col select-none z-10 shrink-0 transition-all duration-150"
    >
      {/* Category Header Bar & Tabs Bar */}
      <div className="h-8 border-b border-border-subtle bg-bg-surface2/60 px-2 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center space-x-3 overflow-x-auto overflow-y-hidden">
          {/* Category Pill Switcher */}
          <div className="flex items-center space-x-1 bg-bg-surface3 border border-border-subtle p-0.5 rounded text-[11px] font-mono shrink-0">
            {WORKBENCH_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat.id)}
                className={`px-2 py-0.5 rounded transition-all font-semibold ${
                  activeCategoryId === cat.id
                    ? 'bg-accent-primary text-white shadow-xs'
                    : 'text-txt-muted hover:text-txt-primary hover:bg-bg-surface2'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="h-4 w-[1px] bg-border-subtle shrink-0" />

          {/* Sub-tabs for selected Category */}
          <div role="tablist" className="flex items-center space-x-1 overflow-x-auto shrink-0">
            {activeCategoryTabs.map((tab) => {
              const Icon = tab.icon;
              const isSelected = currentTabDef.id === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={isSelected}
                  aria-controls={`panel-${tab.id}`}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => setActiveBottomTab(tab.id)}
                  className={`px-2.5 py-0.5 flex items-center space-x-1.5 text-[11px] font-medium rounded transition-all outline-none focus-visible:ring-1 focus-visible:ring-border-focus shrink-0 ${
                    isSelected
                      ? 'bg-bg-surface1 text-txt-primary border border-border-subtle shadow-xs'
                      : 'text-txt-muted hover:text-txt-secondary'
                  }`}
                >
                  <Icon size={12} className="shrink-0 text-accent-primary" />
                  <span className="truncate">{tab.label}</span>
                  {tab.badge && (
                    <span className="text-[9px] px-1 py-0.1 rounded font-mono bg-semantic-accept/15 text-semantic-accept border border-semantic-accept/30">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={toggleBottomPanel}
          className="p-1 rounded text-txt-muted hover:text-txt-primary hover:bg-bg-surface2 outline-none focus-visible:ring-1 focus-visible:ring-border-focus"
          aria-label={bottomPanelCollapsed ? 'Expand Bottom Panel' : 'Collapse Bottom Panel'}
        >
          {bottomPanelCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Active Tab Panel Content Area */}
      {!bottomPanelCollapsed && (
        <div
          id={`panel-${currentTabDef.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${currentTabDef.id}`}
          tabIndex={0}
          className="flex-1 flex flex-col overflow-hidden outline-none"
        >
          <ActiveComponent />
        </div>
      )}
    </div>
  );
};
