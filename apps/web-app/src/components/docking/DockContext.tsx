import { createContext, useContext } from 'react';
import { IDockState, IDockControls } from './types';

export type DockContextType = IDockState & IDockControls;

export const DockContext = createContext<DockContextType | undefined>(undefined);

export const useDock = (): DockContextType => {
  const context = useContext(DockContext);
  if (!context) {
    throw new Error('useDock must be used within a DockProvider');
  }
  return context;
};
