import React, { useState, useMemo } from 'react';
import { useGraph } from '../../../context/GraphContext';
import {
  LEXICAL_RULE_SET_PRESETS,
  LexicalRule,
  getLexicalPresetById,
  tokenizeSource,
  convertRegexToNFA,
  parseRegex,
} from '@project-zero/core-solver';
import {
  FileText,
  RotateCcw,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  AlertCircle,
  BookOpen,
  Terminal,
  Code2,
} from 'lucide-react';

export const LexicalAnalyzerTab: React.FC = () => {
  const { replaceMachine, setLastRegexResult } = useGraph();

  // Selected Preset
  const [selectedPresetId, setSelectedPresetId] = useState<string>('basic-program');
  const activePreset = useMemo(() => {
    return getLexicalPresetById(selectedPresetId) || LEXICAL_RULE_SET_PRESETS[0];
  }, [selectedPresetId]);

  // Active Rule Set State (deep copy of preset on initial / reset)
  const [rules, setRules] = useState<LexicalRule[]>(() => [...activePreset.rules]);

  // Source Text Input State
  const [sourceCode, setSourceCode] = useState<string>(activePreset.sampleSource);

  // New Rule Form State
  const [newTokenType, setNewTokenType] = useState<string>('CUSTOM_TOKEN');
  const [newRegex, setNewRegex] = useState<string>('(a|b)+');
  const [newAction, setNewAction] = useState<'EMIT' | 'SKIP'>('EMIT');

  // Handle Preset Switching
  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const p = getLexicalPresetById(presetId);
    if (p) {
      setRules([...p.rules]);
      setSourceCode(p.sampleSource);
    }
  };

  // Rule Editing Handlers
  const handleToggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const handleUpdateRule = (id: string, patch: Partial<LexicalRule>) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const handleDeleteRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const handleMoveRule = (index: number, direction: 'UP' | 'DOWN') => {
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= rules.length) return;

    setRules((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      // Re-assign priorities based on new ordering
      return copy.map((r, idx) => ({ ...r, priority: idx + 1 }));
    });
  };

  const handleAddRule = () => {
    if (!newTokenType.trim() || !newRegex.trim()) return;

    const newRule: LexicalRule = {
      id: `r-custom-${Date.now()}`,
      tokenType: newTokenType.trim().toUpperCase(),
      regex: newRegex.trim(),
      priority: rules.length + 1,
      action: newAction,
      enabled: true,
      description: 'User-defined token rule',
    };

    setRules((prev) => [...prev, newRule]);
    setNewTokenType('CUSTOM_TOKEN');
    setNewRegex('(a|b)+');
  };

  const handleResetToPreset = () => {
    setRules([...activePreset.rules]);
    setSourceCode(activePreset.sampleSource);
  };

  // Load Rule's Thompson NFA to Canvas
  const handleInspectAutomaton = (rule: LexicalRule) => {
    const res = convertRegexToNFA(rule.regex.trim());
    if (res.success && res.nodes.length > 0) {
      replaceMachine([...res.nodes], [...res.edges], 'NFA');
      setLastRegexResult({ inputRegex: rule.regex.trim(), result: res });
    }
  };

  // Real-time Lexical Analysis Execution
  const analysisResult = useMemo(() => {
    return tokenizeSource(sourceCode, rules);
  }, [sourceCode, rules]);

  return (
    <div className="flex flex-col h-full bg-bg-surface1 text-txt-primary overflow-y-auto p-4 space-y-4 font-sans text-xs select-text">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between border-b border-border-subtle pb-3 gap-2">
        <div>
          <div className="flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-accent-primary" />
            <h3 className="font-semibold text-sm text-txt-primary">
              Lexical Analysis using Finite Automata & Regular Expression
            </h3>
          </div>
          <p className="text-txt-muted text-[11px] mt-0.5">
            Configure token rules, synthesize Thompson finite automata, and scan source text into a structured token stream with maximal munch.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="px-2 py-0.5 rounded bg-accent-primary/10 border border-accent-primary/20 text-accent-primary text-[10px] font-mono">
            Topic 3: Lexical Analyzer
          </span>
          <button
            onClick={handleResetToPreset}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-bg-surface2 hover:bg-bg-surface3 border border-border-subtle text-txt-secondary text-[11px] transition-all cursor-pointer"
            title="Reset active rules and source code to current preset"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Preset</span>
          </button>
        </div>
      </div>

      {/* Preset Selector Bar */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        <span className="text-txt-muted font-medium text-[11px] shrink-0">Rule Set Presets:</span>
        {LEXICAL_RULE_SET_PRESETS.map((preset) => {
          const isSelected = preset.id === selectedPresetId;
          return (
            <button
              key={preset.id}
              onClick={() => handleSelectPreset(preset.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all shrink-0 cursor-pointer border ${
                isSelected
                  ? 'bg-accent-primary text-white border-accent-primary shadow-xs'
                  : 'bg-bg-surface2 text-txt-secondary hover:text-txt-primary hover:bg-bg-surface3 border-border-subtle'
              }`}
            >
              {preset.name}
            </button>
          );
        })}
      </div>

      {/* Main Workspace Layout (Two Columns on large screens) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Token Rule Configuration (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          <div className="p-3 bg-bg-surface2 rounded-lg border border-border-subtle space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-accent-secondary" />
                <h4 className="font-semibold text-xs text-txt-primary">Lexical Rules (Maximal Munch Order)</h4>
              </div>
              <span className="text-[10px] text-txt-muted">
                {rules.filter((r) => r.enabled).length} of {rules.length} Rules Active
              </span>
            </div>

            {/* Rules Table */}
            <div className="border border-border-subtle rounded-md overflow-x-auto max-h-72 overflow-y-auto bg-bg-surface1">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead className="bg-bg-surface2 text-txt-muted font-mono uppercase text-[10px] sticky top-0 z-10 border-b border-border-subtle">
                  <tr>
                    <th className="py-1.5 px-2 text-center w-8">En</th>
                    <th className="py-1.5 px-2 text-center w-12">Pri</th>
                    <th className="py-1.5 px-2">Token Type</th>
                    <th className="py-1.5 px-2">Regex Pattern</th>
                    <th className="py-1.5 px-2 text-center w-16">Action</th>
                    <th className="py-1.5 px-2 text-right w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle font-mono">
                  {rules.map((rule, idx) => {
                    const parseCheck = parseRegex(rule.regex.trim());
                    return (
                      <tr
                        key={rule.id}
                        className={`hover:bg-bg-surface2/50 transition-colors ${
                          !rule.enabled ? 'opacity-50' : ''
                        }`}
                      >
                        <td className="py-1 px-2 text-center">
                          <input
                            type="checkbox"
                            checked={rule.enabled}
                            onChange={() => handleToggleRule(rule.id)}
                            className="rounded border-border-subtle text-accent-primary focus:ring-0 cursor-pointer"
                          />
                        </td>
                        <td className="py-1 px-2 text-center text-txt-muted font-mono text-[10px]">
                          #{rule.priority}
                        </td>
                        <td className="py-1 px-2 font-semibold text-txt-primary">
                          <input
                            type="text"
                            value={rule.tokenType}
                            onChange={(e) => handleUpdateRule(rule.id, { tokenType: e.target.value })}
                            className="bg-transparent border-0 border-b border-transparent hover:border-border-subtle focus:border-accent-primary px-1 py-0.5 text-[11px] w-full text-accent-primary font-mono focus:outline-none"
                          />
                        </td>
                        <td className="py-1 px-2">
                          <div className="flex items-center space-x-1">
                            <input
                              type="text"
                              value={rule.regex}
                              onChange={(e) => handleUpdateRule(rule.id, { regex: e.target.value })}
                              className={`bg-bg-surface2 border rounded px-1.5 py-0.5 text-[10px] w-full font-mono focus:outline-none ${
                                parseCheck.success ? 'border-border-subtle' : 'border-state-error text-state-error'
                              }`}
                            />
                          </div>
                        </td>
                        <td className="py-1 px-2 text-center">
                          <select
                            value={rule.action}
                            onChange={(e) =>
                              handleUpdateRule(rule.id, { action: e.target.value as 'EMIT' | 'SKIP' })
                            }
                            className={`px-1 py-0.5 rounded text-[10px] font-semibold border ${
                              rule.action === 'EMIT'
                                ? 'bg-state-success/10 text-state-success border-state-success/30'
                                : 'bg-state-warning/10 text-state-warning border-state-warning/30'
                            }`}
                          >
                            <option value="EMIT">EMIT</option>
                            <option value="SKIP">SKIP</option>
                          </select>
                        </td>
                        <td className="py-1 px-2 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => handleMoveRule(idx, 'UP')}
                              disabled={idx === 0}
                              className="p-1 text-txt-muted hover:text-txt-primary disabled:opacity-30 cursor-pointer"
                              title="Move Rule Up (Higher Priority)"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleMoveRule(idx, 'DOWN')}
                              disabled={idx === rules.length - 1}
                              className="p-1 text-txt-muted hover:text-txt-primary disabled:opacity-30 cursor-pointer"
                              title="Move Rule Down (Lower Priority)"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleInspectAutomaton(rule)}
                              className="p-1 text-accent-primary hover:text-accent-secondary cursor-pointer"
                              title="Synthesize & Inspect Thompson ε-NFA on Canvas"
                            >
                              <Sparkles className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteRule(rule.id)}
                              className="p-1 text-txt-muted hover:text-state-error cursor-pointer"
                              title="Delete Rule"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Add Custom Rule Form */}
            <div className="p-2.5 bg-bg-surface1 rounded border border-border-subtle space-y-2">
              <span className="text-[10px] font-semibold text-txt-secondary uppercase tracking-wider">
                + Add Custom Token Rule
              </span>
              <div className="grid grid-cols-12 gap-2">
                <input
                  type="text"
                  placeholder="TOKEN_NAME (e.g. KEYWORD_VAR)"
                  value={newTokenType}
                  onChange={(e) => setNewTokenType(e.target.value)}
                  className="col-span-4 bg-bg-surface2 border border-border-subtle rounded px-2 py-1 text-[11px] font-mono focus:border-accent-primary focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Regular Expression (e.g. (a|b)+)"
                  value={newRegex}
                  onChange={(e) => setNewRegex(e.target.value)}
                  className="col-span-5 bg-bg-surface2 border border-border-subtle rounded px-2 py-1 text-[11px] font-mono focus:border-accent-primary focus:outline-none"
                />
                <select
                  value={newAction}
                  onChange={(e) => setNewAction(e.target.value as 'EMIT' | 'SKIP')}
                  className="col-span-2 bg-bg-surface2 border border-border-subtle rounded px-1.5 py-1 text-[11px] font-mono"
                >
                  <option value="EMIT">EMIT</option>
                  <option value="SKIP">SKIP</option>
                </select>
                <button
                  onClick={handleAddRule}
                  className="col-span-1 flex items-center justify-center rounded bg-accent-primary hover:bg-accent-primary/90 text-white font-medium text-[11px] transition-colors cursor-pointer"
                  title="Add Rule"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Source Input Area */}
          <div className="p-3 bg-bg-surface2 rounded-lg border border-border-subtle space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Code2 className="w-4 h-4 text-accent-primary" />
                <h4 className="font-semibold text-xs text-txt-primary">Source Code Input</h4>
              </div>
              <span className="text-[10px] text-txt-muted">{sourceCode.length} Characters</span>
            </div>
            <textarea
              value={sourceCode}
              onChange={(e) => setSourceCode(e.target.value)}
              rows={4}
              placeholder="Enter multiline source code here (e.g. int count = 42; if count == 42 return true;)"
              className="w-full bg-bg-surface1 border border-border-subtle rounded p-2 text-xs font-mono text-txt-primary focus:border-accent-primary focus:outline-none resize-y"
            />
          </div>
        </div>

        {/* Right Column: Lexical Stream & Telemetry (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-3">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-4 gap-2">
            <div className="p-2.5 rounded-lg bg-bg-surface2 border border-border-subtle flex flex-col items-center">
              <span className="text-[10px] text-txt-muted font-mono">EMITTED</span>
              <span className="text-lg font-bold text-accent-primary font-mono">
                {analysisResult.tokens.length}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-bg-surface2 border border-border-subtle flex flex-col items-center">
              <span className="text-[10px] text-txt-muted font-mono">SKIPPED</span>
              <span className="text-lg font-bold text-state-warning font-mono">
                {analysisResult.skippedCount}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-bg-surface2 border border-border-subtle flex flex-col items-center">
              <span className="text-[10px] text-txt-muted font-mono">ERRORS</span>
              <span
                className={`text-lg font-bold font-mono ${
                  analysisResult.errors.length > 0 ? 'text-state-error' : 'text-state-success'
                }`}
              >
                {analysisResult.errors.length}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-bg-surface2 border border-border-subtle flex flex-col items-center">
              <span className="text-[10px] text-txt-muted font-mono">STATUS</span>
              <span
                className={`text-xs font-bold font-mono mt-1 ${
                  analysisResult.success ? 'text-state-success' : 'text-state-error'
                }`}
              >
                {analysisResult.success ? 'PASS' : 'LEX ERROR'}
              </span>
            </div>
          </div>

          {/* Lexical Error Banner (if errors exist) */}
          {analysisResult.errors.length > 0 && (
            <div className="p-3 bg-state-error/10 border border-state-error/30 rounded-lg space-y-1.5">
              <div className="flex items-center space-x-1.5 text-state-error font-semibold text-[11px]">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Lexical Scanner Errors Encountered ({analysisResult.errors.length})</span>
              </div>
              <ul className="space-y-1 max-h-24 overflow-y-auto font-mono text-[10px] text-state-error">
                {analysisResult.errors.map((err, idx) => (
                  <li key={idx} className="flex items-start space-x-1">
                    <span>•</span>
                    <span>
                      Line {err.line}, Col {err.column}: Unexpected symbol <span className="underline font-bold">'{err.unexpectedChar}'</span> (snippet: "{err.sourceSnippet}")
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Structured Token Stream Output Table */}
          <div className="p-3 bg-bg-surface2 rounded-lg border border-border-subtle space-y-2 flex-1 flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-accent-secondary" />
                <h4 className="font-semibold text-xs text-txt-primary">Emitted Token Stream</h4>
              </div>
              <span className="text-[10px] text-txt-muted font-mono">
                {analysisResult.tokens.length} Tokens Emitted
              </span>
            </div>

            <div className="border border-border-subtle rounded-md overflow-x-auto flex-1 max-h-96 overflow-y-auto bg-bg-surface1">
              {analysisResult.tokens.length === 0 ? (
                <div className="p-6 text-center text-txt-muted text-xs">
                  {sourceCode.length === 0
                    ? 'Enter source text above to scan token stream.'
                    : 'No tokens emitted by configured rules.'}
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-bg-surface2 text-txt-muted font-mono uppercase text-[10px] sticky top-0 z-10 border-b border-border-subtle">
                    <tr>
                      <th className="py-1 px-2 text-center w-8">#</th>
                      <th className="py-1 px-2">Token Type</th>
                      <th className="py-1 px-2">Lexeme</th>
                      <th className="py-1 px-2">Position</th>
                      <th className="py-1 px-2 text-right">Offset</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle font-mono">
                    {analysisResult.tokens.map((token, idx) => (
                      <tr key={idx} className="hover:bg-bg-surface2/50 transition-colors">
                        <td className="py-1 px-2 text-center text-txt-muted text-[10px]">
                          {idx + 1}
                        </td>
                        <td className="py-1 px-2">
                          <span className="px-1.5 py-0.5 rounded bg-accent-primary/10 border border-accent-primary/20 text-accent-primary text-[10px] font-semibold">
                            {token.tokenType}
                          </span>
                        </td>
                        <td className="py-1 px-2 font-bold text-txt-primary">
                          <code className="bg-bg-surface2 px-1 py-0.5 rounded text-accent-secondary">
                            {token.lexeme}
                          </code>
                        </td>
                        <td className="py-1 px-2 text-txt-muted text-[10px]">
                          L{token.line}:C{token.column}
                        </td>
                        <td className="py-1 px-2 text-right text-txt-muted text-[10px]">
                          [{token.startOffset}..{token.endOffset})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
