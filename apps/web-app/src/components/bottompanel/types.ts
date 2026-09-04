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
  | 'regex-explanation'
  | 'program-constructs'
  | 'lexical-analyzer'
  | 'fa-regex-equivalence'
  | 'regular-languages'
  | 'pumping-lemma'
  | 'church-turing'
  | 're-languages'
  | 'reducibility'
  | 'halting-problem'
  | 'pcp'
  | 'tools';

export interface IBottomTabDefinition {
  id: BottomTabId;
  label: string;
  icon: LucideIcon;
  badge?: string;
  shortcut?: string;
  component: ComponentType;
}

