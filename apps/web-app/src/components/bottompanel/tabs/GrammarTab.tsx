import React, { useState, useMemo, useEffect } from 'react';
import {
  ContextFreeGrammar,
  validateCFG,
  analyzeCFG,
  generateDerivation,
  evaluateCFGMembership,
  evaluateCFGBatchMembership,
  generateBoundedLanguageSample,
  analyzeGrammarAmbiguity,
  computeDetailedFirstFollowAnalysis,
  detectLeftRecursion,
  eliminateLeftRecursion,
  detectLeftFactoring,
  leftFactorGrammar,
  buildParseTreeFromDerivation,
  toChomskyNormalForm,
  validateCNF,
  toGreibachNormalForm,
  validateGNF,
  cykParse,
  analyzeLL1,
  parseLL1,
  CFGParseTreeNode,
  transformToPredictiveGrammar,
  convertCFGToPDA,
  CFG_PRESETS,
  parseCFGText,
  formatCFGText,
  parseTopDown,
  parseBottomUp,
  compareParsingApproaches,
  buildSLRTable,
  parseSLR,
  interpretSyntacticStatementWithPDA,
} from '@project-zero/core-solver';
import { useGraph } from '../../../context/GraphContext';
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  Layers,
  FileCode,
  Search,
  AlertTriangle,
  Plus,
  Trash2,
  Edit3,
  RefreshCw,
  Code,
  Check,
  Sparkles,
  Split,
  Zap,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  HelpCircle,
  FastForward,
  ArrowDown,
  ArrowUp,
} from 'lucide-react';

export type GrammarSubView =
  | 'EDITOR'
  | 'VALIDATE'
  | 'ANALYZE'
  | 'DERIVATION'
  | 'MEMBERSHIP'
  | 'AMBIGUITY'
  | 'FIRST_FOLLOW'
  | 'LEFT_RECURSION'
  | 'LEFT_FACTORING'
  | 'CNF'
  | 'GNF'
  | 'CYK'
  | 'PARSER_INTRO'
  | 'LL1_TABLE'
  | 'PREDICTIVE_PARSER'
  | 'SLR_COLLECTION'
  | 'SLR_PARSER'
  | 'TRANSFORM'
  | 'TRANSLATE'
  | 'SYNTACTIC_PDA';

export interface IGrammarSubViewItem {
  id: GrammarSubView;
  label: string;
  badge?: string;
}

export interface IGrammarLifecycleStage {
  id: 'DEFINE' | 'ANALYZE' | 'TRANSFORM' | 'PARSE' | 'INTERPRET';
  label: string;
  description: string;
  items: IGrammarSubViewItem[];
}

export const GRAMMAR_LIFECYCLE_STAGES: IGrammarLifecycleStage[] = [
  {
    id: 'DEFINE',
    label: '1. DEFINE',
    description: 'Grammar specification and formal verification',
    items: [
      { id: 'EDITOR', label: 'Grammar Editor' },
      { id: 'VALIDATE', label: 'Validation' },
    ],
  },
  {
    id: 'ANALYZE',
    label: '2. ANALYZE',
    description: 'Structural properties, derivation, and language evaluation',
    items: [
      { id: 'ANALYZE', label: 'Analysis' },
      { id: 'DERIVATION', label: 'Derivation' },
      { id: 'MEMBERSHIP', label: 'CF Language L(G)' },
      { id: 'AMBIGUITY', label: 'Ambiguity' },
      { id: 'FIRST_FOLLOW', label: 'FIRST / FOLLOW' },
    ],
  },
  {
    id: 'TRANSFORM',
    label: '3. TRANSFORM',
    description: 'Recursion elimination, factoring, and normal forms',
    items: [
      { id: 'LEFT_RECURSION', label: 'Left Recursion' },
      { id: 'LEFT_FACTORING', label: 'Left Factoring' },
      { id: 'CNF', label: 'Chomsky NF (CNF)' },
      { id: 'GNF', label: 'Greibach NF (GNF)' },
      { id: 'TRANSFORM', label: 'LL(1) Transform' },
    ],
  },
  {
    id: 'PARSE',
    label: '4. PARSE',
    description: 'Deterministic top-down, bottom-up, and chart parsing',
    items: [
      { id: 'PARSER_INTRO', label: 'Intro to Parsing (Topic 1)' },
      { id: 'CYK', label: 'CYK Parser' },
      { id: 'LL1_TABLE', label: 'LL(1) Table' },
      { id: 'PREDICTIVE_PARSER', label: 'Predictive Parser' },
      { id: 'SLR_COLLECTION', label: 'LR(0) Collection' },
      { id: 'SLR_PARSER', label: 'SLR Table & Parser' },
    ],
  },
  {
    id: 'INTERPRET',
    label: '5. INTERPRET',
    description: 'Automata equivalence and PDA execution',
    items: [
      { id: 'TRANSLATE', label: 'PDA ↔ CFG' },
      { id: 'SYNTACTIC_PDA', label: 'Syntactic PDA (Topic 6)' },
    ],
  },
];

const RenderParseTreeNode: React.FC<{ node: CFGParseTreeNode; isRoot?: boolean }> = ({ node, isRoot }) => {
  return (
    <div className={`flex flex-col items-center ${isRoot ? '' : 'mt-2'}`}>
      <div className="flex items-center gap-1">
        <span
          className={`px-2 py-0.5 rounded text-3xs font-mono font-bold shadow-sm ${
            node.symbol.type === 'NON_TERMINAL'
              ? 'bg-purple-900/80 text-purple-200 border border-purple-600/80'
              : node.symbol.type === 'TERMINAL'
              ? 'bg-emerald-900/80 text-emerald-200 border border-emerald-600/80'
              : 'bg-amber-900/80 text-amber-200 border border-amber-600/80'
          }`}
        >
          {node.symbol.type === 'EPSILON' ? 'ε' : node.symbol.value}
        </span>
        {node.productionId && (
          <span className="text-3xs text-txt-muted font-mono">{`(${node.productionId})`}</span>
        )}
      </div>

      {node.children.length > 0 && (
        <div className="flex items-start gap-2.5 mt-1.5 pt-1.5 border-t border-border-subtle/80 relative">
          {node.children.map((child, idx) => (
            <RenderParseTreeNode key={child.id || idx} node={child} />
          ))}
        </div>
      )}
    </div>
  );
};

export const GrammarTab: React.FC = () => {
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(0);
  const [testInput, setTestInput] = useState<string>('aabb');
  const [customGrammar, setCustomGrammar] = useState<ContextFreeGrammar | null>(null);
  const [activeSubView, setActiveSubView] = useState<GrammarSubView>('EDITOR');
  const [activeStageId, setActiveStageId] = useState<'DEFINE' | 'ANALYZE' | 'TRANSFORM' | 'PARSE' | 'INTERPRET'>('DEFINE');
  const [activeStepIdx, setActiveStepIdx] = useState<number>(0);

  // Sync activeStageId when activeSubView changes
  useEffect(() => {
    const stage = GRAMMAR_LIFECYCLE_STAGES.find((s) => s.items.some((item) => item.id === activeSubView));
    if (stage && stage.id !== activeStageId) {
      setActiveStageId(stage.id);
    }
  }, [activeSubView, activeStageId]);

  // Editor mode state
  const [editorMode, setEditorMode] = useState<'VISUAL' | 'TEXT'>('VISUAL');
  const [bnfText, setBnfText] = useState<string>('');
  const [newLhs, setNewLhs] = useState<string>('S');
  const [newRhs, setNewRhs] = useState<string>('');

  // Topic 2 Batch state
  const [customBatchCandidate, setCustomBatchCandidate] = useState<string>('');
  const [extraBatchStrings, setExtraBatchStrings] = useState<string[]>([]);

  // Topic 4 Ambiguity state
  const [ambiguityInput, setAmbiguityInput] = useState<string>('a+a*a');
  const [activeAmbiguityTreeIdx, setActiveAmbiguityTreeIdx] = useState<number>(0);
  const [ambiguityDerivMode, setAmbiguityDerivMode] = useState<'LEFTMOST' | 'RIGHTMOST'>('LEFTMOST');

  // Topic 5 FIRST & FOLLOW state
  const [selectedFirstFollowVar, setSelectedFirstFollowVar] = useState<string>('');
  const [showIterationDetails, setShowIterationDetails] = useState<boolean>(false);

  // Topic 9 CYK Interactive State
  const [selectedCYKCell, setSelectedCYKCell] = useState<{ i: number; j: number } | null>(null);
  const [cykStepIdx, setCykStepIdx] = useState<number>(0);
  const [isCykPlaying, setIsCykPlaying] = useState<boolean>(false);
  const [cykPlaySpeed, setCykPlaySpeed] = useState<number>(700);
  const [activeCykTreeIdx, setActiveCykTreeIdx] = useState<number>(0);
  const [showCykGrammarDiff, setShowCykGrammarDiff] = useState<boolean>(false);
  const [showCykTheory, setShowCykTheory] = useState<boolean>(false);

  // Module 4 Topic 1: Introduction to Parsing State
  const [parserIntroMode, setParserIntroMode] = useState<'TOP_DOWN' | 'BOTTOM_UP' | 'COMPARISON'>('TOP_DOWN');
  const [parserTopDownStepIdx, setParserTopDownStepIdx] = useState<number>(0);
  const [parserBottomUpStepIdx, setParserBottomUpStepIdx] = useState<number>(0);
  const [parserIsPlaying, setParserIsPlaying] = useState<boolean>(false);
  const [parserPlaySpeed, setParserPlaySpeed] = useState<number>(700);
  const [showParserIntroTheory, setShowParserIntroTheory] = useState<boolean>(false);

  // Module 4 Topic 2: LL(1) Interactive States
  const [selectedLL1Cell, setSelectedLL1Cell] = useState<{ variable: string; terminal: string } | null>(null);
  const [ll1StepIdx, setLl1StepIdx] = useState<number>(0);
  const [ll1IsPlaying, setLl1IsPlaying] = useState<boolean>(false);
  const [ll1PlaySpeed, setLl1PlaySpeed] = useState<number>(800);
  const [showLL1Theory, setShowLL1Theory] = useState<boolean>(false);

  // Module 4 Topic 3: SLR Parsing Interactive States
  const [selectedLR0StateId, setSelectedLR0StateId] = useState<number | null>(0);
  const [selectedSLRCell, setSelectedSLRCell] = useState<{ stateId: number; symbol: string; isGoto: boolean } | null>(null);
  const [slrStepIdx, setSlrStepIdx] = useState<number>(0);
  const [slrIsPlaying, setSlrIsPlaying] = useState<boolean>(false);
  const [slrPlaySpeed, setSlrPlaySpeed] = useState<number>(800);
  const [showSLRTheory, setShowSLRTheory] = useState<boolean>(false);

  // Module 4 Topic 6: Interpretation of Syntactic Statements using PDA
  const [syntacticInput, setSyntacticInput] = useState<string>('aabb');
  const [syntacticStepIdx, setSyntacticStepIdx] = useState<number>(0);
  const [syntacticIsPlaying, setSyntacticIsPlaying] = useState<boolean>(false);
  const [syntacticPlaySpeed, setSyntacticPlaySpeed] = useState<number>(700);
  const [showSyntacticTheory, setShowSyntacticTheory] = useState<boolean>(false);
  const [pdaLoadSuccess, setPdaLoadSuccess] = useState<string | null>(null);

  const { replaceMachine } = useGraph();


  const currentPreset = CFG_PRESETS[selectedPresetIdx] || CFG_PRESETS[0];
  const grammar = customGrammar || currentPreset.grammar;

  // Topic 8 & 9 CNF + CYK Computations (transient — no mutations)
  const isDirectGrammarCNF = useMemo(() => validateCNF(grammar).isValid, [grammar]);
  const cnfResult = useMemo(() => toChomskyNormalForm(grammar), [grammar]);
  const cnfValidation = useMemo(() => (cnfResult.success ? validateCNF(cnfResult.transformedGrammar) : null), [cnfResult]);

  const grammarUsedByCYK = useMemo(() => {
    if (isDirectGrammarCNF) return grammar;
    return cnfResult.success ? cnfResult.transformedGrammar : null;
  }, [isDirectGrammarCNF, grammar, cnfResult]);

  const cykResult = useMemo(() => {
    if (!grammarUsedByCYK) return null;
    return cykParse(grammarUsedByCYK, testInput);
  }, [grammarUsedByCYK, testInput]);

  // Auto-play timer for CYK
  useEffect(() => {
    if (!isCykPlaying) return;
    if (!cykResult || !cykResult.proofSteps || cykResult.proofSteps.length === 0) {
      setIsCykPlaying(false);
      return;
    }
    const timer = setInterval(() => {
      setCykStepIdx((prev) => {
        if (prev >= (cykResult.proofSteps?.length ?? 1) - 1) {
          setIsCykPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, cykPlaySpeed);
    return () => clearInterval(timer);
  }, [isCykPlaying, cykPlaySpeed, cykResult]);

  // Reset CYK stepping/selection on grammar or input changes
  useEffect(() => {
    setCykStepIdx(0);
    setIsCykPlaying(false);
    setSelectedCYKCell(null);
    setActiveCykTreeIdx(0);
  }, [grammar, testInput]);

  // Topic 6: Interpretation of Syntactic Statements using PDA result
  const syntacticResult = useMemo(() => {
    return interpretSyntacticStatementWithPDA(grammar, syntacticInput);
  }, [grammar, syntacticInput]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (syntacticIsPlaying && syntacticResult && syntacticResult.steps.length > 0) {
      timer = setInterval(() => {
        setSyntacticStepIdx((prev) => {
          if (prev >= syntacticResult.steps.length - 1) {
            setSyntacticIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, syntacticPlaySpeed);
    }
    return () => clearInterval(timer);
  }, [syntacticIsPlaying, syntacticPlaySpeed, syntacticResult]);

  useEffect(() => {
    setSyntacticStepIdx(0);
    setSyntacticIsPlaying(false);
    setPdaLoadSuccess(null);
  }, [grammar, syntacticInput]);

  // Default candidates according to current preset
  const defaultBatchCandidates = useMemo(() => {
    switch (currentPreset.id) {
      case 'anbn':
        return ['ε', 'ab', 'aabb', 'aaabbb', 'aaaabbbb', 'a', 'b', 'aab', 'abb', 'ba'];
      case 'as_b':
        return ['b', 'ab', 'aab', 'aaab', 'aaaab', 'ε', 'a', 'ba', 'bb'];
      case 'dyck':
        return ['ε', '()', '(())', '()()', '(()())', '(', ')', ')(', '(()'];
      case 'palindromes':
        return ['ε', 'a', 'b', 'aa', 'bb', 'aba', 'bab', 'abba', 'baab', 'ab', 'ba', 'aab'];
      case 'arithmetic':
      case 'ambiguous_expr':
      case 'unambiguous_expr':
        return ['a', 'b', 'a+b', 'a*b', '(a+b)*a', 'a+a*a', 'a*a+a', 'a+a+a'];
      case 'ambiguous_simple':
        return ['a', 'aa', 'aaa', 'ε'];
      default:
        return ['ε', 'a', 'b', 'ab', 'aabb'];
    }
  }, [currentPreset.id]);

  const defaultAmbiguityCandidates = useMemo(() => {
    switch (currentPreset.id) {
      case 'ambiguous_expr':
      case 'arithmetic':
      case 'unambiguous_expr':
        return ['a+a*a', 'a*a+a', '(a+a)*a', 'a+a+a', 'a*a*a', 'a+b', 'a*b'];
      case 'ambiguous_simple':
        return ['a', 'aa', 'aaa', 'ε'];
      case 'dyck':
        return ['()()', '(())()', '()'];
      case 'anbn':
        return ['ab', 'aabb', 'aaabbb'];
      default:
        return ['a+a*a', 'aa', 'ab'];
    }
  }, [currentPreset.id]);

  const allBatchStrings = useMemo(() => {
    const list = [...defaultBatchCandidates];
    for (const str of extraBatchStrings) {
      if (!list.includes(str)) list.push(str);
    }
    return list;
  }, [defaultBatchCandidates, extraBatchStrings]);

  // Sync BNF text on grammar change
  useEffect(() => {
    setBnfText(formatCFGText(grammar, { compactAlternatives: true }));
  }, [grammar]);

  // Pure Solver Computations
  const validationResult = useMemo(() => validateCFG(grammar), [grammar]);
  const analysisResult = useMemo(() => analyzeCFG(grammar), [grammar]);
  const derivationResult = useMemo(() => generateDerivation(grammar, testInput), [grammar, testInput]);
  const membershipResult = useMemo(() => evaluateCFGMembership(grammar, testInput), [grammar, testInput]);
  const batchResults = useMemo(() => evaluateCFGBatchMembership(grammar, allBatchStrings), [grammar, allBatchStrings]);
  const boundedLanguageSample = useMemo(() => generateBoundedLanguageSample(grammar, 6, 12), [grammar]);
  const parseTree = useMemo(() => buildParseTreeFromDerivation(derivationResult), [derivationResult]);
  const ambiguityResult = useMemo(() => analyzeGrammarAmbiguity(grammar, ambiguityInput), [grammar, ambiguityInput]);



  // Topic 8 GNF Computations (transient — no mutations)
  const gnfResult = useMemo(() => toGreibachNormalForm(grammar), [grammar]);
  const gnfValidation = useMemo(() => (gnfResult.success ? validateGNF(gnfResult.transformedGrammar) : null), [gnfResult]);

  // LL(1) Analysis & Predictive Parser Computations (transient — no mutations)
  const ll1Analysis = useMemo(() => analyzeLL1(grammar), [grammar]);
  const ll1ParseResult = useMemo(() => parseLL1(grammar, testInput), [grammar, testInput]);

  // Module 4 Topic 3: SLR Parser Computations (transient — no mutations)
  const slrBuildResult = useMemo(() => buildSLRTable(grammar), [grammar]);
  const slrParseResult = useMemo(() => parseSLR(grammar, testInput), [grammar, testInput]);

  // Transformation Engine Computation (transient preview — no mutations)
  const transformResult = useMemo(() => transformToPredictiveGrammar(grammar), [grammar]);

  // Topic 5 FIRST & FOLLOW Engine Computation
  const firstFollowAnalysis = useMemo(() => computeDetailedFirstFollowAnalysis(grammar), [grammar]);

  // Topic 6 Left Recursion Engine Computations
  const leftRecursionDiag = useMemo(() => detectLeftRecursion(grammar), [grammar]);
  const leftRecursionResult = useMemo(() => eliminateLeftRecursion(grammar), [grammar]);

  // Topic 7 Left Factoring Engine Computations
  const leftFactoringDiag = useMemo(() => detectLeftFactoring(grammar), [grammar]);
  const leftFactoringResult = useMemo(() => leftFactorGrammar(grammar), [grammar]);

  // Module 4 Topic 1: Parsing Computations & State Sync
  const topDownResult = useMemo(() => {
    return parseTopDown(grammar, testInput);
  }, [grammar, testInput]);

  const bottomUpResult = useMemo(() => {
    return parseBottomUp(grammar, testInput);
  }, [grammar, testInput]);

  const comparisonResult = useMemo(() => {
    return compareParsingApproaches(grammar, testInput);
  }, [grammar, testInput]);

  // Reset step indices on input/grammar/mode change
  useEffect(() => {
    setParserTopDownStepIdx(0);
    setParserBottomUpStepIdx(0);
    setParserIsPlaying(false);
  }, [grammar, testInput, parserIntroMode]);

  // Auto-play stepper for Topic 1
  useEffect(() => {
    if (!parserIsPlaying) return;
    const interval = setInterval(() => {
      if (parserIntroMode === 'TOP_DOWN') {
        setParserTopDownStepIdx((prev) => {
          if (prev >= topDownResult.steps.length - 1) {
            setParserIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      } else if (parserIntroMode === 'BOTTOM_UP') {
        setParserBottomUpStepIdx((prev) => {
          if (prev >= bottomUpResult.steps.length - 1) {
            setParserIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }
    }, parserPlaySpeed);
    return () => clearInterval(interval);
  }, [parserIsPlaying, parserPlaySpeed, parserIntroMode, topDownResult.steps.length, bottomUpResult.steps.length]);

  // Auto-play stepper for LL(1) Predictive Parser
  useEffect(() => {
    if (!ll1IsPlaying) return;
    const interval = setInterval(() => {
      setLl1StepIdx((prev) => {
        if (prev >= ll1ParseResult.steps.length - 1) {
          setLl1IsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, ll1PlaySpeed);
    return () => clearInterval(interval);
  }, [ll1IsPlaying, ll1PlaySpeed, ll1ParseResult.steps.length]);

  // Reset LL(1) stepping and cell selection on grammar or input changes
  useEffect(() => {
    setLl1StepIdx(0);
    setLl1IsPlaying(false);
    setSelectedLL1Cell(null);
  }, [grammar, testInput]);

  // Auto-play stepper for SLR Shift-Reduce Parser
  useEffect(() => {
    if (!slrIsPlaying) return;
    const interval = setInterval(() => {
      setSlrStepIdx((prev) => {
        if (prev >= slrParseResult.steps.length - 1) {
          setSlrIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, slrPlaySpeed);
    return () => clearInterval(interval);
  }, [slrIsPlaying, slrPlaySpeed, slrParseResult.steps.length]);

  // Reset SLR stepping and cell selection on grammar or input changes
  useEffect(() => {
    setSlrStepIdx(0);
    setSlrIsPlaying(false);
    setSelectedSLRCell(null);
  }, [grammar, testInput]);

  // Production CRUD Handlers
  const handleAddProduction = () => {
    if (!newLhs.trim()) return;
    const tempText = `${grammar.productions.map(p => `${p.lhs} -> ${p.rhs.map(r => r.type === 'EPSILON' ? 'ε' : r.value).join(' ')}`).join('\n')}\n${newLhs.trim()} -> ${newRhs.trim() || 'ε'}`;
    const updated = parseCFGText(tempText, { startVariable: grammar.startVariable });
    setCustomGrammar(updated);
    setNewRhs('');
  };

  const handleDeleteProduction = (id: string) => {
    const remaining = grammar.productions.filter((p) => p.id !== id);
    const tempText = remaining.map(p => `${p.lhs} -> ${p.rhs.map(r => r.type === 'EPSILON' ? 'ε' : r.value).join(' ')}`).join('\n');
    const updated = parseCFGText(tempText, { startVariable: grammar.startVariable });
    setCustomGrammar(updated);
  };

  const handleApplyBnfText = () => {
    const parsed = parseCFGText(bnfText, { startVariable: grammar.startVariable });
    setCustomGrammar(parsed);
  };

  const handleFormatBnfText = () => {
    const formatted = formatCFGText(grammar, { compactAlternatives: true });
    setBnfText(formatted);
  };

  const handleResetPreset = () => {
    setCustomGrammar(null);
  };

  const handleSetStartVariable = (startVar: string) => {
    setCustomGrammar({
      ...grammar,
      startVariable: startVar,
    });
  };

  return (
    <div className="flex flex-col h-full bg-bg-base text-txt-primary font-mono text-xs overflow-hidden select-none">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-bg-surface1 border-b border-border-subtle shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-accent-primary font-bold text-xs">
            <BookOpen className="w-4 h-4" />
            <span>Context-Free Grammar (CFG) Workbench</span>
          </div>

          <select
            value={selectedPresetIdx}
            onChange={(e) => {
              setSelectedPresetIdx(Number(e.target.value));
              setCustomGrammar(null);
            }}
            className="bg-bg-surface2 border border-border-strong text-txt-primary font-semibold rounded px-2.5 py-1 text-xs focus:outline-none focus:border-accent-primary"
          >
            {CFG_PRESETS.map((preset, idx) => (
              <option key={idx} value={idx}>
                {preset.name}
              </option>
            ))}
          </select>

          {customGrammar && (
            <button
              onClick={handleResetPreset}
              className="px-2 py-0.5 rounded text-2xs bg-bg-surface2 hover:bg-bg-surface3 border border-border-subtle text-txt-muted hover:text-accent-primary flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Reset
            </button>
          )}
        </div>

        {/* Lifecycle Stage Switcher & Progressive Disclosure Actions */}
        <div className="flex flex-col gap-1.5 w-full">
          {/* Top Level Lifecycle Stage Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5" role="tablist" aria-label="Grammar Lifecycle Stages">
            {GRAMMAR_LIFECYCLE_STAGES.map((stage) => {
              const isSelectedStage = activeStageId === stage.id;
              const hasActiveChild = stage.items.some((item) => item.id === activeSubView);
              return (
                <button
                  key={stage.id}
                  role="tab"
                  aria-selected={isSelectedStage}
                  onClick={() => {
                    setActiveStageId(stage.id);
                    if (!stage.items.some((item) => item.id === activeSubView)) {
                      setActiveSubView(stage.items[0].id);
                    }
                  }}
                  className={`px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1 transition-all shrink-0 ${
                    isSelectedStage
                      ? 'bg-accent-primary text-white shadow-xs'
                      : hasActiveChild
                      ? 'bg-bg-surface3 text-txt-primary border border-accent-primary/40'
                      : 'bg-bg-surface2 text-txt-muted hover:text-txt-primary hover:bg-bg-surface3'
                  }`}
                >
                  <span>{stage.label}</span>
                  <span className="text-3xs opacity-80">({stage.items.length})</span>
                </button>
              );
            })}
          </div>

          {/* Active Stage Actions */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5 border-t border-border-subtle/40">
            {GRAMMAR_LIFECYCLE_STAGES.find((s) => s.id === activeStageId)?.items.map((item) => {
              const isSelected = activeSubView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSubView(item.id)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-all shrink-0 ${
                    isSelected
                      ? 'bg-bg-surface1 text-txt-primary border border-border-subtle shadow-xs ring-1 ring-accent-primary/50'
                      : 'bg-bg-surface2/80 text-txt-secondary hover:text-txt-primary hover:bg-bg-surface3'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 overflow-hidden">
        {/* Left Column: Formal Grammar Specification G = (V, Σ, P, S) */}
        <div className="border-r border-border-subtle p-4 space-y-4 overflow-y-auto bg-bg-surface1/40">
          <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-2">
            <h3 className="font-bold text-txt-primary text-xs flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-accent-primary" /> Formal Grammar Specification G
            </h3>
            <p className="text-3xs text-txt-muted font-sans">{currentPreset.description}</p>

            <div className="space-y-1.5 text-2xs pt-1">
              <div className="bg-bg-surface2 p-2 rounded flex justify-between items-center">
                <span className="text-txt-muted">Variables V:</span>
                <span className="text-teal-400 font-bold">{`{ ${grammar.variables.join(', ')} }`}</span>
              </div>
              <div className="bg-bg-surface2 p-2 rounded flex justify-between items-center">
                <span className="text-txt-muted">Terminals Σ:</span>
                <span className="text-blue-400 font-bold">{`{ ${grammar.terminals.join(', ')} }`}</span>
              </div>
              <div className="bg-bg-surface2 p-2 rounded flex justify-between items-center">
                <span className="text-txt-muted">Start Variable S:</span>
                <span className="text-amber-400 font-bold">{grammar.startVariable}</span>
              </div>
            </div>
          </div>

          {/* Productions List */}
          <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-2">
            <span className="font-bold text-xs text-txt-primary">Production Rules P ({grammar.productions.length})</span>
            <div className="space-y-1">
              {grammar.productions.map((p) => (
                <div key={p.id} className="bg-bg-surface2 p-2 rounded border border-border-subtle text-2xs font-mono flex items-center justify-between">
                  <span className="text-txt-muted">{p.id}:</span>
                  <span className="text-txt-primary font-bold">
                    {p.lhs} → {p.rhs.map((r) => (r.type === 'EPSILON' ? 'ε' : r.value)).join(' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Dynamic Subpanel Views */}
        <div className="col-span-2 p-4 overflow-y-auto space-y-4">
          {activeSubView === 'EDITOR' && (
            <div className="space-y-4">
              {/* Editor Mode Selector */}
              <div className="flex items-center justify-between bg-bg-surface1 p-3 rounded border border-border-subtle">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditorMode('VISUAL')}
                    className={`px-3 py-1 rounded text-2xs font-semibold flex items-center gap-1.5 transition-colors ${
                      editorMode === 'VISUAL'
                        ? 'bg-accent-primary text-white shadow-sm'
                        : 'bg-bg-surface2 text-txt-muted hover:text-txt-primary'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Visual Production Table
                  </button>
                  <button
                    onClick={() => setEditorMode('TEXT')}
                    className={`px-3 py-1 rounded text-2xs font-semibold flex items-center gap-1.5 transition-colors ${
                      editorMode === 'TEXT'
                        ? 'bg-accent-primary text-white shadow-sm'
                        : 'bg-bg-surface2 text-txt-muted hover:text-txt-primary'
                    }`}
                  >
                    <Code className="w-3.5 h-3.5" /> Raw BNF Textarea
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-2xs text-txt-muted">Start Symbol:</span>
                  <select
                    value={grammar.startVariable}
                    onChange={(e) => handleSetStartVariable(e.target.value)}
                    className="bg-bg-surface2 border border-border-subtle text-txt-primary font-bold rounded px-2 py-0.5 text-2xs focus:outline-none focus:border-accent-primary"
                  >
                    {grammar.variables.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {editorMode === 'VISUAL' ? (
                <div className="space-y-3">
                  {/* Quick Add Production Bar */}
                  <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-2">
                    <span className="font-bold text-xs text-txt-primary flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-emerald-400" /> Add New Production (A → α)
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newLhs}
                        onChange={(e) => setNewLhs(e.target.value)}
                        placeholder="LHS (e.g. S)"
                        className="w-20 bg-bg-surface2 border border-border-subtle text-txt-primary font-bold px-2 py-1 rounded text-xs focus:outline-none focus:border-accent-primary"
                      />
                      <span className="text-txt-muted font-bold">→</span>
                      <input
                        type="text"
                        value={newRhs}
                        onChange={(e) => setNewRhs(e.target.value)}
                        placeholder="RHS symbols (e.g. a S b or ε)"
                        className="flex-1 bg-bg-surface2 border border-border-subtle text-txt-primary px-3 py-1 rounded text-xs focus:outline-none focus:border-accent-primary"
                      />
                      <button
                        onClick={handleAddProduction}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Rule
                      </button>
                    </div>
                  </div>

                  {/* Production Rules Table */}
                  <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-2">
                    <span className="font-bold text-xs text-txt-primary">Configured Productions ({grammar.productions.length})</span>
                    <div className="space-y-1.5">
                      {grammar.productions.map((p, idx) => (
                        <div
                          key={p.id}
                          className="bg-bg-surface2 p-2.5 rounded border border-border-subtle flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-txt-muted font-mono text-2xs w-8">#{idx + 1}</span>
                            <span className="font-bold text-teal-400 px-2 py-0.5 bg-teal-950/40 border border-teal-800/60 rounded">
                              {p.lhs}
                            </span>
                            <span className="text-txt-muted">→</span>
                            <div className="flex items-center gap-1">
                              {p.rhs.map((sym, sIdx) => (
                                <span
                                  key={sIdx}
                                  className={`px-2 py-0.5 rounded text-2xs font-bold ${
                                    sym.type === 'NON_TERMINAL'
                                      ? 'bg-teal-950/50 text-teal-300 border border-teal-800/80'
                                      : sym.type === 'EPSILON'
                                      ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/80'
                                      : 'bg-blue-950/50 text-blue-300 border border-blue-800/80'
                                  }`}
                                >
                                  {sym.type === 'EPSILON' ? 'ε' : sym.value}
                                </span>
                              ))}
                            </div>
                          </div>

                          <button
                            onClick={() => handleDeleteProduction(p.id)}
                            className="p-1 rounded text-txt-muted hover:text-red-400 hover:bg-red-950/30 transition-colors"
                            title="Delete production"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Raw BNF Textarea Editor */
                <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-txt-primary">Grammar Text (BNF Notation)</span>
                    <button
                      onClick={handleFormatBnfText}
                      className="px-2.5 py-0.5 rounded text-2xs bg-bg-surface2 hover:bg-bg-surface3 border border-border-subtle text-txt-muted hover:text-txt-primary transition-colors"
                    >
                      Format / Beautify BNF
                    </button>
                  </div>
                  <textarea
                    rows={8}
                    value={bnfText}
                    onChange={(e) => setBnfText(e.target.value)}
                    className="w-full bg-bg-surface2 border border-border-subtle text-txt-primary p-3 rounded font-mono text-xs focus:outline-none focus:border-accent-primary"
                    placeholder="S -> a S b | ε&#10;A -> a A | b"
                  />
                  <button
                    onClick={handleApplyBnfText}
                    className="w-full py-1.5 bg-accent-primary hover:bg-accent-primary/80 text-white rounded font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Check className="w-4 h-4" /> Parse &amp; Apply Grammar
                  </button>
                </div>
              )}
            </div>
          )}

          {activeSubView === 'VALIDATE' && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded border flex items-center justify-between gap-4 ${
                  validationResult.isValid
                    ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                    : 'bg-red-950/40 border-red-800/80 text-red-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  {validationResult.isValid ? (
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-8 h-8 text-red-400 shrink-0" />
                  )}
                  <div>
                    <h3 className="font-bold text-sm">
                      {validationResult.isValid ? 'VALID CFG: Formal Structure Sound' : 'INVALID CFG: Structural Errors Found'}
                    </h3>
                    <p className="text-2xs text-slate-300 mt-0.5 font-sans">
                      {validationResult.isValid
                        ? 'Grammar G satisfies all formal Context-Free Grammar 4-tuple constraints.'
                        : 'Validation errors must be resolved.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Diagnostics Detail */}
              <div className="bg-slate-950/80 p-4 rounded border border-slate-800 space-y-2">
                <span className="font-bold text-xs text-slate-300">Validation Diagnostics ({validationResult.diagnostics.length})</span>
                {validationResult.diagnostics.length > 0 ? (
                  <div className="space-y-1.5">
                    {validationResult.diagnostics.map((d, idx) => (
                      <div key={idx} className="bg-slate-900 p-2.5 rounded border border-slate-800 text-2xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-300">{d.code}</span>
                          <span className="text-3xs uppercase font-bold text-slate-500">{d.severity}</span>
                        </div>
                        <p className="text-slate-200">{d.message}</p>
                        <p className="text-3xs text-slate-400 font-sans">{d.mathematicalExplanation}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-2xs italic">Zero structural errors or warnings detected!</p>
                )}
              </div>
            </div>
          )}

          {activeSubView === 'ANALYZE' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950/80 p-3.5 rounded border border-slate-800 space-y-2">
                <span className="font-bold text-slate-300 text-xs flex items-center gap-1.5">
                  <Search className="w-4 h-4 text-blue-400" /> Variable Properties
                </span>
                <div className="space-y-1.5 text-2xs">
                  <div className="bg-slate-900 p-2 rounded flex justify-between items-center">
                    <span className="text-slate-400">Nullable (A ⇒* ε):</span>
                    <span className="text-emerald-400 font-semibold">
                      {analysisResult.nullableVariables.length > 0 ? `{ ${analysisResult.nullableVariables.join(', ')} }` : '∅'}
                    </span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded flex justify-between items-center">
                    <span className="text-slate-400">Generating (A ⇒* w):</span>
                    <span className="text-blue-400 font-semibold">{`{ ${analysisResult.generatingVariables.join(', ')} }`}</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded flex justify-between items-center">
                    <span className="text-slate-400">Reachable from S:</span>
                    <span className="text-purple-400 font-semibold">{`{ ${analysisResult.reachableVariables.join(', ')} }`}</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded flex justify-between items-center">
                    <span className="text-slate-400">Useless Variables:</span>
                    <span className={analysisResult.uselessVariables.length > 0 ? 'text-amber-400 font-semibold' : 'text-slate-500'}>
                      {analysisResult.uselessVariables.length > 0 ? `{ ${analysisResult.uselessVariables.join(', ')} }` : 'None (0)'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/80 p-3.5 rounded border border-slate-800 space-y-2">
                <span className="font-bold text-slate-300 text-xs flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-teal-400" /> Language Decidability
                </span>
                <div className="space-y-1.5 text-2xs">
                  <div className="bg-slate-900 p-2 rounded flex justify-between items-center">
                    <span className="text-slate-400">Language Emptiness L(G):</span>
                    <span className={analysisResult.isLanguageEmpty ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                      {analysisResult.isLanguageEmpty ? 'EMPTY (L(G) = ∅)' : 'NON-EMPTY (L(G) ≠ ∅)'}
                    </span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded flex justify-between items-center">
                    <span className="text-slate-400">Immediate Left Recursion:</span>
                    <span className={analysisResult.hasLeftRecursion ? 'text-amber-400 font-semibold' : 'text-slate-500'}>
                      {analysisResult.hasLeftRecursion ? 'Detected' : 'None'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSubView === 'MEMBERSHIP' && (
            <div className="space-y-4">
              {/* Language Specification Card */}
              <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-accent-primary" />
                    <span className="font-bold text-xs text-txt-primary">Context-Free Language Definition L(G)</span>
                  </div>
                  <span className="text-2xs px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/80 font-mono font-semibold">
                    L(G) = &#123; w ∈ Σ* | S ⇒* w &#125;
                  </span>
                </div>
                <p className="text-2xs text-txt-muted">{currentPreset.description}</p>
                <div className="flex items-center gap-3 pt-1 text-2xs flex-wrap">
                  <div className="bg-bg-surface2 px-2.5 py-1 rounded border border-border-subtle flex items-center gap-1.5">
                    <span className="text-txt-muted">Alphabet Σ:</span>
                    <span className="text-blue-400 font-bold">&#123; {grammar.terminals.join(', ')} &#125;</span>
                  </div>
                  <div className="bg-bg-surface2 px-2.5 py-1 rounded border border-border-subtle flex items-center gap-1.5">
                    <span className="text-txt-muted">Start Variable:</span>
                    <span className="text-amber-400 font-bold">{grammar.startVariable}</span>
                  </div>
                  <div className="bg-bg-surface2 px-2.5 py-1 rounded border border-border-subtle flex items-center gap-1.5">
                    <span className="text-txt-muted">Language Emptiness:</span>
                    <span className={analysisResult.isLanguageEmpty ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                      {analysisResult.isLanguageEmpty ? 'L(G) = ∅ (Empty)' : 'L(G) ≠ ∅ (Non-Empty)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Single String Evaluator */}
              <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-txt-primary">Interactive String Evaluator (w ∈ L(G)?)</span>
                  {membershipResult.isAccepted && membershipResult.derivation && (
                    <span className="text-3xs text-emerald-400 font-semibold">
                      Derived in {membershipResult.derivation.steps.length - 1} step(s)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    placeholder="Enter test string w (e.g. aabb or ε)..."
                    className="flex-1 bg-bg-surface2 border border-border-subtle text-txt-primary px-3 py-1.5 rounded text-xs focus:outline-none focus:border-accent-primary font-mono"
                  />
                </div>

                {/* Evaluator Status Card */}
                <div
                  className={`p-3 rounded border flex items-center justify-between gap-3 ${
                    membershipResult.isAccepted
                      ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                      : membershipResult.boundedByLimit
                      ? 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                      : 'bg-red-950/40 border-red-800/80 text-red-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {membershipResult.isAccepted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : membershipResult.boundedByLimit ? (
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                    )}
                    <div>
                      <span className="font-bold text-xs block">
                        {membershipResult.isAccepted
                          ? `ACCEPTED: w = "${testInput === '' ? 'ε' : testInput}" ∈ L(G)`
                          : membershipResult.boundedByLimit
                          ? `BOUNDED SEARCH LIMIT: w = "${testInput === '' ? 'ε' : testInput}"`
                          : `REJECTED: w = "${testInput === '' ? 'ε' : testInput}" ∉ L(G)`}
                      </span>
                      <span className="text-3xs text-txt-muted block mt-0.5">{membershipResult.reason}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Batch Evaluation Table */}
              <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="font-bold text-xs text-txt-primary block">Batch Candidate Strings Verification</span>
                    <span className="text-3xs text-txt-muted">Evaluated dynamically against current grammar rules</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={customBatchCandidate}
                      onChange={(e) => setCustomBatchCandidate(e.target.value)}
                      placeholder="Add candidate (e.g. ab)..."
                      className="bg-bg-surface2 border border-border-subtle text-txt-primary px-2.5 py-1 rounded text-2xs focus:outline-none focus:border-accent-primary font-mono w-40"
                    />
                    <button
                      onClick={() => {
                        if (customBatchCandidate.trim() && !extraBatchStrings.includes(customBatchCandidate.trim())) {
                          setExtraBatchStrings([...extraBatchStrings, customBatchCandidate.trim()]);
                          setCustomBatchCandidate('');
                        }
                      }}
                      className="px-2.5 py-1 bg-accent-primary hover:bg-accent-primary/80 text-white rounded text-2xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Add String
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto border border-border-subtle rounded max-h-60 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-2xs font-mono">
                    <thead className="bg-bg-surface2 text-txt-muted border-b border-border-subtle sticky top-0">
                      <tr>
                        <th className="p-2">#</th>
                        <th className="p-2">Candidate String (w)</th>
                        <th className="p-2">Length |w|</th>
                        <th className="p-2">In Σ*?</th>
                        <th className="p-2">Membership Result</th>
                        <th className="p-2">Explanation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle/60">
                      {batchResults.map((item, idx) => (
                        <tr key={idx} className="hover:bg-bg-surface2/50 text-txt-primary">
                          <td className="p-2 text-txt-muted">{idx + 1}</td>
                          <td className="p-2 font-bold text-txt-primary">
                            <span className="px-2 py-0.5 bg-bg-surface3 border border-border-subtle rounded">
                              {item.input === '' ? 'ε' : item.input}
                            </span>
                          </td>
                          <td className="p-2 text-txt-muted">{item.input === 'ε' ? 0 : item.input.length}</td>
                          <td className="p-2">
                            {item.hasInvalidAlphabetSymbols ? (
                              <span className="text-amber-400 font-semibold text-3xs">
                                ✗ Invalid {`{${item.invalidSymbols.join(', ')}}`}
                              </span>
                            ) : (
                              <span className="text-emerald-400 font-semibold text-3xs">✓ Valid</span>
                            )}
                          </td>
                          <td className="p-2">
                            {item.isAccepted ? (
                              <span className="px-2 py-0.5 rounded text-3xs font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800/80">
                                ACCEPT
                              </span>
                            ) : item.boundedByLimit ? (
                              <span className="px-2 py-0.5 rounded text-3xs font-bold bg-amber-950/60 text-amber-300 border border-amber-800/80">
                                LIMIT
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-3xs font-bold bg-red-950/60 text-red-300 border border-red-800/80">
                                REJECT
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-3xs text-txt-muted truncate max-w-xs">{item.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bounded Language Sample */}
              <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-bold text-xs text-txt-primary">Bounded Language Sample (Subset of L(G), |w| ≤ 6)</span>
                  </div>
                  <span className="text-3xs text-txt-muted">Finite witness set</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {boundedLanguageSample.length > 0 ? (
                    boundedLanguageSample.map((sampleStr, idx) => (
                      <button
                        key={idx}
                        onClick={() => setTestInput(sampleStr === 'ε' ? '' : sampleStr)}
                        className="px-2.5 py-1 bg-bg-surface2 hover:bg-bg-surface3 border border-border-subtle hover:border-accent-primary text-emerald-300 font-mono rounded text-2xs transition-colors cursor-pointer"
                        title="Click to test in evaluator"
                      >
                        {sampleStr}
                      </button>
                    ))
                  ) : (
                    <span className="text-txt-muted text-2xs italic">No finite terminal sample generated (Language may be empty).</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSubView === 'DERIVATION' && (
            <div className="space-y-4">
              <div className="bg-bg-surface1 p-3 rounded border border-border-subtle flex items-center gap-3">
                <span className="text-txt-muted text-xs font-semibold">Test Input String w:</span>
                <input
                  type="text"
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  placeholder="e.g. aabb"
                  className="bg-bg-surface2 border border-border-subtle text-txt-primary px-3 py-1 rounded text-xs focus:outline-none focus:border-accent-primary font-mono w-48"
                />
              </div>

              {/* Membership Result Card */}
              <div
                className={`p-4 rounded border flex items-center justify-between gap-4 ${
                  membershipResult.isAccepted
                    ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                    : 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  {membershipResult.isAccepted ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-amber-400 shrink-0" />
                  )}
                  <div>
                    <h3 className="font-bold text-sm">
                      {membershipResult.isAccepted
                        ? `ACCEPT: w = "${testInput}" ∈ L(G)`
                        : `REJECT: w = "${testInput}" ∉ L(G)`}
                    </h3>
                    <p className="text-2xs text-slate-300 mt-0.5 font-sans">{membershipResult.reason}</p>
                  </div>
                </div>
              </div>

              {/* Derivation Steps Table */}
              {derivationResult.success && (
                <div className="bg-bg-surface1 p-4 rounded border border-border-subtle space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-purple-300">
                      Leftmost Derivation Sequence ({derivationResult.steps.length - 1} steps)
                    </span>
                    {parseTree && (
                      <span className="bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded text-3xs font-semibold">
                        Parse Tree Generated (Root: {parseTree.symbol.value})
                      </span>
                    )}
                  </div>
                  <div className="overflow-x-auto border border-border-subtle rounded">
                    <table className="w-full text-left border-collapse text-2xs font-mono">
                      <thead className="bg-bg-surface2 text-txt-muted border-b border-border-subtle">
                        <tr>
                          <th className="p-2">Step</th>
                          <th className="p-2">Production Applied</th>
                          <th className="p-2">Mathematical Derivation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle/60">
                        {derivationResult.steps.map((st) => (
                          <tr key={st.stepIndex} className="hover:bg-bg-surface2/50 text-txt-primary">
                            <td className="p-2 text-txt-muted">{st.stepIndex}</td>
                            <td className="p-2 text-purple-400 font-bold">{st.productionNotation || 'Initial'}</td>
                            <td className="p-2 text-txt-primary font-semibold">{st.mathematicalNotation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSubView === 'AMBIGUITY' && (
            <div className="space-y-4">
              {/* Educational Formal Definition */}
              <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Split className="w-4 h-4 text-fuchsia-400" />
                    <span className="font-bold text-xs text-txt-primary">Ambiguous vs Unambiguous Grammar Analysis</span>
                  </div>
                  <span className="text-2xs px-2 py-0.5 rounded bg-fuchsia-950/60 text-fuchsia-300 border border-fuchsia-800/80 font-mono font-semibold">
                    ∃ w ∈ L(G) s.t. Distinct Parse Trees ≥ 2
                  </span>
                </div>
                <p className="text-2xs text-txt-muted">
                  A Context-Free Grammar is <strong>ambiguous</strong> if there exists at least one terminal string <code className="text-txt-primary">w ∈ L(G)</code> with two or more structurally distinct parse trees (or distinct leftmost derivations). Finding a single witness string proves ambiguity.
                </p>
                <div className="flex items-center gap-3 pt-1 text-2xs flex-wrap">
                  <div className="bg-bg-surface2 px-2.5 py-1 rounded border border-border-subtle flex items-center gap-1.5">
                    <span className="text-txt-muted">Search Depth Bound:</span>
                    <span className="text-fuchsia-400 font-bold">Depth ≤ {ambiguityResult.searchDepthLimit}</span>
                  </div>
                  <div className="bg-bg-surface2 px-2.5 py-1 rounded border border-border-subtle flex items-center gap-1.5">
                    <span className="text-txt-muted">Explored States:</span>
                    <span className="text-blue-400 font-bold">{ambiguityResult.exploredStates}</span>
                  </div>
                  <div className="bg-bg-surface2 px-2.5 py-1 rounded border border-border-subtle flex items-center gap-1.5">
                    <span className="text-txt-muted">Discovered Parses:</span>
                    <span className="text-amber-400 font-bold">{ambiguityResult.distinctParseCount}</span>
                  </div>
                </div>
              </div>

              {/* Candidate Input & Analyzer */}
              <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-bold text-xs text-txt-primary">Candidate Witness String Evaluation</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-3xs text-txt-muted">Quick pool:</span>
                    {defaultAmbiguityCandidates.map((cand, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setAmbiguityInput(cand === 'ε' ? '' : cand);
                          setActiveAmbiguityTreeIdx(0);
                        }}
                        className="px-2 py-0.5 bg-bg-surface2 hover:bg-bg-surface3 border border-border-subtle text-txt-secondary hover:text-txt-primary rounded text-3xs font-mono transition-colors cursor-pointer"
                      >
                        {cand}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={ambiguityInput}
                    onChange={(e) => {
                      setAmbiguityInput(e.target.value);
                      setActiveAmbiguityTreeIdx(0);
                    }}
                    placeholder="Enter candidate string (e.g. a+a*a or aa)..."
                    className="flex-1 bg-bg-surface2 border border-border-subtle text-txt-primary px-3 py-1.5 rounded text-xs focus:outline-none focus:border-accent-primary font-mono"
                  />
                </div>

                {/* Ambiguity Status Banner */}
                <div
                  className={`p-3.5 rounded border flex items-center justify-between gap-3 ${
                    ambiguityResult.status === 'AMBIGUITY_WITNESS_FOUND'
                      ? 'bg-fuchsia-950/40 border-fuchsia-800/80 text-fuchsia-200'
                      : ambiguityResult.status === 'ONE_PARSE_FOUND_WITHIN_BOUND'
                      ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                      : ambiguityResult.status === 'SEARCH_LIMIT_REACHED'
                      ? 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                      : 'bg-red-950/40 border-red-800/80 text-red-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {ambiguityResult.status === 'AMBIGUITY_WITNESS_FOUND' ? (
                      <Split className="w-6 h-6 text-fuchsia-400 shrink-0" />
                    ) : ambiguityResult.status === 'ONE_PARSE_FOUND_WITHIN_BOUND' ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                    ) : ambiguityResult.status === 'SEARCH_LIMIT_REACHED' ? (
                      <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-400 shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs">
                          {ambiguityResult.status === 'AMBIGUITY_WITNESS_FOUND'
                            ? `AMBIGUITY WITNESS FOUND: "${ambiguityResult.witnessString}" has ${ambiguityResult.distinctParseCount} distinct parse trees`
                            : ambiguityResult.status === 'ONE_PARSE_FOUND_WITHIN_BOUND'
                            ? `ONE PARSE FOUND WITHIN SEARCH BOUND (Depth ≤ ${ambiguityResult.searchDepthLimit})`
                            : ambiguityResult.status === 'SEARCH_LIMIT_REACHED'
                            ? `SEARCH LIMIT REACHED (${ambiguityResult.exploredStates} states explored)`
                            : `NOT IN LANGUAGE: "${ambiguityResult.witnessString}" ∉ L(G)`}
                        </span>
                      </div>
                      <p className="text-2xs text-txt-muted mt-0.5 font-sans">{ambiguityResult.reason}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Multi-Tree Visualizer & Derivation Evidence */}
              {ambiguityResult.parseTrees.length > 0 && (
                <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-txt-primary">Distinct Parse Trees Discovered</span>
                      <span className="text-3xs px-2 py-0.5 rounded bg-bg-surface3 border border-border-subtle text-txt-muted font-mono">
                        {ambiguityResult.parseTrees.length} Distinct Tree(s)
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {ambiguityResult.parseTrees.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveAmbiguityTreeIdx(idx)}
                          className={`px-2.5 py-1 rounded text-2xs font-semibold transition-colors cursor-pointer ${
                            activeAmbiguityTreeIdx === idx
                              ? 'bg-fuchsia-600 text-white shadow-sm'
                              : 'bg-bg-surface2 text-txt-secondary hover:text-txt-primary'
                          }`}
                        >
                          Parse Tree {String.fromCharCode(65 + idx)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Parse Tree Graph Hierarchy */}
                  {(() => {
                    const safeTreeIdx = Math.max(0, Math.min(activeAmbiguityTreeIdx, ambiguityResult.parseTrees.length - 1));
                    const selectedTree = ambiguityResult.parseTrees[safeTreeIdx] || ambiguityResult.parseTrees[0];
                    const activeDeriv =
                      ambiguityDerivMode === 'RIGHTMOST' && ambiguityResult.rightmostDerivations
                        ? ambiguityResult.rightmostDerivations[safeTreeIdx] || ambiguityResult.rightmostDerivations[0]
                        : ambiguityResult.derivations[safeTreeIdx] || ambiguityResult.derivations[0];

                    return (
                      <>
                        <div className="p-4 bg-bg-surface2/60 rounded border border-border-subtle overflow-x-auto min-h-[160px] flex items-center justify-center">
                          <RenderParseTreeNode
                            node={selectedTree}
                            isRoot
                          />
                        </div>

                        {/* Derivation Sequence for Selected Tree */}
                        <div className="pt-2 border-t border-border-subtle space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-2xs text-txt-primary">
                              Derivation Sequence for Parse Tree {String.fromCharCode(65 + safeTreeIdx)}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setAmbiguityDerivMode('LEFTMOST')}
                                className={`px-2 py-0.5 rounded text-3xs font-semibold transition-colors cursor-pointer ${
                                  ambiguityDerivMode === 'LEFTMOST'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-bg-surface2 text-txt-muted'
                                }`}
                              >
                                Leftmost (S ⇒lm* w)
                              </button>
                              <button
                                onClick={() => setAmbiguityDerivMode('RIGHTMOST')}
                                className={`px-2 py-0.5 rounded text-3xs font-semibold transition-colors cursor-pointer ${
                                  ambiguityDerivMode === 'RIGHTMOST'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-bg-surface2 text-txt-muted'
                                }`}
                              >
                                Rightmost (S ⇒rm* w)
                              </button>
                            </div>
                          </div>

                          {/* Derivation Steps Table */}
                          {activeDeriv && activeDeriv.steps.length > 0 && (
                            <div className="overflow-x-auto border border-border-subtle rounded max-h-48 overflow-y-auto">
                              <table className="w-full text-left border-collapse text-2xs font-mono">
                                <thead className="bg-bg-surface2 text-txt-muted border-b border-border-subtle sticky top-0">
                                  <tr>
                                    <th className="p-1.5">Step</th>
                                    <th className="p-1.5">Production Applied</th>
                                    <th className="p-1.5">Mathematical Derivation</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border-subtle/60">
                                  {activeDeriv.steps.map((st) => (
                                    <tr key={st.stepIndex} className="hover:bg-bg-surface2/50 text-txt-primary">
                                      <td className="p-1.5 text-txt-muted">{st.stepIndex}</td>
                                      <td className="p-1.5 text-fuchsia-400 font-bold">{st.productionNotation || 'Initial'}</td>
                                      <td className="p-1.5 text-txt-primary font-semibold">{st.mathematicalNotation}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* CNF Transform View */}
          {activeSubView === 'CNF' && (
            <div className="space-y-4">
              <div className="bg-amber-950/30 p-3.5 rounded border border-amber-800/50 space-y-2">
                <h3 className="font-bold text-amber-300 text-xs">Chomsky Normal Form (CNF) Transformation</h3>
                {cnfResult.success ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-3xs font-semibold">
                        CNF VALID
                      </span>
                      <span className="text-slate-400 text-3xs">
                        {cnfResult.totalProductionsOriginal} → {cnfResult.totalProductionsTransformed} productions
                      </span>
                      {cnfResult.epsilonInOriginalLanguage && (
                        <span className="bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded text-3xs font-semibold">
                          ε ∈ L(G) preserved
                        </span>
                      )}
                    </div>

                    {/* Transformation Stages */}
                    <div className="space-y-2">
                      <span className="font-bold text-xs text-amber-300">Transformation Pipeline</span>
                      {cnfResult.stages.map((stage, idx) => (
                        <div key={idx} className="bg-slate-950/80 p-3 rounded border border-slate-800">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="bg-amber-900/60 text-amber-200 px-2 py-0.5 rounded text-3xs font-bold">
                              Stage {idx + 1}: {stage.stage.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <p className="text-slate-400 text-3xs">{stage.description}</p>
                          <p className="text-slate-500 text-3xs italic mt-1">{stage.mathematicalExplanation}</p>
                        </div>
                      ))}
                    </div>

                    {/* CNF Productions */}
                    <div className="bg-slate-950/80 p-3 rounded border border-slate-800">
                      <span className="font-bold text-xs text-amber-300">Final CNF Productions ({cnfResult.transformedGrammar.productions.length})</span>
                      <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                        {cnfResult.transformedGrammar.productions.map((p) => (
                          <div key={p.id} className="text-slate-300 text-3xs font-mono">
                            <span className="text-amber-400 font-bold">{p.lhs}</span>
                            <span className="text-slate-500"> → </span>
                            <span className="text-slate-200">
                              {p.rhs.map((s) => (s.type === 'EPSILON' ? 'ε' : s.value)).join(' ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CNF Validation */}
                    {cnfValidation && (
                      <div className="bg-slate-950/80 p-3 rounded border border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-amber-300">CNF Validation</span>
                          {cnfValidation.isValid ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                        {cnfValidation.errors.length > 0 && (
                          <div className="mt-1 space-y-1">
                            {cnfValidation.errors.map((d, i) => (
                              <p key={i} className="text-red-400 text-3xs">{d.message}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-red-400 text-xs">
                    CNF transformation failed: {cnfResult.errorMessage || 'Unknown error'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CYK Parser View (Topic 9) */}
          {activeSubView === 'CYK' && (
            <div className="space-y-4">
              {/* Educational Formal Header */}
              <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Split className="w-4 h-4 text-rose-400" />
                    <span className="font-bold text-xs text-txt-primary">
                      CYK Algorithm — Cocke–Younger–Kasami Dynamic Programming (Topic 9)
                    </span>
                  </div>
                  <span className="text-2xs px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/80 font-mono font-semibold">
                    O(n³ · |P|) Membership & Parse Tree Engine
                  </span>
                </div>

                <p className="text-2xs text-txt-muted">
                  The <strong>CYK (Cocke–Younger–Kasami)</strong> algorithm employs bottom-up dynamic programming to test whether an input string <code className="text-txt-primary">w</code> belongs to the language <code className="text-txt-primary">L(G)</code> of a grammar in <strong>Chomsky Normal Form (CNF)</strong>. It constructs a triangular table <code className="text-txt-primary">V[i, j]</code> of variables capable of deriving the substring from index <code className="text-txt-primary">i</code> to <code className="text-txt-primary">j</code>.
                </p>

                {/* Grammar Status & CNF Pipeline Guard */}
                <div className="flex items-center gap-3 pt-1 text-2xs flex-wrap">
                  <div
                    className={`px-2.5 py-1 rounded border flex items-center gap-1.5 font-bold ${
                      isDirectGrammarCNF
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                        : 'bg-amber-950/80 text-amber-300 border-amber-800'
                    }`}
                  >
                    {isDirectGrammarCNF ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                    {isDirectGrammarCNF ? 'VALID CNF (DIRECT EXECUTION)' : 'NOT CNF (CONVERTED VIA TOPIC 8 PIPELINE)'}
                  </div>

                  <div className="bg-bg-surface2 px-2.5 py-1 rounded border border-border-subtle flex items-center gap-1.5">
                    <span className="text-txt-muted">Start Variable:</span>
                    <span className="text-rose-300 font-bold font-mono">
                      {grammarUsedByCYK?.startVariable || grammar.startVariable}
                    </span>
                  </div>

                  <div className="bg-bg-surface2 px-2.5 py-1 rounded border border-border-subtle flex items-center gap-1.5">
                    <span className="text-txt-muted">CNF Productions:</span>
                    <span className="text-rose-300 font-bold font-mono">
                      |P| = {grammarUsedByCYK?.productions.length ?? 0}
                    </span>
                  </div>

                  {!isDirectGrammarCNF && cnfResult.success && (
                    <button
                      onClick={() => setShowCykGrammarDiff((prev) => !prev)}
                      className="px-2 py-0.5 rounded bg-bg-surface2 border border-border-subtle text-txt-secondary hover:text-txt-primary font-semibold text-3xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Layers className="w-3 h-3" />
                      {showCykGrammarDiff ? 'Hide CNF Conversion' : 'View Original vs CNF Rules'}
                    </button>
                  )}

                  {!isDirectGrammarCNF && cnfResult.success && !customGrammar && (
                    <button
                      onClick={() => setCustomGrammar(cnfResult.transformedGrammar)}
                      className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold text-3xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" /> Apply CNF to Workbench
                    </button>
                  )}
                </div>

                {/* Optional Collapsible Before vs After CNF Rules */}
                {showCykGrammarDiff && cnfResult.success && (
                  <div className="mt-2 pt-2 border-t border-border-subtle/60 grid grid-cols-1 md:grid-cols-2 gap-3 text-3xs font-mono">
                    <div className="bg-bg-surface2/60 p-2.5 rounded border border-border-subtle">
                      <span className="text-txt-muted font-bold block mb-1">Original CFG (G):</span>
                      <div className="max-h-36 overflow-y-auto space-y-0.5">
                        {grammar.productions.map((p) => (
                          <div key={p.id}>
                            <span className="text-purple-300 font-semibold">{p.lhs}</span> →{' '}
                            {p.rhs.map((s) => s.value).join(' ')}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-bg-surface2/60 p-2.5 rounded border border-rose-900/40">
                      <span className="text-rose-300 font-bold block mb-1">CNF Form Consumed by CYK:</span>
                      <div className="max-h-36 overflow-y-auto space-y-0.5">
                        {cnfResult.transformedGrammar.productions.map((p) => (
                          <div key={p.id}>
                            <span className="text-rose-300 font-semibold">{p.lhs}</span> →{' '}
                            {p.rhs.map((s) => s.value).join(' ')}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input String & Token Stream Controller */}
              <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-bold text-xs text-txt-primary">Input Word & Tokenization</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-3xs text-txt-muted">Preset Candidates:</span>
                    {defaultBatchCandidates.slice(0, 6).map((cand) => (
                      <button
                        key={cand}
                        onClick={() => setTestInput(cand === 'ε' ? '' : cand)}
                        className={`px-2 py-0.5 rounded text-3xs font-mono font-semibold transition-colors cursor-pointer ${
                          testInput === (cand === 'ε' ? '' : cand)
                            ? 'bg-rose-600 text-white'
                            : 'bg-bg-surface2 text-txt-secondary hover:text-txt-primary border border-border-subtle'
                        }`}
                      >
                        {cand}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    placeholder="Enter string (leave blank for ε)..."
                    className="flex-1 bg-bg-surface2 border border-border-subtle rounded px-3 py-1.5 text-xs font-mono text-txt-primary focus:outline-none focus:border-rose-500"
                  />
                  <button
                    onClick={() => setTestInput('')}
                    className="px-2.5 py-1.5 rounded bg-bg-surface2 border border-border-subtle hover:bg-bg-surface3 text-txt-muted hover:text-txt-primary text-xs font-mono transition-colors cursor-pointer"
                  >
                    ε
                  </button>
                </div>

                {/* Tokenization Preview */}
                <div className="flex items-center gap-2 text-2xs text-txt-muted flex-wrap">
                  <span>Tokens:</span>
                  {cykResult && cykResult.tokens.length > 0 ? (
                    <div className="flex items-center gap-1 font-mono">
                      {cykResult.tokens.map((tok, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 rounded bg-rose-950/50 text-rose-200 border border-rose-800/60 font-semibold text-3xs"
                        >
                          {tok}
                        </span>
                      ))}
                      <span className="text-txt-muted text-3xs ml-1">(Length n = {cykResult.tokens.length})</span>
                    </div>
                  ) : testInput === '' ? (
                    <span className="font-mono text-purple-300 font-semibold">ε (Empty String)</span>
                  ) : (
                    <span className="text-red-400">Untokenizable with grammar terminals</span>
                  )}
                </div>
              </div>

              {!grammarUsedByCYK ? (
                <div className="p-4 bg-red-950/40 rounded border border-red-900/60 text-red-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Chomsky Normal Form transformation failed. CYK requires a valid grammar in Chomsky Normal Form.</span>
                </div>
              ) : cykResult ? (
                <>
                  {/* Step-by-Step Educational Trace Controls */}
                  {cykResult.proofSteps && cykResult.proofSteps.length > 0 && (
                    <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-txt-primary">CYK Execution Step Runner</span>
                          <span className="text-3xs px-2 py-0.5 rounded bg-bg-surface2 border border-border-subtle font-mono text-txt-muted">
                            Step {Math.min(cykStepIdx + 1, cykResult.proofSteps.length)} of {cykResult.proofSteps.length}
                          </span>
                        </div>

                        {/* Interactive Buttons */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setIsCykPlaying(false);
                              setCykStepIdx(0);
                            }}
                            title="Reset to beginning"
                            className="p-1.5 rounded bg-bg-surface2 hover:bg-bg-surface3 border border-border-subtle text-txt-secondary hover:text-txt-primary text-xs transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setIsCykPlaying(false);
                              setCykStepIdx((prev) => Math.max(0, prev - 1));
                            }}
                            disabled={cykStepIdx === 0}
                            title="Previous Step"
                            className="p-1.5 rounded bg-bg-surface2 hover:bg-bg-surface3 border border-border-subtle text-txt-secondary hover:text-txt-primary disabled:opacity-40 text-xs transition-colors cursor-pointer"
                          >
                            <SkipBack className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setIsCykPlaying((prev) => !prev)}
                            title={isCykPlaying ? 'Pause Auto-Play' : 'Play Step-by-Step'}
                            className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
                          >
                            {isCykPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                            <span>{isCykPlaying ? 'Pause' : 'Play'}</span>
                          </button>
                          <button
                            onClick={() => {
                              setIsCykPlaying(false);
                              setCykStepIdx((prev) => Math.min((cykResult.proofSteps?.length ?? 1) - 1, prev + 1));
                            }}
                            disabled={cykStepIdx >= (cykResult.proofSteps.length - 1)}
                            title="Next Step"
                            className="p-1.5 rounded bg-bg-surface2 hover:bg-bg-surface3 border border-border-subtle text-txt-secondary hover:text-txt-primary disabled:opacity-40 text-xs transition-colors cursor-pointer"
                          >
                            <SkipForward className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setIsCykPlaying(false);
                              setCykStepIdx((cykResult.proofSteps?.length ?? 1) - 1);
                            }}
                            title="Run to final step"
                            className="px-2 py-1 rounded bg-bg-surface2 hover:bg-bg-surface3 border border-border-subtle text-txt-secondary hover:text-txt-primary text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <FastForward className="w-3.5 h-3.5" />
                            <span>End</span>
                          </button>

                          {/* Speed selector */}
                          <div className="flex items-center gap-1 ml-2 border-l border-border-subtle pl-2">
                            <span className="text-3xs text-txt-muted">Speed:</span>
                            {[
                              { label: '1x', ms: 700 },
                              { label: '2x', ms: 300 },
                              { label: '0.5x', ms: 1200 },
                            ].map((spd) => (
                              <button
                                key={spd.label}
                                onClick={() => setCykPlaySpeed(spd.ms)}
                                className={`px-1.5 py-0.5 rounded text-3xs font-mono ${
                                  cykPlaySpeed === spd.ms
                                    ? 'bg-rose-600 text-white font-bold'
                                    : 'bg-bg-surface2 text-txt-muted hover:text-txt-primary'
                                }`}
                              >
                                {spd.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Current Step Card */}
                      {(() => {
                        const safeIdx = Math.min(cykStepIdx, cykResult.proofSteps.length - 1);
                        const curStep = cykResult.proofSteps[safeIdx];
                        if (!curStep) return null;

                        return (
                          <div className="p-3 bg-bg-surface2/60 rounded border border-rose-900/40 space-y-1.5">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-3xs font-mono font-bold ${
                                    curStep.type === 'CYK_INITIALIZATION'
                                      ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                      : curStep.type === 'CYK_CELL_EVALUATION'
                                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                                      : curStep.type === 'CYK_SPLIT_EVALUATION'
                                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                      : curStep.type === 'CYK_ACCEPTANCE'
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                      : curStep.type === 'CYK_REJECTION'
                                      ? 'bg-red-950 text-red-300 border border-red-800'
                                      : 'bg-purple-950 text-purple-300 border border-purple-800'
                                  }`}
                                >
                                  {curStep.type}
                                </span>
                                <span className="font-bold text-xs text-txt-primary">{curStep.title}</span>
                              </div>

                              {curStep.spanStart !== undefined && curStep.spanEnd !== undefined && (
                                <span className="text-3xs font-mono text-txt-muted">
                                  Cell [{curStep.spanStart}, {curStep.spanEnd}]
                                  {curStep.splitPosition !== undefined ? ` | Split k=${curStep.splitPosition}` : ''}
                                </span>
                              )}
                            </div>

                            <p className="text-2xs text-txt-secondary">{curStep.description}</p>

                            {curStep.mathematicalNotation && (
                              <div className="p-1.5 bg-bg-surface1 rounded font-mono text-3xs text-rose-300/90 border border-border-subtle/60 overflow-x-auto">
                                {curStep.mathematicalNotation}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Triangular CYK Dynamic Programming Chart */}
                  {cykResult.table.tokenCount > 0 && (
                    <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-txt-primary">
                            Triangular Dynamic Programming Table V[i, j]
                          </span>
                          <span className="text-3xs text-txt-muted font-mono">
                            {cykResult.table.tokenCount} tokens ({((cykResult.table.tokenCount * (cykResult.table.tokenCount + 1)) / 2)} sub-spans)
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-3xs text-txt-muted">
                          <div className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded bg-rose-500/80 border border-rose-400 inline-block" />
                            <span>Active Cell</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded bg-sky-500/80 border border-sky-400 inline-block" />
                            <span>Left Split</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded bg-emerald-500/80 border border-emerald-400 inline-block" />
                            <span>Right Split</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded bg-amber-500/80 border border-amber-400 inline-block" />
                            <span>Selected</span>
                          </div>
                        </div>
                      </div>

                      {/* Triangular Chart View */}
                      <div className="overflow-x-auto border border-border-subtle rounded bg-bg-surface2/40 p-2">
                        {(() => {
                          const curStep =
                            cykResult.proofSteps && cykResult.proofSteps.length > 0
                              ? cykResult.proofSteps[Math.min(cykStepIdx, cykResult.proofSteps.length - 1)]
                              : null;

                          return (
                            <table className="w-full text-left border-collapse text-3xs font-mono">
                              <thead className="bg-bg-surface2 text-txt-muted border-b border-border-subtle">
                                <tr>
                                  <th className="p-2 border-r border-border-subtle text-center w-16">Start i \ End j</th>
                                  {cykResult.table.tokens.map((tok, j) => (
                                    <th key={j} className="p-2 text-center border-r border-border-subtle min-w-[68px]">
                                      <div className="font-bold text-txt-primary">j = {j}</div>
                                      <div className="text-3xs text-rose-300 font-semibold truncate">&quot;{tok}&quot;</div>
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border-subtle/60">
                                {cykResult.table.cells.map((row, i) => (
                                  <tr key={i}>
                                    <td className="p-2 text-txt-primary font-bold border-r border-border-subtle bg-bg-surface2/60 text-center">
                                      i = {i}
                                    </td>
                                    {row.map((cell, j) => {
                                      if (j < i) {
                                        return (
                                          <td key={j} className="p-2 border-r border-border-subtle/40 bg-bg-surface3/20" />
                                        );
                                      }

                                      const isRootCell = i === 0 && j === cykResult.table.tokenCount - 1;
                                      const isActiveStepCell =
                                        curStep && curStep.spanStart === i && curStep.spanEnd === j;
                                      const isLeftSplitCell =
                                        curStep &&
                                        curStep.leftCellSpan &&
                                        curStep.leftCellSpan.start === i &&
                                        curStep.leftCellSpan.end === j;
                                      const isRightSplitCell =
                                        curStep &&
                                        curStep.rightCellSpan &&
                                        curStep.rightCellSpan.start === i &&
                                        curStep.rightCellSpan.end === j;
                                      const isUserSelected =
                                        selectedCYKCell && selectedCYKCell.i === i && selectedCYKCell.j === j;

                                      return (
                                        <td
                                          key={j}
                                          onClick={() => setSelectedCYKCell({ i, j })}
                                          className={`p-2 text-center border-r border-border-subtle transition-all cursor-pointer relative ${
                                            isUserSelected
                                              ? 'ring-2 ring-amber-400 bg-amber-950/60 z-20'
                                              : isActiveStepCell
                                              ? 'ring-2 ring-rose-500 bg-rose-950/80 shadow-md z-10'
                                              : isLeftSplitCell
                                              ? 'ring-2 ring-sky-500 bg-sky-950/70 z-10'
                                              : isRightSplitCell
                                              ? 'ring-2 ring-emerald-500 bg-emerald-950/70 z-10'
                                              : isRootCell
                                              ? cykResult.isAccepted
                                                ? 'bg-emerald-950/40 border-2 border-emerald-600/80'
                                                : 'bg-red-950/40 border-2 border-red-600/80'
                                              : cell.variables.length > 0
                                              ? 'bg-bg-surface2/70 hover:bg-bg-surface2'
                                              : 'bg-bg-surface3/10 hover:bg-bg-surface2/30 text-txt-muted'
                                          }`}
                                        >
                                          {/* Substring badge */}
                                          <div className="text-3xs text-txt-muted/80 truncate">
                                            [{i},{j}] &quot;{cell.substring}&quot;
                                          </div>

                                          {/* Variable set */}
                                          <div
                                            className={`font-bold mt-0.5 ${
                                              cell.variables.length > 0
                                                ? isRootCell
                                                  ? cykResult.isAccepted
                                                    ? 'text-emerald-300'
                                                    : 'text-red-300'
                                                  : 'text-rose-300'
                                                : 'text-txt-muted/50'
                                            }`}
                                          >
                                            {cell.variables.length > 0 ? `{ ${cell.variables.join(', ')} }` : '∅'}
                                          </div>

                                          {/* Contributing to parse dot indicator */}
                                          {cell.contributesToParse && (
                                            <span
                                              className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400"
                                              title="Contributes to accepted parse tree"
                                            />
                                          )}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Clicked Cell Inspector Drawer */}
                  {selectedCYKCell && cykResult.table.cells[selectedCYKCell.i] && cykResult.table.cells[selectedCYKCell.i][selectedCYKCell.j] && (
                    <div className="bg-bg-surface1 p-3.5 rounded border border-amber-800/60 space-y-2">
                      {(() => {
                        const cell = cykResult.table.cells[selectedCYKCell.i][selectedCYKCell.j];
                        return (
                          <>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-amber-300">
                                  Cell V[{selectedCYKCell.i}, {selectedCYKCell.j}] Inspector
                                </span>
                                <span className="text-3xs px-2 py-0.5 rounded bg-bg-surface2 text-txt-muted font-mono">
                                  Substring: &quot;{cell.substring}&quot; (Span: {cell.spanEnd - cell.spanStart + 1} tokens)
                                </span>
                              </div>
                              <button
                                onClick={() => setSelectedCYKCell(null)}
                                className="text-3xs text-txt-muted hover:text-txt-primary cursor-pointer"
                              >
                                ✕ Close
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-2xs">
                              <div className="bg-bg-surface2/60 p-2.5 rounded border border-border-subtle space-y-1">
                                <span className="text-txt-muted font-bold block">Variables in Cell:</span>
                                <div className="font-mono text-rose-300 font-bold">
                                  {cell.variables.length > 0 ? `{ ${cell.variables.join(', ')} }` : '∅ (Empty Set)'}
                                </div>
                                <div className="text-3xs text-txt-muted pt-1">
                                  {cell.contributesToParse ? (
                                    <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                                      <CheckCircle2 className="w-3 h-3" /> Contributes to final accepted parse
                                    </span>
                                  ) : (
                                    <span>Does not participate in final root parse</span>
                                  )}
                                </div>
                              </div>

                              <div className="bg-bg-surface2/60 p-2.5 rounded border border-border-subtle space-y-1">
                                <span className="text-txt-muted font-bold block">Derivation Evidence (Backpointers):</span>
                                <div className="max-h-28 overflow-y-auto space-y-1 font-mono text-3xs">
                                  {cell.witnesses.length > 0 ? (
                                    cell.witnesses.map((w, wIdx) => (
                                      <div key={wIdx} className="p-1 rounded bg-bg-surface1 border border-border-subtle/50">
                                        <span className="text-rose-300 font-bold">{w.variable}</span> →{' '}
                                        {w.leftVariable && w.rightVariable ? (
                                          <span>
                                            {w.leftVariable} {w.rightVariable}{' '}
                                            <span className="text-txt-muted">
                                              (split k={w.splitPosition} → V[{cell.spanStart},{w.splitPosition}] × V[{w.splitPosition + 1},{cell.spanEnd}])
                                            </span>
                                          </span>
                                        ) : (
                                          <span>
                                            {w.productionRhs.map((s) => s.value).join(' ')}{' '}
                                            <span className="text-txt-muted">(terminal base match)</span>
                                          </span>
                                        )}
                                      </div>
                                    ))
                                  ) : (
                                    <span className="text-txt-muted italic">No derivations possible for this span.</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* Final Membership Result & Ambiguity Evaluation */}
                  <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        {cykResult.isAccepted ? (
                          <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2.5 py-1 rounded text-2xs font-bold flex items-center gap-1.5 shadow-sm">
                            <CheckCircle2 className="w-4 h-4" /> ACCEPTED: &quot;{testInput || 'ε'}&quot; ∈ L(G)
                          </span>
                        ) : (
                          <span className="bg-red-950 text-red-300 border border-red-800 px-2.5 py-1 rounded text-2xs font-bold flex items-center gap-1.5 shadow-sm">
                            <XCircle className="w-4 h-4" /> REJECTED: &quot;{testInput || 'ε'}&quot; ∉ L(G)
                          </span>
                        )}

                        {cykResult.isEpsilonAcceptance && (
                          <span className="bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded text-3xs font-semibold">
                            ε-acceptance ({grammarUsedByCYK?.startVariable} → ε)
                          </span>
                        )}

                        {cykResult.isAmbiguous ? (
                          <span className="bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded text-3xs font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Ambiguous:{' '}
                            {cykResult.isExactCountKnown
                              ? `${cykResult.exactParseTreeCount} Valid Parse Trees`
                              : `>${Number.MAX_SAFE_INTEGER} Valid Parse Trees (Overflow)`}
                          </span>
                        ) : cykResult.isAccepted ? (
                          <span className="bg-bg-surface2 text-txt-secondary border border-border-subtle px-2 py-0.5 rounded text-3xs font-semibold">
                            Unambiguous Derivation (1 Parse Tree)
                          </span>
                        ) : null}
                      </div>

                      <div className="text-3xs text-txt-muted font-mono">
                        Cells Explored: {cykResult.exploredCellCount} | Time: {cykResult.statistics?.executionTimeMs.toFixed(2)} ms
                      </div>
                    </div>

                    {/* Mathematical Explanation */}
                    {cykResult.isAccepted ? (
                      <p className="text-2xs text-txt-secondary">
                        The grammar start symbol <code className="text-emerald-300 font-mono font-bold">{grammarUsedByCYK?.startVariable}</code> was found in root cell <code className="text-txt-primary font-mono font-bold">V[0, {Math.max(0, cykResult.tokens.length - 1)}]</code>. This proves mathematically that <code className="text-txt-primary font-mono font-bold">&quot;{testInput || 'ε'}&quot;</code> can be derived from <code className="text-emerald-300 font-mono font-bold">{grammarUsedByCYK?.startVariable}</code>.
                      </p>
                    ) : (
                      <p className="text-2xs text-txt-secondary">
                        {cykResult.rejectionExplanation || `The start symbol ${grammarUsedByCYK?.startVariable} does not appear in root cell V[0, ${Math.max(0, cykResult.tokens.length - 1)}]. No valid derivation exists.`}
                      </p>
                    )}

                    {/* Reconstructed Parse Tree(s) from Backpointers */}
                    {cykResult.parseTrees && cykResult.parseTrees.length > 0 && (
                      <div className="bg-bg-surface2/60 p-3.5 rounded border border-border-subtle space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-rose-300">
                              Reconstructed CNF Parse Tree (from CYK Backpointers)
                            </span>
                            {cykResult.parseTrees.length > 1 && (
                              <span className="text-3xs px-2 py-0.5 rounded bg-bg-surface3 border border-border-subtle text-txt-muted font-mono">
                                Showing {cykResult.parseTrees.length} of{' '}
                                {cykResult.isExactCountKnown
                                  ? `${cykResult.exactParseTreeCount} Trees`
                                  : `>${Number.MAX_SAFE_INTEGER} Trees`}
                              </span>
                            )}
                          </div>

                          {/* Multiple Parse Tree Selector Tabs */}
                          {cykResult.parseTrees.length > 1 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {cykResult.parseTrees.map((_, tIdx) => (
                                <button
                                  key={tIdx}
                                  onClick={() => setActiveCykTreeIdx(tIdx)}
                                  className={`px-2 py-0.5 rounded text-3xs font-semibold transition-colors cursor-pointer ${
                                    activeCykTreeIdx === tIdx
                                      ? 'bg-rose-600 text-white shadow-sm'
                                      : 'bg-bg-surface2 text-txt-secondary hover:text-txt-primary border border-border-subtle'
                                  }`}
                                >
                                  Parse Tree {String.fromCharCode(65 + tIdx)}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Hierarchical Tree Render */}
                        {(() => {
                          const safeTreeIdx = Math.max(0, Math.min(activeCykTreeIdx, cykResult.parseTrees.length - 1));
                          const currentTree = cykResult.parseTrees[safeTreeIdx] || cykResult.parseTrees[0];

                          return (
                            <div className="p-4 bg-bg-surface1 rounded border border-border-subtle overflow-x-auto min-h-[160px] flex items-center justify-center">
                              <RenderParseTreeNode node={currentTree} isRoot={true} />
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Execution Statistics Grid */}
                  {cykResult.statistics && (
                    <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-2">
                      <span className="font-bold text-xs text-txt-primary">CYK Performance & Complexity Profile</span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-center text-3xs font-mono">
                        <div className="p-2 bg-bg-surface2 rounded border border-border-subtle">
                          <span className="text-txt-muted block">Input Length (n)</span>
                          <span className="text-rose-300 font-bold text-xs">{cykResult.statistics.inputLength}</span>
                        </div>
                        <div className="p-2 bg-bg-surface2 rounded border border-border-subtle">
                          <span className="text-txt-muted block">DP Cells (n(n+1)/2)</span>
                          <span className="text-rose-300 font-bold text-xs">{cykResult.statistics.totalCells}</span>
                        </div>
                        <div className="p-2 bg-bg-surface2 rounded border border-border-subtle">
                          <span className="text-txt-muted block">Populated Cells</span>
                          <span className="text-rose-300 font-bold text-xs">{cykResult.statistics.populatedCells}</span>
                        </div>
                        <div className="p-2 bg-bg-surface2 rounded border border-border-subtle">
                          <span className="text-txt-muted block">Productions Tested</span>
                          <span className="text-rose-300 font-bold text-xs">{cykResult.statistics.productionsChecked}</span>
                        </div>
                        <div className="p-2 bg-bg-surface2 rounded border border-border-subtle">
                          <span className="text-txt-muted block">Insertions</span>
                          <span className="text-rose-300 font-bold text-xs">{cykResult.statistics.successfulInsertions}</span>
                        </div>
                        <div className="p-2 bg-bg-surface2 rounded border border-border-subtle">
                          <span className="text-txt-muted block">Exec Time</span>
                          <span className="text-rose-300 font-bold text-xs">{cykResult.statistics.executionTimeMs.toFixed(2)} ms</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Educational Theory Reference Accordion */}
                  <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-2">
                    <button
                      onClick={() => setShowCykTheory((prev) => !prev)}
                      className="w-full flex items-center justify-between text-xs font-bold text-txt-primary hover:text-rose-300 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-rose-400" />
                        <span>CYK Algorithm Theory & Mathematical Foundations</span>
                      </div>
                      <span className="text-3xs text-txt-muted">{showCykTheory ? '▲ Hide Guide' : '▼ Read Guide'}</span>
                    </button>

                    {showCykTheory && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border-subtle text-2xs">
                        <div className="bg-bg-surface2/60 p-2.5 rounded border border-border-subtle space-y-1">
                          <span className="font-bold text-txt-primary block">1. Why Chomsky Normal Form is Required</span>
                          <p className="text-txt-muted">
                            CYK relies on the property that in CNF, every production is either <code className="text-txt-primary">A → a</code> (consuming exactly 1 symbol) or <code className="text-txt-primary">A → BC</code> (splitting the derived substring into exactly two non-empty pieces). This guarantees no cyclic derivations and enables clean $O(n^3)$ dynamic programming.
                          </p>
                        </div>
                        <div className="bg-bg-surface2/60 p-2.5 rounded border border-border-subtle space-y-1">
                          <span className="font-bold text-txt-primary block">2. The DP Recurrence Relation</span>
                          <p className="text-txt-muted font-mono">
                            {'V[i, j] = ⋃ (k=i..j-1) { A | ∃ A → BC, B ∈ V[i, k], C ∈ V[k+1, j] }'}
                          </p>
                          <p className="text-txt-muted">
                            For substrings of length 1, <code className="text-txt-primary">A ∈ V[i, i]</code> if <code className="text-txt-primary">A → aᵢ</code> exists.
                          </p>
                        </div>
                        <div className="bg-bg-surface2/60 p-2.5 rounded border border-border-subtle space-y-1">
                          <span className="font-bold text-txt-primary block">3. Backpointers & Parse Tree Generation</span>
                          <p className="text-txt-muted">
                            Whenever a binary production <code className="text-txt-primary">A → BC</code> succeeds at split <code className="text-txt-primary">k</code>, we store a backpointer record referencing the production and split. A recursive traversal from root cell <code className="text-txt-primary">V[0, n-1]</code> reconstructs the exact parse tree.
                          </p>
                        </div>
                        <div className="bg-bg-surface2/60 p-2.5 rounded border border-border-subtle space-y-1">
                          <span className="font-bold text-txt-primary block">4. Ambiguity & Catalan Numbers</span>
                          <p className="text-txt-muted">
                            When multiple split positions or productions derive the same nonterminal, the grammar is ambiguous. In grammars like <code className="text-txt-primary">S → SS | a</code>, the number of parse trees for a word of length <code className="text-txt-primary">n</code> is given by the Catalan number <code className="text-txt-primary">C_{'{'}n-1{'}'}</code>.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* FIRST/FOLLOW View (Topic 5) */}
          {activeSubView === 'FIRST_FOLLOW' && (
            <div className="space-y-4">
              {/* Educational Formal Header */}
              <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span className="font-bold text-xs text-txt-primary">FIRST and FOLLOW Sets Analysis</span>
                  </div>
                  <span className="text-2xs px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/80 font-mono font-semibold">
                    Fixed-Point Iterative Analysis
                  </span>
                </div>
                <p className="text-2xs text-txt-muted">
                  <strong>FIRST(A)</strong> is the set of terminals that can begin strings derived from <code className="text-txt-primary">A</code> (plus ε if <code className="text-txt-primary">A ⇒* ε</code>).
                  <strong> FOLLOW(A)</strong> is the set of terminals that can appear immediately to the right of <code className="text-txt-primary">A</code> in some sentential form (plus $ for start symbol S).
                </p>

                <div className="flex items-center gap-3 pt-1 text-2xs flex-wrap">
                  <div className="bg-bg-surface2 px-2.5 py-1 rounded border border-border-subtle flex items-center gap-1.5">
                    <span className="text-txt-muted">Variables (|V|):</span>
                    <span className="text-cyan-400 font-bold">{grammar.variables.length}</span>
                  </div>
                  <div className="bg-bg-surface2 px-2.5 py-1 rounded border border-border-subtle flex items-center gap-1.5">
                    <span className="text-txt-muted">Nullable Variables:</span>
                    <span className="text-purple-400 font-bold">{firstFollowAnalysis.nullableVariables.length} ({firstFollowAnalysis.nullableVariables.join(', ') || 'None'})</span>
                  </div>
                  <div className="bg-bg-surface2 px-2.5 py-1 rounded border border-border-subtle flex items-center gap-1.5">
                    <span className="text-txt-muted">FIRST Iterations:</span>
                    <span className="text-blue-400 font-bold">{firstFollowAnalysis.firstIterations.length} passes</span>
                  </div>
                  <div className="bg-bg-surface2 px-2.5 py-1 rounded border border-border-subtle flex items-center gap-1.5">
                    <span className="text-txt-muted">FOLLOW Iterations:</span>
                    <span className="text-amber-400 font-bold">{firstFollowAnalysis.followIterations.length} passes</span>
                  </div>
                </div>
              </div>

              {!firstFollowAnalysis.isValid ? (
                <div className="bg-red-950/40 p-4 rounded border border-red-800/80 text-red-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-400" />
                    <span className="font-bold text-xs">Invalid Grammar Specification</span>
                  </div>
                  <ul className="list-disc pl-5 text-2xs space-y-1 font-mono">
                    {firstFollowAnalysis.diagnostics?.map((diag, i) => (
                      <li key={i}>{diag}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <>
                  {/* Master Sets Table */}
                  <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-txt-primary">Grammar Symbols (V) Sets</span>
                      <span className="text-3xs text-txt-muted">Click any row to view step-by-step mathematical breakdown</span>
                    </div>

                    <div className="overflow-x-auto border border-border-subtle rounded">
                      <table className="w-full text-left border-collapse text-2xs font-mono">
                        <thead className="bg-bg-surface2 text-txt-muted border-b border-border-subtle">
                          <tr>
                            <th className="p-2">Variable (V)</th>
                            <th className="p-2">Nullable (A ⇒* ε)</th>
                            <th className="p-2">FIRST(A)</th>
                            <th className="p-2">FOLLOW(A)</th>
                            <th className="p-2 text-right">Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle/60">
                          {grammar.variables.map((v) => {
                            const isSelected = (selectedFirstFollowVar || grammar.startVariable || grammar.variables[0]) === v;
                            const isNullable = firstFollowAnalysis.nullableVariables.includes(v);
                            const firstSet = firstFollowAnalysis.firstSets[v] || [];
                            const followSet = firstFollowAnalysis.followSets[v] || [];

                            return (
                              <tr
                                key={v}
                                onClick={() => setSelectedFirstFollowVar(v)}
                                className={`cursor-pointer transition-colors ${
                                  isSelected
                                    ? 'bg-cyan-950/50 border-l-2 border-l-cyan-400'
                                    : 'hover:bg-bg-surface2/50 text-txt-primary'
                                }`}
                              >
                                <td className="p-2 font-bold text-cyan-400 flex items-center gap-1.5">
                                  {v}
                                  {v === grammar.startVariable && (
                                    <span className="px-1 py-0.2 rounded bg-cyan-900/60 text-cyan-200 text-3xs font-sans">Start</span>
                                  )}
                                </td>
                                <td className="p-2">
                                  {isNullable ? (
                                    <span className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800 text-3xs font-semibold">
                                      YES (ε)
                                    </span>
                                  ) : (
                                    <span className="text-txt-muted text-3xs">NO</span>
                                  )}
                                </td>
                                <td className="p-2 text-txt-primary font-bold">
                                  {'{'}{firstSet.join(', ') || '∅'}{'}'}
                                </td>
                                <td className="p-2 text-txt-primary font-bold">
                                  {'{'}{followSet.join(', ') || '∅'}{'}'}
                                </td>
                                <td className="p-2 text-right">
                                  <span className={`text-3xs px-2 py-0.5 rounded ${
                                    isSelected
                                      ? 'bg-cyan-600 text-white font-semibold'
                                      : 'bg-bg-surface2 text-txt-muted'
                                  }`}>
                                    {isSelected ? 'Active' : 'Inspect'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Selected Symbol Breakdown */}
                  {(() => {
                    const activeVar = selectedFirstFollowVar || grammar.startVariable || grammar.variables[0] || '';
                    const exp = firstFollowAnalysis.explanations[activeVar];
                    if (!exp) return null;

                    return (
                      <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-3">
                        <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-txt-primary">Mathematical Breakdown for Symbol:</span>
                            <span className="px-2 py-0.5 rounded bg-cyan-900/60 text-cyan-200 border border-cyan-600/80 text-xs font-mono font-bold">
                              {activeVar}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-2xs">
                            <span className="text-txt-muted">Nullable:</span>
                            <span className={`font-bold ${exp.isNullable ? 'text-purple-300' : 'text-slate-400'}`}>
                              {exp.isNullable ? `YES (${exp.nullableReason})` : 'NO'}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* FIRST Set Rules */}
                          <div className="bg-bg-surface2/60 p-3 rounded border border-border-subtle space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-2xs text-cyan-300">FIRST({activeVar}) Derivation Rules</span>
                              <span className="text-2xs font-mono font-bold text-cyan-200">
                                {'{'}{exp.firstSet.join(', ') || '∅'}{'}'}
                              </span>
                            </div>

                            {exp.firstRules.length > 0 ? (
                              <ul className="space-y-1.5 text-3xs font-mono text-txt-secondary">
                                {exp.firstRules.map((r, i) => (
                                  <li key={i} className="flex items-start gap-1.5 bg-bg-surface1/60 p-1.5 rounded border border-border-subtle/50">
                                    <span className="text-cyan-400 font-bold shrink-0">•</span>
                                    <span>{r}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-3xs text-txt-muted italic">No terminals or ε reachable in FIRST({activeVar}).</p>
                            )}

                            {exp.dependencies.firstDependsOn.length > 0 && (
                              <div className="pt-1 flex items-center gap-1.5 flex-wrap text-3xs">
                                <span className="text-txt-muted font-sans">FIRST depends on:</span>
                                {exp.dependencies.firstDependsOn.map((dep) => (
                                  <span key={dep} className="px-1.5 py-0.2 rounded bg-bg-surface3 border border-border-subtle font-mono text-cyan-300">
                                    {dep}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* FOLLOW Set Rules */}
                          <div className="bg-bg-surface2/60 p-3 rounded border border-border-subtle space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-2xs text-amber-300">FOLLOW({activeVar}) Propagation Rules</span>
                              <span className="text-2xs font-mono font-bold text-amber-200">
                                {'{'}{exp.followSet.join(', ') || '∅'}{'}'}
                              </span>
                            </div>

                            {exp.followRules.length > 0 ? (
                              <ul className="space-y-1.5 text-3xs font-mono text-txt-secondary">
                                {exp.followRules.map((r, i) => (
                                  <li key={i} className="flex items-start gap-1.5 bg-bg-surface1/60 p-1.5 rounded border border-border-subtle/50">
                                    <span className="text-amber-400 font-bold shrink-0">•</span>
                                    <span>{r}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-3xs text-txt-muted italic">No follow constraints generated for {activeVar}.</p>
                            )}

                            {exp.dependencies.followDependsOn.length > 0 && (
                              <div className="pt-1 flex items-center gap-1.5 flex-wrap text-3xs">
                                <span className="text-txt-muted font-sans">FOLLOW propagates from:</span>
                                {exp.dependencies.followDependsOn.map((dep) => (
                                  <span key={dep} className="px-1.5 py-0.2 rounded bg-bg-surface3 border border-border-subtle font-mono text-amber-300">
                                    {dep}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Fixed-Point Iteration History Accordion */}
                  <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 text-txt-muted" />
                        <span className="font-bold text-xs text-txt-primary">Fixed-Point Convergence History</span>
                      </div>
                      <button
                        onClick={() => setShowIterationDetails(!showIterationDetails)}
                        className="px-2.5 py-1 rounded bg-bg-surface2 hover:bg-bg-surface3 border border-border-subtle text-txt-secondary hover:text-txt-primary text-2xs font-semibold transition-colors cursor-pointer"
                      >
                        {showIterationDetails ? 'Hide Iteration Logs' : 'Show Iteration Passes'}
                      </button>
                    </div>

                    {showIterationDetails && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border-subtle">
                        {/* FIRST Passes */}
                        <div className="space-y-2">
                          <span className="font-bold text-2xs text-cyan-300">
                            FIRST Fixed-Point Steps ({firstFollowAnalysis.firstIterations.length} passes)
                          </span>
                          <div className="space-y-1.5 max-h-56 overflow-y-auto font-mono text-3xs">
                            {firstFollowAnalysis.firstIterations.map((it) => (
                              <div key={it.iteration} className="bg-bg-surface2/80 p-2 rounded border border-border-subtle">
                                <div className="flex items-center justify-between text-txt-muted pb-1 border-b border-border-subtle/50 mb-1">
                                  <span>Pass {it.iteration}</span>
                                  <span className={it.changed ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                                    {it.changed ? 'Expanded' : 'Stable (Fixed Point)'}
                                  </span>
                                </div>
                                <div className="space-y-0.5">
                                  {grammar.variables.map((v) => (
                                    <div key={v} className="flex items-center justify-between">
                                      <span className="text-cyan-400">{v}:</span>
                                      <span className="text-txt-primary">{'{'}{(it.sets[v] || []).join(', ') || '∅'}{'}'}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* FOLLOW Passes */}
                        <div className="space-y-2">
                          <span className="font-bold text-2xs text-amber-300">
                            FOLLOW Fixed-Point Steps ({firstFollowAnalysis.followIterations.length} passes)
                          </span>
                          <div className="space-y-1.5 max-h-56 overflow-y-auto font-mono text-3xs">
                            {firstFollowAnalysis.followIterations.map((it) => (
                              <div key={it.iteration} className="bg-bg-surface2/80 p-2 rounded border border-border-subtle">
                                <div className="flex items-center justify-between text-txt-muted pb-1 border-b border-border-subtle/50 mb-1">
                                  <span>Pass {it.iteration}</span>
                                  <span className={it.changed ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                                    {it.changed ? 'Expanded' : 'Stable (Fixed Point)'}
                                  </span>
                                </div>
                                <div className="space-y-0.5">
                                  {grammar.variables.map((v) => (
                                    <div key={v} className="flex items-center justify-between">
                                      <span className="text-amber-400">{v}:</span>
                                      <span className="text-txt-primary">{'{'}{(it.sets[v] || []).join(', ') || '∅'}{'}'}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Left Recursion Analysis & Elimination View (Topic 6) */}
          {activeSubView === 'LEFT_RECURSION' && (
            <div className="space-y-4">
              {/* Educational Formal Header */}
              <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-orange-400" />
                    <span className="font-bold text-xs text-txt-primary">Left Recursion Analysis & Elimination (Topic 6)</span>
                  </div>
                  <span className="text-2xs px-2 py-0.5 rounded bg-orange-950/60 text-orange-300 border border-orange-800/80 font-mono font-semibold">
                    Grammar Normalization
                  </span>
                </div>
                <p className="text-2xs text-txt-muted">
                  <strong>Immediate Left Recursion</strong> occurs when a production is of the form <code className="text-txt-primary">A → Aα</code>. Standard elimination transforms <code className="text-txt-primary">A → Aα | β</code> into <code className="text-txt-primary">A → β A&apos;, A&apos; → α A&apos; | ε</code>.
                  <strong> Indirect Left Recursion</strong> involves cycles such as <code className="text-txt-primary">A ⇒* Aα</code> via multiple nonterminals and requires systematic ordered substitution.
                </p>

                {/* Status Diagnostic Card */}
                <div className="flex items-center gap-3 pt-1 text-2xs flex-wrap">
                  <div className={`px-2.5 py-1 rounded border flex items-center gap-1.5 font-bold ${
                    leftRecursionDiag.classification === 'NO_LEFT_RECURSION'
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                      : leftRecursionDiag.classification === 'IMMEDIATE_LEFT_RECURSION'
                      ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                      : leftRecursionDiag.classification === 'INDIRECT_LEFT_RECURSION'
                      ? 'bg-purple-950/80 text-purple-300 border-purple-800'
                      : 'bg-red-950/80 text-red-300 border-red-800'
                  }`}>
                    {leftRecursionDiag.classification === 'NO_LEFT_RECURSION' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    )}
                    {leftRecursionDiag.classification === 'NO_LEFT_RECURSION' && 'NO LEFT RECURSION'}
                    {leftRecursionDiag.classification === 'IMMEDIATE_LEFT_RECURSION' && 'IMMEDIATE LEFT RECURSION DETECTED'}
                    {leftRecursionDiag.classification === 'INDIRECT_LEFT_RECURSION' && 'INDIRECT LEFT RECURSION DETECTED'}
                    {leftRecursionDiag.classification === 'BOTH' && 'IMMEDIATE & INDIRECT LEFT RECURSION DETECTED'}
                  </div>

                  <div className="bg-bg-surface2 px-2.5 py-1 rounded border border-border-subtle flex items-center gap-1.5">
                    <span className="text-txt-muted">Direct Recursive Variables:</span>
                    <span className="text-orange-400 font-bold">{leftRecursionDiag.directVariables.length > 0 ? leftRecursionDiag.directVariables.join(', ') : 'None'}</span>
                  </div>

                  <div className="bg-bg-surface2 px-2.5 py-1 rounded border border-border-subtle flex items-center gap-1.5">
                    <span className="text-txt-muted">Indirect Cycles:</span>
                    <span className="text-purple-400 font-bold">{leftRecursionDiag.indirectCycles.length > 0 ? leftRecursionDiag.indirectCycles.map(c => c.join(' → ')).join('; ') : 'None'}</span>
                  </div>
                </div>
              </div>

              {/* Left-Corner Dependency & Recursive Productions Inspector */}
              <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-3">
                <span className="font-bold text-xs text-txt-primary">Left-Corner Dependency & Structure Analysis</span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Immediate Left Recursive Productions */}
                  <div className="bg-bg-surface2/60 p-3 rounded border border-border-subtle space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-2xs text-orange-300">Direct Left-Recursive Rules (A → Aα)</span>
                      <span className="text-3xs text-txt-muted">{leftRecursionDiag.directProductions.length} rule(s)</span>
                    </div>

                    {leftRecursionDiag.directProductions.length > 0 ? (
                      <div className="space-y-1 font-mono text-3xs">
                        {leftRecursionDiag.directProductions.map((p) => (
                          <div key={p.id} className="p-1.5 bg-bg-surface1 rounded border border-orange-900/60 flex items-center justify-between text-orange-200">
                            <span>{p.lhs} → {p.rhs.map(s => s.type === 'EPSILON' ? 'ε' : s.value).join(' ')}</span>
                            <span className="text-orange-400 font-bold text-3xs">Direct</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-3xs text-txt-muted italic">No direct left-recursive productions found.</p>
                    )}
                  </div>

                  {/* Left-Corner Graph Dependencies */}
                  <div className="bg-bg-surface2/60 p-3 rounded border border-border-subtle space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-2xs text-purple-300">Left-Corner Symbol Dependencies</span>
                      <span className="text-3xs text-txt-muted">Position 0 Expansion Map</span>
                    </div>

                    <div className="space-y-1 font-mono text-3xs">
                      {grammar.variables.map((v) => {
                        const deps = leftRecursionDiag.leftCornerDependencies[v] || [];
                        return (
                          <div key={v} className="p-1.5 bg-bg-surface1 rounded border border-border-subtle flex items-center justify-between">
                            <span className="text-cyan-400 font-bold">{v}</span>
                            <span className="text-txt-muted">→ leftmost:</span>
                            <span className="text-txt-primary">
                              {deps.length > 0 ? `{${deps.join(', ')}}` : '∅ (terminals / ε only)'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Before vs After Transformation Comparison */}
              <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-txt-primary">Before vs After Grammar Comparison</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-3xs font-semibold">
                      {leftRecursionResult.languagePreservationStatus === 'VERIFIED_BOUNDED' ? '✓ Language Preserved (Bounded Check)' : 'Preservation Verified'}
                    </span>
                  </div>

                  {leftRecursionResult.changed && !customGrammar && (
                    <button
                      onClick={() => setCustomGrammar(leftRecursionResult.transformedGrammar)}
                      className="px-2.5 py-1 rounded bg-orange-600 hover:bg-orange-500 text-white font-semibold text-2xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Apply Transformed Grammar to Workbench
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Original Grammar */}
                  <div className="bg-bg-surface2/60 p-3 rounded border border-border-subtle space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-border-subtle">
                      <span className="font-bold text-2xs text-txt-primary">Original Grammar (G)</span>
                      <span className="text-3xs text-txt-muted">|V| = {grammar.variables.length}, |P| = {grammar.productions.length}</span>
                    </div>

                    <div className="space-y-1 font-mono text-3xs max-h-60 overflow-y-auto">
                      {grammar.productions.map((p, idx) => {
                        const isDirectRec = p.rhs.length > 0 && p.rhs[0].type === 'NON_TERMINAL' && p.rhs[0].value === p.lhs;
                        return (
                          <div
                            key={p.id || idx}
                            className={`p-1.5 rounded border flex items-center justify-between ${
                              isDirectRec
                                ? 'bg-orange-950/40 border-orange-800/80 text-orange-200'
                                : 'bg-bg-surface1 border-border-subtle text-txt-primary'
                            }`}
                          >
                            <span>{p.lhs} → {p.rhs.length === 0 ? 'ε' : p.rhs.map(s => s.type === 'EPSILON' ? 'ε' : s.value).join(' ')}</span>
                            {isDirectRec && (
                              <span className="text-3xs text-orange-400 font-semibold px-1 rounded bg-orange-950 border border-orange-800">
                                Left-Recursive
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Transformed Grammar */}
                  <div className="bg-bg-surface2/60 p-3 rounded border border-border-subtle space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-border-subtle">
                      <span className="font-bold text-2xs text-emerald-300">Transformed Grammar (G&apos;)</span>
                      <span className="text-3xs text-emerald-400 font-semibold">
                        {leftRecursionResult.detectionAfter.isLeftRecursive ? 'Left-Recursive' : '✓ Zero Left Recursion'}
                      </span>
                    </div>

                    <div className="space-y-1 font-mono text-3xs max-h-60 overflow-y-auto">
                      {leftRecursionResult.transformedGrammar.productions.map((p, idx) => {
                        const isNewVar = leftRecursionResult.generatedSymbolNames.includes(p.lhs);
                        return (
                          <div
                            key={p.id || idx}
                            className={`p-1.5 rounded border flex items-center justify-between ${
                              isNewVar
                                ? 'bg-purple-950/40 border-purple-800/80 text-purple-200'
                                : 'bg-bg-surface1 border-border-subtle text-txt-primary'
                            }`}
                          >
                            <span>{p.lhs} → {p.rhs.length === 0 ? 'ε' : p.rhs.map(s => s.type === 'EPSILON' ? 'ε' : s.value).join(' ')}</span>
                            {isNewVar && (
                              <span className="text-3xs text-purple-300 font-semibold px-1 rounded bg-purple-950 border border-purple-800">
                                New Aux Symbol
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Step-by-Step Transformation Trace History */}
              <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-3">
                <span className="font-bold text-xs text-txt-primary">
                  Transformation Trace & Mathematical History ({leftRecursionResult.steps.length} step(s))
                </span>

                <div className="space-y-2">
                  {leftRecursionResult.steps.map((step) => (
                    <div key={step.stepIndex} className="bg-bg-surface2/80 p-2.5 rounded border border-border-subtle space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-2xs text-cyan-300 flex items-center gap-1.5">
                          <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-200 border border-cyan-800 text-3xs font-mono">
                            Step {step.stepIndex + 1}
                          </span>
                          {step.title}
                        </span>
                        <span className="text-3xs text-txt-muted font-mono">{step.type}</span>
                      </div>

                      <p className="text-2xs text-txt-secondary">{step.description}</p>

                      <div className="bg-bg-surface1 p-1.5 rounded border border-border-subtle/60 text-3xs font-mono text-amber-200">
                        {step.mathematicalNotation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Left Factoring Analysis & Transformation View (Topic 7) */}
          {activeSubView === 'LEFT_FACTORING' && (
            <div className="space-y-4">
              {/* Educational Formal Header */}
              <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Split className="w-4 h-4 text-teal-400" />
                    <span className="font-bold text-xs text-txt-primary">Left Factoring Studio (Topic 7)</span>
                  </div>
                  <span className="text-2xs px-2 py-0.5 rounded bg-teal-950/60 text-teal-300 border border-teal-800/80 font-mono font-semibold">
                    Common Prefix Extraction
                  </span>
                </div>
                <p className="text-2xs text-txt-muted">
                  <strong>Left Factoring</strong> is a grammar transformation applied when two or more alternatives for a nonterminal share a common prefix.
                  The rule <code className="text-txt-primary">A → αβ₁ | αβ₂</code> is transformed into <code className="text-txt-primary">A → αA&apos;, A&apos; → β₁ | β₂</code>, deferring the parser&apos;s decision until sufficient lookahead tokens have been scanned.
                </p>

                {/* Status Diagnostic Card */}
                <div className="flex items-center gap-3 pt-1 text-2xs flex-wrap">
                  <div className={`px-2.5 py-1 rounded border flex items-center gap-1.5 font-bold ${
                    !leftFactoringDiag.requiresFactoring
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                      : 'bg-amber-950/80 text-amber-300 border-amber-800'
                  }`}>
                    {!leftFactoringDiag.requiresFactoring ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    )}
                    {!leftFactoringDiag.requiresFactoring ? 'NO LEFT FACTORING REQUIRED' : 'LEFT FACTORING AVAILABLE'}
                  </div>

                  <div className="bg-bg-surface2 px-2.5 py-1 rounded border border-border-subtle flex items-center gap-1.5">
                    <span className="text-txt-muted">Factorable Variables:</span>
                    <span className="text-teal-400 font-bold">{leftFactoringDiag.factorableVariables.length > 0 ? leftFactoringDiag.factorableVariables.join(', ') : 'None'}</span>
                  </div>

                  <div className="bg-bg-surface2 px-2.5 py-1 rounded border border-border-subtle flex items-center gap-1.5">
                    <span className="text-txt-muted">Prefix Groups:</span>
                    <span className="text-cyan-400 font-bold">{leftFactoringDiag.totalPrefixGroups} group(s)</span>
                  </div>
                </div>
              </div>

              {/* Factorable Groups Inspector */}
              <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-3">
                <span className="font-bold text-xs text-txt-primary">Factorable Common Prefix Groups</span>

                {leftFactoringDiag.groups.length > 0 ? (
                  <div className="space-y-2">
                    {leftFactoringDiag.groups.map((grp, idx) => (
                      <div key={idx} className="bg-bg-surface2/60 p-3 rounded border border-border-subtle space-y-2 font-mono text-2xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-amber-400 font-bold">Variable {grp.variable}</span>
                            <span className="text-txt-muted">|</span>
                            <span className="text-teal-300 font-semibold">Common Prefix (LCP): &ldquo;{grp.commonPrefixNotation}&rdquo;</span>
                          </div>
                          <span className="text-3xs text-txt-muted">{grp.matchedProductions.length} alternative(s)</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                          <div className="p-2 bg-bg-surface1 rounded border border-border-subtle space-y-1">
                            <span className="text-3xs text-txt-muted font-sans font-bold">Matched Alternatives:</span>
                            {grp.matchedProductions.map((p) => (
                              <div key={p.id} className="text-txt-primary">
                                {p.lhs} → {p.rhs.map(s => s.type === 'EPSILON' ? 'ε' : s.value).join(' ')}
                              </div>
                            ))}
                          </div>

                          <div className="p-2 bg-bg-surface1 rounded border border-border-subtle space-y-1">
                            <span className="text-3xs text-txt-muted font-sans font-bold">Extracted Suffixes (β):</span>
                            {grp.suffixes.map((s, sIdx) => (
                              <div key={sIdx} className="text-cyan-300">
                                β_{sIdx + 1} = &ldquo;{s.suffixNotation}&rdquo;
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="p-1.5 bg-teal-950/40 border border-teal-900/60 rounded text-teal-200 text-3xs">
                          <strong>Planned Transform:</strong> {grp.plannedTransformation}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-2xs text-txt-muted italic">No common prefixes found among nonterminal alternatives. All production prefixes are distinct.</p>
                )}
              </div>

              {/* Before vs After Transformation Comparison */}
              <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-txt-primary">Before vs After Factored Comparison</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-3xs font-semibold">
                      {leftFactoringResult.languagePreservationStatus === 'VERIFIED_BOUNDED' ? '✓ Language Preserved (Bounded Check)' : 'Preservation Verified'}
                    </span>
                  </div>

                  {leftFactoringResult.changed && !customGrammar && (
                    <button
                      onClick={() => setCustomGrammar(leftFactoringResult.transformedGrammar)}
                      className="px-2.5 py-1 rounded bg-teal-600 hover:bg-teal-500 text-white font-semibold text-2xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Apply Factored Grammar to Workbench
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Original Grammar */}
                  <div className="bg-bg-surface2/60 p-3 rounded border border-border-subtle space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-border-subtle">
                      <span className="font-bold text-2xs text-txt-primary">Original Grammar (G)</span>
                      <span className="text-3xs text-txt-muted">|V| = {grammar.variables.length}, |P| = {grammar.productions.length}</span>
                    </div>

                    <div className="space-y-1 font-mono text-3xs max-h-60 overflow-y-auto">
                      {grammar.productions.map((p, idx) => {
                        return (
                          <div
                            key={p.id || idx}
                            className="p-1.5 rounded border bg-bg-surface1 border-border-subtle text-txt-primary flex items-center justify-between"
                          >
                            <span>{p.lhs} → {p.rhs.length === 0 ? 'ε' : p.rhs.map(s => s.type === 'EPSILON' ? 'ε' : s.value).join(' ')}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Transformed Grammar */}
                  <div className="bg-bg-surface2/60 p-3 rounded border border-border-subtle space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-border-subtle">
                      <span className="font-bold text-2xs text-teal-300">Factored Grammar (G&apos;)</span>
                      <span className="text-3xs text-emerald-400 font-semibold">
                        {!leftFactoringResult.detectionAfter.requiresFactoring ? '✓ Zero Common Prefixes' : 'Factored'}
                      </span>
                    </div>

                    <div className="space-y-1 font-mono text-3xs max-h-60 overflow-y-auto">
                      {leftFactoringResult.transformedGrammar.productions.map((p, idx) => {
                        const isNewVar = leftFactoringResult.generatedSymbolNames.includes(p.lhs);
                        return (
                          <div
                            key={p.id || idx}
                            className={`p-1.5 rounded border flex items-center justify-between ${
                              isNewVar
                                ? 'bg-teal-950/40 border-teal-800/80 text-teal-200'
                                : 'bg-bg-surface1 border-border-subtle text-txt-primary'
                            }`}
                          >
                            <span>{p.lhs} → {p.rhs.length === 0 ? 'ε' : p.rhs.map(s => s.type === 'EPSILON' ? 'ε' : s.value).join(' ')}</span>
                            {isNewVar && (
                              <span className="text-3xs text-teal-300 font-semibold px-1 rounded bg-teal-950 border border-teal-800">
                                Factored Aux
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Step-by-Step Transformation Trace History */}
              <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-3">
                <span className="font-bold text-xs text-txt-primary">
                  Transformation Trace & Mathematical History ({leftFactoringResult.steps.length} step(s))
                </span>

                <div className="space-y-2">
                  {leftFactoringResult.steps.map((step) => (
                    <div key={step.stepIndex} className="bg-bg-surface2/80 p-2.5 rounded border border-border-subtle space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-2xs text-teal-300 flex items-center gap-1.5">
                          <span className="px-1.5 py-0.2 rounded bg-teal-950 text-teal-200 border border-teal-800 text-3xs font-mono">
                            Pass {step.stepIndex + 1}
                          </span>
                          {step.title}
                        </span>
                        <span className="text-3xs text-txt-muted font-mono">{step.type}</span>
                      </div>

                      <p className="text-2xs text-txt-secondary">{step.description}</p>

                      <div className="bg-bg-surface1 p-1.5 rounded border border-border-subtle/60 text-3xs font-mono text-amber-200">
                        {step.mathematicalNotation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Chomsky Normal Form (CNF) Studio (Topic 8) */}
          {activeSubView === 'CNF' && (
            <div className="space-y-4">
              {/* Educational Banner */}
              <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Split className="w-4 h-4 text-purple-400" />
                    <span className="font-bold text-xs text-txt-primary">Chomsky Normal Form (CNF) Studio (Topic 8)</span>
                  </div>
                  <span className="text-2xs px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/80 font-mono font-semibold">
                    A → BC | a | (S → ε)
                  </span>
                </div>
                <p className="text-2xs text-txt-muted">
                  A context-free grammar is in <strong>Chomsky Normal Form (CNF)</strong> if every production is of the form <code className="text-txt-primary">A → BC</code> (two nonterminals) or <code className="text-txt-primary">A → a</code> (a single terminal), with the start symbol optionally permitted <code className="text-txt-primary">S → ε</code> when <code className="text-txt-primary">ε ∈ L(G)</code>.
                </p>

                {/* Validation & Diagnostic Status */}
                <div className="flex items-center gap-3 pt-1 text-2xs flex-wrap">
                  <div className={`px-2.5 py-1 rounded border flex items-center gap-1.5 font-bold ${
                    cnfValidation?.isValid
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                      : 'bg-purple-950/80 text-purple-300 border-purple-800'
                  }`}>
                    {cnfValidation?.isValid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
                    {cnfValidation?.isValid ? 'VALID CNF' : 'NOT CNF (NEEDS TRANSFORMATION)'}
                  </div>

                  <div className="bg-bg-surface2 px-2.5 py-1 rounded border border-border-subtle flex items-center gap-1.5">
                    <span className="text-txt-muted">Start Epsilon:</span>
                    <span className="text-purple-300 font-bold">{cnfResult.epsilonInOriginalLanguage ? 'Preserved (ε ∈ L(G))' : 'None (ε ∉ L(G))'}</span>
                  </div>

                  <div className="bg-bg-surface2 px-2.5 py-1 rounded border border-border-subtle flex items-center gap-1.5">
                    <span className="text-txt-muted">Variables:</span>
                    <span className="text-purple-300 font-bold">|V| = {cnfResult.transformedGrammar.variables.length}</span>
                  </div>

                  <div className="bg-bg-surface2 px-2.5 py-1 rounded border border-border-subtle flex items-center gap-1.5">
                    <span className="text-txt-muted">Productions:</span>
                    <span className="text-purple-300 font-bold">|P| = {cnfResult.transformedGrammar.productions.length}</span>
                  </div>
                </div>
              </div>

              {/* Before vs After Comparison Studio */}
              <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-txt-primary">Original CFG vs Transformed CNF</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-3xs font-semibold">
                      ✓ Language Preserved (Bounded Check)
                    </span>
                  </div>

                  {!customGrammar && (
                    <button
                      onClick={() => setCustomGrammar(cnfResult.transformedGrammar)}
                      className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-semibold text-2xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Apply CNF to Workbench
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Original Grammar */}
                  <div className="bg-bg-surface2/60 p-3 rounded border border-border-subtle space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-border-subtle">
                      <span className="font-bold text-2xs text-txt-primary">Original Grammar (G)</span>
                      <span className="text-3xs text-txt-muted">|V| = {grammar.variables.length}, |P| = {grammar.productions.length}</span>
                    </div>

                    <div className="space-y-1 font-mono text-3xs max-h-60 overflow-y-auto">
                      {grammar.productions.map((p, idx) => (
                        <div key={p.id || idx} className="p-1.5 rounded border bg-bg-surface1 border-border-subtle text-txt-primary">
                          {p.lhs} → {p.rhs.length === 0 ? 'ε' : p.rhs.map(s => s.type === 'EPSILON' ? 'ε' : s.value).join(' ')}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Transformed CNF Grammar */}
                  <div className="bg-bg-surface2/60 p-3 rounded border border-border-subtle space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-border-subtle">
                      <span className="font-bold text-2xs text-purple-300">Chomsky NF Grammar (G&apos;)</span>
                      <span className="text-3xs text-emerald-400 font-semibold">
                        {cnfValidation?.isValid ? '✓ Valid CNF' : 'Transformed'}
                      </span>
                    </div>

                    <div className="space-y-1 font-mono text-3xs max-h-60 overflow-y-auto">
                      {cnfResult.transformedGrammar.productions.map((p, idx) => {
                        const isHelper = p.lhs.startsWith('T_') || p.lhs.includes('_BIN_');
                        return (
                          <div
                            key={p.id || idx}
                            className={`p-1.5 rounded border flex items-center justify-between ${
                              isHelper
                                ? 'bg-purple-950/40 border-purple-800/80 text-purple-200'
                                : 'bg-bg-surface1 border-border-subtle text-txt-primary'
                            }`}
                          >
                            <span>{p.lhs} → {p.rhs.length === 0 ? 'ε' : p.rhs.map(s => s.type === 'EPSILON' ? 'ε' : s.value).join(' ')}</span>
                            {isHelper && (
                              <span className="text-3xs text-purple-300 font-semibold px-1 rounded bg-purple-950 border border-purple-800">
                                {p.lhs.startsWith('T_') ? 'Term Helper' : 'Bin Helper'}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Transformation Pipeline Stage Trace */}
              <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-3">
                <span className="font-bold text-xs text-txt-primary">
                  CNF Transformation Pipeline Trace ({cnfResult.stages.length} stages)
                </span>

                <div className="space-y-2">
                  {cnfResult.stages.map((stg, idx) => (
                    <div key={idx} className="bg-bg-surface2/80 p-2.5 rounded border border-border-subtle space-y-1.5 font-mono text-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-purple-300 flex items-center gap-1.5">
                          <span className="px-1.5 py-0.2 rounded bg-purple-950 text-purple-200 border border-purple-800 text-3xs font-mono">
                            Stage {idx + 1}
                          </span>
                          {stg.stage}
                        </span>
                        <span className="text-3xs text-txt-muted font-sans font-semibold">
                          +{stg.addedProductions.length} / -{stg.removedProductions.length} prods
                        </span>
                      </div>

                      <p className="text-2xs text-txt-secondary font-sans">{stg.description}</p>
                      <div className="bg-bg-surface1 p-1.5 rounded border border-border-subtle/60 text-3xs text-amber-200">
                        {stg.mathematicalExplanation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Greibach Normal Form (GNF) Studio (Topic 8) */}
          {activeSubView === 'GNF' && (
            <div className="space-y-4">
              {/* Educational Banner */}
              <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Split className="w-4 h-4 text-pink-400" />
                    <span className="font-bold text-xs text-txt-primary">Greibach Normal Form (GNF) Studio (Topic 8)</span>
                  </div>
                  <span className="text-2xs px-2 py-0.5 rounded bg-pink-950/60 text-pink-300 border border-pink-800/80 font-mono font-semibold">
                    A → a α (a ∈ Σ, α ∈ V*) | (S → ε)
                  </span>
                </div>
                <p className="text-2xs text-txt-muted">
                  A context-free grammar is in <strong>Greibach Normal Form (GNF)</strong> if every production starts with a terminal followed by zero or more nonterminals: <code className="text-txt-primary">A → a A₁ A₂ ... Aₖ</code>, with <code className="text-txt-primary">S → ε</code> allowed when <code className="text-txt-primary">ε ∈ L(G)</code>.
                </p>

                {/* Validation & Diagnostic Status */}
                <div className="flex items-center gap-3 pt-1 text-2xs flex-wrap">
                  <div className={`px-2.5 py-1 rounded border flex items-center gap-1.5 font-bold ${
                    gnfValidation?.isValid
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                      : 'bg-pink-950/80 text-pink-300 border-pink-800'
                  }`}>
                    {gnfValidation?.isValid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
                    {gnfValidation?.isValid ? 'VALID GNF' : 'NOT GNF (NEEDS TRANSFORMATION)'}
                  </div>

                  <div className="bg-bg-surface2 px-2.5 py-1 rounded border border-border-subtle flex items-center gap-1.5">
                    <span className="text-txt-muted">Start Epsilon:</span>
                    <span className="text-pink-300 font-bold">{gnfResult.epsilonInOriginalLanguage ? 'Preserved (ε ∈ L(G))' : 'None (ε ∉ L(G))'}</span>
                  </div>

                  <div className="bg-bg-surface2 px-2.5 py-1 rounded border border-border-subtle flex items-center gap-1.5">
                    <span className="text-txt-muted">Variables:</span>
                    <span className="text-pink-300 font-bold">|V| = {gnfResult.transformedGrammar.variables.length}</span>
                  </div>

                  <div className="bg-bg-surface2 px-2.5 py-1 rounded border border-border-subtle flex items-center gap-1.5">
                    <span className="text-txt-muted">Productions:</span>
                    <span className="text-pink-300 font-bold">|P| = {gnfResult.transformedGrammar.productions.length}</span>
                  </div>
                </div>
              </div>

              {/* Before vs After Comparison Studio */}
              <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-txt-primary">Original CFG vs Transformed GNF</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-3xs font-semibold">
                      ✓ Language Preserved (Bounded Check)
                    </span>
                  </div>

                  {!customGrammar && (
                    <button
                      onClick={() => setCustomGrammar(gnfResult.transformedGrammar)}
                      className="px-2.5 py-1 rounded bg-pink-600 hover:bg-pink-500 text-white font-semibold text-2xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Apply GNF to Workbench
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Original Grammar */}
                  <div className="bg-bg-surface2/60 p-3 rounded border border-border-subtle space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-border-subtle">
                      <span className="font-bold text-2xs text-txt-primary">Original Grammar (G)</span>
                      <span className="text-3xs text-txt-muted">|V| = {grammar.variables.length}, |P| = {grammar.productions.length}</span>
                    </div>

                    <div className="space-y-1 font-mono text-3xs max-h-60 overflow-y-auto">
                      {grammar.productions.map((p, idx) => (
                        <div key={p.id || idx} className="p-1.5 rounded border bg-bg-surface1 border-border-subtle text-txt-primary">
                          {p.lhs} → {p.rhs.length === 0 ? 'ε' : p.rhs.map(s => s.type === 'EPSILON' ? 'ε' : s.value).join(' ')}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Transformed GNF Grammar */}
                  <div className="bg-bg-surface2/60 p-3 rounded border border-border-subtle space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-border-subtle">
                      <span className="font-bold text-2xs text-pink-300">Greibach NF Grammar (G&apos;)</span>
                      <span className="text-3xs text-emerald-400 font-semibold">
                        {gnfValidation?.isValid ? '✓ Valid GNF' : 'Transformed'}
                      </span>
                    </div>

                    <div className="space-y-1 font-mono text-3xs max-h-60 overflow-y-auto">
                      {gnfResult.transformedGrammar.productions.map((p, idx) => {
                        const isZ = p.lhs.startsWith('Z_');
                        const isT = p.lhs.startsWith('T_');
                        return (
                          <div
                            key={p.id || idx}
                            className={`p-1.5 rounded border flex items-center justify-between ${
                              isZ || isT
                                ? 'bg-pink-950/40 border-pink-800/80 text-pink-200'
                                : 'bg-bg-surface1 border-border-subtle text-txt-primary'
                            }`}
                          >
                            <span>{p.lhs} → {p.rhs.length === 0 ? 'ε' : p.rhs.map(s => s.type === 'EPSILON' ? 'ε' : s.value).join(' ')}</span>
                            {(isZ || isT) && (
                              <span className="text-3xs text-pink-300 font-semibold px-1 rounded bg-pink-950 border border-pink-800">
                                {isZ ? 'Left-Rec Aux Z' : 'Term Aux T'}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Transformation Pipeline Stage Trace */}
              <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-3">
                <span className="font-bold text-xs text-txt-primary">
                  GNF Transformation Pipeline Trace ({gnfResult.stages.length} stages)
                </span>

                <div className="space-y-2">
                  {gnfResult.stages.map((stg, idx) => (
                    <div key={idx} className="bg-bg-surface2/80 p-2.5 rounded border border-border-subtle space-y-1.5 font-mono text-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-pink-300 flex items-center gap-1.5">
                          <span className="px-1.5 py-0.2 rounded bg-pink-950 text-pink-200 border border-pink-800 text-3xs font-mono">
                            Stage {idx + 1}
                          </span>
                          {stg.stage}
                        </span>
                        <span className="text-3xs text-txt-muted font-sans font-semibold">
                          +{stg.addedProductions.length} / -{stg.removedProductions.length} prods
                        </span>
                      </div>

                      <p className="text-2xs text-txt-secondary font-sans">{stg.description}</p>
                      <div className="bg-bg-surface1 p-1.5 rounded border border-border-subtle/60 text-3xs text-amber-200">
                        {stg.mathematicalExplanation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Module 4 — Topic 1: Introduction to Parsing (Top-Down & Bottom-Up) */}
          {activeSubView === 'PARSER_INTRO' && (
            <div className="space-y-4">
              {/* Syllabus & Paradigm Banner */}
              <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-400" />
                    <span className="font-bold text-xs text-txt-primary">
                      Module 4 — Topic 1: Introduction to Parsing
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-2xs">
                    <span className="px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800 font-mono font-semibold flex items-center gap-1">
                      <ArrowDown className="w-3 h-3 text-indigo-400" /> Top-Down ({grammar.startVariable} ⇒* w)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800 font-mono font-semibold flex items-center gap-1">
                      <ArrowUp className="w-3 h-3 text-rose-400" /> Bottom-Up (w ⇒* {grammar.startVariable})
                    </span>
                  </div>
                </div>

                <p className="text-2xs text-txt-muted">
                  <strong>Parsing</strong> determines whether an input string belongs to a language by constructing its derivation sequence and parse tree.
                  <strong> Top-Down parsing</strong> begins at the grammar start symbol and recursively expands nonterminals to match the input.
                  <strong> Bottom-Up parsing</strong> begins with the input tokens and repeatedly shifts symbols and reduces recognized patterns back to the start symbol.
                </p>

                {/* Sub-mode Switcher */}
                <div className="flex items-center gap-2 pt-1 border-t border-border-subtle">
                  <button
                    onClick={() => setParserIntroMode('TOP_DOWN')}
                    className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      parserIntroMode === 'TOP_DOWN'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-bg-surface2 text-txt-secondary hover:text-txt-primary'
                    }`}
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                    <span>Top-Down Parsing Studio</span>
                  </button>

                  <button
                    onClick={() => setParserIntroMode('BOTTOM_UP')}
                    className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      parserIntroMode === 'BOTTOM_UP'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-bg-surface2 text-txt-secondary hover:text-txt-primary'
                    }`}
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                    <span>Bottom-Up (Shift-Reduce) Studio</span>
                  </button>

                  <button
                    onClick={() => setParserIntroMode('COMPARISON')}
                    className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      parserIntroMode === 'COMPARISON'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-bg-surface2 text-txt-secondary hover:text-txt-primary'
                    }`}
                  >
                    <Split className="w-3.5 h-3.5" />
                    <span>Comparative Analysis & Roadmap</span>
                  </button>
                </div>
              </div>

              {/* Input String & Token Stream Controller */}
              <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-bold text-xs text-txt-primary">Input Word & Candidate Tokens</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-3xs text-txt-muted">Preset Candidates:</span>
                    {defaultBatchCandidates.slice(0, 6).map((cand) => (
                      <button
                        key={cand}
                        onClick={() => setTestInput(cand === 'ε' ? '' : cand)}
                        className={`px-2 py-0.5 rounded text-3xs font-mono font-semibold transition-colors cursor-pointer ${
                          testInput === (cand === 'ε' ? '' : cand)
                            ? 'bg-indigo-600 text-white'
                            : 'bg-bg-surface2 text-txt-secondary hover:text-txt-primary border border-border-subtle'
                        }`}
                      >
                        {cand}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    placeholder="Enter input string (leave blank for ε)..."
                    className="flex-1 bg-bg-surface2 border border-border-subtle rounded px-3 py-1.5 text-xs font-mono text-txt-primary focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={() => setTestInput('')}
                    className="px-2.5 py-1.5 rounded bg-bg-surface2 border border-border-subtle hover:bg-bg-surface3 text-txt-muted hover:text-txt-primary text-xs font-mono transition-colors cursor-pointer"
                  >
                    Clear (ε)
                  </button>
                </div>
              </div>

              {/* 1. TOP-DOWN PARSING STUDIO */}
              {parserIntroMode === 'TOP_DOWN' && (
                <div className="space-y-4">
                  {/* Status & Telemetry Card */}
                  <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-txt-primary">Top-Down Parsing Outcome</span>
                        {topDownResult.status === 'ACCEPT' ? (
                          <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-3xs font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> ACCEPTED: &quot;{testInput || 'ε'}&quot; ∈ L(G)
                          </span>
                        ) : topDownResult.status === 'SEARCH_LIMIT_REACHED' ? (
                          <span className="bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded text-3xs font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> SEARCH LIMIT REACHED (SAFETY CUTOFF)
                          </span>
                        ) : (
                          <span className="bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded text-3xs font-semibold flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> REJECTED: &quot;{testInput || 'ε'}&quot; ∉ L(G)
                          </span>
                        )}
                      </div>

                      <div className="text-3xs text-txt-muted font-mono">
                        Start Symbol: <span className="text-indigo-400 font-bold">{grammar.startVariable}</span> | States Explored: {topDownResult.exploredStateCount} | Total Steps: {topDownResult.steps.length}
                      </div>
                    </div>

                    <p className="text-2xs text-txt-secondary">{topDownResult.explanation}</p>

                    {/* Interactive Step Runner Controls */}
                    {topDownResult.steps.length > 0 && (
                      <div className="p-3 bg-bg-surface2/80 rounded border border-border-subtle flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-txt-primary">Derivation Stepper:</span>
                          <span className="px-2 py-0.5 rounded bg-bg-surface3 border border-border-subtle text-3xs font-mono text-indigo-300 font-semibold">
                            Step {Math.min(parserTopDownStepIdx + 1, topDownResult.steps.length)} of {topDownResult.steps.length}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => setParserTopDownStepIdx(0)}
                            disabled={parserTopDownStepIdx === 0}
                            className="p-1 rounded bg-bg-surface3 border border-border-subtle text-txt-muted hover:text-txt-primary disabled:opacity-30"
                            title="Reset to Start"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setParserTopDownStepIdx((p) => Math.max(0, p - 1))}
                            disabled={parserTopDownStepIdx === 0}
                            className="p-1 rounded bg-bg-surface3 border border-border-subtle text-txt-muted hover:text-txt-primary disabled:opacity-30"
                            title="Previous Step"
                          >
                            <SkipBack className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setParserIsPlaying((prev) => !prev)}
                            className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-2xs flex items-center gap-1"
                          >
                            {parserIsPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                            <span>{parserIsPlaying ? 'Pause' : 'Play'}</span>
                          </button>
                          <button
                            onClick={() => setParserTopDownStepIdx((p) => Math.min(topDownResult.steps.length - 1, p + 1))}
                            disabled={parserTopDownStepIdx >= topDownResult.steps.length - 1}
                            className="p-1 rounded bg-bg-surface3 border border-border-subtle text-txt-muted hover:text-txt-primary disabled:opacity-30"
                            title="Next Step"
                          >
                            <SkipForward className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setParserTopDownStepIdx(topDownResult.steps.length - 1)}
                            disabled={parserTopDownStepIdx >= topDownResult.steps.length - 1}
                            className="p-1 rounded bg-bg-surface3 border border-border-subtle text-txt-muted hover:text-txt-primary disabled:opacity-30"
                            title="Run to End"
                          >
                            <FastForward className="w-3.5 h-3.5" />
                          </button>

                          {/* Speed selector */}
                          <div className="flex items-center gap-1 ml-2 border-l border-border-subtle pl-2">
                            <span className="text-3xs text-txt-muted">Speed:</span>
                            {[
                              { label: '1x', ms: 700 },
                              { label: '2x', ms: 300 },
                              { label: '0.5x', ms: 1200 },
                            ].map((spd) => (
                              <button
                                key={spd.label}
                                onClick={() => setParserPlaySpeed(spd.ms)}
                                className={`px-1.5 py-0.5 rounded text-3xs font-mono ${
                                  parserPlaySpeed === spd.ms
                                    ? 'bg-indigo-600 text-white font-bold'
                                    : 'bg-bg-surface2 text-txt-muted hover:text-txt-primary'
                                }`}
                              >
                                {spd.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Current Step Spotlight Card */}
                    {(() => {
                      const curStep = topDownResult.steps[parserTopDownStepIdx];
                      if (!curStep) return null;

                      return (
                        <div className="p-3 bg-bg-surface2/60 rounded border border-indigo-900/40 space-y-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-3xs font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                                Step #{curStep.stepIndex}
                              </span>
                              {curStep.expandedSymbol ? (
                                <span className="text-xs font-bold text-txt-primary">
                                  Expanding Nonterminal <code className="text-indigo-400 font-mono font-bold">{curStep.expandedSymbol}</code>
                                </span>
                              ) : curStep.remainingInput === '' ? (
                                <span className="text-xs font-bold text-emerald-400">
                                  Derivation Fully Completed
                                </span>
                              ) : (
                                <span className="text-xs font-bold text-txt-primary">
                                  Initial Sentential Form
                                </span>
                              )}
                            </div>

                            {curStep.selectedProduction && (
                              <span className="text-2xs font-mono bg-bg-surface3 px-2 py-0.5 rounded border border-border-subtle text-amber-300 font-bold">
                                Applied Rule: {curStep.selectedProduction.lhs} → {curStep.selectedProduction.rhs.map(s => s.type === 'EPSILON' ? 'ε' : s.value).join(' ')}
                              </span>
                            )}
                          </div>

                          {/* Sentential Form Display */}
                          <div className="p-2.5 bg-bg-surface1 rounded border border-border-subtle flex items-center justify-between flex-wrap gap-2">
                            <span className="text-3xs text-txt-muted font-sans uppercase tracking-wider font-semibold">Sentential Form:</span>
                            <div className="font-mono text-sm font-bold flex items-center gap-1.5 flex-wrap">
                              {curStep.sententialForm.map((sym, i) => (
                                <span
                                  key={i}
                                  className={`px-1.5 py-0.5 rounded text-xs ${
                                    sym.type === 'NON_TERMINAL'
                                      ? i === curStep.expandedIndex
                                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1 ring-offset-bg-surface1'
                                        : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                                      : 'bg-blue-950 text-blue-300 border border-blue-800'
                                  }`}
                                >
                                  {sym.type === 'EPSILON' ? 'ε' : sym.value}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Matched Prefix & Remaining Input */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-2xs font-mono">
                            <div className="p-2 bg-bg-surface1 rounded border border-border-subtle">
                              <span className="text-txt-muted block text-3xs font-sans">Matched Input Prefix:</span>
                              <span className="text-emerald-400 font-bold">{curStep.matchedPrefix || '∅ (None yet)'}</span>
                            </div>
                            <div className="p-2 bg-bg-surface1 rounded border border-border-subtle">
                              <span className="text-txt-muted block text-3xs font-sans">Remaining Input:</span>
                              <span className="text-amber-400 font-bold">{curStep.remainingInput || '∅ (Exhausted)'}</span>
                            </div>
                          </div>

                          <p className="text-2xs text-txt-secondary">{curStep.explanation}</p>

                          {/* Production Alternatives / Choice Point Callout */}
                          {curStep.availableAlternatives && curStep.availableAlternatives.length > 1 && (
                            <div className="p-2.5 bg-amber-950/30 rounded border border-amber-800/40 text-2xs space-y-1">
                              <span className="font-bold text-amber-300 flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" /> Educational Choice Point:
                              </span>
                              <p className="text-txt-muted text-3xs">
                                Variable <code className="text-amber-300 font-mono font-bold">{curStep.expandedSymbol}</code> has {curStep.availableAlternatives.length} production choices:
                                {' '}{curStep.availableAlternatives.map(p => `${p.lhs} → ${p.rhs.map(s => s.type === 'EPSILON' ? 'ε' : s.value).join('')}`).join(' | ')}.
                                In general top-down parsing, choosing the incorrect alternative requires backtracking.
                                <strong> In Topic 2 (LL(1) Parsing)</strong>, lookahead tokens and FIRST sets are introduced to make this decision deterministically!
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Parse Tree & Derivation Trace Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Parse Tree Card */}
                    <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-2">
                      <span className="font-bold text-xs text-txt-primary flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-indigo-400" /> Reconstructed Parse Tree (Top-Down)
                      </span>
                      {topDownResult.parseTree ? (
                        <div className="p-3 bg-bg-surface2/60 rounded border border-border-subtle flex justify-center overflow-x-auto min-h-[140px]">
                          <RenderParseTreeNode node={topDownResult.parseTree} isRoot />
                        </div>
                      ) : (
                        <div className="p-4 bg-bg-surface2/40 rounded border border-border-subtle text-center text-2xs text-txt-muted">
                          No parse tree generated: input is not derivable from start symbol &apos;{grammar.startVariable}&apos;.
                        </div>
                      )}
                    </div>

                    {/* Step History Table */}
                    <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-2">
                      <span className="font-bold text-xs text-txt-primary">Derivation History</span>
                      <div className="space-y-1 max-h-[220px] overflow-y-auto font-mono text-3xs">
                        {topDownResult.steps.map((step, idx) => (
                          <div
                            key={idx}
                            onClick={() => setParserTopDownStepIdx(idx)}
                            className={`p-2 rounded border cursor-pointer transition-colors flex items-center justify-between ${
                              parserTopDownStepIdx === idx
                                ? 'bg-indigo-950/80 border-indigo-700 text-indigo-200 font-bold'
                                : 'bg-bg-surface2 border-border-subtle text-txt-muted hover:text-txt-primary'
                            }`}
                          >
                            <span>#{step.stepIndex}: {step.formattedSententialForm}</span>
                            <span className="text-txt-muted text-3xs font-sans">
                              {step.selectedProduction ? `${step.selectedProduction.lhs} → ${step.selectedProduction.rhs.map(s => s.type === 'EPSILON' ? 'ε' : s.value).join('')}` : 'Start'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. BOTTOM-UP PARSING STUDIO */}
              {parserIntroMode === 'BOTTOM_UP' && (
                <div className="space-y-4">
                  {/* Status & Telemetry Card */}
                  <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-txt-primary">Bottom-Up Parsing Outcome</span>
                        {bottomUpResult.status === 'ACCEPT' ? (
                          <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-3xs font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> ACCEPTED: &quot;{testInput || 'ε'}&quot; ∈ L(G)
                          </span>
                        ) : bottomUpResult.status === 'SEARCH_LIMIT_REACHED' ? (
                          <span className="bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded text-3xs font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> SEARCH LIMIT REACHED (SAFETY CUTOFF)
                          </span>
                        ) : (
                          <span className="bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded text-3xs font-semibold flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> REJECTED: Cannot Reduce to &apos;{grammar.startVariable}&apos;
                          </span>
                        )}
                      </div>

                      <div className="text-3xs text-txt-muted font-mono">
                        Target Root: <span className="text-rose-400 font-bold">{grammar.startVariable}</span> | Configurations: {bottomUpResult.exploredStateCount} | Total Steps: {bottomUpResult.steps.length}
                      </div>
                    </div>

                    <p className="text-2xs text-txt-secondary">{bottomUpResult.explanation}</p>

                    {/* Interactive Step Runner Controls */}
                    {bottomUpResult.steps.length > 0 && (
                      <div className="p-3 bg-bg-surface2/80 rounded border border-border-subtle flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-txt-primary">Shift-Reduce Stepper:</span>
                          <span className="px-2 py-0.5 rounded bg-bg-surface3 border border-border-subtle text-3xs font-mono text-rose-300 font-semibold">
                            Step {Math.min(parserBottomUpStepIdx + 1, bottomUpResult.steps.length)} of {bottomUpResult.steps.length}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => setParserBottomUpStepIdx(0)}
                            disabled={parserBottomUpStepIdx === 0}
                            className="p-1 rounded bg-bg-surface3 border border-border-subtle text-txt-muted hover:text-txt-primary disabled:opacity-30"
                            title="Reset to Start"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setParserBottomUpStepIdx((p) => Math.max(0, p - 1))}
                            disabled={parserBottomUpStepIdx === 0}
                            className="p-1 rounded bg-bg-surface3 border border-border-subtle text-txt-muted hover:text-txt-primary disabled:opacity-30"
                            title="Previous Step"
                          >
                            <SkipBack className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setParserIsPlaying((prev) => !prev)}
                            className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold text-2xs flex items-center gap-1"
                          >
                            {parserIsPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                            <span>{parserIsPlaying ? 'Pause' : 'Play'}</span>
                          </button>
                          <button
                            onClick={() => setParserBottomUpStepIdx((p) => Math.min(bottomUpResult.steps.length - 1, p + 1))}
                            disabled={parserBottomUpStepIdx >= bottomUpResult.steps.length - 1}
                            className="p-1 rounded bg-bg-surface3 border border-border-subtle text-txt-muted hover:text-txt-primary disabled:opacity-30"
                            title="Next Step"
                          >
                            <SkipForward className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setParserBottomUpStepIdx(bottomUpResult.steps.length - 1)}
                            disabled={parserBottomUpStepIdx >= bottomUpResult.steps.length - 1}
                            className="p-1 rounded bg-bg-surface3 border border-border-subtle text-txt-muted hover:text-txt-primary disabled:opacity-30"
                            title="Run to End"
                          >
                            <FastForward className="w-3.5 h-3.5" />
                          </button>

                          {/* Speed selector */}
                          <div className="flex items-center gap-1 ml-2 border-l border-border-subtle pl-2">
                            <span className="text-3xs text-txt-muted">Speed:</span>
                            {[
                              { label: '1x', ms: 700 },
                              { label: '2x', ms: 300 },
                              { label: '0.5x', ms: 1200 },
                            ].map((spd) => (
                              <button
                                key={spd.label}
                                onClick={() => setParserPlaySpeed(spd.ms)}
                                className={`px-1.5 py-0.5 rounded text-3xs font-mono ${
                                  parserPlaySpeed === spd.ms
                                    ? 'bg-rose-600 text-white font-bold'
                                    : 'bg-bg-surface2 text-txt-muted hover:text-txt-primary'
                                }`}
                              >
                                {spd.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Current Step Spotlight Card */}
                    {(() => {
                      const curStep = bottomUpResult.steps[parserBottomUpStepIdx];
                      if (!curStep) return null;

                      return (
                        <div className="p-3 bg-bg-surface2/60 rounded border border-rose-900/40 space-y-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-3xs font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800">
                                Step #{curStep.stepIndex}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-3xs font-mono font-bold ${
                                  curStep.action === 'SHIFT'
                                    ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                    : curStep.action === 'REDUCE'
                                    ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                    : curStep.action === 'ACCEPT'
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                    : 'bg-red-950 text-red-300 border border-red-800'
                                }`}
                              >
                                {curStep.action}
                              </span>
                              {curStep.reducedProduction && (
                                <span className="text-2xs font-mono text-purple-300 font-bold">
                                  {curStep.reducedProduction.lhs} → {curStep.reducedProduction.rhs.map(s => s.type === 'EPSILON' ? 'ε' : s.value).join(' ')}
                                </span>
                              )}
                            </div>

                            {curStep.hasConflict && (
                              <span className="bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded text-3xs font-semibold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> {curStep.conflictType === 'SHIFT_REDUCE' ? 'Shift/Reduce Choice' : 'Reduce/Reduce Choice'}
                              </span>
                            )}
                          </div>

                          {/* Visual Stack & Remaining Input */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-2xs font-mono">
                            <div className="p-2.5 bg-bg-surface1 rounded border border-border-subtle space-y-1">
                              <span className="text-txt-muted block text-3xs font-sans font-semibold">Parser Stack (Bottom to Top):</span>
                              <div className="flex items-center gap-1 flex-wrap font-bold">
                                <span className="px-1.5 py-0.5 rounded bg-bg-surface3 text-txt-muted">$</span>
                                {curStep.stack.map((sym, i) => (
                                  <span
                                    key={i}
                                    className={`px-1.5 py-0.5 rounded ${
                                      sym.type === 'NON_TERMINAL'
                                        ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                        : 'bg-blue-950 text-blue-300 border border-blue-800'
                                    }`}
                                  >
                                    {sym.type === 'EPSILON' ? 'ε' : sym.value}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="p-2.5 bg-bg-surface1 rounded border border-border-subtle space-y-1">
                              <span className="text-txt-muted block text-3xs font-sans font-semibold">Remaining Input Stream:</span>
                              <div className="flex items-center gap-1 flex-wrap font-bold text-amber-300">
                                {curStep.remainingTokens.length > 0 ? (
                                  curStep.remainingTokens.map((tok, i) => (
                                    <span key={i} className="px-1.5 py-0.5 rounded bg-bg-surface3 border border-border-subtle">
                                      {tok}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-txt-muted">$ (End of Input)</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <p className="text-2xs text-txt-secondary">{curStep.explanation}</p>

                          {/* Conflict Explanation Callout */}
                          {curStep.hasConflict && curStep.availableChoices && (
                            <div className="p-2.5 bg-amber-950/30 rounded border border-amber-800/40 text-2xs space-y-1">
                              <span className="font-bold text-amber-300 flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" /> Shift/Reduce Decision Point:
                              </span>
                              <p className="text-txt-muted text-3xs">
                                At this configuration, multiple parsing actions were valid ({curStep.availableChoices.map(c => c.description).join('; ')}).
                                A naive bottom-up parser cannot know which action leads to acceptance without backtracking.
                                <strong> In Topic 3 (SLR Parsing)</strong>, an LR state automaton and ACTION/GOTO tables resolve these conflicts deterministically!
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Parse Tree & Action History Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Parse Tree Card */}
                    <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-2">
                      <span className="font-bold text-xs text-txt-primary flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-rose-400" /> Reconstructed Parse Tree (Bottom-Up Reductions)
                      </span>
                      {bottomUpResult.parseTree ? (
                        <div className="p-3 bg-bg-surface2/60 rounded border border-border-subtle flex justify-center overflow-x-auto min-h-[140px]">
                          <RenderParseTreeNode node={bottomUpResult.parseTree} isRoot />
                        </div>
                      ) : (
                        <div className="p-4 bg-bg-surface2/40 rounded border border-border-subtle text-center text-2xs text-txt-muted">
                          No parse tree generated: input could not be reduced to start symbol &apos;{grammar.startVariable}&apos;.
                        </div>
                      )}
                    </div>

                    {/* Action History Table */}
                    <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-2">
                      <span className="font-bold text-xs text-txt-primary">Shift-Reduce Action History</span>
                      <div className="space-y-1 max-h-[220px] overflow-y-auto font-mono text-3xs">
                        {bottomUpResult.steps.map((step, idx) => (
                          <div
                            key={idx}
                            onClick={() => setParserBottomUpStepIdx(idx)}
                            className={`p-2 rounded border cursor-pointer transition-colors flex items-center justify-between ${
                              parserBottomUpStepIdx === idx
                                ? 'bg-rose-950/80 border-rose-700 text-rose-200 font-bold'
                                : 'bg-bg-surface2 border-border-subtle text-txt-muted hover:text-txt-primary'
                            }`}
                          >
                            <span>#{step.stepIndex} [{step.action}] {step.formattedStack}</span>
                            <span className="text-txt-muted text-3xs font-sans">
                              {step.reducedProduction ? `${step.reducedProduction.lhs} → ${step.reducedProduction.rhs.map(s => s.type === 'EPSILON' ? 'ε' : s.value).join('')}` : step.shiftedToken ? `Shift '${step.shiftedToken}'` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. COMPARATIVE ANALYSIS & ROADMAP VIEW */}
              {parserIntroMode === 'COMPARISON' && (
                <div className="space-y-4">
                  {/* Agreement Banner */}
                  <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Split className="w-4 h-4 text-emerald-400" />
                        <span className="font-bold text-xs text-txt-primary">Paradigm Agreement on Current Input (&quot;{testInput || 'ε'}&quot;)</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-3xs font-semibold font-mono ${
                        comparisonResult.agreement
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        {comparisonResult.agreement ? '✓ Both Paradigms Agree' : 'Paradigms Diverge'}
                      </span>
                    </div>
                    <p className="text-2xs text-txt-muted">
                      Both top-down and bottom-up parsing recognize the exact same formal language $L(G)$, but traverse the derivation tree in opposite directions.
                    </p>
                  </div>

                  {/* 7-Dimensional Pedagogical Comparison Table */}
                  <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-2">
                    <span className="font-bold text-xs text-txt-primary">Top-Down vs Bottom-Up: Core Differences</span>
                    <div className="overflow-x-auto border border-border-subtle rounded">
                      <table className="w-full text-left border-collapse text-2xs">
                        <thead className="bg-bg-surface2 text-txt-muted border-b border-border-subtle font-semibold">
                          <tr>
                            <th className="p-2 border-r border-border-subtle w-1/4">Comparison Dimension</th>
                            <th className="p-2 border-r border-border-subtle text-indigo-300 w-3/8">Top-Down Parsing</th>
                            <th className="p-2 text-rose-300 w-3/8">Bottom-Up Parsing</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle/60">
                          {comparisonResult.comparisonTable.map((row, i) => (
                            <tr key={i} className="hover:bg-bg-surface2/40">
                              <td className="p-2 font-bold text-txt-primary border-r border-border-subtle bg-bg-surface2/30">
                                {row.dimension}
                              </td>
                              <td className="p-2 border-r border-border-subtle text-indigo-200">
                                {row.topDown}
                              </td>
                              <td className="p-2 text-rose-200">
                                {row.bottomUp}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Syllabus Bridge Roadmap */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-indigo-950/30 p-3 rounded border border-indigo-800/50 space-y-2">
                      <span className="font-bold text-xs text-indigo-300 flex items-center gap-1.5">
                        <ArrowDown className="w-4 h-4 text-indigo-400" /> The Road to Topic 2: LL(1) Parsing
                      </span>
                      <p className="text-2xs text-txt-muted">
                        In naive top-down parsing, when a nonterminal has multiple rules $A \to \alpha_1 \mid \alpha_2$, the parser must guess or backtrack.
                        <strong> Topic 2 introduces LL(1)</strong>: by computing <strong>FIRST and FOLLOW sets</strong>, we construct a deterministic parse table $M[A, a]$ that selects the correct production in $O(1)$ time looking at only 1 lookahead token.
                      </p>
                    </div>

                    <div className="bg-rose-950/30 p-3 rounded border border-rose-800/50 space-y-2">
                      <span className="font-bold text-xs text-rose-300 flex items-center gap-1.5">
                        <ArrowUp className="w-4 h-4 text-rose-400" /> The Road to Topic 3: SLR Parsing
                      </span>
                      <p className="text-2xs text-txt-muted">
                        In naive bottom-up parsing, deciding whether to <em>shift</em> or <em>reduce</em> (and which production to reduce by) creates shift/reduce and reduce/reduce conflicts.
                        <strong> Topic 3 introduces SLR(1)</strong>: by tracking $LR(0)$ item sets in a DFA and checking $FOLLOW(A)$, we construct deterministic $ACTION$ and $GOTO$ tables that power industrial compilers.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Collapsible Educational Theory Guide */}
              <div className="bg-bg-surface1 p-3.5 rounded border border-border-subtle space-y-2">
                <button
                  onClick={() => setShowParserIntroTheory((prev) => !prev)}
                  className="w-full flex items-center justify-between text-xs font-bold text-txt-primary hover:text-indigo-300 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Parsing Theory & Mathematical Foundations</span>
                  </div>
                  <span className="text-3xs text-txt-muted">{showParserIntroTheory ? '▲ Hide Guide' : '▼ Read Guide'}</span>
                </button>

                {showParserIntroTheory && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border-subtle text-2xs">
                    <div className="bg-bg-surface2/60 p-2.5 rounded border border-border-subtle space-y-1">
                      <span className="font-bold text-txt-primary block">1. Why Parsing is Necessary</span>
                      <p className="text-txt-muted">
                        Grammars define languages generatively ($S \Rightarrow^* w$). However, compilers and interpreters need to solve the inverse problem: given $w$, reconstruct the syntactic structure (parse tree) to evaluate expressions, generate bytecode, or check semantics.
                      </p>
                    </div>
                    <div className="bg-bg-surface2/60 p-2.5 rounded border border-border-subtle space-y-1">
                      <span className="font-bold text-txt-primary block">2. The Yield Invariant</span>
                      <p className="text-txt-muted">
                        For any valid parse tree T, the concatenation of all its leaves read from left to right must strictly equal the input token stream: <code className="text-txt-primary">yield(T) = w</code>. Both top-down and bottom-up workflows preserve this invariant.
                      </p>
                    </div>
                    <div className="bg-bg-surface2/60 p-2.5 rounded border border-border-subtle space-y-1">
                      <span className="font-bold text-txt-primary block">3. Sentential Forms vs Stacks</span>
                      <p className="text-txt-muted">
                        Top-down maintains a sentential form $\alpha \in (V \cup \Sigma)^*$, expanding the leftmost nonterminal. Bottom-up maintains a stack containing shifted terminals and reduced nonterminals, matching the rightmost derivation in reverse.
                      </p>
                    </div>
                    <div className="bg-bg-surface2/60 p-2.5 rounded border border-border-subtle space-y-1">
                      <span className="font-bold text-txt-primary block">4. Search vs Deterministic Parsing</span>
                      <p className="text-txt-muted">
                        Introductory parsing uses bounded search to find derivations when ambiguous or choice-heavy grammars are used. Industrial parsers (LL, LR, LALR) eliminate search entirely by restricting to deterministic grammar classes.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* LL(1) Table & Conflict View */}
          {activeSubView === 'LL1_TABLE' && (
            <div className="space-y-4">
              <div className="bg-emerald-950/30 p-3.5 rounded border border-emerald-800/50 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-emerald-300 text-xs">Module 4 — Topic 2: LL(1) Parse Table & Conflict Studio</h3>
                    <span className="bg-slate-900 text-slate-300 border border-slate-700 px-2 py-0.5 rounded text-3xs font-semibold">
                      Start Symbol: <span className="text-emerald-400 font-bold">{grammar.startVariable}</span>
                    </span>
                  </div>
                  {ll1Analysis.isLL1 ? (
                    <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-3xs font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> STRICTLY LL(1) (0 CONFLICTS)
                    </span>
                  ) : (
                    <span className="bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded text-3xs font-semibold flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> NOT LL(1) ({ll1Analysis.conflicts.length} CONFLICTS)
                    </span>
                  )}
                </div>

                <p className="text-3xs text-slate-400 leading-relaxed">
                  The LL(1) parse table <span className="font-bold text-slate-300">M[A, a]</span> maps each nonterminal <span className="font-bold text-emerald-300">A</span> and lookahead terminal <span className="font-bold text-emerald-300">a</span> (including end-marker <span className="font-bold text-amber-400">$</span>) to a unique production rule. A grammar is strictly LL(1) if and only if every cell contains at most one production.
                </p>

                {/* Conflicts Alert */}
                {ll1Analysis.conflicts.length > 0 && (
                  <div className="bg-red-950/40 p-3 rounded border border-red-900/60 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-red-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                        {ll1Analysis.conflicts.length} Parse Table Conflict(s) Detected
                      </span>
                      <span className="text-3xs text-red-400 font-semibold">Deterministic 1-lookahead parsing is impossible without left-factoring or rewriting</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {ll1Analysis.conflicts.map((c, i) => (
                        <div
                          key={i}
                          onClick={() => setSelectedLL1Cell({ variable: c.variable, terminal: c.terminal })}
                          className="bg-slate-950/70 p-2.5 rounded border border-red-900/40 hover:border-red-600 transition-colors cursor-pointer space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-red-400 text-3xs">
                              [{c.type}] M[{c.variable}, &apos;{c.terminal}&apos;]
                            </span>
                            <span className="text-4xs bg-red-950 text-red-300 px-1.5 py-0.5 rounded border border-red-800">
                              Click to inspect
                            </span>
                          </div>
                          <p className="text-3xs text-slate-300">{c.mathematicalExplanation}</p>
                          <div className="text-4xs text-slate-400 flex items-center gap-1">
                            <span>Competing:</span>
                            <span className="font-mono text-amber-300">{c.productionNotations.join(' vs ')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interactive Table Grid */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-3xs text-slate-400">
                    <span>Click any cell to inspect its prediction evidence, FIRST/FOLLOW rationale, or conflict details:</span>
                    {selectedLL1Cell && (
                      <button
                        onClick={() => setSelectedLL1Cell(null)}
                        className="text-emerald-400 hover:text-emerald-300 underline font-semibold"
                      >
                        Clear selection
                      </button>
                    )}
                  </div>

                  <div className="overflow-x-auto border border-slate-800 rounded bg-slate-950/60">
                    <table className="w-full text-left border-collapse text-3xs font-mono">
                      <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="p-2 border-r border-slate-800 text-center font-bold text-slate-300 bg-slate-900/90">
                            V \ Σ
                          </th>
                          {ll1Analysis.parseTable.terminals.map((t) => (
                            <th
                              key={t}
                              className={`p-2 border-r border-slate-800 font-bold text-center ${
                                t === '$' ? 'text-amber-400 bg-amber-950/20' : 'text-emerald-400'
                              }`}
                            >
                              {t}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {ll1Analysis.parseTable.variables.map((v) => (
                          <tr key={v} className="hover:bg-slate-900/40 transition-colors">
                            <td className="p-2 font-bold text-slate-200 border-r border-slate-800 text-center bg-slate-900/50">
                              {v}
                            </td>
                            {ll1Analysis.parseTable.terminals.map((t) => {
                              const cell = ll1Analysis.parseTable.grid[v]?.[t];
                              const hasConflict = cell?.hasConflict;
                              const isSelected = selectedLL1Cell?.variable === v && selectedLL1Cell?.terminal === t;
                              const hasProds = cell && cell.productions.length > 0;

                              return (
                                <td
                                  key={t}
                                  onClick={() => setSelectedLL1Cell({ variable: v, terminal: t })}
                                  title={`Inspect M[${v}, '${t}']`}
                                  className={`p-2 text-center border-r border-slate-800 cursor-pointer transition-all ${
                                    isSelected
                                      ? 'ring-2 ring-emerald-400 bg-emerald-950/80 z-10'
                                      : hasConflict
                                      ? 'bg-red-950/80 text-red-300 font-bold hover:bg-red-900/90'
                                      : hasProds
                                      ? 'text-emerald-300 font-semibold hover:bg-emerald-950/50'
                                      : 'text-slate-700 hover:bg-slate-900/60 hover:text-slate-500'
                                  }`}
                                >
                                  {hasConflict ? (
                                    <span className="flex items-center justify-center gap-1 text-red-300">
                                      <AlertTriangle className="w-2.5 h-2.5" />
                                      {cell.productions.map((p) => p.id).join(', ')}
                                    </span>
                                  ) : hasProds ? (
                                    cell.productions.map((p) => p.id).join(', ')
                                  ) : (
                                    '—'
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Selected Cell Inspector Card */}
                {selectedLL1Cell && (() => {
                  const v = selectedLL1Cell.variable;
                  const t = selectedLL1Cell.terminal;
                  const cell = ll1Analysis.parseTable.grid[v]?.[t];
                  const conflict = ll1Analysis.conflicts.find((c) => c.variable === v && c.terminal === t);
                  const isNullable = ll1Analysis.nullableVariables.includes(v);

                  return (
                    <div className="bg-slate-950/90 p-3.5 rounded border border-emerald-700/60 space-y-3 shadow-lg animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-emerald-300">
                            Table Cell Inspector: M[{v}, &apos;{t}&apos;]
                          </span>
                          {conflict ? (
                            <span className="bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded text-3xs font-semibold">
                              CONFLICT: {conflict.type}
                            </span>
                          ) : cell && cell.productions.length > 0 ? (
                            <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-3xs font-semibold">
                              DETERMINISTIC ENTRY
                            </span>
                          ) : (
                            <span className="bg-slate-900 text-slate-400 border border-slate-800 px-2 py-0.5 rounded text-3xs font-semibold">
                              EMPTY (SYNTAX ERROR)
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => setSelectedLL1Cell(null)}
                          className="text-slate-400 hover:text-slate-200 text-xs px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800"
                        >
                          ✕ Close
                        </button>
                      </div>

                      {/* Content Details */}
                      {!cell || cell.productions.length === 0 ? (
                        <div className="text-3xs text-slate-400 space-y-1">
                          <p>
                            No production expands variable <span className="font-bold text-slate-300">&apos;{v}&apos;</span> when lookahead is <span className="font-bold text-amber-300">&apos;{t}&apos;</span>.
                          </p>
                          <p className="text-slate-500">
                            If the predictive parser encounters stack top <span className="font-mono text-slate-300">&apos;{v}&apos;</span> and lookahead <span className="font-mono text-slate-300">&apos;{t}&apos;</span>, parsing will fail immediately with a <span className="text-red-400">Syntax Error</span>.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <span className="text-3xs font-bold text-slate-300">
                              {cell.productions.length === 1 ? 'Selected Production Rule:' : 'Competing Production Rules in Conflict:'}
                            </span>
                            <div className="space-y-2">
                              {cell.productions.map((p) => {
                                const sSet = ll1Analysis.selectSets.find((s) => s.productionId === p.id);
                                const evidence = conflict?.competingProductionEvidence?.find((e) => e.productionId === p.id);
                                const rhsNot = p.rhs.length === 0 ? 'ε' : p.rhs.map((s) => (s.type === 'EPSILON' ? 'ε' : s.value)).join(' ');

                                return (
                                  <div
                                    key={p.id}
                                    className={`p-2.5 rounded border text-3xs font-mono space-y-1 ${
                                      conflict
                                        ? 'bg-red-950/30 border-red-900/50 text-red-200'
                                        : 'bg-emerald-950/20 border-emerald-900/50 text-emerald-200'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between font-bold">
                                      <span className="text-emerald-300 font-semibold">{p.id}: {p.lhs} → {rhsNot}</span>
                                      <span className="text-4xs text-slate-400">SELECT({p.id}) = {'{'}{sSet?.selectSet.join(', ')}{'}'}</span>
                                    </div>
                                    <div className="text-4xs text-slate-300 font-sans">
                                      {evidence ? (
                                        <p>
                                          <span className="font-bold text-amber-300">{evidence.reason === 'FIRST_SET' ? 'Derived via FIRST Set:' : 'Derived via FOLLOW Set:'}</span>{' '}
                                          {evidence.explanation}
                                        </p>
                                      ) : (
                                        <p>
                                          Entered cell M[{v}, {t}] because terminal &apos;{t}&apos; is in SELECT({p.id}).
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Contextual FIRST/FOLLOW Data */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-3xs">
                            <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                              <span className="text-slate-400 block text-4xs">FIRST({v})</span>
                              <span className="font-mono text-emerald-300 font-bold">
                                {'{'}{(ll1Analysis.firstSets[v] || []).join(', ')}{'}'}
                              </span>
                            </div>
                            <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                              <span className="text-slate-400 block text-4xs">FOLLOW({v})</span>
                              <span className="font-mono text-cyan-300 font-bold">
                                {'{'}{(ll1Analysis.followSets[v] || []).join(', ')}{'}'}
                              </span>
                            </div>
                            <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                              <span className="text-slate-400 block text-4xs">Nullable Variable?</span>
                              <span className={`font-bold ${isNullable ? 'text-amber-400' : 'text-slate-400'}`}>
                                {isNullable ? 'YES (derives ε)' : 'NO'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Predictive Parser View */}
          {activeSubView === 'PREDICTIVE_PARSER' && (
            <div className="space-y-4">
              <div className="bg-violet-950/30 p-3.5 rounded border border-violet-800/50 space-y-4">
                {/* Header & Status Banner */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-violet-300 text-xs">Module 4 — Topic 2: LL(1) Predictive Parser Studio</h3>
                    <span className="bg-slate-900 text-slate-300 border border-slate-700 px-2 py-0.5 rounded text-3xs font-semibold">
                      Start Symbol: <span className="text-violet-400 font-bold">{grammar.startVariable}</span>
                    </span>
                    <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-0.5 rounded border border-slate-700 text-3xs">
                      <span className="text-slate-400">Input w:</span>
                      <input
                        type="text"
                        value={testInput}
                        onChange={(e) => setTestInput(e.target.value)}
                        placeholder="e.g. id+id"
                        className="bg-slate-950 text-amber-300 font-mono font-bold px-1.5 py-0.5 rounded border border-slate-800 focus:outline-none focus:border-violet-500 text-3xs w-28"
                      />
                    </div>
                  </div>

                  {ll1ParseResult.isAccepted ? (
                    <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2.5 py-1 rounded text-3xs font-bold flex items-center gap-1.5 shadow-sm">
                      <CheckCircle2 className="w-3.5 h-3.5" /> ACCEPTED (L = L = 1)
                    </span>
                  ) : (
                    <span className="bg-red-950 text-red-300 border border-red-800 px-2.5 py-1 rounded text-3xs font-bold flex items-center gap-1.5 shadow-sm">
                      <XCircle className="w-3.5 h-3.5" /> REJECTED
                    </span>
                  )}
                </div>

                {/* Candidate Test Input Chips */}
                <div className="flex items-center gap-1.5 flex-wrap text-3xs bg-slate-950/60 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 font-semibold flex items-center gap-1">
                    <Search className="w-3 h-3" /> Quick Inputs:
                  </span>
                  {allBatchStrings.slice(0, 8).map((candidate) => (
                    <button
                      key={candidate}
                      onClick={() => setTestInput(candidate === 'ε' ? '' : candidate)}
                      className={`px-2 py-0.5 rounded text-3xs font-mono font-bold transition-colors ${
                        (candidate === 'ε' && testInput === '') || testInput === candidate
                          ? 'bg-violet-600 text-white shadow'
                          : 'bg-slate-900 text-slate-300 border border-slate-700 hover:border-violet-500'
                      }`}
                    >
                      {candidate === '' || candidate === 'ε' ? 'ε (empty)' : candidate}
                    </button>
                  ))}
                </div>

                {/* Rejection Diagnostics Alert */}
                {ll1ParseResult.rejectionReason && (
                  <div className="bg-red-950/40 p-3 rounded border border-red-900/60 space-y-1">
                    <span className="font-bold text-xs text-red-300 flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5 text-red-400" /> Parser Rejection Diagnostic
                    </span>
                    <p className="text-3xs text-red-200 font-mono">{ll1ParseResult.rejectionReason}</p>
                    <p className="text-4xs text-slate-400">
                      Predictive LL(1) parsing requires a deterministic lookup with 1 lookahead token. Mismatched terminals or missing table entries cause rejection.
                    </p>
                  </div>
                )}

                {/* Statistics Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-3xs">
                  <div className="bg-slate-950/80 p-2 rounded border border-slate-800 text-center">
                    <span className="text-slate-400 block text-4xs">Parser Steps</span>
                    <span className="font-bold text-violet-300 text-xs">{ll1ParseResult.steps.length}</span>
                  </div>
                  <div className="bg-slate-950/80 p-2 rounded border border-slate-800 text-center">
                    <span className="text-slate-400 block text-4xs">Terminal Matches</span>
                    <span className="font-bold text-emerald-300 text-xs">{ll1ParseResult.stats?.matchCount ?? 0}</span>
                  </div>
                  <div className="bg-slate-950/80 p-2 rounded border border-slate-800 text-center">
                    <span className="text-slate-400 block text-4xs">Nonterminal Expansions</span>
                    <span className="font-bold text-cyan-300 text-xs">{ll1ParseResult.stats?.expansionCount ?? 0}</span>
                  </div>
                  <div className="bg-slate-950/80 p-2 rounded border border-slate-800 text-center">
                    <span className="text-slate-400 block text-4xs">ε-Reductions</span>
                    <span className="font-bold text-amber-300 text-xs">{ll1ParseResult.stats?.epsilonCount ?? 0}</span>
                  </div>
                  <div className="bg-slate-950/80 p-2 rounded border border-slate-800 text-center col-span-2 sm:col-span-1">
                    <span className="text-slate-400 block text-4xs">Grammar Status</span>
                    <span className={`font-bold text-xs ${ll1Analysis.isLL1 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {ll1Analysis.isLL1 ? 'Strict LL(1)' : 'Conflicts'}
                    </span>
                  </div>
                </div>

                {/* Step Runner Toolbar */}
                {ll1ParseResult.steps.length > 0 && (() => {
                  const maxStep = ll1ParseResult.steps.length - 1;
                  const curStep = ll1ParseResult.steps[Math.min(ll1StepIdx, maxStep)];

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2 bg-slate-950/80 p-2.5 rounded border border-slate-800">
                        {/* Step Navigation Controls */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setLl1StepIdx(0);
                              setLl1IsPlaying(false);
                            }}
                            title="Reset to initial state"
                            className="bg-slate-900 hover:bg-slate-800 text-slate-300 p-1.5 rounded border border-slate-700 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setLl1StepIdx((prev) => Math.max(0, prev - 1));
                              setLl1IsPlaying(false);
                            }}
                            disabled={ll1StepIdx <= 0}
                            title="Previous step"
                            className="bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 text-slate-300 p-1.5 rounded border border-slate-700 transition-colors"
                          >
                            <SkipBack className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setLl1IsPlaying((prev) => !prev)}
                            title={ll1IsPlaying ? 'Pause execution' : 'Play execution'}
                            className="bg-violet-600 hover:bg-violet-500 text-white px-2.5 py-1 rounded font-bold text-3xs flex items-center gap-1 transition-colors shadow"
                          >
                            {ll1IsPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                            <span>{ll1IsPlaying ? 'PAUSE' : 'PLAY'}</span>
                          </button>
                          <button
                            onClick={() => {
                              setLl1StepIdx((prev) => Math.min(maxStep, prev + 1));
                              setLl1IsPlaying(false);
                            }}
                            disabled={ll1StepIdx >= maxStep}
                            title="Next step"
                            className="bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 text-slate-300 p-1.5 rounded border border-slate-700 transition-colors"
                          >
                            <SkipForward className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setLl1StepIdx(maxStep);
                              setLl1IsPlaying(false);
                            }}
                            title="Run to end"
                            className="bg-slate-900 hover:bg-slate-800 text-slate-300 p-1.5 rounded border border-slate-700 transition-colors"
                          >
                            <FastForward className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Step Position Indicator */}
                        <div className="flex items-center gap-2 text-3xs">
                          <span className="font-bold text-violet-300">
                            Step {ll1StepIdx + 1} of {ll1ParseResult.steps.length}
                          </span>
                          <span className="text-slate-500">|</span>
                          <span className="text-slate-400">Speed:</span>
                          <select
                            value={ll1PlaySpeed}
                            onChange={(e) => setLl1PlaySpeed(Number(e.target.value))}
                            className="bg-slate-900 border border-slate-700 text-slate-300 rounded px-1.5 py-0.5 text-4xs font-semibold focus:outline-none"
                          >
                            <option value={1600}>0.5x (Slow)</option>
                            <option value={800}>1x (Normal)</option>
                            <option value={400}>2x (Fast)</option>
                          </select>
                        </div>
                      </div>

                      {/* Active Step Spotlight Card */}
                      {curStep && (
                        <div className="bg-slate-950/90 p-3.5 rounded border border-violet-700/60 space-y-3 shadow-md">
                          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                            <span className="font-bold text-xs text-violet-300 flex items-center gap-1.5">
                              <Zap className="w-3.5 h-3.5 text-violet-400" />
                              Active Step {curStep.stepIndex + 1}: {curStep.action}
                            </span>
                            <span className="font-mono text-4xs text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                              Derivation Action
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Parser Stack View */}
                            <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 space-y-1.5">
                              <span className="text-4xs font-bold text-slate-400 uppercase tracking-wider block">
                                Parser Stack (Bottom → Top)
                              </span>
                              <div className="flex items-center gap-1.5 flex-wrap font-mono text-3xs">
                                {curStep.stack.map((sym, idx) => {
                                  const isTop = idx === curStep.stack.length - 1;
                                  return (
                                    <span
                                      key={idx}
                                      className={`px-2 py-0.5 rounded font-bold transition-all ${
                                        isTop
                                          ? 'bg-violet-600 text-white shadow ring-2 ring-violet-400/50 scale-105'
                                          : sym === '$'
                                          ? 'bg-amber-950/70 text-amber-300 border border-amber-800'
                                          : 'bg-slate-800 text-slate-200 border border-slate-700'
                                      }`}
                                    >
                                      {sym}
                                      {isTop && <span className="ml-1 text-4xs opacity-80">(TOP)</span>}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Lookahead & Remaining Input */}
                            <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 space-y-1.5">
                              <span className="text-4xs font-bold text-slate-400 uppercase tracking-wider block">
                                Lookahead & Remaining Tokens
                              </span>
                              <div className="flex items-center gap-2 font-mono text-3xs">
                                <span className="bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded font-bold">
                                  Lookahead: &apos;{curStep.lookahead}&apos;
                                </span>
                                <span className="text-slate-400">Remaining:</span>
                                <span className="text-slate-300 font-semibold">
                                  [ {curStep.remainingInput.join(' ')} ]
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Leftmost Sentential Form Trace */}
                          <div className="bg-violet-950/20 p-2.5 rounded border border-violet-900/40 space-y-1">
                            <div className="flex items-center justify-between text-4xs">
                              <span className="font-bold text-violet-300 uppercase tracking-wider">
                                Leftmost Derivation Sentential Form
                              </span>
                              <span className="text-slate-400 font-mono">
                                {grammar.startVariable} ⇒* w
                              </span>
                            </div>
                            <div className="font-mono text-xs text-violet-200 font-bold">
                              {curStep.formattedSententialForm || grammar.startVariable}
                            </div>
                          </div>

                          {/* Explanation */}
                          <div className="text-3xs text-slate-300 bg-slate-900/40 p-2 rounded border border-slate-800/60 leading-relaxed">
                            <span className="font-bold text-violet-400">Execution Rationale: </span>
                            {curStep.mathematicalExplanation}
                          </div>
                        </div>
                      )}

                      {/* Interactive Execution Trace Table */}
                      <div className="bg-slate-950/80 p-3 rounded border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-violet-300">
                            Predictive Execution Step-by-Step History
                          </span>
                          <span className="text-4xs text-slate-400">
                            Click any row to jump to that step
                          </span>
                        </div>
                        <div className="overflow-x-auto border border-slate-800 rounded max-h-64">
                          <table className="w-full text-left border-collapse text-3xs font-mono">
                            <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 sticky top-0">
                              <tr>
                                <th className="p-1.5 text-center">Step</th>
                                <th className="p-1.5">Stack</th>
                                <th className="p-1.5">Remaining Input</th>
                                <th className="p-1.5 text-center">Lookahead</th>
                                <th className="p-1.5">Action / Applied Production</th>
                                <th className="p-1.5">Sentential Form</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                              {ll1ParseResult.steps.map((st) => {
                                const isActive = st.stepIndex === curStep?.stepIndex;
                                return (
                                  <tr
                                    key={st.stepIndex}
                                    onClick={() => {
                                      setLl1StepIdx(st.stepIndex);
                                      setLl1IsPlaying(false);
                                    }}
                                    className={`cursor-pointer transition-colors ${
                                      isActive
                                        ? 'bg-violet-950/80 text-violet-200 font-bold border-l-4 border-violet-400'
                                        : 'hover:bg-slate-900/50 text-slate-300'
                                    }`}
                                  >
                                    <td className="p-1.5 text-center text-slate-500">{st.stepIndex + 1}</td>
                                    <td className="p-1.5 text-violet-300 font-bold">[ {st.stack.join(', ')} ]</td>
                                    <td className="p-1.5 text-slate-400">[ {st.remainingInput.join(', ')} ]</td>
                                    <td className="p-1.5 text-center text-amber-400 font-bold">{st.lookahead}</td>
                                    <td className="p-1.5 text-emerald-400 font-semibold">{st.action}</td>
                                    <td className="p-1.5 text-slate-300">{st.formattedSententialForm || '—'}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Reconstructed Parse Tree */}
                {ll1ParseResult.parseTree && (
                  <div className="bg-slate-950/80 p-3.5 rounded border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-violet-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Reconstructed LL(1) Parse Tree
                      </span>
                      <span className="text-3xs text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 font-semibold">
                        yield(tree) ≡ &quot;{testInput}&quot;
                      </span>
                    </div>

                    <div className="overflow-x-auto p-4 bg-slate-900/40 rounded border border-slate-800/80 flex justify-center max-h-96">
                      <RenderParseTreeNode node={ll1ParseResult.parseTree} isRoot />
                    </div>
                  </div>
                )}

                {/* Educational Theory Guide Accordion */}
                <div className="border border-violet-900/40 rounded bg-slate-950/60 overflow-hidden">
                  <button
                    onClick={() => setShowLL1Theory((prev) => !prev)}
                    className="w-full px-3.5 py-2 text-left font-bold text-3xs text-violet-300 flex items-center justify-between bg-violet-950/20 hover:bg-violet-950/40 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-violet-400" />
                      Topic 2 Educational Guide: LL(1) Predictive Parsing Principles
                    </span>
                    <span>{showLL1Theory ? '▲ Collapse Guide' : '▼ Expand Guide'}</span>
                  </button>

                  {showLL1Theory && (
                    <div className="p-3.5 space-y-3 text-3xs text-slate-300 leading-relaxed border-t border-violet-900/30">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 space-y-1">
                          <span className="font-bold text-emerald-400 block">1. What Does LL(1) Mean?</span>
                          <p className="text-slate-400">
                            <strong>L:</strong> Scans input from <em>Left to right</em>.<br />
                            <strong>L:</strong> Constructs a <em>Leftmost derivation</em>.<br />
                            <strong>1:</strong> Uses exactly <em>1 lookahead token</em> to decide every expansion.
                          </p>
                        </div>
                        <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 space-y-1">
                          <span className="font-bold text-cyan-400 block">2. Table Construction</span>
                          <p className="text-slate-400">
                            For each production A → α:<br />
                            • For all a ∈ FIRST(α), place A → α in M[A, a].<br />
                            • If ε ∈ FIRST(α), for all b ∈ FOLLOW(A), place A → α in M[A, b].
                          </p>
                        </div>
                        <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 space-y-1">
                          <span className="font-bold text-amber-400 block">3. Stack Execution</span>
                          <p className="text-slate-400">
                            Stack initialized with [$ , S]. Top of stack is matched against input (if terminal) or expanded via M[A, a] (if nonterminal, pushing RHS in reverse order).
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800 space-y-1">
                        <span className="font-bold text-violet-300">Roadmap: From Topic 1 to Topic 3</span>
                        <p className="text-slate-400">
                          In <strong>Topic 1</strong>, Top-Down parsing required bounded search/backtracking over sentential forms. <strong>Topic 2 (LL(1))</strong> makes top-down parsing <em>deterministic</em> using FIRST/FOLLOW prediction sets. In <strong>Topic 3 (SLR)</strong>, we will explore bottom-up shift-reduce parsing using LR(0) state items and lookahead disambiguation.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Module 4 Topic 3: LR(0) Collection View */}
          {activeSubView === 'SLR_COLLECTION' && (
            <div className="space-y-4">
              <div className="bg-amber-950/20 p-3.5 rounded border border-amber-800/50 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-amber-300 text-xs">Module 4 — Topic 3: Canonical LR(0) Collection & DFA Automaton</h3>
                    <span className="bg-slate-900 text-slate-300 border border-slate-700 px-2 py-0.5 rounded text-3xs font-semibold">
                      Augmented Start: <span className="text-amber-400 font-bold">{slrBuildResult.collection.augmentedStartSymbol}</span>
                    </span>
                    <span className="bg-slate-900 text-slate-300 border border-slate-700 px-2 py-0.5 rounded text-3xs font-semibold">
                      DFA States: <span className="text-emerald-400 font-bold">{slrBuildResult.collection.states.length}</span>
                    </span>
                    <span className="bg-slate-900 text-slate-300 border border-slate-700 px-2 py-0.5 rounded text-3xs font-semibold">
                      Transitions: <span className="text-cyan-400 font-bold">{slrBuildResult.collection.transitions.length}</span>
                    </span>
                  </div>
                  <span className="bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded text-3xs font-semibold flex items-center gap-1">
                    <Layers className="w-3 h-3" /> LR(0) CANONICAL DFA
                  </span>
                </div>

                <p className="text-3xs text-slate-400 leading-relaxed">
                  The Canonical LR(0) collection represents the set of all deterministic parser states constructed via <span className="font-bold text-amber-300">CLOSURE</span> and <span className="font-bold text-cyan-300">GOTO</span> operations on the augmented grammar <span className="font-mono text-slate-300">{slrBuildResult.collection.augmentedStartSymbol} → {grammar.startVariable}</span>.
                </p>

                {/* State Selection Pills */}
                <div className="flex items-center gap-1.5 flex-wrap bg-slate-950/60 p-2.5 rounded border border-slate-800">
                  <span className="text-slate-400 text-3xs font-semibold">Jump to State:</span>
                  {slrBuildResult.collection.states.map((st) => (
                    <button
                      key={st.id}
                      onClick={() => setSelectedLR0StateId(st.id)}
                      className={`px-2 py-0.5 rounded text-3xs font-mono font-bold transition-all ${
                        selectedLR0StateId === st.id
                          ? 'bg-amber-600 text-white shadow ring-2 ring-amber-400/50 scale-105'
                          : 'bg-slate-900 text-slate-300 border border-slate-700 hover:border-amber-500'
                      }`}
                    >
                      {st.name} {st.completedItems.length > 0 && '•'}
                    </button>
                  ))}
                </div>

                {/* State Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {slrBuildResult.collection.states.map((st) => {
                    const isSelected = selectedLR0StateId === st.id;
                    return (
                      <div
                        key={st.id}
                        onClick={() => setSelectedLR0StateId(st.id)}
                        className={`p-3 rounded border transition-all cursor-pointer space-y-2.5 ${
                          isSelected
                            ? 'bg-slate-900/90 border-amber-500 ring-2 ring-amber-500/30 shadow-lg'
                            : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40'
                        }`}
                      >
                        {/* State Card Header */}
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                          <span className="font-bold text-xs font-mono text-amber-300">
                            State {st.name} {st.id === 0 && <span className="text-4xs text-emerald-400 ml-1">(Initial)</span>}
                          </span>
                          <span className="text-4xs text-slate-400">
                            {st.items.length} item(s) {st.completedItems.length > 0 && `• ${st.completedItems.length} completed`}
                          </span>
                        </div>

                        {/* Items List */}
                        <div className="space-y-1 font-mono text-3xs">
                          {st.items.map((it) => {
                            return (
                              <div
                                key={it.id}
                                className={`px-2 py-1 rounded flex items-center justify-between ${
                                  it.isCompleted
                                    ? 'bg-amber-950/40 text-amber-200 border border-amber-900/40'
                                    : it.isKernel
                                    ? 'bg-slate-900/80 text-slate-200'
                                    : 'bg-slate-950/40 text-slate-400'
                                }`}
                              >
                                <span>{it.formatted}</span>
                                <span className="text-4xs font-sans opacity-70">
                                  {it.isCompleted ? 'Reduce' : it.isKernel ? 'Kernel' : 'Closure'}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Outgoing Transitions */}
                        {st.transitions.length > 0 && (
                          <div className="pt-2 border-t border-slate-800/60 space-y-1">
                            <span className="text-4xs text-slate-400 font-bold uppercase tracking-wider block">
                              Outgoing Transitions:
                            </span>
                            <div className="flex items-center gap-1 flex-wrap font-mono text-4xs">
                              {st.transitions.map((tr) => (
                                <button
                                  key={tr.symbol}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedLR0StateId(tr.targetStateId);
                                  }}
                                  className={`px-1.5 py-0.5 rounded border transition-colors ${
                                    tr.isTerminal
                                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800 hover:border-emerald-500'
                                      : 'bg-cyan-950/60 text-cyan-300 border-cyan-800 hover:border-cyan-500'
                                  }`}
                                  title={`GOTO(I${st.id}, '${tr.symbol}') = I${tr.targetStateId}`}
                                >
                                  {tr.symbol} → I{tr.targetStateId}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Detailed State Inspector */}
                {selectedLR0StateId !== null && (() => {
                  const state = slrBuildResult.collection.states.find((s) => s.id === selectedLR0StateId);
                  if (!state) return null;

                  return (
                    <div className="bg-slate-950/90 p-4 rounded border border-amber-600/60 space-y-3 shadow-xl">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="font-bold text-xs text-amber-300">
                          State Inspector: {state.name} ({state.items.length} LR(0) items)
                        </span>
                        <span className="text-3xs text-slate-400 font-mono">
                          {state.transitions.length} outgoing transitions
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Items breakdown */}
                        <div className="space-y-2">
                          <span className="text-3xs font-bold text-slate-300 block">LR(0) Items in State:</span>
                          <div className="space-y-1.5 font-mono text-3xs">
                            {state.items.map((it) => (
                              <div
                                key={it.id}
                                className={`p-2 rounded border space-y-0.5 ${
                                  it.isCompleted
                                    ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                                    : 'bg-slate-900/70 border-slate-800 text-slate-200'
                                }`}
                              >
                                <div className="flex items-center justify-between font-bold">
                                  <span>{it.formatted}</span>
                                  <span className="text-4xs text-slate-400">
                                    {it.isCompleted ? 'COMPLETED' : `Next: '${it.nextSymbol?.value}'`}
                                  </span>
                                </div>
                                {it.isCompleted && (
                                  <p className="text-4xs text-amber-400 font-sans">
                                    Generates REDUCE on lookaheads ∈ FOLLOW({it.lhs}) = {'{'}{slrBuildResult.table.followSets[it.lhs]?.join(', ')}{'}'}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Transitions breakdown */}
                        <div className="space-y-2">
                          <span className="text-3xs font-bold text-slate-300 block">GOTO / Transition Table for {state.name}:</span>
                          {state.transitions.length === 0 ? (
                            <p className="text-3xs text-slate-500 italic">No outgoing transitions (all items completed or accept).</p>
                          ) : (
                            <div className="space-y-1.5 font-mono text-3xs">
                              {state.transitions.map((tr) => (
                                <div
                                  key={tr.symbol}
                                  onClick={() => setSelectedLR0StateId(tr.targetStateId)}
                                  className="p-2 rounded border border-slate-800 bg-slate-900/50 hover:bg-slate-900 cursor-pointer flex items-center justify-between"
                                >
                                  <div>
                                    <span className={tr.isTerminal ? 'text-emerald-400 font-bold' : 'text-cyan-400 font-bold'}>
                                      {tr.isTerminal ? 'Terminal Shift' : 'Nonterminal GOTO'} on &apos;{tr.symbol}&apos;
                                    </span>
                                  </div>
                                  <span className="text-amber-300 font-bold">→ State I{tr.targetStateId}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Module 4 Topic 3: SLR Parse Table & Shift-Reduce Studio */}
          {activeSubView === 'SLR_PARSER' && (
            <div className="space-y-4">
              <div className="bg-rose-950/20 p-3.5 rounded border border-rose-800/50 space-y-4">
                {/* Header & Status Banner */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-rose-300 text-xs">Module 4 — Topic 3: SLR(1) Parse Table & Shift-Reduce Studio</h3>
                    <span className="bg-slate-900 text-slate-300 border border-slate-700 px-2 py-0.5 rounded text-3xs font-semibold">
                      Start: <span className="text-rose-400 font-bold">{grammar.startVariable}</span>
                    </span>
                    <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-0.5 rounded border border-slate-700 text-3xs">
                      <span className="text-slate-400">Input w:</span>
                      <input
                        type="text"
                        value={testInput}
                        onChange={(e) => setTestInput(e.target.value)}
                        placeholder="e.g. id+id*id"
                        className="bg-slate-950 text-amber-300 font-mono font-bold px-1.5 py-0.5 rounded border border-slate-800 focus:outline-none focus:border-rose-500 text-3xs w-28"
                      />
                    </div>
                  </div>

                  {slrParseResult.isAccepted ? (
                    <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2.5 py-1 rounded text-3xs font-bold flex items-center gap-1.5 shadow-sm">
                      <CheckCircle2 className="w-3.5 h-3.5" /> ACCEPTED (SLR Shift-Reduce)
                    </span>
                  ) : (
                    <span className="bg-red-950 text-red-300 border border-red-800 px-2.5 py-1 rounded text-3xs font-bold flex items-center gap-1.5 shadow-sm">
                      <XCircle className="w-3.5 h-3.5" /> REJECTED
                    </span>
                  )}
                </div>

                {/* Candidate Test Input Chips */}
                <div className="flex items-center gap-1.5 flex-wrap text-3xs bg-slate-950/60 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 font-semibold flex items-center gap-1">
                    <Search className="w-3 h-3" /> Quick Inputs:
                  </span>
                  {allBatchStrings.slice(0, 8).map((candidate) => (
                    <button
                      key={candidate}
                      onClick={() => setTestInput(candidate === 'ε' ? '' : candidate)}
                      className={`px-2 py-0.5 rounded text-3xs font-mono font-bold transition-colors ${
                        (candidate === 'ε' && testInput === '') || testInput === candidate
                          ? 'bg-rose-600 text-white shadow'
                          : 'bg-slate-900 text-slate-300 border border-slate-700 hover:border-rose-500'
                      }`}
                    >
                      {candidate === '' || candidate === 'ε' ? 'ε (empty)' : candidate}
                    </button>
                  ))}
                </div>

                {/* Conflict Alert Banner if grammar is not SLR */}
                {!slrBuildResult.table.isSLR && (
                  <div className="bg-red-950/40 p-3 rounded border border-red-900/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-red-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                        SLR(1) Conflicts Detected ({slrBuildResult.table.conflicts.length} conflict cell(s))
                      </span>
                      <span className="text-3xs text-red-400 font-semibold">
                        Non-deterministic: Requires LR(1) or LALR(1) lookahead disambiguation
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {slrBuildResult.table.conflicts.map((c, i) => (
                        <div
                          key={i}
                          onClick={() => setSelectedSLRCell({ stateId: c.stateId, symbol: c.symbol, isGoto: false })}
                          className="bg-slate-950/70 p-2.5 rounded border border-red-900/40 hover:border-red-600 transition-colors cursor-pointer space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-red-400 text-3xs">
                              [{c.conflictType}] State I{c.stateId}, Lookahead &apos;{c.symbol}&apos;
                            </span>
                            <span className="text-4xs bg-red-950 text-red-300 px-1.5 py-0.5 rounded border border-red-800">
                              Click to inspect
                            </span>
                          </div>
                          <p className="text-3xs text-slate-300">{c.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rejection Diagnostics Alert */}
                {slrParseResult.rejectionReason && (
                  <div className="bg-red-950/40 p-3 rounded border border-red-900/60 space-y-1">
                    <span className="font-bold text-xs text-red-300 flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5 text-red-400" /> SLR Parser Diagnostic
                    </span>
                    <p className="text-3xs text-red-200 font-mono">{slrParseResult.rejectionReason}</p>
                  </div>
                )}

                {/* Statistics Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-3xs">
                  <div className="bg-slate-950/80 p-2 rounded border border-slate-800 text-center">
                    <span className="text-slate-400 block text-4xs">Parser Steps</span>
                    <span className="font-bold text-rose-300 text-xs">{slrParseResult.steps.length}</span>
                  </div>
                  <div className="bg-slate-950/80 p-2 rounded border border-slate-800 text-center">
                    <span className="text-slate-400 block text-4xs">Shift Actions</span>
                    <span className="font-bold text-emerald-300 text-xs">{slrParseResult.stats.shiftCount}</span>
                  </div>
                  <div className="bg-slate-950/80 p-2 rounded border border-slate-800 text-center">
                    <span className="text-slate-400 block text-4xs">Reduce Actions</span>
                    <span className="font-bold text-amber-300 text-xs">{slrParseResult.stats.reduceCount}</span>
                  </div>
                  <div className="bg-slate-950/80 p-2 rounded border border-slate-800 text-center">
                    <span className="text-slate-400 block text-4xs">LR(0) States</span>
                    <span className="font-bold text-cyan-300 text-xs">{slrBuildResult.table.states.length}</span>
                  </div>
                  <div className="bg-slate-950/80 p-2 rounded border border-slate-800 text-center col-span-2 sm:col-span-1">
                    <span className="text-slate-400 block text-4xs">SLR(1) Status</span>
                    <span className={`font-bold text-xs ${slrBuildResult.table.isSLR ? 'text-emerald-400' : 'text-red-400'}`}>
                      {slrBuildResult.table.isSLR ? 'Strict SLR(1)' : 'Conflicts'}
                    </span>
                  </div>
                </div>

                {/* SLR ACTION & GOTO Table Grid */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-3xs text-slate-400">
                    <span>Interactive SLR(1) ACTION and GOTO Table (Click any cell to inspect mathematical rationale):</span>
                    {selectedSLRCell && (
                      <button
                        onClick={() => setSelectedSLRCell(null)}
                        className="text-rose-400 hover:text-rose-300 underline font-semibold"
                      >
                        Clear selection
                      </button>
                    )}
                  </div>

                  <div className="overflow-x-auto border border-slate-800 rounded bg-slate-950/60 max-h-80">
                    <table className="w-full text-left border-collapse text-3xs font-mono">
                      <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 sticky top-0 z-20">
                        <tr>
                          <th rowSpan={2} className="p-2 border-r border-slate-800 text-center font-bold text-slate-300 bg-slate-900">
                            State
                          </th>
                          <th
                            colSpan={slrBuildResult.table.terminals.length}
                            className="p-1.5 border-r border-slate-800 text-center font-bold text-emerald-400 bg-emerald-950/30 border-b"
                          >
                            ACTION Table (Terminals ∪ {'{$}'})
                          </th>
                          <th
                            colSpan={slrBuildResult.table.variables.length}
                            className="p-1.5 text-center font-bold text-cyan-400 bg-cyan-950/30 border-b"
                          >
                            GOTO Table (Nonterminals)
                          </th>
                        </tr>
                        <tr>
                          {slrBuildResult.table.terminals.map((t) => (
                            <th
                              key={t}
                              className={`p-1.5 border-r border-slate-800 font-bold text-center ${
                                t === '$' ? 'text-amber-400 bg-amber-950/20' : 'text-emerald-400'
                              }`}
                            >
                              {t}
                            </th>
                          ))}
                          {slrBuildResult.table.variables.map((v) => (
                            <th key={v} className="p-1.5 border-r border-slate-800 font-bold text-center text-cyan-400">
                              {v}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {slrBuildResult.table.states.map((stId) => (
                          <tr key={stId} className="hover:bg-slate-900/40 transition-colors">
                            <td className="p-2 font-bold text-slate-200 border-r border-slate-800 text-center bg-slate-900/50">
                              I{stId}
                            </td>
                            {/* ACTION Cells */}
                            {slrBuildResult.table.terminals.map((t) => {
                              const actions = slrBuildResult.table.actionGrid[stId]?.[t] || [];
                              const hasConflict = actions.length > 1;
                              const isSelected =
                                selectedSLRCell?.stateId === stId &&
                                selectedSLRCell?.symbol === t &&
                                !selectedSLRCell?.isGoto;

                              return (
                                <td
                                  key={t}
                                  onClick={() => setSelectedSLRCell({ stateId: stId, symbol: t, isGoto: false })}
                                  className={`p-2 text-center border-r border-slate-800 cursor-pointer transition-all ${
                                    isSelected
                                      ? 'ring-2 ring-rose-400 bg-rose-950/80 z-10 font-bold'
                                      : hasConflict
                                      ? 'bg-red-950/80 text-red-300 font-bold hover:bg-red-900/90'
                                      : actions.length > 0
                                      ? actions[0].type === 'SHIFT'
                                        ? 'text-emerald-300 font-semibold hover:bg-emerald-950/40'
                                        : actions[0].type === 'ACCEPT'
                                        ? 'text-purple-300 font-bold bg-purple-950/20 hover:bg-purple-950/50'
                                        : 'text-amber-300 font-semibold hover:bg-amber-950/40'
                                      : 'text-slate-700 hover:bg-slate-900/60'
                                  }`}
                                >
                                  {hasConflict ? (
                                    <span className="flex items-center justify-center gap-1 text-red-300">
                                      <AlertTriangle className="w-2.5 h-2.5" />
                                      {actions.map((a) => a.notation.split(' ')[0]).join('/')}
                                    </span>
                                  ) : actions.length > 0 ? (
                                    actions[0].notation.split(' ')[0]
                                  ) : (
                                    '—'
                                  )}
                                </td>
                              );
                            })}
                            {/* GOTO Cells */}
                            {slrBuildResult.table.variables.map((v) => {
                              const target = slrBuildResult.table.gotoGrid[stId]?.[v];
                              const isSelected =
                                selectedSLRCell?.stateId === stId &&
                                selectedSLRCell?.symbol === v &&
                                selectedSLRCell?.isGoto;

                              return (
                                <td
                                  key={v}
                                  onClick={() => setSelectedSLRCell({ stateId: stId, symbol: v, isGoto: true })}
                                  className={`p-2 text-center border-r border-slate-800 cursor-pointer transition-all ${
                                    isSelected
                                      ? 'ring-2 ring-cyan-400 bg-cyan-950/80 z-10 font-bold text-cyan-200'
                                      : target !== null
                                      ? 'text-cyan-300 font-bold hover:bg-cyan-950/40'
                                      : 'text-slate-700 hover:bg-slate-900/60'
                                  }`}
                                >
                                  {target !== null ? target : '—'}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Selected Cell Inspector Card */}
                {selectedSLRCell && (() => {
                  const stId = selectedSLRCell.stateId;
                  const sym = selectedSLRCell.symbol;
                  const isGoto = selectedSLRCell.isGoto;

                  if (isGoto) {
                    const target = slrBuildResult.table.gotoGrid[stId]?.[sym];
                    return (
                      <div className="bg-slate-950/90 p-3.5 rounded border border-cyan-700/60 space-y-2 shadow-lg animate-fadeIn">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-cyan-300">
                            GOTO Table Inspector: GOTO[I{stId}, &apos;{sym}&apos;]
                          </span>
                          <button
                            onClick={() => setSelectedSLRCell(null)}
                            className="text-slate-400 hover:text-slate-200 text-xs px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800"
                          >
                            ✕ Close
                          </button>
                        </div>
                        {target !== null ? (
                          <p className="text-3xs text-slate-300">
                            When nonterminal <span className="font-bold text-cyan-300">&apos;{sym}&apos;</span> is reduced while state <span className="font-mono text-slate-300">I{stId}</span> is at the top of the state stack, the parser transitions to state <span className="font-bold text-cyan-300">I{target}</span>.
                          </p>
                        ) : (
                          <p className="text-3xs text-slate-500 italic">No GOTO transition defined for variable &apos;{sym}&apos; from state I{stId}.</p>
                        )}
                      </div>
                    );
                  }

                  const actions = slrBuildResult.table.actionGrid[stId]?.[sym] || [];
                  const conflict = slrBuildResult.table.conflicts.find((c) => c.stateId === stId && c.symbol === sym);

                  return (
                    <div className="bg-slate-950/90 p-3.5 rounded border border-rose-700/60 space-y-3 shadow-lg animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-rose-300">
                            ACTION Table Inspector: ACTION[I{stId}, &apos;{sym}&apos;]
                          </span>
                          {conflict ? (
                            <span className="bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded text-3xs font-semibold">
                              CONFLICT: {conflict.conflictType}
                            </span>
                          ) : actions.length > 0 ? (
                            <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-3xs font-semibold">
                              DETERMINISTIC ACTION
                            </span>
                          ) : (
                            <span className="bg-slate-900 text-slate-400 border border-slate-800 px-2 py-0.5 rounded text-3xs font-semibold">
                              SYNTAX ERROR (NO ENTRY)
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => setSelectedSLRCell(null)}
                          className="text-slate-400 hover:text-slate-200 text-xs px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800"
                        >
                          ✕ Close
                        </button>
                      </div>

                      {actions.length === 0 ? (
                        <p className="text-3xs text-slate-400">
                          No action defined for state <span className="font-mono text-slate-300">I{stId}</span> on lookahead <span className="font-mono text-amber-300">&apos;{sym}&apos;</span>. Encountering this combination results in an immediate syntax error.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {actions.map((act, i) => (
                            <div
                              key={i}
                              className={`p-2.5 rounded border text-3xs font-mono space-y-1 ${
                                conflict
                                  ? 'bg-red-950/30 border-red-900/50 text-red-200'
                                  : 'bg-slate-900/80 border-slate-800 text-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between font-bold">
                                <span className={act.type === 'SHIFT' ? 'text-emerald-300' : act.type === 'ACCEPT' ? 'text-purple-300' : 'text-amber-300'}>
                                  Action: {act.notation}
                                </span>
                                <span className="text-4xs text-slate-400 font-sans">
                                  {act.type === 'SHIFT' ? 'Terminal Shift' : act.type === 'ACCEPT' ? 'End of Stream' : 'SLR Reduction'}
                                </span>
                              </div>
                              <div className="text-4xs text-slate-300 font-sans">
                                {act.type === 'SHIFT' && (
                                  <p>Shift lookahead token &apos;{sym}&apos; onto stack and advance to state I{act.targetStateId}.</p>
                                )}
                                {act.type === 'ACCEPT' && (
                                  <p>Augmented start production completed on end-marker. Parsing accepts successfully.</p>
                                )}
                                {act.type === 'REDUCE' && (
                                  <p>
                                    Reduce RHS to nonterminal <span className="font-bold text-amber-300">&apos;{act.production?.lhs}&apos;</span> because lookahead &apos;{sym}&apos; is in <span className="font-mono text-cyan-300">FOLLOW({act.production?.lhs})</span> = {'{'}{slrBuildResult.table.followSets[act.production?.lhs || '']?.join(', ')}{'}'}.
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Step Runner Toolbar */}
                {slrParseResult.steps.length > 0 && (() => {
                  const maxStep = slrParseResult.steps.length - 1;
                  const curStep = slrParseResult.steps[Math.min(slrStepIdx, maxStep)];

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2 bg-slate-950/80 p-2.5 rounded border border-slate-800">
                        {/* Step Navigation Controls */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setSlrStepIdx(0);
                              setSlrIsPlaying(false);
                            }}
                            title="Reset to initial state"
                            className="bg-slate-900 hover:bg-slate-800 text-slate-300 p-1.5 rounded border border-slate-700 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setSlrStepIdx((prev) => Math.max(0, prev - 1));
                              setSlrIsPlaying(false);
                            }}
                            disabled={slrStepIdx <= 0}
                            title="Previous step"
                            className="bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 text-slate-300 p-1.5 rounded border border-slate-700 transition-colors"
                          >
                            <SkipBack className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setSlrIsPlaying((prev) => !prev)}
                            title={slrIsPlaying ? 'Pause execution' : 'Play execution'}
                            className="bg-rose-600 hover:bg-rose-500 text-white px-2.5 py-1 rounded font-bold text-3xs flex items-center gap-1 transition-colors shadow"
                          >
                            {slrIsPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                            <span>{slrIsPlaying ? 'PAUSE' : 'PLAY'}</span>
                          </button>
                          <button
                            onClick={() => {
                              setSlrStepIdx((prev) => Math.min(maxStep, prev + 1));
                              setSlrIsPlaying(false);
                            }}
                            disabled={slrStepIdx >= maxStep}
                            title="Next step"
                            className="bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 text-slate-300 p-1.5 rounded border border-slate-700 transition-colors"
                          >
                            <SkipForward className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setSlrStepIdx(maxStep);
                              setSlrIsPlaying(false);
                            }}
                            title="Run to end"
                            className="bg-slate-900 hover:bg-slate-800 text-slate-300 p-1.5 rounded border border-slate-700 transition-colors"
                          >
                            <FastForward className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Step Position Indicator */}
                        <div className="flex items-center gap-2 text-3xs">
                          <span className="font-bold text-rose-300">
                            Step {slrStepIdx + 1} of {slrParseResult.steps.length}
                          </span>
                          <span className="text-slate-500">|</span>
                          <span className="text-slate-400">Speed:</span>
                          <select
                            value={slrPlaySpeed}
                            onChange={(e) => setSlrPlaySpeed(Number(e.target.value))}
                            className="bg-slate-900 border border-slate-700 text-slate-300 rounded px-1.5 py-0.5 text-4xs font-semibold focus:outline-none"
                          >
                            <option value={1600}>0.5x (Slow)</option>
                            <option value={800}>1x (Normal)</option>
                            <option value={400}>2x (Fast)</option>
                          </select>
                        </div>
                      </div>

                      {/* Active Step Spotlight Card */}
                      {curStep && (
                        <div className="bg-slate-950/90 p-3.5 rounded border border-rose-700/60 space-y-3 shadow-md">
                          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                            <span className="font-bold text-xs text-rose-300 flex items-center gap-1.5">
                              <Zap className="w-3.5 h-3.5 text-rose-400" />
                              Active Step {curStep.stepIndex + 1}: {curStep.actionDescription}
                            </span>
                            <span className="font-mono text-4xs text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                              Bottom-Up LR Decision
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Parser Stacks View */}
                            <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 space-y-2">
                              <div>
                                <span className="text-4xs font-bold text-slate-400 uppercase tracking-wider block">
                                  State Stack:
                                </span>
                                <div className="flex items-center gap-1.5 flex-wrap font-mono text-3xs mt-1">
                                  {curStep.stateStack.map((stVal, idx) => {
                                    const isTop = idx === curStep.stateStack.length - 1;
                                    return (
                                      <span
                                        key={idx}
                                        className={`px-2 py-0.5 rounded font-bold transition-all ${
                                          isTop
                                            ? 'bg-rose-600 text-white shadow ring-2 ring-rose-400/50 scale-105'
                                            : 'bg-slate-800 text-slate-200 border border-slate-700'
                                        }`}
                                      >
                                        I{stVal}
                                        {isTop && <span className="ml-1 text-4xs opacity-80">(TOP)</span>}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>

                              <div>
                                <span className="text-4xs font-bold text-slate-400 uppercase tracking-wider block">
                                  Symbol Stack:
                                </span>
                                <div className="flex items-center gap-1.5 flex-wrap font-mono text-3xs mt-1">
                                  {curStep.symbolStack.map((symVal, idx) => (
                                    <span
                                      key={idx}
                                      className={`px-2 py-0.5 rounded font-bold ${
                                        symVal === '$'
                                          ? 'bg-amber-950/70 text-amber-300 border border-amber-800'
                                          : 'bg-slate-800 text-slate-200 border border-slate-700'
                                      }`}
                                    >
                                      {symVal}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Lookahead & Remaining Input */}
                            <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 space-y-2">
                              <span className="text-4xs font-bold text-slate-400 uppercase tracking-wider block">
                                Lookahead & Remaining Tokens
                              </span>
                              <div className="flex items-center gap-2 font-mono text-3xs">
                                <span className="bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded font-bold">
                                  Lookahead: &apos;{curStep.lookahead}&apos;
                                </span>
                                <span className="text-slate-400">Remaining:</span>
                                <span className="text-slate-300 font-semibold">
                                  [ {curStep.remainingInput.join(' ')} ]
                                </span>
                              </div>
                              {curStep.gotoState !== undefined && (
                                <div className="pt-2 border-t border-slate-800/80 text-3xs">
                                  <span className="text-slate-400">GOTO Transition: </span>
                                  <span className="font-bold text-cyan-300 font-mono">
                                    GOTO[I{curStep.stateStackAfter[curStep.stateStackAfter.length - 2]}, {curStep.reducedProduction?.lhs}] = I{curStep.gotoState}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Explanation */}
                          <div className="text-3xs text-slate-300 bg-slate-900/40 p-2 rounded border border-slate-800/60 leading-relaxed">
                            <span className="font-bold text-rose-400">Execution Rationale: </span>
                            {curStep.mathematicalExplanation}
                          </div>
                        </div>
                      )}

                      {/* Interactive Execution Trace Table */}
                      <div className="bg-slate-950/80 p-3 rounded border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-rose-300">
                            Shift-Reduce Step-by-Step Execution Trace
                          </span>
                          <span className="text-4xs text-slate-400">
                            Click any row to jump to that step
                          </span>
                        </div>
                        <div className="overflow-x-auto border border-slate-800 rounded max-h-64">
                          <table className="w-full text-left border-collapse text-3xs font-mono">
                            <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 sticky top-0">
                              <tr>
                                <th className="p-1.5 text-center">Step</th>
                                <th className="p-1.5">State Stack</th>
                                <th className="p-1.5">Symbol Stack</th>
                                <th className="p-1.5 text-center">Lookahead</th>
                                <th className="p-1.5">Action / Applied Decision</th>
                                <th className="p-1.5">Remaining Input</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                              {slrParseResult.steps.map((st) => {
                                const isActive = st.stepIndex === curStep?.stepIndex;
                                return (
                                  <tr
                                    key={st.stepIndex}
                                    onClick={() => {
                                      setSlrStepIdx(st.stepIndex);
                                      setSlrIsPlaying(false);
                                    }}
                                    className={`cursor-pointer transition-colors ${
                                      isActive
                                        ? 'bg-rose-950/80 text-rose-200 font-bold border-l-4 border-rose-400'
                                        : 'hover:bg-slate-900/50 text-slate-300'
                                    }`}
                                  >
                                    <td className="p-1.5 text-center text-slate-500">{st.stepIndex + 1}</td>
                                    <td className="p-1.5 text-rose-300 font-bold">[ {st.stateStack.map((s) => `I${s}`).join(', ')} ]</td>
                                    <td className="p-1.5 text-slate-300 font-bold">[ {st.symbolStack.join(', ')} ]</td>
                                    <td className="p-1.5 text-center text-amber-400 font-bold">{st.lookahead}</td>
                                    <td className="p-1.5 text-emerald-400 font-semibold">{st.actionDescription}</td>
                                    <td className="p-1.5 text-slate-400">[ {st.remainingInput.join(' ')} ]</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Reconstructed Visual Parse Tree */}
                {slrParseResult.parseTree && (
                  <div className="bg-slate-950/80 p-3.5 rounded border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-rose-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Reconstructed SLR Parse Tree (Built from REDUCE actions)
                      </span>
                      <span className="text-3xs text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 font-semibold">
                        yield(tree) ≡ &quot;{testInput}&quot;
                      </span>
                    </div>

                    <div className="overflow-x-auto p-4 bg-slate-900/40 rounded border border-slate-800/80 flex justify-center max-h-96">
                      <RenderParseTreeNode node={slrParseResult.parseTree} isRoot />
                    </div>
                  </div>
                )}

                {/* Educational Theory Guide Accordion */}
                <div className="border border-rose-900/40 rounded bg-slate-950/60 overflow-hidden">
                  <button
                    onClick={() => setShowSLRTheory((prev) => !prev)}
                    className="w-full px-3.5 py-2 text-left font-bold text-3xs text-rose-300 flex items-center justify-between bg-rose-950/20 hover:bg-rose-950/40 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-rose-400" />
                      Topic 3 Educational Guide: Simple LR (SLR) Parsing Principles
                    </span>
                    <span>{showSLRTheory ? '▲ Collapse Guide' : '▼ Expand Guide'}</span>
                  </button>

                  {showSLRTheory && (
                    <div className="p-3.5 space-y-3 text-3xs text-slate-300 leading-relaxed border-t border-rose-900/30">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 space-y-1">
                          <span className="font-bold text-amber-400 block">1. What is an LR(0) Item?</span>
                          <p className="text-slate-400">
                            An item <span className="font-mono">A → α · β</span> tracks how much of a production RHS has already been matched on the stack (α) and what is expected next (β).
                          </p>
                        </div>
                        <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 space-y-1">
                          <span className="font-bold text-emerald-400 block">2. Why Use FOLLOW for Reductions?</span>
                          <p className="text-slate-400">
                            In basic LR(0), any completed item triggers a reduction on all lookaheads. In <strong>SLR(1)</strong>, reductions are restricted strictly to <span className="font-mono">FOLLOW(A)</span>, eliminating many spurious conflicts.
                          </p>
                        </div>
                        <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 space-y-1">
                          <span className="font-bold text-cyan-400 block">3. Dual Stacks & GOTO</span>
                          <p className="text-slate-400">
                            SLR maintains a state stack and a symbol stack. After popping |β| symbols on reduction <span className="font-mono">A → β</span>, the parser consults <span className="font-mono">GOTO[topState, A]</span> to determine the next state.
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800 space-y-1">
                        <span className="font-bold text-rose-300">Comparing LL(1) and SLR(1)</span>
                        <p className="text-slate-400">
                          <strong>LL(1)</strong> builds a leftmost derivation from top to bottom and cannot handle left-recursion without grammar transformation. <strong>SLR(1)</strong> constructs a rightmost derivation in reverse from bottom to top, handling left-recursive grammars naturally without restructuring.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* LL(1) Grammar Transformation View */}
          {activeSubView === 'TRANSFORM' && (
            <div className="space-y-4">
              <div className="bg-fuchsia-950/30 p-3.5 rounded border border-fuchsia-800/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-fuchsia-300 text-xs">Grammar Transformation Engine</h3>
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-900 text-slate-300 border border-slate-700 px-2 py-0.5 rounded text-3xs font-semibold">
                      Preservation: {transformResult.languagePreservationStatus}
                    </span>
                    {transformResult.afterLL1Analysis.isLL1 ? (
                      <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-3xs font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> TRANSFORMED TO LL(1)
                      </span>
                    ) : (
                      <span className="bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded text-3xs font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {transformResult.afterLL1Analysis.conflicts.length} CONFLICT(S) REMAIN
                      </span>
                    )}
                  </div>
                </div>

                {/* Before vs After Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-slate-950/80 p-3 rounded border border-slate-800 space-y-1">
                    <span className="font-bold text-2xs text-red-400">Original Grammar G</span>
                    <p className="text-3xs text-slate-400">Productions: {transformResult.originalGrammar.productions.length}</p>
                    <p className="text-3xs text-slate-400">LL(1) Status: {transformResult.beforeLL1Analysis.isLL1 ? 'LL(1)' : 'NOT LL(1)'} ({transformResult.beforeLL1Analysis.conflicts.length} conflict(s))</p>
                  </div>
                  <div className="bg-slate-950/80 p-3 rounded border border-slate-800 space-y-1">
                    <span className="font-bold text-2xs text-emerald-400">Transformed Grammar G&apos;</span>
                    <p className="text-3xs text-slate-400">Productions: {transformResult.transformedGrammar.productions.length} ({transformResult.generatedSymbolNames.length} new variable(s))</p>
                    <p className="text-3xs text-slate-400">LL(1) Status: {transformResult.afterLL1Analysis.isLL1 ? 'LL(1)' : 'NOT LL(1)'} ({transformResult.afterLL1Analysis.conflicts.length} conflict(s))</p>
                  </div>
                </div>

                {/* Commit Action Button */}
                {transformResult.changed && (
                  <div className="flex items-center justify-between bg-fuchsia-950/40 p-2.5 rounded border border-fuchsia-800/60">
                    <span className="text-3xs text-fuchsia-200">
                      Previewing transformed LL(1) grammar. Click to set as active Workbench grammar.
                    </span>
                    <button
                      onClick={() => setCustomGrammar(transformResult.transformedGrammar)}
                      className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-3 py-1 rounded text-xs font-bold transition-colors shadow"
                    >
                      Commit Transformed Grammar
                    </button>
                  </div>
                )}

                {/* Interactive Step-by-Step Derivation Inspector */}
                {transformResult.steps.length > 0 && (
                  <div className="bg-slate-950/80 p-3 rounded border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-fuchsia-300">
                        Transformation Step {activeStepIdx + 1} of {transformResult.steps.length}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActiveStepIdx((prev) => Math.max(0, prev - 1))}
                          disabled={activeStepIdx === 0}
                          className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 px-2 py-0.5 rounded text-3xs font-semibold"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setActiveStepIdx((prev) => Math.min(transformResult.steps.length - 1, prev + 1))}
                          disabled={activeStepIdx === transformResult.steps.length - 1}
                          className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 px-2 py-0.5 rounded text-3xs font-semibold"
                        >
                          Next
                        </button>
                      </div>
                    </div>

                    {/* Step Detail */}
                    {(() => {
                      const st = transformResult.steps[Math.min(activeStepIdx, transformResult.steps.length - 1)];
                      if (!st) return null;
                      return (
                        <div className="bg-slate-900 p-3 rounded border border-slate-800 space-y-2 text-3xs font-mono">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-fuchsia-400 text-2xs">{st.title}</span>
                            <span className="bg-fuchsia-950 text-fuchsia-300 border border-fuchsia-800 px-1.5 py-0.5 rounded text-3xs">
                              {st.type}
                            </span>
                          </div>
                          <p className="text-slate-300 font-sans">{st.description}</p>
                          <div className="bg-slate-950 p-2 rounded text-amber-300 font-bold">
                            {st.mathematicalNotation}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SubView 11: TRANSLATE */}
          {activeSubView === 'TRANSLATE' && (
            <div className="space-y-4">
              <div className="bg-slate-900/90 p-4 rounded-lg border border-orange-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-orange-400">PDA ↔ CFG Translation Engine</span>
                    <span className="bg-orange-950 text-orange-300 text-3xs px-2 py-0.5 rounded border border-orange-800 font-semibold">
                      Bidirectional
                    </span>
                  </div>
                  {(() => {
                    const res = convertCFGToPDA(grammar);
                    return (
                      <span
                        className={`text-3xs font-bold px-2 py-0.5 rounded ${
                          res.preservation.status === 'VERIFIED_BOUNDED'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {res.preservation.status}
                      </span>
                    );
                  })()}
                </div>

                {(() => {
                  const res = convertCFGToPDA(grammar);
                  return (
                    <div className="space-y-3 text-3xs font-mono">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-slate-950/80 p-3 rounded border border-slate-800 space-y-1">
                          <span className="font-bold text-2xs text-orange-400">Source CFG G</span>
                          <p className="text-3xs text-slate-400">Variables: {res.sourceCFG.variables.join(', ')}</p>
                          <p className="text-3xs text-slate-400">Productions: {res.sourceCFG.productions.length}</p>
                        </div>
                        <div className="bg-slate-950/80 p-3 rounded border border-slate-800 space-y-1">
                          <span className="font-bold text-2xs text-amber-400">Target Top-Down PDA M</span>
                          <p className="text-3xs text-slate-400">States: {res.targetPDAGraph.nodes.length} (q0, q1, q2)</p>
                          <p className="text-3xs text-slate-400">Transitions: {res.targetPDAGraph.edges.length}</p>
                        </div>
                      </div>

                      {/* Bounded Preservation Result */}
                      <div className="bg-slate-950/80 p-2.5 rounded border border-slate-800 space-y-1">
                        <span className="font-bold text-2xs text-slate-300">Bounded Preservation Status</span>
                        <p className="text-slate-400 font-sans">{res.preservation.explanation}</p>
                      </div>

                      {/* Step Timeline */}
                      <div className="bg-slate-950/80 p-3 rounded border border-slate-800 space-y-2">
                        <span className="font-bold text-xs text-orange-300">Translation Steps ({res.steps.length})</span>
                        <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                          {res.steps.map((st, idx) => (
                            <div key={idx} className="bg-slate-900 p-2 rounded border border-slate-800 space-y-1 text-3xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-orange-400">{st.title}</span>
                                <span className="text-slate-500 font-sans">{st.type}</span>
                              </div>
                              <p className="text-slate-400 font-sans">{st.description}</p>
                              <div className="text-amber-300 font-bold">{st.mathematicalNotation}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* SubView 12: SYNTACTIC_PDA (Module 4 Topic 6) */}
          {activeSubView === 'SYNTACTIC_PDA' && (
            <div className="space-y-4">
              {/* Header & Status Banner */}
              <div className="bg-slate-900/95 p-4 rounded-lg border border-emerald-800/40 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-400">
                      Module 4 Topic 6 — Syntactic Statement Interpretation using PDA
                    </span>
                    <span className="bg-emerald-950 text-emerald-300 text-3xs px-2 py-0.5 rounded border border-emerald-800 font-semibold">
                      Top-Down Interpreter
                    </span>
                    {syntacticResult.isAccepted ? (
                      <span className="bg-emerald-900/80 text-emerald-200 text-3xs px-2 py-0.5 rounded border border-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> ACCEPT (Syntactically Valid)
                      </span>
                    ) : syntacticResult.status === 'SEARCH_LIMIT_REACHED' ? (
                      <span className="bg-amber-900/80 text-amber-200 text-3xs px-2 py-0.5 rounded border border-amber-700 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-400" /> SEARCH_LIMIT_REACHED
                      </span>
                    ) : (
                      <span className="bg-rose-900/80 text-rose-200 text-3xs px-2 py-0.5 rounded border border-rose-700 font-bold flex items-center gap-1">
                        <XCircle className="w-3 h-3 text-rose-400" /> REJECT (Syntax Error)
                      </span>
                    )}
                    {syntacticResult.isAmbiguousDerivation && (
                      <span className="bg-purple-950 text-purple-300 text-3xs px-2 py-0.5 rounded border border-purple-800 font-semibold">
                        Ambiguous Grammar
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowSyntacticTheory((prev) => !prev)}
                      className="px-2.5 py-1 rounded text-2xs font-semibold bg-bg-surface2 hover:bg-bg-surface3 text-txt-secondary hover:text-txt-primary border border-border-subtle flex items-center gap-1 transition-colors"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                      {showSyntacticTheory ? 'Hide Guide' : 'Topic 6 Theory Guide'}
                    </button>

                    <button
                      onClick={() => {
                        if (syntacticResult?.targetPDAGraph) {
                          replaceMachine(
                            [...syntacticResult.targetPDAGraph.nodes],
                            [...syntacticResult.targetPDAGraph.edges],
                            'PDA'
                          );
                          setPdaLoadSuccess('Syntactic Interpreter PDA successfully loaded into Workspace Canvas!');
                          setTimeout(() => setPdaLoadSuccess(null), 4000);
                        }
                      }}
                      className="px-2.5 py-1 rounded bg-teal-600 hover:bg-teal-500 text-white font-semibold text-2xs flex items-center gap-1.5 transition-colors shadow-sm"
                      title="Loads the 3-state Top-Down Pushdown Automaton into the main canvas"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      Load Interpreter PDA into Workspace Canvas
                    </button>
                  </div>
                </div>

                {pdaLoadSuccess && (
                  <div className="bg-teal-950/90 text-teal-200 border border-teal-700 p-2 rounded text-2xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                      <span>{pdaLoadSuccess}</span>
                    </div>
                    <button onClick={() => setPdaLoadSuccess(null)} className="text-teal-400 hover:text-teal-200 text-xs">×</button>
                  </div>
                )}

                {/* Educational Theory Guide (Collapsible) */}
                {showSyntacticTheory && (
                  <div className="bg-slate-950/90 p-3.5 rounded border border-emerald-900/60 space-y-2 text-2xs">
                    <div className="font-bold text-emerald-300 text-xs flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-emerald-400" /> Topic 6 Foundations: Pushdown Automata as Syntax Interpreters
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-3xs font-sans">
                      <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800 space-y-1">
                        <strong className="text-emerald-400 font-bold block">1. Top-Down PDA Construction</strong>
                        <p className="text-slate-300">
                          For grammar G = (V, Σ, P, S), M = (&#123;q0, q1, q2&#125;, Σ, V ∪ Σ ∪ &#123;Z0&#125;, δ, q0, Z0, &#123;q2&#125;).
                          q0 pushes S above Z0 via ε, Z0 / S Z0 entering loop state q1.
                        </p>
                      </div>
                      <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800 space-y-1">
                        <strong className="text-cyan-400 font-bold block">2. Stack as Pending Syntactic Expectations</strong>
                        <p className="text-slate-300">
                          The stack memory stores the unfulfilled remainder of the leftmost derivation. At every step,
                          S ⇒* w α, where w is consumed input and α is the stack contents from top to bottom.
                        </p>
                      </div>
                      <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800 space-y-1">
                        <strong className="text-purple-400 font-bold block">3. Variable Expansion vs Terminal Match</strong>
                        <p className="text-slate-300">
                          Non-terminal A at stack top: expanded via production A → γ (ε, A / γ).
                          Terminal a at stack top: matched and consumed from statement (a, a / ε).
                        </p>
                      </div>
                      <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800 space-y-1">
                        <strong className="text-amber-400 font-bold block">4. Acceptance & Ambiguity</strong>
                        <p className="text-slate-300">
                          Input is syntactically valid iff all input tokens are consumed, stack clears to Z0, and M enters q2.
                          Ambiguity yields multiple valid branching paths; existential acceptance requires ≥1 valid path.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Input & Quick Presets */}
                <div className="bg-slate-950/80 p-3 rounded border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-bold text-2xs text-slate-300">Syntactic Statement Input:</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-3xs text-slate-500">Quick Presets:</span>
                      {defaultBatchCandidates.slice(0, 6).map((cand, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSyntacticInput(cand === 'ε' ? '' : cand)}
                          className="px-2 py-0.5 rounded text-3xs font-mono bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 hover:border-emerald-600 transition-colors"
                        >
                          {cand === '' || cand === 'ε' ? 'ε (empty)' : cand}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={syntacticInput}
                      onChange={(e) => setSyntacticInput(e.target.value)}
                      placeholder="Enter statement to interpret (e.g. aabb, id + id)..."
                      className="flex-1 bg-slate-900 border border-slate-700 text-slate-100 px-3 py-1.5 rounded text-xs font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={() => {
                        setSyntacticStepIdx(0);
                        setSyntacticIsPlaying(false);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Run Interpretation
                    </button>
                  </div>

                  {/* Tokenized Preview */}
                  <div className="flex items-center gap-2 pt-1 text-3xs font-mono">
                    <span className="text-slate-500">Tokenized Symbols ({syntacticResult.tokens.length}):</span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {syntacticResult.tokens.length === 0 ? (
                        <span className="text-slate-400 italic">ε (empty string)</span>
                      ) : (
                        syntacticResult.tokens.map((tok, idx) => (
                          <span
                            key={idx}
                            className={`px-1.5 py-0.5 rounded font-bold border ${
                              idx < (syntacticResult.steps[syntacticStepIdx]?.inputIndex ?? 0)
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                                : idx === (syntacticResult.steps[syntacticStepIdx]?.inputIndex ?? 0)
                                ? 'bg-cyan-950 text-cyan-200 border-cyan-500 ring-1 ring-cyan-400'
                                : 'bg-slate-900 text-slate-400 border-slate-700'
                            }`}
                          >
                            {tok}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Stepper Toolbar */}
                {syntacticResult.steps.length > 0 && (
                  <div className="flex items-center justify-between flex-wrap gap-2 bg-slate-950 p-2.5 rounded border border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setSyntacticIsPlaying(false);
                          setSyntacticStepIdx(0);
                        }}
                        disabled={syntacticStepIdx === 0}
                        className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 border border-slate-700"
                        title="Start"
                      >
                        <SkipBack className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setSyntacticIsPlaying(false);
                          setSyntacticStepIdx((prev) => Math.max(0, prev - 1));
                        }}
                        disabled={syntacticStepIdx === 0}
                        className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 border border-slate-700"
                        title="Previous Step"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setSyntacticIsPlaying((prev) => !prev)}
                        className={`px-3 py-1 rounded text-2xs font-semibold flex items-center gap-1.5 transition-colors ${
                          syntacticIsPlaying
                            ? 'bg-amber-600 hover:bg-amber-500 text-white'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                      >
                        {syntacticIsPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        {syntacticIsPlaying ? 'Pause' : 'Play'}
                      </button>
                      <button
                        onClick={() => {
                          setSyntacticIsPlaying(false);
                          setSyntacticStepIdx((prev) => Math.min(syntacticResult.steps.length - 1, prev + 1));
                        }}
                        disabled={syntacticStepIdx >= syntacticResult.steps.length - 1}
                        className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 border border-slate-700"
                        title="Next Step"
                      >
                        <SkipForward className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setSyntacticIsPlaying(false);
                          setSyntacticStepIdx(syntacticResult.steps.length - 1);
                        }}
                        disabled={syntacticStepIdx >= syntacticResult.steps.length - 1}
                        className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 border border-slate-700"
                        title="End"
                      >
                        <FastForward className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-2xs font-mono text-slate-400">
                        Step <span className="text-emerald-400 font-bold">{syntacticStepIdx + 1}</span> of{' '}
                        <span className="text-slate-200 font-bold">{syntacticResult.steps.length}</span>
                      </span>

                      <div className="flex items-center gap-1.5 text-3xs font-mono">
                        <span className="text-slate-500">Speed:</span>
                        {[
                          { label: 'Fast', speed: 350 },
                          { label: 'Normal', speed: 700 },
                          { label: 'Slow', speed: 1200 },
                        ].map((sp) => (
                          <button
                            key={sp.speed}
                            onClick={() => setSyntacticPlaySpeed(sp.speed)}
                            className={`px-1.5 py-0.5 rounded ${
                              syntacticPlaySpeed === sp.speed
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold'
                                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {sp.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step Details & Visualizer Grid */}
                {(() => {
                  const st = syntacticResult.steps[syntacticStepIdx];
                  if (!st) return null;

                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                      {/* Left 2 Cols: Step Inspector & Grammar Context */}
                      <div className="lg:col-span-2 space-y-3">
                        {/* Step Action Banner */}
                        <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-2 text-2xs">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-200 text-xs">
                                Step #{st.stepIndex + 1}:
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-3xs font-bold border ${
                                  st.actionType === 'INIT'
                                    ? 'bg-blue-950 text-blue-300 border-blue-800'
                                    : st.actionType === 'EXPAND_VARIABLE'
                                    ? 'bg-purple-950 text-purple-300 border-purple-800'
                                    : st.actionType === 'MATCH_TERMINAL'
                                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                    : st.actionType === 'ACCEPT'
                                    ? 'bg-teal-950 text-teal-300 border-teal-800'
                                    : 'bg-rose-950 text-rose-300 border-rose-800'
                                }`}
                              >
                                {st.actionType}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 font-mono text-3xs">
                              <span className="text-slate-400">Current State:</span>
                              <span className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300 font-bold border border-slate-700">
                                {st.currentState}
                              </span>
                              <span className="text-slate-400">Lookahead:</span>
                              <span className="bg-slate-900 px-1.5 py-0.5 rounded text-cyan-300 font-bold border border-slate-700">
                                {st.currentLookahead ?? 'ε'}
                              </span>
                            </div>
                          </div>

                          {/* Formal Instantaneous Description */}
                          <div className="bg-slate-900/90 p-2 rounded border border-slate-800 flex items-center justify-between font-mono text-3xs">
                            <span className="text-slate-400">Instantaneous Description (q, w, α):</span>
                            <span className="text-amber-300 font-bold">{st.instantaneousDescription}</span>
                          </div>

                          {/* Sentential Form Invariant */}
                          <div className="bg-slate-900/90 p-2 rounded border border-slate-800 space-y-1 font-mono text-3xs">
                            <div className="flex items-center justify-between text-slate-400">
                              <span>Sentential Form Invariant (S ⇒* w α):</span>
                              <span className="text-slate-500 font-sans">w = matched, α = stack</span>
                            </div>
                            <div className="text-slate-100 font-bold flex items-center gap-1.5">
                              <span className="text-emerald-400">{st.matchedPrefix}</span>
                              <span className="text-slate-500">·</span>
                              <span className="text-purple-400">
                                {st.stack.slice(1).reverse().join(' ') || 'ε'}
                              </span>
                            </div>
                          </div>

                          {/* Production or Terminal Context */}
                          {st.productionUsed && (
                            <div className="bg-purple-950/40 p-2.5 rounded border border-purple-800/60 space-y-1 text-2xs font-mono">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-purple-300">Grammar Production Applied:</span>
                                <span className="text-purple-400 text-3xs">({st.productionUsed.id})</span>
                              </div>
                              <div className="text-sm font-bold text-purple-200">
                                {st.productionUsed.lhs} →{' '}
                                {st.productionUsed.rhs.map((s) => (s.type === 'EPSILON' ? 'ε' : s.value)).join(' ')}
                              </div>
                            </div>
                          )}

                          {st.matchedTerminal && (
                            <div className="bg-emerald-950/40 p-2.5 rounded border border-emerald-800/60 space-y-1 text-2xs font-mono">
                              <span className="font-bold text-emerald-300">Terminal Matched with Input:</span>
                              <div className="text-sm font-bold text-emerald-200">
                                Token '{st.matchedTerminal}' consumed from input string and popped from stack.
                              </div>
                            </div>
                          )}

                          {/* Educational Explanation */}
                          <div className="bg-slate-900/70 p-2.5 rounded border border-slate-800 space-y-1">
                            <span className="font-bold text-slate-300 text-3xs font-sans">Why Did This Step Occur?</span>
                            <p className="text-slate-300 font-sans text-xs">{st.explanation}</p>
                            <div className="text-amber-300 font-mono text-3xs pt-1">{st.mathematicalNotation}</div>
                          </div>
                        </div>
                      </div>

                      {/* Right 1 Col: Stack Visualizer & Steps Timeline */}
                      <div className="space-y-3">
                        {/* Visual Pushdown Stack Column */}
                        <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 text-cyan-400" /> Pushdown Stack Memory
                            </span>
                            <span className="text-3xs font-mono text-slate-400">
                              {st.stack.length} symbols
                            </span>
                          </div>

                          <div className="bg-slate-900 p-2 rounded border border-slate-800 flex flex-col items-center gap-1 min-h-[160px] justify-start font-mono text-2xs">
                            <div className="text-3xs text-cyan-400 font-bold pb-1 flex items-center gap-1">
                              <span>▲</span> TOP OF STACK
                            </div>

                            {st.stack
                              .slice()
                              .reverse()
                              .map((sym, idx) => {
                                const isTop = idx === 0;
                                const isNonTerminal = grammar.variables.includes(sym);
                                const isTerminal = grammar.terminals.includes(sym);

                                return (
                                  <div
                                    key={idx}
                                    className={`w-full py-1 px-2.5 rounded text-center font-bold border transition-colors ${
                                      isTop
                                        ? 'border-cyan-400 ring-1 ring-cyan-500/40 shadow-sm'
                                        : 'border-slate-700'
                                    } ${
                                      isNonTerminal
                                        ? 'bg-purple-950 text-purple-200'
                                        : isTerminal
                                        ? 'bg-emerald-950 text-emerald-200'
                                        : 'bg-slate-800 text-slate-300'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-3xs text-slate-500 font-normal">
                                        {isTop ? 'TOP' : `#${st.stack.length - 1 - idx}`}
                                      </span>
                                      <span className="text-xs">{sym}</span>
                                      <span className="text-3xs font-sans text-slate-500">
                                        {isNonTerminal ? 'Non-Term' : isTerminal ? 'Term' : 'Z0'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>

                        {/* Step Timeline List */}
                        <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-2 text-3xs font-mono">
                          <span className="font-bold text-xs text-slate-300">
                            Interpretation Steps ({syntacticResult.steps.length})
                          </span>
                          <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                            {syntacticResult.steps.map((step, idx) => (
                              <div
                                key={idx}
                                onClick={() => {
                                  setSyntacticIsPlaying(false);
                                  setSyntacticStepIdx(idx);
                                }}
                                className={`p-1.5 rounded border cursor-pointer transition-colors flex items-center justify-between ${
                                  idx === syntacticStepIdx
                                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                                }`}
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold w-4">#{idx + 1}</span>
                                  <span className="font-semibold">{step.actionType}</span>
                                </div>
                                <span className="text-slate-500 font-sans">{step.currentState}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GrammarTab;

