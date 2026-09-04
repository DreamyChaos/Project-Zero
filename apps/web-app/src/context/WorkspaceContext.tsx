import React, { createContext, useContext } from 'react';
import { DockProvider, useDock, DockContextType } from '../components/docking';
import { PanelRegionId } from '../components/docking/types';

export interface WorkspaceContextType extends DockContextType {
  // Backwards compatibility alias definitions if needed
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const WorkspaceStateBridge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dock = useDock();

  return (
    <WorkspaceContext.Provider value={dock}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <DockProvider>
      <WorkspaceStateBridge>{children}</WorkspaceStateBridge>
    </DockProvider>
  );
};

export const useWorkspace = (): WorkspaceContextType => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    // If not enclosed in WorkspaceContext specifically, try useDock directly
    try {
      return useDock() as WorkspaceContextType;
    } catch {
      throw new Error('useWorkspace must be used within a WorkspaceProvider');
    }
  }
  return context;
};

export type { PanelRegionId };
