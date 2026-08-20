import { ComponentType } from 'react';
import { LucideIcon } from 'lucide-react';

export type BottomTabId =
  | 'diagnostics'
  | 'challenges'
  | 'grammar'
  | 'analysis'
  | 'trace'
  | 'matrix'
  | 'math'
  | 'tester'
  | 'logs'
  | 'algorithm'
  | 'pda-branch'
  | 'minimization-explanation'
  | 'regex-explanation';

export interface IBottomTabDefinition {
  id: BottomTabId;
  label: string;
  icon: LucideIcon;
  badge?: string;
  shortcut?: string;
  component: ComponentType;
}

