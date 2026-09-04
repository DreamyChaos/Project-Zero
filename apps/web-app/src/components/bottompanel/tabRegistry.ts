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
import { ProgramConstructsTab } from './tabs/ProgramConstructsTab';
import { LexicalAnalyzerTab } from './tabs/LexicalAnalyzerTab';
import { AutomataRegexEquivalenceTab } from './tabs/AutomataRegexEquivalenceTab';
import { RegularLanguagesTab } from './tabs/RegularLanguagesTab';
import { PumpingLemmaTab } from './tabs/PumpingLemmaTab';
import { ChurchTuringTab } from './tabs/ChurchTuringTab';
import { RELanguagesTab } from './tabs/RELanguagesTab';
import { ReducibilityTab } from './tabs/ReducibilityTab';
import { HaltingProblemTab } from './tabs/HaltingProblemTab';
import { PCPTab } from './tabs/PCPTab';
import { ToolsTab } from './tabs/ToolsTab';
import { Play, Grid, Calculator, Layers, Terminal, Cpu, GitBranch, Search, Stethoscope, Trophy, BookOpen, Sparkles, Code, FileCode, Code2, Scale, Activity, Zap, AlertTriangle, Split, Wrench } from 'lucide-react';

export interface IWorkbenchCategory {
  id: string;
  label: string;
  tabs: IBottomTabDefinition[];
}

export const WORKBENCH_CATEGORIES: IWorkbenchCategory[] = [
  // -------------------------------------------------------------------------
  // 1. Execution & Debug — runtime simulation, trace, testing
  // -------------------------------------------------------------------------
  {
    id: 'execution',
    label: 'Execution',
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

  // -------------------------------------------------------------------------
  // 2. Automata Analysis — formal correctness & structure analysis
  // -------------------------------------------------------------------------
  {
    id: 'analysis',
    label: 'Analysis',
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
        label: 'Minimization',
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

  // -------------------------------------------------------------------------
  // 3. Language Theory — regular/context-free language properties
  // -------------------------------------------------------------------------
  {
    id: 'languages',
    label: 'Languages',
    tabs: [
      {
        id: 'regular-languages',
        label: 'Regular Languages',
        icon: BookOpen,
        shortcut: 'Ctrl+Shift+R',
        component: RegularLanguagesTab,
      },
      {
        id: 'pumping-lemma',
        label: 'Pumping Lemma',
        icon: Activity,
        shortcut: 'Ctrl+Shift+U',
        component: PumpingLemmaTab,
      },
      {
        id: 'fa-regex-equivalence',
        label: 'FA ↔ RegEx',
        icon: Scale,
        shortcut: 'Ctrl+Shift+E',
        component: AutomataRegexEquivalenceTab,
      },
      {
        id: 'program-constructs',
        label: 'Program Constructs',
        icon: FileCode,
        shortcut: 'Ctrl+Shift+P',
        component: ProgramConstructsTab,
      },
      {
        id: 'lexical-analyzer',
        label: 'Lexical Analyzer',
        icon: Code2,
        shortcut: 'Ctrl+Shift+L',
        component: LexicalAnalyzerTab,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 4. Computability Theory — decidability, complexity, reductions
  // -------------------------------------------------------------------------
  {
    id: 'computability',
    label: 'Computability',
    tabs: [
      {
        id: 'church-turing',
        label: 'Church–Turing Thesis',
        icon: Scale,
        component: ChurchTuringTab,
      },
      {
        id: 're-languages',
        label: 'Recursive & RE Languages',
        icon: GitBranch,
        component: RELanguagesTab,
      },
      {
        id: 'reducibility',
        label: 'Reducibility',
        icon: Zap,
        component: ReducibilityTab,
      },
      {
        id: 'halting-problem',
        label: 'Halting Problem',
        icon: AlertTriangle,
        component: HaltingProblemTab,
      },
      {
        id: 'pcp',
        label: 'Post Correspondence (PCP)',
        icon: Split,
        component: PCPTab,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 5. CFG Workbench — context-free grammar analysis and parsing
  // -------------------------------------------------------------------------
  {
    id: 'cfg',
    label: 'Grammar',
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

  // -------------------------------------------------------------------------
  // 6. Tools — interoperability and export tools
  // -------------------------------------------------------------------------
  {
    id: 'tools',
    label: 'Tools',
    tabs: [
      {
        id: 'tools',
        label: 'Tools (JFLAP/LEX/YACC)',
        icon: Wrench,
        component: ToolsTab,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 7. Challenges — automata problem sets
  // -------------------------------------------------------------------------
  {
    id: 'challenges',
    label: 'Challenges',
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

/** Flat list of all tabs across all categories — preserved for backward compatibility */
export const BOTTOM_PANEL_TABS: IBottomTabDefinition[] = WORKBENCH_CATEGORIES.flatMap((c) => c.tabs);
