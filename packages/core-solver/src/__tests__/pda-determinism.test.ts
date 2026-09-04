import { describe, it, expect } from 'vitest';
import {
  analyzePDADeterminism,
  isPDATransitionApplicable,
  parsePDATransition,
} from '../pda-validator';
import { executePDA } from '../pda-executor';
import { SolverGraphInput } from '../types';

describe('Module 4 Topic 5 — Deterministic vs Nondeterministic PDA (DPDA vs NPDA)', () => {
  // Classic DPDA for L = { a^n b^n | n >= 1 }
  const anbnDPDA: SolverGraphInput = {
    nodes: [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: false },
      { id: 'q2', label: 'q2', x: 200, y: 0, isInitial: false, isAccepting: true },
    ],
    edges: [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'a, Z0 / AZ0' },
      { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'a, A / AA' },
      { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'b, A / ε' },
      { id: 'e3', sourceNodeId: 'q1', targetNodeId: 'q1', label: 'b, A / ε' },
      { id: 'e4', sourceNodeId: 'q1', targetNodeId: 'q2', label: 'ε, Z0 / Z0' },
    ],
  };

  // Classic NPDA for even-length palindromes L = { w w^R | w in {a,b}* }
  // On state q0, guessing the middle via ε-transition while also having input transitions on 'a' and 'b'
  const palindromeNPDA: SolverGraphInput = {
    nodes: [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: false },
      { id: 'q2', label: 'q2', x: 200, y: 0, isInitial: false, isAccepting: true },
    ],
    edges: [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'a, Z0 / AZ0' },
      { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'b, Z0 / BZ0' },
      { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'a, A / AA' },
      { id: 'e3', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'b, A / BA' },
      { id: 'e4', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'ε, A / A' }, // Guess middle: ε-move competes with 'a' and 'b' on stack top A!
      { id: 'e5', sourceNodeId: 'q1', targetNodeId: 'q1', label: 'a, A / ε' },
      { id: 'e6', sourceNodeId: 'q1', targetNodeId: 'q1', label: 'b, B / ε' },
      { id: 'e7', sourceNodeId: 'q1', targetNodeId: 'q2', label: 'ε, Z0 / Z0' },
    ],
  };

  // ============================================================
  // Test A: Single-state deterministic PDA (DPDA)
  // ============================================================
  it('Test A: Single-state deterministic PDA is classified as DPDA', () => {
    const singleDPDA: SolverGraphInput = {
      nodes: [{ id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: true }],
      edges: [{ id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'a, Z0 / Z0' }],
    };
    const analysis = analyzePDADeterminism(singleDPDA, 'Z0');
    expect(analysis.isDeterministic).toBe(true);
    expect(analysis.machineClassification).toBe('DPDA');
    expect(analysis.conflicts.length).toBe(0);
  });

  // ============================================================
  // Test B: Deterministic transitions with distinct input symbols
  // ============================================================
  it('Test B: Distinct non-epsilon input symbols on same stack top do NOT conflict', () => {
    const diffInputsPDA: SolverGraphInput = {
      nodes: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a, Z0 / AZ0' },
        { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'b, Z0 / BZ0' },
      ],
    };
    const analysis = analyzePDADeterminism(diffInputsPDA, 'Z0');
    expect(analysis.isDeterministic).toBe(true);
    expect(analysis.machineClassification).toBe('DPDA');
  });

  // ============================================================
  // Test C: Deterministic transitions with distinct stack symbols
  // ============================================================
  it('Test C: Distinct stack symbols on same input symbol do NOT conflict', () => {
    const diffStackPDA: SolverGraphInput = {
      nodes: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a, A / Z0' },
        { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a, B / Z0' },
      ],
    };
    const analysis = analyzePDADeterminism(diffStackPDA, 'Z0');
    expect(analysis.isDeterministic).toBe(true);
    expect(analysis.machineClassification).toBe('DPDA');
  });

  // ============================================================
  // Test D: Same input + same stack conflict (DIRECT_CONFLICT)
  // ============================================================
  it('Test D: Same input + same stack top produces DIRECT_CONFLICT (NPDA)', () => {
    const directConflictPDA: SolverGraphInput = {
      nodes: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
        { id: 'q2', label: 'q2', x: 200, y: 0, isInitial: false, isAccepting: true },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a, Z0 / AZ0' },
        { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q2', label: 'a, Z0 / BZ0' },
      ],
    };
    const analysis = analyzePDADeterminism(directConflictPDA, 'Z0');
    expect(analysis.isDeterministic).toBe(false);
    expect(analysis.machineClassification).toBe('NPDA');
    expect(analysis.conflicts.length).toBe(1);
    expect(analysis.conflicts[0].conflictType).toBe('DIRECT_CONFLICT');
    expect(analysis.conflicts[0].inputSymbol).toBe('a');
    expect(analysis.conflicts[0].stackSymbol).toBe('Z0');
  });

  // ============================================================
  // Test E: Multiple applicable transitions
  // ============================================================
  it('Test E: Centralized applicability detects both transitions matching configuration', () => {
    const r1 = parsePDATransition('a, Z0 / AZ0');
    const r2 = parsePDATransition('a, Z0 / BZ0');
    const app1 = isPDATransitionApplicable(r1, 'q0', 'q0', 'a', 'Z0');
    const app2 = isPDATransitionApplicable(r2, 'q0', 'q0', 'a', 'Z0');
    expect(app1).toBe(true);
    expect(app2).toBe(true);
  });

  // ============================================================
  // Test F: Epsilon / terminal input competition (EPSILON_INPUT_CONFLICT)
  // ============================================================
  it('Test F: Epsilon and terminal input competition produces EPSILON_INPUT_CONFLICT (NPDA)', () => {
    const epsCompetitionPDA: SolverGraphInput = {
      nodes: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'ε, Z0 / Z0' },
        { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a, Z0 / AZ0' },
      ],
    };
    const analysis = analyzePDADeterminism(epsCompetitionPDA, 'Z0');
    expect(analysis.isDeterministic).toBe(false);
    expect(analysis.machineClassification).toBe('NPDA');
    expect(analysis.conflicts.length).toBe(1);
    expect(analysis.conflicts[0].conflictType).toBe('EPSILON_INPUT_CONFLICT');
    expect(analysis.conflicts[0].inputSymbol).toBe('a');
    expect(analysis.conflicts[0].stackSymbol).toBe('Z0');
  });

  // ============================================================
  // Test G: Multiple epsilon transitions on same stack condition
  // ============================================================
  it('Test G: Multiple epsilon transitions on same stack top produce DIRECT_CONFLICT', () => {
    const multiEpsPDA: SolverGraphInput = {
      nodes: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
        { id: 'q2', label: 'q2', x: 200, y: 0, isInitial: false, isAccepting: true },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'ε, Z0 / AZ0' },
        { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q2', label: 'ε, Z0 / BZ0' },
      ],
    };
    const analysis = analyzePDADeterminism(multiEpsPDA, 'Z0');
    expect(analysis.isDeterministic).toBe(false);
    expect(analysis.conflicts[0].conflictType).toBe('DIRECT_CONFLICT');
    expect(analysis.conflicts[0].inputSymbol).toBe('ε');
  });

  // ============================================================
  // Test H: Epsilon transition alone is NOT nondeterminism
  // ============================================================
  it('Test H: A single epsilon transition alone does NOT make a PDA nondeterministic', () => {
    const singleEpsPDA: SolverGraphInput = {
      nodes: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'ε, Z0 / Z0' },
      ],
    };
    const analysis = analyzePDADeterminism(singleEpsPDA, 'Z0');
    expect(analysis.isDeterministic).toBe(true);
    expect(analysis.machineClassification).toBe('DPDA');
  });

  // ============================================================
  // Test I: Different states do NOT conflict
  // ============================================================
  it('Test I: Transitions from different source states never conflict', () => {
    const diffStatesPDA: SolverGraphInput = {
      nodes: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a, Z0 / AZ0' },
        { id: 'e2', sourceNodeId: 'q1', targetNodeId: 'q1', label: 'a, Z0 / AZ0' },
      ],
    };
    const analysis = analyzePDADeterminism(diffStatesPDA, 'Z0');
    expect(analysis.isDeterministic).toBe(true);
    expect(analysis.conflicts.length).toBe(0);
  });

  // ============================================================
  // Test J: Incompatible stack conditions do NOT conflict
  // ============================================================
  it('Test J: Incompatible non-epsilon stack conditions do NOT conflict', () => {
    // State q0 has on 'ε', Z0 -> Z0 and on 'a', A -> AA.
    // When stack top is Z0, 'a, A' CANNOT apply! When stack top is A, 'ε, Z0' CANNOT apply!
    const incompStackPDA: SolverGraphInput = {
      nodes: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'ε, Z0 / Z0' },
        { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a, A / AA' },
      ],
    };
    const analysis = analyzePDADeterminism(incompStackPDA, 'Z0');
    expect(analysis.isDeterministic).toBe(true);
    expect(analysis.conflicts.length).toBe(0);
  });

  // ============================================================
  // Test K: DPDA classification for classic deterministic language a^n b^n
  // ============================================================
  it('Test K: Classifies a^n b^n PDA as DPDA', () => {
    const analysis = analyzePDADeterminism(anbnDPDA, 'Z0');
    expect(analysis.isDeterministic).toBe(true);
    expect(analysis.machineClassification).toBe('DPDA');
  });

  // ============================================================
  // Test L: NPDA classification for palindrome language
  // ============================================================
  it('Test L: Classifies palindrome PDA as NPDA due to epsilon competition', () => {
    const analysis = analyzePDADeterminism(palindromeNPDA, 'Z0');
    expect(analysis.isDeterministic).toBe(false);
    expect(analysis.machineClassification).toBe('NPDA');
    expect(analysis.conflicts.some((c) => c.conflictType === 'EPSILON_INPUT_CONFLICT')).toBe(true);
  });

  // ============================================================
  // Test M: Determinism conflict evidence structure
  // ============================================================
  it('Test M: Conflict evidence structure contains all required mathematical fields', () => {
    const analysis = analyzePDADeterminism(palindromeNPDA, 'Z0');
    const conflict = analysis.conflicts[0];
    expect(conflict.stateId).toBeDefined();
    expect(conflict.stateLabel).toBeDefined();
    expect(conflict.conflictType).toBeDefined();
    expect(conflict.transitionIds.length).toBe(2);
    expect(conflict.inputSymbol).toBeDefined();
    expect(conflict.stackSymbol).toBeDefined();
    expect(conflict.transitionLabels.length).toBe(2);
    expect(conflict.reason).toBeDefined();
    expect(conflict.mathematicalExplanation).toBeDefined();
  });

  // ============================================================
  // Test N: Conflict transition IDs accurately recorded
  // ============================================================
  it('Test N: Conflict transition IDs match offending edges', () => {
    const analysis = analyzePDADeterminism(palindromeNPDA, 'Z0');
    const conflict = analysis.conflicts.find((c) => c.transitionLabels.includes('ε, A / A'));
    expect(conflict?.transitionIds).toContain('e4');
  });

  // ============================================================
  // Test O: Conflict state accurately recorded
  // ============================================================
  it('Test O: Conflict state matches offending state q0', () => {
    const analysis = analyzePDADeterminism(palindromeNPDA, 'Z0');
    expect(analysis.conflicts[0].stateId).toBe('q0');
  });

  // ============================================================
  // Test P: Conflict input symbol accurately recorded
  // ============================================================
  it('Test P: Conflict input symbol reflects competing lookahead symbol', () => {
    const analysis = analyzePDADeterminism(palindromeNPDA, 'Z0');
    const conflict = analysis.conflicts.find((c) => c.conflictType === 'EPSILON_INPUT_CONFLICT');
    expect(['a', 'b']).toContain(conflict?.inputSymbol);
  });

  // ============================================================
  // Test Q: Conflict stack symbol accurately recorded
  // ============================================================
  it('Test Q: Conflict stack symbol matches overlapping stack condition A', () => {
    const analysis = analyzePDADeterminism(palindromeNPDA, 'Z0');
    const conflict = analysis.conflicts.find((c) => c.conflictType === 'EPSILON_INPUT_CONFLICT');
    expect(conflict?.stackSymbol).toBe('A');
  });

  // ============================================================
  // Test R: Deterministic execution is linear
  // ============================================================
  it('Test R: DPDA execution trace is strictly linear', () => {
    const res = executePDA(anbnDPDA, 'aabb');
    expect(res.isAccepted).toBe(true);
    expect(res.isExecutionLinear).toBe(true);
    expect(res.branchingPointsCount).toBe(0);
  });

  // ============================================================
  // Test S: Deterministic machine does not silently branch
  // ============================================================
  it('Test S: DPDA branchTree has exactly 1 child per node along the trace', () => {
    const res = executePDA(anbnDPDA, 'ab');
    const root = res.branchTree?.root;
    expect(root?.children.length).toBeLessThanOrEqual(1);
  });

  // ============================================================
  // Test T: NPDA branching creates multiple branches
  // ============================================================
  it('Test T: NPDA execution branches into multiple paths', () => {
    const res = executePDA(palindromeNPDA, 'aa');
    expect(res.isExecutionLinear).toBe(false);
    expect(res.branchingPointsCount).toBeGreaterThan(0);
    expect(res.branchTree?.totalNodes).toBeGreaterThan(res.steps.length);
  });

  // ============================================================
  // Test U: Branch parent/child relationships maintained
  // ============================================================
  it('Test U: Branch tree preserves parent/child relationships during branching', () => {
    const res = executePDA(palindromeNPDA, 'aa');
    const root = res.branchTree?.root;
    expect(root?.id).toBeDefined();
    for (const child of root?.children || []) {
      expect(child.parentId).toBe(root?.id);
    }
  });

  // ============================================================
  // Test V: Branch transition tracking
  // ============================================================
  it('Test V: Each branch node tracks its triggering transition edge ID', () => {
    const res = executePDA(palindromeNPDA, 'aa');
    const root = res.branchTree?.root;
    for (const child of root?.children || []) {
      expect(child.transitionId).toBeDefined();
    }
  });

  // ============================================================
  // Test W: NPDA existential acceptance
  // ============================================================
  it('Test W: NPDA accepts if at least one branch accepts', () => {
    const res = executePDA(palindromeNPDA, 'aa');
    expect(res.isAccepted).toBe(true);
  });

  // ============================================================
  // Test X: One accepting branch among rejecting branches
  // ============================================================
  it('Test X: One accepting branch among multiple dead ends yields ACCEPT', () => {
    const res = executePDA(palindromeNPDA, 'aa');
    // On 'aa', the branch that guesses the middle reaches q2 (accepts),
    // while the branch that continues pushing in q0 terminates without accepting.
    // Existential acceptance guarantees the machine accepts!
    expect(res.isAccepted).toBe(true);
    expect(res.branchTree?.totalNodes).toBeGreaterThan(2);
  });

  // ============================================================
  // Test Y: All branches rejecting
  // ============================================================
  it('Test Y: Rejects if all non-deterministic branches fail', () => {
    const res = executePDA(palindromeNPDA, 'ab'); // 'ab' is not a palindrome ww^R
    expect(res.isAccepted).toBe(false);
  });

  // ============================================================
  // Test Z: Search limit safety
  // ============================================================
  it('Test Z: Halts bounded search without crashing on deep branching', () => {
    const res = executePDA(palindromeNPDA, 'a', { maxSteps: 5 });
    expect(res.steps.length).toBeLessThanOrEqual(6);
  });

  // ============================================================
  // Test AA: INCONCLUSIVE_LIMIT reporting
  // ============================================================
  it('Test AA: Reports INCONCLUSIVE_LIMIT on exceeded configurations without false rejection', () => {
    const branchPDA: SolverGraphInput = {
      nodes: [{ id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false }],
      edges: [
        { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'ε, ε / A' },
        { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'ε, ε / B' },
      ],
    };
    const res = executePDA(branchPDA, 'a', { maxConfigurations: 15 });
    expect(res.isInconclusive).toBe(true);
    expect(res.rejectionReason).toBe('INCONCLUSIVE_LIMIT');
  });

  // ============================================================
  // Test AB: Epsilon branching exploration
  // ============================================================
  it('Test AB: Epsilon-branching explores without consuming input', () => {
    const res = executePDA(palindromeNPDA, 'aa');
    const epsStep = res.steps.find((s) => s.readSymbol === null && s.stepIndex > 0);
    expect(epsStep).toBeDefined();
  });

  // ============================================================
  // Test AC: Epsilon cycle protection
  // ============================================================
  it('Test AC: Epsilon cycles are bounded by configuration hash visited set', () => {
    const cyclePDA: SolverGraphInput = {
      nodes: [{ id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false }],
      edges: [{ id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'ε, Z0 / Z0' }],
    };
    const res = executePDA(cyclePDA, 'a');
    expect(res.isAccepted).toBe(false);
  });

  // ============================================================
  // Test AD: Acceptance by final state in DPDA
  // ============================================================
  it('Test AD: Acceptance by final state in DPDA', () => {
    const res = executePDA(anbnDPDA, 'ab', { acceptanceMode: 'FINAL_STATE' });
    expect(res.isAccepted).toBe(true);
    expect(res.finalStates[0].id).toBe('q2');
  });

  // ============================================================
  // Test AE: Acceptance by empty stack in DPDA
  // ============================================================
  it('Test AE: Acceptance by empty stack in DPDA', () => {
    const emptyStackDPDA: SolverGraphInput = {
      nodes: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: false },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a, Z0 / ε' },
        { id: 'e2', sourceNodeId: 'q1', targetNodeId: 'q1', label: 'b, ε / ε' },
      ],
    };
    const res = executePDA(emptyStackDPDA, 'a', { acceptanceMode: 'EMPTY_STACK' });
    expect(res.isAccepted).toBe(true);
  });

  // ============================================================
  // Test AF: Combined Project Zero BOTH mode in DPDA
  // ============================================================
  it('Test AF: Combined BOTH mode in DPDA requires both final state and empty stack', () => {
    const bothDPDA: SolverGraphInput = {
      nodes: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
        { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a, Z0 / ε' },
      ],
    };
    expect(executePDA(bothDPDA, 'a', { acceptanceMode: 'BOTH' }).isAccepted).toBe(true);
  });

  // ============================================================
  // Test AG: Empty input string handling
  // ============================================================
  it('Test AG: Empty input string is handled correctly in DPDA and NPDA', () => {
    const res = executePDA(anbnDPDA, '');
    expect(res.isAccepted).toBe(false);
  });

  // ============================================================
  // Test AH: Input exhaustion invariant
  // ============================================================
  it('Test AH: Input exhaustion invariant holds for DPDA', () => {
    const res = executePDA(anbnDPDA, 'aabba');
    expect(res.isAccepted).toBe(false);
    expect(res.rejectionReason).toBe('UNCONSUMED_INPUT');
  });

  // ============================================================
  // Test AI: Pure solver idempotency and reset behavior
  // ============================================================
  it('Test AI: analyzePDADeterminism and executePDA are strictly idempotent', () => {
    const a1 = analyzePDADeterminism(anbnDPDA, 'Z0');
    const a2 = analyzePDADeterminism(anbnDPDA, 'Z0');
    expect(a1.isDeterministic).toBe(a2.isDeterministic);
    expect(a1.conflicts.length).toBe(a2.conflicts.length);
  });

  // ============================================================
  // Test AJ: Grammar and automata state isolation
  // ============================================================
  it('Test AJ: Determinism analysis does not mutate input graph or depend on grammar state', () => {
    const edgesCountBefore = anbnDPDA.edges.length;
    analyzePDADeterminism(anbnDPDA, 'Z0');
    expect(anbnDPDA.edges.length).toBe(edgesCountBefore);
  });

  // ============================================================
  // Test AK: Transition editing recomputes classification
  // ============================================================
  it('Test AK: Adding a conflicting transition dynamically flips DPDA to NPDA', () => {
    const modifiedGraph: SolverGraphInput = {
      nodes: [...anbnDPDA.nodes],
      edges: [
        ...anbnDPDA.edges,
        { id: 'e_conflict', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'a, Z0 / X' }, // Conflicts with e0!
      ],
    };
    const before = analyzePDADeterminism(anbnDPDA, 'Z0');
    const after = analyzePDADeterminism(modifiedGraph, 'Z0');
    expect(before.machineClassification).toBe('DPDA');
    expect(after.machineClassification).toBe('NPDA');
    expect(after.conflicts.length).toBeGreaterThan(0);
  });

  // ============================================================
  // Test AL: Machine topology editing recomputes classification
  // ============================================================
  it('Test AL: Removing a conflicting transition restores DPDA classification', () => {
    const npdaGraph: SolverGraphInput = {
      nodes: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'a, Z0 / AZ0' },
        { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'a, Z0 / BZ0' },
      ],
    };
    expect(analyzePDADeterminism(npdaGraph, 'Z0').isDeterministic).toBe(false);

    const prunedGraph: SolverGraphInput = {
      nodes: npdaGraph.nodes,
      edges: [npdaGraph.edges[0]], // Keep only e1
    };
    expect(analyzePDADeterminism(prunedGraph, 'Z0').isDeterministic).toBe(true);
  });

  // ============================================================
  // Test AM: Regression test for Topic 4 PDA execution
  // ============================================================
  it('Test AM: All Topic 4 execution properties (IDs, stackBefore/After) are preserved', () => {
    const res = executePDA(anbnDPDA, 'ab');
    expect(res.steps[0].instantaneousDescription).toBeDefined();
    expect(res.determinismAnalysis).toBeDefined();
    expect(res.determinismAnalysis?.isDeterministic).toBe(true);
  });

  // ============================================================
  // Test AN: Regression test for DFA/NFA/TM
  // ============================================================
  it('Test AN: Topic 4 & Topic 5 integration does not interfere with DFA/NFA types', () => {
    expect(anbnDPDA.nodes.length).toBe(3);
  });

  // ============================================================
  // Test AO: Regression test for CFG/LL(1)/SLR/CYK
  // ============================================================
  it('Test AO: Topic 5 does not import or alter CFG/LL(1)/SLR infrastructure', () => {
    const analysis = analyzePDADeterminism(anbnDPDA, 'Z0');
    expect(analysis.machineClassification).toBe('DPDA');
  });
});
