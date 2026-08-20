import { describe, it, expect } from 'vitest';
import {
  convertCFGToPDA,
  convertPDAToCFG,
  verifyTranslationRoundTrip,
} from '../pda-cfg-translation';
import { ContextFreeGrammar, SolverGraphInput } from '../types';
import { executePDA } from '../pda-executor';
import { makeProduction, nt, term, EPSILON_SYM } from '../cfg-transformations';

describe('PDA ↔ CFG Translation Engine Hostile Tests', () => {
  // Test Grammars
  const G_SIMPLE_A: ContextFreeGrammar = {
    variables: ['S'],
    terminals: ['a'],
    productions: [makeProduction('S', [term('a')])],
    startVariable: 'S',
  };

  const G_EPSILON: ContextFreeGrammar = {
    variables: ['S'],
    terminals: [],
    productions: [makeProduction('S', [EPSILON_SYM])],
    startVariable: 'S',
  };

  const G_ANBN: ContextFreeGrammar = {
    variables: ['S'],
    terminals: ['a', 'b'],
    productions: [
      makeProduction('S', [term('a'), nt('S'), term('b')]),
      makeProduction('S', [EPSILON_SYM]),
    ],
    startVariable: 'S',
  };

  const G_MULTIPLE_PRODS: ContextFreeGrammar = {
    variables: ['S', 'A'],
    terminals: ['a', 'b'],
    productions: [
      makeProduction('S', [term('a'), nt('A')]),
      makeProduction('A', [term('b')]),
    ],
    startVariable: 'S',
  };

  const G_MULTI_CHAR: ContextFreeGrammar = {
    variables: ['Stmt'],
    terminals: ['while', 'id'],
    productions: [
      makeProduction('Stmt', [term('while'), term('id')]),
    ],
    startVariable: 'Stmt',
  };

  // Test PDAs
  const PDA_ONE_STATE: SolverGraphInput = {
    nodes: [{ id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: true }],
    edges: [{ id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'a, Z0 / Z0' }],
  };

  const PDA_ANBN: SolverGraphInput = {
    nodes: [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: false },
      { id: 'q2', label: 'q2', x: 200, y: 0, isInitial: false, isAccepting: true },
    ],
    edges: [
      { id: 'e0', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'a, Z0 / A Z0' },
      { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q0', label: 'a, A / A A' },
      { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q1', label: 'b, A / ε' },
      { id: 'e3', sourceNodeId: 'q1', targetNodeId: 'q1', label: 'b, A / ε' },
      { id: 'e4', sourceNodeId: 'q1', targetNodeId: 'q2', label: 'ε, Z0 / Z0' },
    ],
  };

  // CFG -> PDA Tests
  describe('CFG → PDA Translation', () => {
    it('1. Converts S → a', () => {
      const res = convertCFGToPDA(G_SIMPLE_A);
      expect(res.success).toBe(true);
      expect(res.targetPDAGraph.nodes.length).toBe(3);
      expect(res.preservation.status).toBe('VERIFIED_BOUNDED');

      const pdaAccepted = executePDA(res.targetPDAGraph, 'a', { initialStackSymbol: res.targetInitialStackSymbol });
      expect(pdaAccepted.isAccepted).toBe(true);

      const pdaRejected = executePDA(res.targetPDAGraph, 'b', { initialStackSymbol: res.targetInitialStackSymbol });
      expect(pdaRejected.isAccepted).toBe(false);
    });

    it('2. Converts S → ε', () => {
      const res = convertCFGToPDA(G_EPSILON);
      expect(res.success).toBe(true);
      expect(res.preservation.status).toBe('VERIFIED_BOUNDED');

      const pdaAccepted = executePDA(res.targetPDAGraph, '', { initialStackSymbol: res.targetInitialStackSymbol });
      expect(pdaAccepted.isAccepted).toBe(true);
    });

    it('3. Converts S → a S b | ε (a^n b^n)', () => {
      const res = convertCFGToPDA(G_ANBN);
      expect(res.success).toBe(true);
      expect(res.preservation.status).toBe('VERIFIED_BOUNDED');

      expect(executePDA(res.targetPDAGraph, 'aabb', { initialStackSymbol: res.targetInitialStackSymbol }).isAccepted).toBe(true);
      expect(executePDA(res.targetPDAGraph, 'aab', { initialStackSymbol: res.targetInitialStackSymbol }).isAccepted).toBe(false);
    });

    it('4. Converts multi-variable CFG', () => {
      const res = convertCFGToPDA(G_MULTIPLE_PRODS);
      expect(res.success).toBe(true);
      expect(executePDA(res.targetPDAGraph, 'ab', { initialStackSymbol: res.targetInitialStackSymbol }).isAccepted).toBe(true);
    });

    it('5. Handles multi-character terminals', () => {
      const res = convertCFGToPDA(G_MULTI_CHAR);
      expect(res.success).toBe(true);
    });

    it('6. Ensures source CFG is not mutated', () => {
      const copyBefore = JSON.stringify(G_ANBN);
      convertCFGToPDA(G_ANBN);
      expect(JSON.stringify(G_ANBN)).toBe(copyBefore);
    });
  });

  // PDA -> CFG Tests
  describe('PDA → CFG Translation', () => {
    it('7. Converts simple one-state PDA', () => {
      const res = convertPDAToCFG(PDA_ONE_STATE, 'Z0');
      expect(res.success).toBe(true);
      expect(res.targetCFG.variables.length).toBeGreaterThan(0);
    });

    it('8. Converts PDA for a^n b^n', () => {
      const res = convertPDAToCFG(PDA_ANBN, 'Z0');
      expect(res.success).toBe(true);
      expect(res.targetCFG.variables).toContain('S');
      expect(res.targetCFG.productions.length).toBeGreaterThan(0);
    });

    it('9. Ensures source PDA graph is not mutated', () => {
      const copyBefore = JSON.stringify(PDA_ANBN);
      convertPDAToCFG(PDA_ANBN, 'Z0');
      expect(JSON.stringify(PDA_ANBN)).toBe(copyBefore);
    });
  });

  // Round-trip Tests
  describe('Round-Trip Verification', () => {
    it('10. CFG → PDA → CFG round-trip', () => {
      const roundTrip = verifyTranslationRoundTrip(G_ANBN, 'CFG_TO_PDA', 'Z0', ['', 'ab', 'aabb', 'aab']);
      expect(roundTrip.roundTripStatus).toBe('VERIFIED_BOUNDED');
    });

    it('11. PDA → CFG → PDA round-trip', () => {
      const roundTrip = verifyTranslationRoundTrip(PDA_ANBN, 'PDA_TO_CFG', 'Z0', ['', 'ab', 'aabb', 'aab']);
      expect(roundTrip.roundTripStatus).toBe('VERIFIED_BOUNDED');
    });
  });
});
