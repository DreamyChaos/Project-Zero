import React, { useMemo } from 'react';
import { useGraph } from '../../../context/GraphContext';
import { Calculator } from 'lucide-react';

export const FormalDefinitionTab: React.FC = () => {
  const { to5Tuple, machineType, initialStackSymbol, blankSymbol } = useGraph();
  const tuple5 = useMemo(() => to5Tuple(), [to5Tuple]);

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
          {tuple5.alphabet.length > 0 ? tuple5.alphabet.join(', ') : '∅'} &#125;{' '}
          <span className="text-txt-muted text-[11px]">(Input Alphabet Set)</span>
        </div>
        {machineType === 'TM' && (
          <div>
            <span className="text-accent-secondary font-bold">B</span> = {blankSymbol}{' '}
            <span className="text-txt-muted text-[11px]">(Tape Blank Symbol)</span>
          </div>
        )}
        {machineType === 'PDA' && (
          <div>
            <span className="text-accent-secondary font-bold">Z₀</span> = {initialStackSymbol}{' '}
            <span className="text-txt-muted text-[11px]">(Initial Stack Symbol)</span>
          </div>
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
        <div className="pt-2 border-t border-border-subtle text-txt-secondary">
          <span className="font-bold text-accent-primary">δ</span> :{' '}
          {machineType === 'TM'
            ? 'Q × Γ → Q × Γ × {L, R, S}'
            : machineType === 'PDA'
            ? 'Q × (Σ ∪ {ε}) × Γ → P(Q × Γ*)'
            : machineType === 'NFA'
            ? 'Q × (Σ ∪ {ε}) → P(Q)'
            : 'Q × Σ → Q'}{' '}
          <span className="text-txt-muted text-[11px]">(Transition Function: {tuple5.transitions.length} total)</span>
        </div>
      </div>
    </div>
  );
};

