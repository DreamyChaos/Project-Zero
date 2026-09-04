import React, { useState, useMemo } from 'react';
import { useGraph } from '../../../context/GraphContext';
import {
  PUMPING_PRESETS,
  runPumpingLemmaProof,
  testLanguageMembership,
} from '@project-zero/core-solver';
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ListOrdered,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';

export const PumpingLemmaTab: React.FC = () => {
  const { nodes, edges, machineType } = useGraph();

  // Selected language preset ID or 'custom_canvas'
  const [selectedPresetId, setSelectedPresetId] = useState<string>('anbn');

  // Pumping length p
  const [pumpingLength, setPumpingLength] = useState<number>(4);

  // Witness string w
  const [customWitness, setCustomWitness] = useState<string>('');

  // Selected decomposition index in valid list
  const [selectedDecompIndex, setSelectedDecompIndex] = useState<number>(0);

  // Custom pumping exponent i
  const [customI, setCustomI] = useState<number>(0);

  // Active preset or custom language wrapper
  const activeLanguage = useMemo(() => {
    if (selectedPresetId === 'custom_canvas') {
      return {
        id: 'custom_canvas',
        name: `Canvas ${machineType} Language`,
        isRegular: true,
        membershipCheck: (str: string) => {
          const res = testLanguageMembership({ nodes, edges }, machineType, str);
          return {
            isMember: res.isMember,
            reason: res.isMember ? 'Accepted by Canvas Automaton' : 'Rejected by Canvas Automaton',
          };
        },
      };
    }
    return PUMPING_PRESETS[selectedPresetId] || PUMPING_PRESETS.anbn;
  }, [selectedPresetId, nodes, edges, machineType]);

  // Suggested witness for current preset and p
  const suggestedWitness = useMemo(() => {
    if (selectedPresetId === 'custom_canvas') {
      return 'a'.repeat(Math.max(1, pumpingLength));
    }
    const preset = PUMPING_PRESETS[selectedPresetId];
    return preset ? preset.suggestedWitness(pumpingLength) : '';
  }, [selectedPresetId, pumpingLength]);

  // Effective witness string
  const effectiveWitness = customWitness.trim() !== '' ? customWitness.trim() : suggestedWitness;

  // Run full quantified proof analysis
  const proofResult = useMemo(() => {
    const testIVals = Array.from(new Set([0, 1, 2, 3, 4, Math.max(0, customI)])).sort((a, b) => a - b);
    return runPumpingLemmaProof({
      language: activeLanguage,
      p: pumpingLength,
      customWitness: effectiveWitness,
      testIVals,
    });
  }, [activeLanguage, pumpingLength, effectiveWitness, customI]);

  // Active decomposition in focus
  const activeDecomposition = useMemo(() => {
    if (!proofResult.isWitnessValid || proofResult.decompositions.length === 0) {
      return null;
    }
    const idx = Math.min(Math.max(0, selectedDecompIndex), proofResult.decompositions.length - 1);
    return proofResult.decompositions[idx] || proofResult.decompositions[0];
  }, [proofResult, selectedDecompIndex]);

  // Reset to default preset witness
  const handleResetWitness = () => {
    setCustomWitness('');
  };

  return (
    <div className="flex flex-col h-full bg-bg-surface1 text-txt-primary overflow-y-auto p-4 space-y-4 font-sans text-xs select-text">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between border-b border-border-subtle pb-3 gap-2">
        <div>
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-accent-primary" />
            <h3 className="font-semibold text-sm text-txt-primary">
              Pumping Lemma for Regular Languages
            </h3>
          </div>
          <p className="text-txt-muted text-[11px] mt-0.5">
            Interactive educational proof assistant and quantifier analysis (∀ valid decompositions d = (x,y,z), ∃ i ≥ 0 such that xyⁱz ∉ L ⟹ L is non-regular).
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono border font-bold ${
              proofResult.proofStatus === 'CONTRADICTION_PROVEN_NON_REGULAR'
                ? 'bg-semantic-error/15 border-semantic-error/30 text-semantic-error'
                : proofResult.proofStatus === 'CONSISTENT_WITH_REGULAR'
                ? 'bg-semantic-accept/15 border-semantic-accept/30 text-semantic-accept'
                : 'bg-accent-primary/10 border-accent-primary/20 text-accent-primary'
            }`}
          >
            {proofResult.proofStatus === 'CONTRADICTION_PROVEN_NON_REGULAR'
              ? 'CONTRADICTION: NON-REGULAR'
              : proofResult.proofStatus === 'CONSISTENT_WITH_REGULAR'
              ? 'CONSISTENT WITH REGULAR'
              : proofResult.proofStatus === 'INVALID_INPUT'
              ? 'INVALID WITNESS/INPUT'
              : 'PROOF INCOMPLETE'}
          </span>
          <span className="px-2 py-0.5 rounded bg-bg-surface3 border border-border-subtle text-txt-secondary text-[10px] font-mono">
            Topic 6: Pumping Lemma
          </span>
        </div>
      </div>

      {/* Section 1: Language & Witness Parameter Configuration */}
      <div className="p-3.5 bg-bg-surface2 rounded-lg border border-border-subtle space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-semibold text-xs text-txt-primary">1. Language Selection &amp; Witness Parameters</h4>
          <span className="text-[10px] text-txt-muted">
            Assume L is regular ⟹ ∃ pumping length p ≥ 1
          </span>
        </div>

        {/* Preset Selector */}
        <div className="flex flex-wrap items-center gap-1.5">
          {Object.values(PUMPING_PRESETS).map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                setSelectedPresetId(preset.id);
                setPumpingLength(preset.suggestedP);
                setCustomWitness('');
                setSelectedDecompIndex(0);
              }}
              className={`px-2.5 py-1 rounded text-[11px] font-medium border cursor-pointer transition-colors ${
                selectedPresetId === preset.id
                  ? 'bg-accent-primary text-white border-accent-primary shadow-sm'
                  : 'bg-bg-surface1 text-txt-secondary hover:bg-bg-surface3 border-border-subtle'
              }`}
            >
              {preset.name}
            </button>
          ))}
          <button
            onClick={() => {
              setSelectedPresetId('custom_canvas');
              setCustomWitness('');
              setSelectedDecompIndex(0);
            }}
            className={`px-2.5 py-1 rounded text-[11px] font-medium border cursor-pointer transition-colors ${
              selectedPresetId === 'custom_canvas'
                ? 'bg-accent-primary text-white border-accent-primary shadow-sm'
                : 'bg-bg-surface1 text-txt-secondary hover:bg-bg-surface3 border-border-subtle'
            }`}
          >
            Canvas Automaton
          </button>
        </div>

        {/* Parameter Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
          {/* Pumping Length p (3 cols) */}
          <div className="md:col-span-3 p-2.5 bg-bg-surface1 rounded border border-border-subtle space-y-1.5">
            <span className="text-[10px] font-semibold text-txt-secondary uppercase tracking-wider block">
              Pumping Length (p ≥ 1):
            </span>
            <input
              type="number"
              min="1"
              max="20"
              value={pumpingLength}
              onChange={(e) => setPumpingLength(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-bg-surface2 border border-border-subtle focus:border-accent-primary rounded px-2.5 py-1 text-xs font-mono font-bold text-txt-primary focus:outline-none"
            />
          </div>

          {/* Witness String w (9 cols) */}
          <div className="md:col-span-9 p-2.5 bg-bg-surface1 rounded border border-border-subtle space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-txt-secondary uppercase tracking-wider">
                Witness String w (|w| ≥ p and w ∈ L):
              </span>
              <button
                onClick={handleResetWitness}
                className="text-[10px] text-accent-primary hover:underline flex items-center space-x-1 cursor-pointer"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Use Suggested: "{suggestedWitness}"</span>
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={customWitness}
                placeholder={`Suggested witness: "${suggestedWitness}"`}
                onChange={(e) => setCustomWitness(e.target.value)}
                className="flex-1 bg-bg-surface2 border border-border-subtle focus:border-accent-primary rounded px-2.5 py-1 text-xs font-mono font-bold text-txt-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Witness Validation Banner */}
        {!proofResult.isWitnessValid && (
          <div className="p-2.5 bg-semantic-error/15 border border-semantic-error/30 rounded text-semantic-error text-[11px] font-medium flex items-center space-x-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{proofResult.witnessValidationError}</span>
          </div>
        )}
      </div>

      {/* Section 2: Interactive Decomposition & Visual Pumping */}
      {proofResult.isWitnessValid && activeDecomposition && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Visual Decomposition & Valid List (6 Cols) */}
          <div className="lg:col-span-6 p-3.5 bg-bg-surface2 rounded-lg border border-border-subtle space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-xs text-txt-primary">2. Decomposition w = xyz</h4>
              <span className="px-2 py-0.5 rounded bg-bg-surface3 border border-border-subtle text-accent-primary font-mono text-[10px]">
                {proofResult.totalValidDecompositions} Valid Decompositions
              </span>
            </div>

            {/* Visual String Split Highlighting */}
            <div className="p-3 bg-bg-surface1 rounded border border-border-subtle space-y-2">
              <span className="text-[10px] text-txt-muted uppercase font-mono block">
                Visual String Split (w = xyz):
              </span>
              <div className="flex items-center space-x-1 font-mono text-xs font-bold text-center">
                <div className="flex-1 p-2 rounded bg-accent-cyan/15 border border-accent-cyan/30 text-accent-cyan break-all">
                  <span className="text-[9px] block text-txt-muted">x (|x|={activeDecomposition.decomposition.x.length})</span>
                  "{activeDecomposition.decomposition.x || 'ε'}"
                </div>
                <div className="flex-1 p-2 rounded bg-accent-primary/20 border border-accent-primary/40 text-accent-primary break-all shadow-sm">
                  <span className="text-[9px] block text-accent-primary font-bold">y (|y|={activeDecomposition.decomposition.y.length}) [PUMP]</span>
                  "{activeDecomposition.decomposition.y}"
                </div>
                <div className="flex-1 p-2 rounded bg-accent-secondary/15 border border-accent-secondary/30 text-accent-secondary break-all">
                  <span className="text-[9px] block text-txt-muted">z (|z|={activeDecomposition.decomposition.z.length})</span>
                  "{activeDecomposition.decomposition.z || 'ε'}"
                </div>
              </div>

              {/* Invariant Check Badges */}
              <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono text-center pt-1 border-t border-border-subtle">
                <div className="p-1 rounded bg-bg-surface2 text-semantic-accept">
                  ✓ |xy| = {activeDecomposition.decomposition.x.length + activeDecomposition.decomposition.y.length} ≤ {pumpingLength}
                </div>
                <div className="p-1 rounded bg-bg-surface2 text-semantic-accept">
                  ✓ |y| = {activeDecomposition.decomposition.y.length} &gt; 0
                </div>
                <div className="p-1 rounded bg-bg-surface2 text-semantic-accept">
                  ✓ x+y+z = w
                </div>
              </div>
            </div>

            {/* Enumerated Valid Decompositions List */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold text-txt-secondary uppercase tracking-wider block">
                Select from All {proofResult.totalValidDecompositions} Valid Decompositions (|xy| ≤ {pumpingLength}, |y| &gt; 0):
              </span>
              <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                {proofResult.decompositions.map((d, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedDecompIndex(idx)}
                    className={`w-full p-2 rounded text-left font-mono text-[11px] border transition-colors flex items-center justify-between cursor-pointer ${
                      selectedDecompIndex === idx
                        ? 'bg-accent-primary/15 border-accent-primary text-txt-primary font-bold'
                        : 'bg-bg-surface1 hover:bg-bg-surface3 border-border-subtle text-txt-secondary'
                    }`}
                  >
                    <span>
                      x="{d.decomposition.x || 'ε'}", y="{d.decomposition.y}", z="{d.decomposition.z || 'ε'}"
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-sans ${
                        d.hasDisprovingI ? 'bg-semantic-error/15 text-semantic-error' : 'bg-semantic-accept/15 text-semantic-accept'
                      }`}
                    >
                      {d.hasDisprovingI ? `Disproved at i=${d.disprovingI}` : 'Preserved'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Pumping Sweep Table & Membership (6 Cols) */}
          <div className="lg:col-span-6 p-3.5 bg-bg-surface2 rounded-lg border border-border-subtle space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-xs text-txt-primary">3. Pumping Operation (xyⁱz)</h4>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] text-txt-muted">Custom i:</span>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={customI}
                    onChange={(e) => setCustomI(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-12 bg-bg-surface1 border border-border-subtle rounded px-1.5 py-0.5 text-[10px] font-mono font-bold text-center text-txt-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Pumping Sweep Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b border-border-subtle text-txt-muted text-[10px]">
                      <th className="py-1 px-2">i</th>
                      <th className="py-1 px-2">PUMPED STRING xyⁱz</th>
                      <th className="py-1 px-2">LENGTH</th>
                      <th className="py-1 px-2 text-right">MEMBERSHIP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeDecomposition.evaluations.map((ev) => (
                      <tr
                        key={ev.i}
                        className={`border-b border-border-subtle/40 ${
                          !ev.isMember ? 'bg-semantic-error/10 text-semantic-error' : 'text-txt-primary'
                        }`}
                      >
                        <td className="py-1 px-2 font-bold">{ev.i}</td>
                        <td className="py-1 px-2 font-bold break-all">"{ev.pumpedString || 'ε'}"</td>
                        <td className="py-1 px-2 text-txt-muted">{ev.length}</td>
                        <td className="py-1 px-2 text-right">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-sans font-bold ${
                              ev.isMember
                                ? 'bg-semantic-accept/15 text-semantic-accept'
                                : 'bg-semantic-error/15 text-semantic-error'
                            }`}
                          >
                            {ev.isMember ? 'IN L' : 'NOT IN L'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Decomposition Reasoning Status */}
            <div className="p-2.5 rounded bg-bg-surface1 border border-border-subtle text-[11px]">
              <span className="font-semibold text-txt-secondary block mb-0.5">Decomposition Assessment:</span>
              <p className="text-txt-muted">{activeDecomposition.reasoning}</p>
            </div>
          </div>
        </div>
      )}

      {/* Section 3: Quantifier Proof Engine & Formal Conclusion */}
      {proofResult.isWitnessValid && (
        <div
          className={`p-4 rounded-lg border space-y-3 ${
            proofResult.proofStatus === 'CONTRADICTION_PROVEN_NON_REGULAR'
              ? 'bg-semantic-error/10 border-semantic-error/30'
              : proofResult.proofStatus === 'CONSISTENT_WITH_REGULAR'
              ? 'bg-semantic-accept/10 border-semantic-accept/30'
              : 'bg-bg-surface2 border-border-subtle'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {proofResult.proofStatus === 'CONTRADICTION_PROVEN_NON_REGULAR' ? (
                <ShieldCheck className="w-5 h-5 text-semantic-error shrink-0" />
              ) : proofResult.proofStatus === 'CONSISTENT_WITH_REGULAR' ? (
                <CheckCircle2 className="w-5 h-5 text-semantic-accept shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-accent-primary shrink-0" />
              )}
              <div>
                <h4
                  className={`font-bold text-sm ${
                    proofResult.proofStatus === 'CONTRADICTION_PROVEN_NON_REGULAR'
                      ? 'text-semantic-error'
                      : proofResult.proofStatus === 'CONSISTENT_WITH_REGULAR'
                      ? 'text-semantic-accept'
                      : 'text-txt-primary'
                  }`}
                >
                  {proofResult.conclusion}
                </h4>
                <p className="text-[11px] text-txt-muted mt-0.5">
                  Universal Quantifier Status: {proofResult.decompositions.filter((d) => d.hasDisprovingI).length} of{' '}
                  {proofResult.totalValidDecompositions} valid decompositions disproved under tested parameters.
                </p>
              </div>
            </div>
          </div>

          {/* Structural Decomposition Class Reasoning (if available) */}
          {proofResult.decompositionClassSummary && (
            <div className="p-3 bg-bg-surface1 rounded border border-border-subtle text-[11px] space-y-1">
              <span className="font-bold text-txt-primary block">Structural Decomposition-Class Argument:</span>
              <p className="text-txt-muted leading-relaxed">{proofResult.decompositionClassSummary}</p>
            </div>
          )}

          {/* Formal Step-by-Step Proof Trace */}
          <div className="p-3 bg-bg-surface1 rounded border border-border-subtle space-y-2">
            <div className="flex items-center space-x-1.5">
              <ListOrdered className="w-4 h-4 text-accent-primary" />
              <span className="font-bold text-xs text-txt-primary">Formal Proof Trace Steps:</span>
            </div>
            <div className="space-y-1 text-[11px] font-mono text-txt-secondary max-h-48 overflow-y-auto pr-1">
              {proofResult.proofSteps.map((step, idx) => (
                <div key={idx} className="p-1.5 rounded bg-bg-surface2/60 border border-border-subtle/50">
                  {step}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Educational Foundations Accordion */}
      <div className="p-3.5 bg-bg-surface2/60 rounded-lg border border-border-subtle space-y-2 text-[11px] text-txt-secondary">
        <div className="font-bold text-txt-primary flex items-center space-x-1.5">
          <HelpCircle className="w-4 h-4 text-accent-primary" />
          <span>Understanding the Pumping Lemma &amp; Quantifier Logic</span>
        </div>
        <p className="leading-relaxed text-txt-muted">
          <strong>The Pumping Lemma:</strong> If <i>L</i> is a regular language, then there exists a pumping length <i>p</i> such that every string <i>w ∈ L</i> with <i>|w| ≥ p</i> can be decomposed into <i>w = xyz</i> satisfying:
          (1) <i>|xy| ≤ p</i>, (2) <i>|y| &gt; 0</i>, and (3) for all <i>i ≥ 0</i>, <i>xyⁱz ∈ L</i>.
        </p>
        <p className="leading-relaxed text-txt-muted">
          <strong>Crucial Quantifier Distinction:</strong> To prove that a language is <strong>NOT</strong> regular, one must show that for <strong>ALL</strong> valid decompositions <i>(x, y, z)</i>, there exists at least one exponent <i>i ≥ 0</i> that breaks membership.
          A single failing decomposition is exploratory evidence, NOT a proof. Conversely, passing pumping tests is a <strong>necessary</strong> condition, not a sufficient proof of regularity.
        </p>
      </div>
    </div>
  );
};
