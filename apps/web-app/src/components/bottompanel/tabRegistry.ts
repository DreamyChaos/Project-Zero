import { IBottomTabDefinition } from './types';
import { DiagnosticsTab } from './tabs/DiagnosticsTab';
import { ExecutionTraceTab } from './tabs/ExecutionTraceTab';
import { TransitionTableTab } from './tabs/TransitionTableTab';
import { FormalDefinitionTab } from './tabs/FormalDefinitionTab';
import { StringTesterTab } from './tabs/StringTesterTab';
import { LogsTab } from './tabs/LogsTab';
import { AlgorithmVisualizerTab } from './tabs/AlgorithmVisualizerTab';
import { PDABranchInspectorTab } from './tabs/PDABranchInspectorTab';
import { AnalysisPanelTab } from './tabs/AnalysisPanelTab';
import { ChallengeTab } from './tabs/ChallengeTab';
import { GrammarTab } from './tabs/GrammarTab';
import { MinimizationExplanationTab } from './tabs/MinimizationExplanationTab';
import { RegexExplanationTab } from './tabs/RegexExplanationTab';
import { Play, Grid, Calculator, Layers, Terminal, Cpu, GitBranch, Search, Stethoscope, Trophy, BookOpen, Sparkles, Code } from 'lucide-react';

export interface IWorkbenchCategory {
  id: string;
  label: string;
  tabs: IBottomTabDefinition[];
}

export const WORKBENCH_CATEGORIES: IWorkbenchCategory[] = [
  {
    id: 'execution',
    label: 'Execution & Debug',
    tabs: [
      {
        id: 'trace',
        label: 'Execution Trace',
        icon: Play,
        shortcut: 'Ctrl+1',
        component: ExecutionTraceTab,
      },
      {
        id: 'pda-branch',
        label: 'PDA Branch Tree',
        icon: GitBranch,
        shortcut: 'Ctrl+2',
        component: PDABranchInspectorTab,
      },
      {
        id: 'tester',
        label: 'Batch Tester',
        icon: Layers,
        badge: '4/4',
        shortcut: 'Ctrl+3',
        component: StringTesterTab,
      },
      {
        id: 'logs',
        label: 'Console Logs',
        icon: Terminal,
        shortcut: 'Ctrl+4',
        component: LogsTab,
      },
    ],
  },
  {
    id: 'analysis',
    label: 'Formal Analysis',
    tabs: [
      {
        id: 'diagnostics',
        label: 'Diagnostics',
        icon: Stethoscope,
        shortcut: 'Ctrl+5',
        component: DiagnosticsTab,
      },
      {
        id: 'analysis',
        label: 'Equivalence & Repair',
        icon: Search,
        shortcut: 'Ctrl+6',
        component: AnalysisPanelTab,
      },
      {
        id: 'minimization-explanation',
        label: 'Minimization Explanation',
        icon: Sparkles,
        component: MinimizationExplanationTab,
      },
      {
        id: 'regex-explanation',
        label: 'Regex Conversion',
        icon: Code,
        component: RegexExplanationTab,
      },
      {
        id: 'matrix',
        label: 'Transition Matrix',
        icon: Grid,
        shortcut: 'Ctrl+7',
        component: TransitionTableTab,
      },
      {
        id: 'math',
        label: 'Formal Math Spec',
        icon: Calculator,
        shortcut: 'Ctrl+8',
        component: FormalDefinitionTab,
      },
      {
        id: 'algorithm',
        label: 'Algorithm Steps',
        icon: Cpu,
        shortcut: 'Ctrl+9',
        component: AlgorithmVisualizerTab,
      },
    ],
  },
  {
    id: 'cfg',
    label: 'CFG Workbench',
    tabs: [
      {
        id: 'grammar',
        label: 'Grammar & Parser',
        icon: BookOpen,
        shortcut: 'Ctrl+0',
        component: GrammarTab,
      },
    ],
  },
  {
    id: 'challenges',
    label: 'Automata Challenges',
    tabs: [
      {
        id: 'challenges',
        label: 'Problem Sets',
        icon: Trophy,
        shortcut: 'Ctrl+Shift+C',
        component: ChallengeTab,
      },
    ],
  },
];

export const BOTTOM_PANEL_TABS: IBottomTabDefinition[] = WORKBENCH_CATEGORIES.flatMap((c) => c.tabs);

