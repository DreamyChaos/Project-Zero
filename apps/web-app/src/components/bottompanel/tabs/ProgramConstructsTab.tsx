import React, { useState, useMemo, useCallback } from 'react';
import { useGraph } from '../../../context/GraphContext';
import {
  PROGRAM_CONSTRUCT_PRESETS,
  ProgramConstructPreset,
  getProgramConstructById,
  parseRegex,
  convertRegexToNFA,
  evaluateConstructBatch,
} from '@project-zero/core-solver';
import {
  FileCode,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  Plus,
  Trash2,
  BookOpen,
  HelpCircle,
  Tag,
  Activity,
  Check,
  X as XIcon,
} from 'lucide-react';

interface CustomTestCase {
  id: string;
  input: string;
  expected?: boolean;
}

export const ProgramConstructsTab: React.FC = () => {
  const { replaceMachine, setLastRegexResult } = useGraph();

  // Selected Preset State
  const [selectedId, setSelectedId] = useState<string>('ident-simple');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  // Active construct data
  const activePreset = useMemo<ProgramConstructPreset>(() => {
    return getProgramConstructById(selectedId) || PROGRAM_CONSTRUCT_PRESETS[0];
  }, [selectedId]);

  // Editable Regex Input State (initialized to selected preset's regex)
  const [currentRegex, setCurrentRegex] = useState<string>(activePreset.regex);

  // Sync currentRegex when selected preset changes
  const handleSelectPreset = useCallback((preset: ProgramConstructPreset) => {
    setSelectedId(preset.id);
    setCurrentRegex(preset.regex);
    // Initialize test cases from preset
    const initialTests: CustomTestCase[] = [
      ...preset.sampleValid.map((s, idx) => ({ id: `v-${idx}-${s}`, input: s, expected: true })),
      ...preset.sampleInvalid.map((s, idx) => ({ id: `iv-${idx}-${s}`, input: s, expected: false })),
    ];
    setTestCases(initialTests);
    setManualInput('');
  }, []);

  // Live syntax validation of current Regex
  const validation = useMemo(() => {
    return parseRegex(currentRegex);
  }, [currentRegex]);

  // Test cases state
  const [testCases, setTestCases] = useState<CustomTestCase[]>(() => [
    ...PROGRAM_CONSTRUCT_PRESETS[0].sampleValid.map((s, idx) => ({ id: `v-${idx}-${s}`, input: s, expected: true })),
    ...PROGRAM_CONSTRUCT_PRESETS[0].sampleInvalid.map((s, idx) => ({ id: `iv-${idx}-${s}`, input: s, expected: false })),
  ]);

  const [manualInput, setManualInput] = useState<string>('');

  // Add custom test string
  const handleAddTestCase = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (manualInput.trim() === '') return;
    const newCase: CustomTestCase = {
      id: `custom-${Date.now()}-${manualInput}`,
      input: manualInput,
      expected: undefined,
    };
    setTestCases((prev) => [...prev, newCase]);
    setManualInput('');
  };

  const handleRemoveTestCase = (id: string) => {
    setTestCases((prev) => prev.filter((tc) => tc.id !== id));
  };

  const handleResetTestCases = () => {
    const initialTests: CustomTestCase[] = [
      ...activePreset.sampleValid.map((s, idx) => ({ id: `v-${idx}-${s}`, input: s, expected: true })),
      ...activePreset.sampleInvalid.map((s, idx) => ({ id: `iv-${idx}-${s}`, input: s, expected: false })),
    ];
    setTestCases(initialTests);
  };

  const handleClearAllTests = () => {
    setTestCases([]);
  };

  // Construct Thompson NFA from current regex and load into canvas
  const handleConstructNFA = () => {
    const trimmed = currentRegex.trim();
    const res = convertRegexToNFA(trimmed);
    if (res.success && res.nodes.length > 0) {
      replaceMachine([...res.nodes], [...res.edges], 'NFA');
      setLastRegexResult({ inputRegex: trimmed, result: res });
    }
  };

  // Evaluate batch test results against candidate regex NFA
  const batchResults = useMemo(() => {
    if (!validation.success || testCases.length === 0) {
      return [];
    }

    const generated = convertRegexToNFA(currentRegex.trim());
    if (!generated.success || generated.nodes.length === 0) {
      return [];
    }

    return evaluateConstructBatch(
      { nodes: generated.nodes, edges: generated.edges },
      testCases
    );
  }, [currentRegex, validation.success, testCases]);

  // Metrics summary
  const summary = useMemo(() => {
    if (batchResults.length === 0) return { total: 0, passed: 0, failed: 0, accuracy: 100 };
    const total = batchResults.length;
    const passed = batchResults.filter((r) => r.status === 'PASS').length;
    const failed = total - passed;
    const accuracy = total > 0 ? Math.round((passed / total) * 100) : 100;
    return { total, passed, failed, accuracy };
  }, [batchResults]);

  // Categories list
  const categories = ['All', 'Identifiers', 'Numbers', 'Keywords', 'Operators', 'Delimiters', 'Literals'];

  const filteredPresets = useMemo(() => {
    if (activeCategory === 'All') return PROGRAM_CONSTRUCT_PRESETS;
    return PROGRAM_CONSTRUCT_PRESETS.filter((p) => p.category === activeCategory);
  }, [activeCategory]);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-4 bg-bg-surface1 text-xs font-mono select-none">
      {/* Top Banner */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-3 shrink-0">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-accent-primary/15 text-accent-primary rounded-md">
            <FileCode size={18} />
          </div>
          <div>
            <h3 className="font-bold text-txt-primary text-sm">Program Constructs using Regular Expressions</h3>
            <p className="text-[11px] text-txt-muted">
              Explore lexical token patterns, verify batch candidate strings, and synthesize canonical Thompson ε-NFAs.
            </p>
          </div>
        </div>
        <div className="px-2.5 py-1 bg-accent-primary/10 border border-accent-primary/20 text-accent-primary font-bold rounded text-[11px]">
          Topic 2: Program Constructs
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
        <span className="text-[10px] text-txt-muted uppercase font-bold mr-1">Category:</span>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-2.5 py-1 rounded-md text-[11px] transition-colors cursor-pointer ${
              activeCategory === cat
                ? 'bg-accent-primary text-white font-bold shadow-xs'
                : 'bg-bg-surface2 text-txt-secondary hover:bg-bg-surface3 hover:text-txt-primary border border-border-subtle'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Preset Library Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {filteredPresets.map((preset) => {
          const isSelected = preset.id === selectedId;
          return (
            <button
              key={preset.id}
              onClick={() => handleSelectPreset(preset)}
              className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-accent-primary/10 border-accent-primary shadow-xs'
                  : 'bg-bg-surface2/60 hover:bg-bg-surface3 border-border-subtle'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-bg-surface3 text-txt-muted border border-border-subtle font-mono">
                    {preset.category}
                  </span>
                  {isSelected && <CheckCircle2 size={12} className="text-accent-primary" />}
                </div>
                <div className={`font-bold text-xs ${isSelected ? 'text-accent-primary' : 'text-txt-primary'}`}>
                  {preset.name}
                </div>
              </div>
              <div className="mt-2 text-[10px] text-txt-muted truncate font-mono bg-bg-surface3/80 px-1.5 py-0.5 rounded border border-border-subtle">
                {preset.regex}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Construct Definition & Regex Editor */}
      <div className="bg-bg-surface2/70 p-4 rounded-xl border border-border-subtle space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <h4 className="font-bold text-txt-primary text-sm">{activePreset.name}</h4>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-primary/15 text-accent-primary font-bold border border-accent-primary/30">
                {activePreset.category}
              </span>
            </div>
            <p className="text-[11px] text-txt-muted leading-relaxed">{activePreset.description}</p>
          </div>

          <button
            onClick={handleConstructNFA}
            disabled={!validation.success}
            className={`px-4 py-2 rounded-lg font-bold flex items-center space-x-2 text-xs transition-all shadow-md shrink-0 ${
              validation.success
                ? 'bg-accent-primary hover:bg-accent-hover text-white cursor-pointer shadow-accent-primary/20 hover:scale-[1.02]'
                : 'bg-bg-surface3 text-txt-muted border border-border-subtle cursor-not-allowed opacity-60'
            }`}
          >
            <Sparkles size={14} />
            <span>Construct ε-NFA on Canvas</span>
          </button>
        </div>

        {/* Academic Context & Formal Grammar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
          <div className="p-2.5 bg-bg-surface3 rounded-lg border border-border-subtle space-y-1">
            <div className="font-bold text-txt-primary flex items-center space-x-1.5 text-[10px] uppercase tracking-wider text-accent-primary">
              <BookOpen size={12} />
              <span>Formal Grammar Rule</span>
            </div>
            <div className="font-mono text-txt-secondary font-bold">{activePreset.grammarRule}</div>
          </div>

          <div className="p-2.5 bg-bg-surface3 rounded-lg border border-border-subtle space-y-1">
            <div className="font-bold text-txt-primary flex items-center space-x-1.5 text-[10px] uppercase tracking-wider text-accent-cyan">
              <HelpCircle size={12} />
              <span>Lexical Compiler Role</span>
            </div>
            <div className="text-txt-muted text-[10px] leading-tight">{activePreset.academicContext}</div>
          </div>
        </div>

        {/* Editable Pattern Input Field with Live Validation */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-txt-secondary flex items-center space-x-1">
              <Tag size={12} className="text-accent-primary" />
              <span>Regular Expression Specification:</span>
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                validation.success
                  ? 'bg-semantic-accept/15 text-semantic-accept border border-semantic-accept/30'
                  : 'bg-semantic-error/15 text-semantic-error border border-semantic-error/30'
              }`}
            >
              {validation.success ? '✓ Valid Regular Expression' : `✕ ${validation.errorMessage}`}
            </span>
          </div>

          <div className="flex items-center bg-bg-surface3 border border-border-subtle focus-within:border-accent-primary rounded-lg px-3 py-2 shadow-inner">
            <span className="text-txt-muted font-bold mr-2 select-none">r =</span>
            <input
              type="text"
              value={currentRegex}
              onChange={(e) => setCurrentRegex(e.target.value)}
              placeholder="e.g. (a|b)*abb, [0-9]+"
              className="w-full bg-transparent text-txt-primary font-mono font-bold text-xs outline-none"
            />
            {currentRegex !== activePreset.regex && (
              <button
                type="button"
                onClick={() => setCurrentRegex(activePreset.regex)}
                className="text-[10px] px-2 py-0.5 rounded bg-bg-surface2 hover:bg-bg-surface1 text-txt-muted hover:text-txt-primary ml-2 cursor-pointer"
                title="Reset to preset default"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Batch Testing Suite */}
      <div className="bg-bg-surface2/60 p-4 rounded-xl border border-border-subtle space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="font-bold text-txt-primary flex items-center space-x-1.5 text-xs">
              <Activity size={14} className="text-accent-primary" />
              <span>Batch String Verification Suite</span>
            </div>
            <p className="text-[10px] text-txt-muted">
              Evaluates test strings using pure non-deterministic execution against L(r)
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleResetTestCases}
              className="px-2.5 py-1 bg-bg-surface3 hover:bg-bg-surface2 border border-border-subtle rounded text-[10px] text-txt-secondary hover:text-txt-primary flex items-center space-x-1 cursor-pointer"
            >
              <RotateCcw size={11} />
              <span>Load Preset Tests</span>
            </button>
            <button
              onClick={handleClearAllTests}
              className="px-2.5 py-1 bg-bg-surface3 hover:bg-bg-surface2 border border-border-subtle rounded text-[10px] text-semantic-error hover:text-semantic-error/80 flex items-center space-x-1 cursor-pointer"
            >
              <Trash2 size={11} />
              <span>Clear Tests</span>
            </button>
          </div>
        </div>

        {/* Input Bar to Add Custom Test String */}
        <form onSubmit={handleAddTestCase} className="flex items-center space-x-2">
          <div className="flex-1 flex items-center bg-bg-surface3 border border-border-subtle focus-within:border-accent-primary rounded-lg px-3 py-1.5 shadow-inner">
            <span className="text-txt-muted font-bold mr-2 select-none">w =</span>
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Add candidate test string (e.g. 1024, my_var, //test)"
              className="w-full bg-transparent text-txt-primary placeholder-txt-muted font-mono font-bold text-xs outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={manualInput.trim() === ''}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
              manualInput.trim() !== ''
                ? 'bg-accent-primary text-white hover:bg-accent-hover cursor-pointer'
                : 'bg-bg-surface3 text-txt-muted border border-border-subtle cursor-not-allowed opacity-50'
            }`}
          >
            <Plus size={13} />
            <span>Add Test</span>
          </button>
        </form>

        {/* Test Summary Metrics Banner */}
        <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
          <div className="bg-bg-surface3/80 p-2 rounded-lg border border-border-subtle">
            <div className="text-txt-muted text-[10px]">TOTAL TESTS</div>
            <div className="font-bold text-txt-primary text-sm mt-0.5">{summary.total}</div>
          </div>
          <div className="bg-bg-surface3/80 p-2 rounded-lg border border-border-subtle">
            <div className="text-txt-muted text-[10px]">PASSED</div>
            <div className="font-bold text-semantic-accept text-sm mt-0.5">{summary.passed}</div>
          </div>
          <div className="bg-bg-surface3/80 p-2 rounded-lg border border-border-subtle">
            <div className="text-txt-muted text-[10px]">FAILED</div>
            <div className="font-bold text-semantic-error text-sm mt-0.5">{summary.failed}</div>
          </div>
          <div className="bg-bg-surface3/80 p-2 rounded-lg border border-border-subtle">
            <div className="text-txt-muted text-[10px]">ACCURACY</div>
            <div className="font-bold text-accent-primary text-sm mt-0.5">{summary.accuracy}%</div>
          </div>
        </div>

        {/* Batch Test Results Table */}
        {batchResults.length > 0 ? (
          <div className="border border-border-subtle rounded-lg overflow-hidden max-h-60 overflow-y-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead className="bg-bg-surface3 text-txt-muted uppercase text-[10px] sticky top-0 border-b border-border-subtle select-none">
                <tr>
                  <th className="py-2 px-3">Input String (w)</th>
                  <th className="py-2 px-3">Expected</th>
                  <th className="py-2 px-3">NFA Match Result</th>
                  <th className="py-2 px-3">Active States</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/50 font-mono">
                {batchResults.map((res, idx) => {
                  const tc = testCases[idx];
                  return (
                    <tr key={tc?.id || idx} className="hover:bg-bg-surface3/50 transition-colors">
                      <td className="py-2 px-3 font-bold text-txt-primary">
                        {res.input === '' ? <span className="text-txt-muted italic">ε (empty)</span> : res.input}
                      </td>
                      <td className="py-2 px-3">
                        {typeof res.expected === 'boolean' ? (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              res.expected
                                ? 'bg-semantic-accept/15 text-semantic-accept'
                                : 'bg-semantic-error/15 text-semantic-error'
                            }`}
                          >
                            {res.expected ? 'ACCEPT' : 'REJECT'}
                          </span>
                        ) : (
                          <span className="text-txt-muted text-[10px]">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center space-x-1 ${
                            res.isAccepted
                              ? 'bg-semantic-accept/15 text-semantic-accept border border-semantic-accept/30'
                              : 'bg-semantic-error/15 text-semantic-error border border-semantic-error/30'
                          }`}
                        >
                          {res.isAccepted ? <Check size={11} className="mr-1" /> : <XIcon size={11} className="mr-1" />}
                          <span>{res.isAccepted ? 'ACCEPTED' : 'REJECTED'}</span>
                        </span>
                      </td>
                      <td className="py-2 px-3 text-txt-secondary text-[10px]">
                        {res.finalStateLabels.length > 0 ? `{${res.finalStateLabels.join(', ')}}` : '∅ (Halted)'}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {tc && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTestCase(tc.id)}
                            className="text-txt-muted hover:text-semantic-error p-1 rounded transition-colors cursor-pointer"
                            title="Remove test case"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 text-center text-txt-muted text-[11px] bg-bg-surface3/40 rounded-lg border border-dashed border-border-subtle">
            No test strings defined. Click "Load Preset Tests" or type a candidate string above to run batch evaluation.
          </div>
        )}
      </div>
    </div>
  );
};
