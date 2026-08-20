import React, { useState, useMemo } from 'react';
import { useGraph } from '../../../context/GraphContext';
import { useExecution } from '../../../context/ExecutionContext';
import {
  CHALLENGE_LIBRARY,
  gradeSubmission,
  GradingResult,
} from '@project-zero/core-solver';
import {
  Trophy,
  Award,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Play,
  Lightbulb,
  RotateCcw,
  Check,
} from 'lucide-react';

export const ChallengeTab: React.FC = () => {
  const { nodes, edges, machineType, initialStackSymbol, blankSymbol } = useGraph();
  const { setInputString, reset } = useExecution();

  const [selectedChallengeId, setSelectedChallengeId] = useState<string>(CHALLENGE_LIBRARY[0].id);
  const [hintLevel, setHintLevel] = useState<number>(0);
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);

  const selectedChallenge = useMemo(() => {
    return CHALLENGE_LIBRARY.find((c) => c.id === selectedChallengeId) || CHALLENGE_LIBRARY[0];
  }, [selectedChallengeId]);

  const handleSelectChallenge = (id: string) => {
    setSelectedChallengeId(id);
    setHintLevel(0);
    setGradingResult(null);
  };

  const handleNextHint = () => {
    if (hintLevel < selectedChallenge.hints.length) {
      setHintLevel((prev) => prev + 1);
    }
  };

  const handleResetChallengeState = () => {
    setHintLevel(0);
    setGradingResult(null);
  };

  const handleSubmitForGrading = () => {
    const result = gradeSubmission(
      selectedChallenge,
      { nodes, edges },
      machineType,
      initialStackSymbol,
      blankSymbol
    );
    setGradingResult(result);
  };

  const handleInspectCounterexample = (counterexampleStr: string) => {
    if (counterexampleStr !== undefined) {
      setInputString(counterexampleStr);
      reset();
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-base text-txt-primary font-mono text-xs overflow-hidden select-none">
      {/* Header Bar: Challenge Selector & Actions */}
      <div className="flex items-center justify-between px-4 py-2 bg-bg-surface1 border-b border-border-subtle shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
            <Trophy className="w-4 h-4" />
            <span>Automata Challenge Workbench</span>
          </div>

          <select
            value={selectedChallengeId}
            onChange={(e) => handleSelectChallenge(e.target.value)}
            className="bg-bg-surface2 border border-border-strong text-txt-primary font-semibold rounded px-2.5 py-1 text-xs focus:outline-none focus:border-amber-500"
          >
            {CHALLENGE_LIBRARY.map((c) => (
              <option key={c.id} value={c.id}>
                [{c.category}] {c.title} ({c.difficulty})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetChallengeState}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded text-xs transition-colors border border-slate-700 font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset View
          </button>
          <button
            onClick={handleSubmitForGrading}
            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-3.5 py-1 rounded transition-colors shadow"
          >
            <Award className="w-4 h-4" /> Submit Automaton for Grading
          </button>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 overflow-hidden">
        {/* Left Column: Challenge Prompt & Progressive Hints */}
        <div className="border-r border-slate-800 p-4 space-y-4 overflow-y-auto bg-slate-950/40">
          <div className="bg-slate-950/90 p-3.5 rounded border border-slate-800 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-slate-200 text-xs">{selectedChallenge.title}</span>
              <span
                className={`px-2 py-0.5 rounded text-3xs font-bold border ${
                  selectedChallenge.difficulty === 'BEGINNER'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : selectedChallenge.difficulty === 'INTERMEDIATE'
                    ? 'bg-amber-950 text-amber-300 border-amber-800'
                    : 'bg-red-950 text-red-300 border-red-800'
                }`}
              >
                {selectedChallenge.difficulty}
              </span>
            </div>

            <p className="text-2xs text-slate-300 leading-relaxed font-sans">{selectedChallenge.prompt}</p>

            <div className="bg-slate-900/80 p-2 rounded border border-slate-800/80 text-2xs space-y-1">
              <span className="text-slate-500 block">Formal Language Specification:</span>
              <code className="text-amber-300 font-mono block">{selectedChallenge.expectedLanguageDescription}</code>
            </div>

            <div className="flex items-center justify-between text-3xs text-slate-400 pt-1">
              <span>Required Machine: <strong className="text-slate-200">{selectedChallenge.targetMachineType}</strong></span>
              <span>Active Canvas: <strong className="text-slate-200">{machineType}</strong></span>
            </div>
          </div>

          {/* Progressive Hints Section */}
          <div className="bg-slate-950/80 p-3.5 rounded border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-xs text-amber-300 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-amber-400" /> Hints ({hintLevel} / {selectedChallenge.hints.length})
              </span>

              {hintLevel < selectedChallenge.hints.length && (
                <button
                  onClick={handleNextHint}
                  className="bg-slate-800 hover:bg-slate-700 text-amber-300 px-2 py-1 rounded text-3xs border border-slate-700 font-semibold transition-colors"
                >
                  + Reveal Next Hint
                </button>
              )}
            </div>

            {hintLevel > 0 ? (
              <div className="space-y-2">
                {selectedChallenge.hints.slice(0, hintLevel).map((h, idx) => (
                  <div key={idx} className="bg-slate-900/90 p-2 rounded border border-amber-900/40 text-2xs font-sans text-amber-100 flex items-start gap-2">
                    <span className="bg-amber-950 text-amber-400 border border-amber-800 px-1.5 py-0.5 rounded text-3xs font-mono font-bold">
                      H{idx + 1}
                    </span>
                    <p className="leading-relaxed">{h}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-3xs italic">
                Stuck? Click "Reveal Next Hint" to unlock progressive mathematical guidance without altering your canvas.
              </p>
            )}
          </div>
        </div>

        {/* Middle & Right Column: Grading Results & Feedback */}
        <div className="col-span-2 p-4 overflow-y-auto space-y-4">
          {gradingResult ? (
            <>
              {/* Score & Status Summary Banner */}
              <div
                className={`p-4 rounded border flex flex-wrap items-center justify-between gap-4 ${
                  gradingResult.status === 'PASS'
                    ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                    : gradingResult.status === 'INVALID_MACHINE'
                    ? 'bg-red-950/40 border-red-800/80 text-red-200'
                    : 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  {gradingResult.status === 'PASS' ? (
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-8 h-8 text-amber-400 shrink-0" />
                  )}
                  <div>
                    <h3 className="font-bold text-sm">
                      {gradingResult.status === 'PASS'
                        ? 'PASSED: 100/100 Formal Score'
                        : `FAILED (${gradingResult.score}/100 Score)`}
                    </h3>
                    <p className="text-2xs text-slate-300 mt-0.5 font-sans leading-relaxed">
                      {gradingResult.explanation}
                    </p>
                  </div>
                </div>

                {gradingResult.shortestCounterexample !== undefined && (
                  <div className="flex items-center gap-3 bg-slate-950/90 p-2.5 rounded border border-amber-900/80">
                    <div className="text-2xs">
                      <span className="text-slate-400 block">Shortest Counterexample w:</span>
                      <code className="text-xs font-bold text-amber-300">
                        {gradingResult.shortestCounterexample === '' ? 'ε (Empty String)' : `"${gradingResult.shortestCounterexample}"`}
                      </code>
                    </div>
                    <button
                      onClick={() => handleInspectCounterexample(gradingResult.shortestCounterexample!)}
                      className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs px-3 py-1.5 rounded transition-colors shadow"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Inspect Counterexample Live
                    </button>
                  </div>
                )}
              </div>

              {/* Mathematical Reason Card */}
              <div className="bg-slate-950/80 p-3.5 rounded border border-slate-800 space-y-1">
                <span className="text-3xs uppercase font-bold text-amber-400 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" /> Mathematical Proof & Semantics
                </span>
                <p className="text-2xs text-slate-300 font-sans leading-relaxed">
                  {gradingResult.mathematicalReason}
                </p>
              </div>

              {/* Passed vs Failed Checks Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Passed Checks */}
                <div className="bg-slate-950/80 p-3.5 rounded border border-slate-800 space-y-2">
                  <span className="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Passed Checks ({gradingResult.passedChecks.length})
                  </span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {gradingResult.passedChecks.map((c, idx) => (
                      <div key={idx} className="bg-slate-900/80 p-2 rounded border border-slate-800 text-2xs space-y-0.5">
                        <span className="font-bold text-slate-200 flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-400" /> {c.name}
                        </span>
                        <p className="text-3xs text-slate-400">{c.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Failed Checks */}
                <div className="bg-slate-950/80 p-3.5 rounded border border-slate-800 space-y-2">
                  <span className="font-bold text-xs text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400" /> Failed Checks ({gradingResult.failedChecks.length})
                  </span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {gradingResult.failedChecks.length > 0 ? (
                      gradingResult.failedChecks.map((c, idx) => (
                        <div key={idx} className="bg-amber-950/30 p-2 rounded border border-amber-900/60 text-2xs space-y-0.5">
                          <span className="font-bold text-amber-200 flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-amber-400" /> {c.name}
                          </span>
                          <p className="text-3xs text-slate-300">{c.detail}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500 text-3xs italic">No check failures detected!</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500 text-xs italic space-y-2">
              <Trophy className="w-8 h-8 text-slate-600 mb-1" />
              <span>Construct your candidate automaton on the canvas, then click "Submit Automaton for Grading" above.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChallengeTab;
