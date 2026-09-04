import React, { useMemo } from 'react';
import { useGraph } from '../../../context/GraphContext';
import { Calculator, CheckCircle2, AlertTriangle } from 'lucide-react';
import { computePDAAlphabets, analyzePDADeterminism } from '@project-zero/core-solver';

export const FormalDefinitionTab: React.FC = () => {
  const { nodes, edges, to5Tuple, machineType, initialStackSymbol, blankSymbol, pdaAcceptanceMode, setPdaAcceptanceMode } = useGraph();
  const tuple5 = useMemo(() => to5Tuple(), [to5Tuple]);

  const pdaAlphabets = useMemo(() => {
    if (machineType !== 'PDA') return { inputAlphabet: [], stackAlphabet: [] };
    return computePDAAlphabets({ nodes, edges }, initialStackSymbol);
  }, [nodes, edges, machineType, initialStackSymbol]);

  const pdaDeterminism = useMemo(() => {
    if (machineType !== 'PDA') return null;
    return analyzePDADeterminism({ nodes, edges }, initialStackSymbol);
  }, [nodes, edges, machineType, initialStackSymbol]);

  const tupleTitle =
    machineType === 'TM'
      ? 'Formal 7-Tuple Definition: M = (Q, Σ, Γ, δ, q₀, B, F)'
      : machineType === 'PDA'
      ? 'Formal 7-Tuple Definition: M = (Q, Σ, Γ, δ, q₀, Z₀, F)'
      : 'Formal 5-Tuple Definition: M = (Q, Σ, δ, q₀, F)';

  return (
    <div className="flex-1 overflow-y-auto p-3 text-xs font-mono select-none space-y-3">
      <div className="flex items-center space-x-2 text-txt-secondary border-b border-border-subtle pb-2">
        <Calculator size={16} className="text-accent-primary" />
        <span className="font-bold text-txt-primary">{tupleTitle}</span>
      </div>

      <div className="bg-bg-surface2/80 p-3 rounded-lg border border-border-subtle space-y-2 text-txt-primary">
        <div>
          <span className="text-accent-primary font-bold">Q</span> = &#123;{' '}
          {tuple5.states.length > 0 ? tuple5.states.join(', ') : '∅'} &#125;{' '}
          <span className="text-txt-muted text-[11px]">(Finite Set of States)</span>
        </div>
        <div>
          <span className="text-semantic-info font-bold">Σ</span> = &#123;{' '}
          {machineType === 'PDA'
            ? pdaAlphabets.inputAlphabet.length > 0
              ? pdaAlphabets.inputAlphabet.join(', ')
              : '∅'
            : tuple5.alphabet.length > 0
            ? tuple5.alphabet.join(', ')
            : '∅'}{' '}
          &#125; <span className="text-txt-muted text-[11px]">(Input Alphabet Set)</span>
        </div>
        {machineType === 'TM' && (
          <div>
            <span className="text-accent-secondary font-bold">B</span> = {blankSymbol}{' '}
            <span className="text-txt-muted text-[11px]">(Tape Blank Symbol)</span>
          </div>
        )}
        {machineType === 'PDA' && (
          <>
            <div>
              <span className="text-accent-secondary font-bold">Γ</span> = &#123;{' '}
              {pdaAlphabets.stackAlphabet.length > 0 ? pdaAlphabets.stackAlphabet.join(', ') : '∅'} &#125;{' '}
              <span className="text-txt-muted text-[11px]">(Stack Alphabet Set)</span>
            </div>
            <div>
              <span className="text-accent-secondary font-bold">Z₀</span> = {initialStackSymbol}{' '}
              <span className="text-txt-muted text-[11px]">(Initial Stack Symbol)</span>
            </div>
          </>
        )}
        <div>
          <span className="text-txt-secondary font-bold">q₀</span> ={' '}
          {tuple5.initialState ? tuple5.initialState : 'Unassigned'}{' '}
          <span className="text-txt-muted text-[11px]">(Start / Initial State)</span>
        </div>
        <div>
          <span className="text-semantic-accept font-bold">F</span> = &#123;{' '}
          {tuple5.acceptingStates.length > 0 ? tuple5.acceptingStates.join(', ') : '∅'} &#125;{' '}
          <span className="text-txt-muted text-[11px]">(Set of Accepting States)</span>
        </div>
        <div className="pt-2 border-t border-border-subtle text-txt-secondary space-y-1">
          <div>
            <span className="font-bold text-accent-primary">δ</span> :{' '}
            {machineType === 'TM'
              ? 'Q × Γ → Q × Γ × {L, R, S}'
              : machineType === 'PDA'
              ? pdaDeterminism?.isDeterministic
                ? 'Q × (Σ ∪ {ε}) × Γ → Q × Γ* (Deterministic: |δ(q, a, X)| ≤ 1)'
                : 'Q × (Σ ∪ {ε}) × Γ → P(Q × Γ*) (Nondeterministic: |δ(q, a, X)| ≥ 0)'
              : machineType === 'NFA'
              ? 'Q × (Σ ∪ {ε}) → P(Q)'
              : 'Q × Σ → Q'}{' '}
            <span className="text-txt-muted text-[11px]">({tuple5.transitions.length} total transitions)</span>
          </div>
          {machineType === 'PDA' && pdaDeterminism && (
            <div className="flex items-center space-x-2 pt-1">
              <span className="text-[11px] font-bold text-txt-muted">Classification:</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1 border ${
                  pdaDeterminism.isDeterministic
                    ? 'bg-semantic-accept/10 text-semantic-accept border-semantic-accept/30'
                    : 'bg-semantic-warning/10 text-semantic-warning border-semantic-warning/30'
                }`}
              >
                {pdaDeterminism.isDeterministic ? (
                  <>
                    <CheckCircle2 size={11} />
                    <span>DPDA (Deterministic Pushdown Automaton)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={11} />
                    <span>NPDA (Nondeterministic Pushdown Automaton — {pdaDeterminism.conflicts.length} conflict(s))</span>
                  </>
                )}
              </span>
            </div>
          )}
        </div>

        {machineType === 'PDA' && (
          <div className="pt-2 border-t border-border-subtle flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-txt-secondary font-bold">Acceptance Criterion:</span>{' '}
              <span className="font-bold text-accent-primary">
                {pdaAcceptanceMode === 'FINAL_STATE'
                  ? 'L(M) — Acceptance by Final State'
                  : pdaAcceptanceMode === 'EMPTY_STACK'
                  ? 'N(M) — Acceptance by Empty Stack'
                  : 'Combined — Final State AND Empty Stack'}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setPdaAcceptanceMode('FINAL_STATE')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                  pdaAcceptanceMode === 'FINAL_STATE'
                    ? 'bg-accent-primary text-txt-on-accent border-accent-primary'
                    : 'bg-bg-surface3 text-txt-secondary border-border-subtle hover:bg-bg-surface2'
                }`}
              >
                L(M) Final State
              </button>
              <button
                type="button"
                onClick={() => setPdaAcceptanceMode('EMPTY_STACK')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                  pdaAcceptanceMode === 'EMPTY_STACK'
                    ? 'bg-accent-primary text-txt-on-accent border-accent-primary'
                    : 'bg-bg-surface3 text-txt-secondary border-border-subtle hover:bg-bg-surface2'
                }`}
              >
                N(M) Empty Stack
              </button>
              <button
                type="button"
                onClick={() => setPdaAcceptanceMode('BOTH')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                  pdaAcceptanceMode === 'BOTH'
                    ? 'bg-accent-primary text-txt-on-accent border-accent-primary'
                    : 'bg-bg-surface3 text-txt-secondary border-border-subtle hover:bg-bg-surface2'
                }`}
              >
                Both Combined
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
