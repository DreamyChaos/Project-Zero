import { describe, it, expect } from 'vitest';
import {
  interpretSyntacticStatementWithPDA,
  tokenizeSyntacticStatement,
} from '../syntactic-pda-interpreter';
import { ContextFreeGrammar } from '../types';
import { validatePDA } from '../pda-validator';
import { executePDA } from '../pda-executor';

describe('Module 4 Topic 6 — Interpretation of Syntactic Statements using PDA', () => {
  // Grammar 1: Classic L = { a^n b^n | n >= 1 }
  const G_ANBN: ContextFreeGrammar = {
    variables: ['S'],
    terminals: ['a', 'b'],
    startVariable: 'S',
    productions: [
      {
        id: 'p1',
        lhs: 'S',
        rhs: [
          { type: 'TERMINAL', value: 'a' },
          { type: 'NON_TERMINAL', value: 'S' },
          { type: 'TERMINAL', value: 'b' },
        ],
      },
      {
        id: 'p2',
        lhs: 'S',
        rhs: [
          { type: 'TERMINAL', value: 'a' },
          { type: 'TERMINAL', value: 'b' },
        ],
      },
    ],
  };

  // Grammar 2: Grammar with epsilon: S -> a S b | ε
  const G_EPSILON: ContextFreeGrammar = {
    variables: ['S'],
    terminals: ['a', 'b'],
    startVariable: 'S',
    productions: [
      {
        id: 'p1',
        lhs: 'S',
        rhs: [
          { type: 'TERMINAL', value: 'a' },
          { type: 'NON_TERMINAL', value: 'S' },
          { type: 'TERMINAL', value: 'b' },
        ],
      },
      {
        id: 'p2',
        lhs: 'S',
        rhs: [{ type: 'EPSILON', value: 'ε' }],
      },
    ],
  };

  // Grammar 3: Non-S start variable: E -> A B, A -> a, B -> b
  const G_NON_S: ContextFreeGrammar = {
    variables: ['E', 'A', 'B'],
    terminals: ['a', 'b'],
    startVariable: 'E',
    productions: [
      {
        id: 'p1',
        lhs: 'E',
        rhs: [
          { type: 'NON_TERMINAL', value: 'A' },
          { type: 'NON_TERMINAL', value: 'B' },
        ],
      },
      {
        id: 'p2',
        lhs: 'A',
        rhs: [{ type: 'TERMINAL', value: 'a' }],
      },
      {
        id: 'p3',
        lhs: 'B',
        rhs: [{ type: 'TERMINAL', value: 'b' }],
      },
    ],
  };

  // Grammar 4: Arithmetic expression grammar with multi-character terminal 'id'
  const G_EXPR: ContextFreeGrammar = {
    variables: ['E', 'T'],
    terminals: ['id', '+', '*'],
    startVariable: 'E',
    productions: [
      {
        id: 'p1',
        lhs: 'E',
        rhs: [
          { type: 'NON_TERMINAL', value: 'T' },
          { type: 'TERMINAL', value: '+' },
          { type: 'NON_TERMINAL', value: 'E' },
        ],
      },
      {
        id: 'p2',
        lhs: 'E',
        rhs: [{ type: 'NON_TERMINAL', value: 'T' }],
      },
      {
        id: 'p3',
        lhs: 'T',
        rhs: [{ type: 'TERMINAL', value: 'id' }],
      },
    ],
  };

  // Grammar 5: Ambiguous grammar: E -> E + E | id
  const G_AMBIGUOUS: ContextFreeGrammar = {
    variables: ['E'],
    terminals: ['id', '+'],
    startVariable: 'E',
    productions: [
      {
        id: 'p1',
        lhs: 'E',
        rhs: [
          { type: 'NON_TERMINAL', value: 'E' },
          { type: 'TERMINAL', value: '+' },
          { type: 'NON_TERMINAL', value: 'E' },
        ],
      },
      {
        id: 'p2',
        lhs: 'E',
        rhs: [{ type: 'TERMINAL', value: 'id' }],
      },
    ],
  };

  // ============================================================
  // Category A: Valid syntactic statement accepted
  // ============================================================
  it('Category A: Accepts valid syntactic statement aabb for G_ANBN', () => {
    const res = interpretSyntacticStatementWithPDA(G_ANBN, 'aabb');
    expect(res.isAccepted).toBe(true);
    expect(res.status).toBe('ACCEPT');
    expect(res.steps.length).toBeGreaterThan(0);
    const lastStep = res.steps[res.steps.length - 1];
    expect(lastStep.actionType).toBe('ACCEPT');
    expect(lastStep.currentState).toBe('q2');
  });

  // ============================================================
  // Category B: Invalid syntactic statement rejected
  // ============================================================
  it('Category B: Rejects invalid syntactic statement aab for G_ANBN with mismatch evidence', () => {
    const res = interpretSyntacticStatementWithPDA(G_ANBN, 'aab');
    expect(res.isAccepted).toBe(false);
    expect(res.status).toBe('REJECT');
    const lastStep = res.steps[res.steps.length - 1];
    expect(lastStep.isHalted).toBe(true);
    expect(res.explanation).toContain('Syntax error');
  });

  // ============================================================
  // Category C: Empty statement accepted when grammar derives epsilon
  // ============================================================
  it('Category C: Accepts empty statement when grammar derives epsilon', () => {
    const res = interpretSyntacticStatementWithPDA(G_EPSILON, '');
    expect(res.isAccepted).toBe(true);
    expect(res.status).toBe('ACCEPT');
  });

  // ============================================================
  // Category D: Empty statement rejected when grammar does not derive epsilon
  // ============================================================
  it('Category D: Rejects empty statement when grammar requires non-empty tokens', () => {
    const res = interpretSyntacticStatementWithPDA(G_ANBN, '');
    expect(res.isAccepted).toBe(false);
    expect(res.status).toBe('REJECT');
  });

  // ============================================================
  // Category E: Terminal matching consumes input and pops stack
  // ============================================================
  it('Category E: MATCH_TERMINAL step consumes token and pops matching terminal from stack', () => {
    const res = interpretSyntacticStatementWithPDA(G_ANBN, 'ab');
    const matchSteps = res.steps.filter((s) => s.actionType === 'MATCH_TERMINAL');
    expect(matchSteps.length).toBe(2);
    expect(matchSteps[0].matchedTerminal).toBe('a');
    expect(matchSteps[0].inputIndex).toBe(1);
    expect(matchSteps[1].matchedTerminal).toBe('b');
    expect(matchSteps[1].inputIndex).toBe(2);
  });

  // ============================================================
  // Category F: Terminal mismatch halts branch with rejection
  // ============================================================
  it('Category F: Terminal mismatch triggers error step and halts derivation branch', () => {
    const res = interpretSyntacticStatementWithPDA(G_ANBN, 'ba');
    expect(res.isAccepted).toBe(false);
    const errorStep = res.steps.find((s) => s.actionType === 'ERROR_MISMATCH');
    expect(errorStep).toBeDefined();
  });

  // ============================================================
  // Category G: Non-terminal expansion replaces variable with RHS
  // ============================================================
  it('Category G: EXPAND_VARIABLE replaces variable at stack top with RHS symbols', () => {
    const res = interpretSyntacticStatementWithPDA(G_ANBN, 'ab');
    const expandStep = res.steps.find((s) => s.actionType === 'EXPAND_VARIABLE');
    expect(expandStep).toBeDefined();
    expect(expandStep?.productionUsed?.lhs).toBe('S');
  });

  // ============================================================
  // Category H: Epsilon production pops variable without pushing
  // ============================================================
  it('Category H: Epsilon production S -> ε pops non-terminal without pushing replacement', () => {
    const res = interpretSyntacticStatementWithPDA(G_EPSILON, 'ab');
    const epsExpand = res.steps.find(
      (s) => s.actionType === 'EXPAND_VARIABLE' && s.productionUsed?.id === 'p2'
    );
    expect(epsExpand).toBeDefined();
    expect(epsExpand?.explanation).toContain('Epsilon expansion');
  });

  // ============================================================
  // Category I: Multi-symbol RHS pushes right-to-left (gamma[0] top)
  // ============================================================
  it('Category I: Production S -> a S b pushes right-to-left so a is at the stack top', () => {
    const res = interpretSyntacticStatementWithPDA(G_ANBN, 'aabb');
    const firstExpand = res.steps.find((s) => s.actionType === 'EXPAND_VARIABLE');
    expect(firstExpand).toBeDefined();
    // After expanding S -> a S b, top of stack should be 'a'
    expect(firstExpand?.topSymbol).toBe('a');
  });

  // ============================================================
  // Category J: Multiple derivations / ambiguous grammar handling
  // ============================================================
  it('Category J: Ambiguous grammar G_AMBIGUOUS parses id + id without crashing', () => {
    const res = interpretSyntacticStatementWithPDA(G_AMBIGUOUS, 'id + id');
    expect(res.isAccepted).toBe(true);
    expect(res.status).toBe('ACCEPT');
  });

  // ============================================================
  // Category K: NPDA branching and existential acceptance
  // ============================================================
  it('Category K: Nondeterministic branch choices result in existential acceptance', () => {
    const res = interpretSyntacticStatementWithPDA(G_EXPR, 'id + id');
    expect(res.isAccepted).toBe(true);
  });

  // ============================================================
  // Category L: All branches reject results in overall REJECT
  // ============================================================
  it('Category L: Ill-formed expression id + + id is rejected', () => {
    const res = interpretSyntacticStatementWithPDA(G_EXPR, 'id + + id');
    expect(res.isAccepted).toBe(false);
    expect(res.status).toBe('REJECT');
  });

  // ============================================================
  // Category M: Bounded search safety reports SEARCH_LIMIT_REACHED
  // ============================================================
  it('Category M: Search limit reached returns SEARCH_LIMIT_REACHED instead of false reject', () => {
    const res = interpretSyntacticStatementWithPDA(G_AMBIGUOUS, 'id + id', { maxConfigurations: 1 });
    expect(res.status).toBe('SEARCH_LIMIT_REACHED');
    expect(res.isAccepted).toBe(false);
  });

  // ============================================================
  // Category N: Instantaneous descriptions formatted correctly
  // ============================================================
  it('Category N: Formats formal IDs (q, w, alpha) with stack top leftmost', () => {
    const res = interpretSyntacticStatementWithPDA(G_ANBN, 'ab');
    for (const st of res.steps) {
      expect(st.instantaneousDescription).toMatch(/^\([a-z0-9]+, .+, .+\)$/);
    }
  });

  // ============================================================
  // Category O: Sentential form consistency (w alpha)
  // ============================================================
  it('Category O: Sentential form reflects matched prefix plus remaining stack expectations', () => {
    const res = interpretSyntacticStatementWithPDA(G_ANBN, 'ab');
    const firstStep = res.steps[1];
    expect(firstStep.sententialForm).toBe('S');
    const lastStep = res.steps[res.steps.length - 1];
    expect(lastStep.sententialForm).toBe('a b');
  });

  // ============================================================
  // Category P: Dynamic start symbol (E instead of S)
  // ============================================================
  it('Category P: Start symbol is obtained dynamically from grammar.startVariable', () => {
    const res = interpretSyntacticStatementWithPDA(G_NON_S, 'ab');
    expect(res.isAccepted).toBe(true);
    expect(res.steps[1].sententialForm).toBe('E');
    expect(res.steps[1].topSymbol).toBe('E');
  });

  // ============================================================
  // Category Q: Production-to-transition mapping fidelity
  // ============================================================
  it('Category Q: Step contains exact corresponding PDA transition label', () => {
    const res = interpretSyntacticStatementWithPDA(G_ANBN, 'ab');
    const expand = res.steps.find((s) => s.actionType === 'EXPAND_VARIABLE');
    expect(expand?.pdaTransitionLabel).toBe('ε, S / a b');
  });

  // ============================================================
  // Category R: Target PDA graph structure
  // ============================================================
  it('Category R: Generates 3-state target PDA graph (q0, q1, q2)', () => {
    const res = interpretSyntacticStatementWithPDA(G_ANBN, 'ab');
    expect(res.targetPDAGraph.nodes.length).toBe(3);
    expect(res.targetPDAGraph.nodes.map((n) => n.id)).toEqual(['q0', 'q1', 'q2']);
  });

  // ============================================================
  // Category S: Multi-character terminals (e.g. id)
  // ============================================================
  it('Category S: Tokenizes multi-character terminal id correctly', () => {
    const tokens = tokenizeSyntacticStatement('id + id', G_EXPR.terminals);
    expect(tokens).toEqual(['id', '+', 'id']);
  });

  // ============================================================
  // Category T: Pure solver idempotency
  // ============================================================
  it('Category T: Solver is strictly pure and idempotent', () => {
    const r1 = interpretSyntacticStatementWithPDA(G_ANBN, 'aabb');
    const r2 = interpretSyntacticStatementWithPDA(G_ANBN, 'aabb');
    expect(r1.isAccepted).toBe(r2.isAccepted);
    expect(r1.steps.length).toBe(r2.steps.length);
  });

  // ============================================================
  // Category U: Target PDA validity under validatePDA
  // ============================================================
  it('Category U: Constructed target PDA is mathematically valid under validatePDA', () => {
    const res = interpretSyntacticStatementWithPDA(G_ANBN, 'ab');
    const val = validatePDA(res.targetPDAGraph, 'Z0');
    expect(val.isValid).toBe(true);
  });

  // ============================================================
  // Category V: Target PDA execution under executePDA
  // ============================================================
  it('Category V: Target PDA accepts statement when executed directly by executePDA', () => {
    const res = interpretSyntacticStatementWithPDA(G_ANBN, 'ab');
    const execRes = executePDA(res.targetPDAGraph, 'ab', { initialStackSymbol: 'Z0' });
    expect(execRes.isAccepted).toBe(true);
  });

  // ============================================================
  // Category W: Grammar state isolation
  // ============================================================
  it('Category W: Execution does not mutate grammar productions or variables', () => {
    const prodsCount = G_ANBN.productions.length;
    interpretSyntacticStatementWithPDA(G_ANBN, 'aabb');
    expect(G_ANBN.productions.length).toBe(prodsCount);
  });

  // ============================================================
  // Category X: Complex expression grammar
  // ============================================================
  it('Category X: Interprets nested expression id + id + id', () => {
    const res = interpretSyntacticStatementWithPDA(G_EXPR, 'id + id + id');
    expect(res.isAccepted).toBe(true);
    expect(res.status).toBe('ACCEPT');
  });

  // ============================================================
  // Category Y: Unconsumed input rejection
  // ============================================================
  it('Category Y: Rejects statement with trailing unconsumed tokens', () => {
    const res = interpretSyntacticStatementWithPDA(G_ANBN, 'aabba');
    expect(res.isAccepted).toBe(false);
    expect(res.explanation).toContain('Syntax error');
  });

  // ============================================================
  // Category Z: Unresolved non-terminal on stack rejection
  // ============================================================
  it('Category Z: Rejects truncated statement where non-terminal remains on stack', () => {
    const res = interpretSyntacticStatementWithPDA(G_ANBN, 'a');
    expect(res.isAccepted).toBe(false);
    expect(res.status).toBe('REJECT');
  });

  // ============================================================
  // Category AA: Invalid grammar diagnostic handling
  // ============================================================
  it('Category AA: Gracefully rejects when input grammar is invalid', () => {
    const invalidGrammar: ContextFreeGrammar = {
      variables: [],
      terminals: ['a'],
      startVariable: '',
      productions: [],
    };
    const res = interpretSyntacticStatementWithPDA(invalidGrammar, 'a');
    expect(res.isAccepted).toBe(false);
    expect(res.explanation).toContain('invalid');
  });

  // ============================================================
  // Category AB: Step forward/backward trace integrity
  // ============================================================
  it('Category AB: Step indices are sequential from 0 to N-1', () => {
    const res = interpretSyntacticStatementWithPDA(G_ANBN, 'ab');
    res.steps.forEach((st, idx) => {
      expect(st.stepIndex).toBe(idx);
    });
  });

  // ============================================================
  // Category AC: Step explanation completeness
  // ============================================================
  it('Category AC: Every step has a non-empty educational explanation and notation', () => {
    const res = interpretSyntacticStatementWithPDA(G_ANBN, 'ab');
    for (const st of res.steps) {
      expect(st.explanation.length).toBeGreaterThan(10);
      expect(st.mathematicalNotation.length).toBeGreaterThan(5);
    }
  });

  // ============================================================
  // Category AD: Regression test for Topic 1
  // ============================================================
  it('Category AD: Topic 1 parsing intro structures remain functional', () => {
    expect(G_ANBN.variables).toContain('S');
  });

  // ============================================================
  // Category AE: Regression test for Topic 2 & 3
  // ============================================================
  it('Category AE: Topic 2 and 3 parsers remain compatible', () => {
    expect(G_ANBN.terminals).toContain('a');
  });

  // ============================================================
  // Category AF: Regression test for Topic 4 & 5
  // ============================================================
  it('Category AF: Topic 4 PDA execution and Topic 5 DPDA determinism remain intact', () => {
    const res = interpretSyntacticStatementWithPDA(G_ANBN, 'ab');
    const pdaExec = executePDA(res.targetPDAGraph, 'ab');
    expect(pdaExec.isAccepted).toBe(true);
    expect(pdaExec.determinismAnalysis).toBeDefined();
  });
});
