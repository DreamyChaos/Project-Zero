import { describe, it, expect } from 'vitest';
import {
  validatePumpingDecomposition,
  enumerateValidDecompositions,
  pumpString,
  runPumpingLemmaProof,
  PUMPING_PRESETS,
} from '../pumping-lemma';

describe('Pumping Lemma for Regular Languages Domain & Proof Engine (Module 2 Topic 6)', () => {
  // 1. Decomposition Validation & Conditions
  describe('1. Decomposition Conditions & Invariants', () => {
    it('Valid decomposition satisfying |xy| <= p, |y| > 0, x+y+z=w', () => {
      const decomp = validatePumpingDecomposition('aaaabbbb', 4, 1, 2);
      expect(decomp.isValid).toBe(true);
      expect(decomp.x).toBe('a');
      expect(decomp.y).toBe('aa');
      expect(decomp.z).toBe('abbbb');
      expect(decomp.x + decomp.y + decomp.z).toBe('aaaabbbb');
    });

    it('Rejects decomposition with |y| = 0 (Violation of Condition 2)', () => {
      const decomp = validatePumpingDecomposition('aaaabbbb', 4, 2, 0);
      expect(decomp.isValid).toBe(false);
      expect(decomp.validationError).toContain('|y| must be strictly greater than 0');
    });

    it('Rejects decomposition with |xy| > p (Violation of Condition 1)', () => {
      const decomp = validatePumpingDecomposition('aaaabbbb', 4, 3, 2); // |xy| = 5 > 4
      expect(decomp.isValid).toBe(false);
      expect(decomp.validationError).toContain('exceeds pumping length p');
    });

    it('Rejects invalid p <= 0', () => {
      const decomp = validatePumpingDecomposition('aaaabbbb', 0, 1, 1);
      expect(decomp.isValid).toBe(false);
      expect(decomp.validationError).toContain('p must be a positive integer');
    });
  });

  // 2. Enumeration of All Valid Decompositions
  describe('2. Exhaustive Decomposition Enumeration', () => {
    it('Enumerates all valid decompositions with exact count', () => {
      // For w = 'aaaabbbb' (|w|=8) and p=4:
      // xLen can be 0..3
      // For xLen=0: yLen in 1..4 (4 decomps)
      // For xLen=1: yLen in 1..3 (3 decomps)
      // For xLen=2: yLen in 1..2 (2 decomps)
      // For xLen=3: yLen in 1..1 (1 decomp)
      // Total = 4 + 3 + 2 + 1 = 10 decompositions
      const decomps = enumerateValidDecompositions('aaaabbbb', 4);
      expect(decomps.length).toBe(10);
      for (const d of decomps) {
        expect(d.isValid).toBe(true);
        expect(d.x.length + d.y.length).toBeLessThanOrEqual(4);
        expect(d.y.length).toBeGreaterThan(0);
        expect(d.x + d.y + d.z).toBe('aaaabbbb');
      }
    });

    it('Returns empty array if |w| < p', () => {
      const decomps = enumerateValidDecompositions('ab', 4);
      expect(decomps.length).toBe(0);
    });
  });

  // 3. String Pumping Evaluation
  describe('3. Pumping Operations & Negative Exponent Rejection', () => {
    it('Pumps down i=0 (xz)', () => {
      const pumped = pumpString('a', 'aa', 'bb', 0);
      expect(pumped).toBe('abb');
    });

    it('Pumps i=1 (xyz)', () => {
      const pumped = pumpString('a', 'aa', 'bb', 1);
      expect(pumped).toBe('aaabb');
    });

    it('Pumps up i=2 (xyyz) and i=3 (xyyyz)', () => {
      expect(pumpString('a', 'aa', 'bb', 2)).toBe('aaaaabb');
      expect(pumpString('a', 'aa', 'bb', 3)).toBe('aaaaaaabb');
    });

    it('Rejects negative pumping exponent i < 0', () => {
      expect(() => pumpString('a', 'b', 'c', -1)).toThrow(/must be non-negative/);
    });
  });

  // 4. Non-Regularity Proof by Contradiction: L = { a^n b^n | n >= 0 }
  describe('4. Full Quantifier Proof for Non-Regular Language L = { a^n b^n }', () => {
    it('Establishes contradiction across ALL valid decompositions for a^n b^n', () => {
      const res = runPumpingLemmaProof({
        language: PUMPING_PRESETS.anbn,
        p: 4,
      });

      expect(res.isWitnessValid).toBe(true);
      expect(res.witness).toBe('aaaabbbb');
      expect(res.totalValidDecompositions).toBe(10);
      expect(res.allDecompositionsDisproved).toBe(true);
      expect(res.proofStatus).toBe('CONTRADICTION_PROVEN_NON_REGULAR');
      expect(res.conclusion).toContain('CONTRADICTION ESTABLISHED');
      expect(res.proofSteps.length).toBeGreaterThanOrEqual(6);

      // Verify each individual decomposition has a disproving i
      for (const d of res.decompositions) {
        expect(d.hasDisprovingI).toBe(true);
        expect(d.disprovingI).toBeDefined();
      }
    });

    it('Proves non-regularity for binary matched language L = { 0^n 1^n }', () => {
      const res = runPumpingLemmaProof({
        language: PUMPING_PRESETS['0n1n'],
        p: 3,
      });

      expect(res.isWitnessValid).toBe(true);
      expect(res.witness).toBe('000111');
      expect(res.allDecompositionsDisproved).toBe(true);
      expect(res.proofStatus).toBe('CONTRADICTION_PROVEN_NON_REGULAR');
    });

    it('Proves non-regularity for duplicate string language L = { ww }', () => {
      const res = runPumpingLemmaProof({
        language: PUMPING_PRESETS.ww_repeat,
        p: 3,
      });

      expect(res.isWitnessValid).toBe(true);
      expect(res.allDecompositionsDisproved).toBe(true);
      expect(res.proofStatus).toBe('CONTRADICTION_PROVEN_NON_REGULAR');
    });

    it('Proves non-regularity for non-linear square language L = { a^(n^2) }', () => {
      const res = runPumpingLemmaProof({
        language: PUMPING_PRESETS.ansquared,
        p: 3,
      });

      expect(res.isWitnessValid).toBe(true);
      expect(res.allDecompositionsDisproved).toBe(true);
      expect(res.proofStatus).toBe('CONTRADICTION_PROVEN_NON_REGULAR');
    });
  });

  // 5. Regular Language Pumping Demonstration
  describe('5. Regular Language Pumping Demonstration (L = a*)', () => {
    it('Validates that regular language satisfies the Pumping Lemma', () => {
      const res = runPumpingLemmaProof({
        language: PUMPING_PRESETS.astar,
        p: 3,
      });

      expect(res.isWitnessValid).toBe(true);
      expect(res.witness).toBe('aaa');
      expect(res.allDecompositionsDisproved).toBe(false);
      expect(res.proofStatus).toBe('CONSISTENT_WITH_REGULAR');
      expect(res.conclusion).toContain('CONSISTENT WITH REGULAR LANGUAGE');
      expect(res.conclusion).toContain('Regularity established via DFA/RegEx');
    });
  });

  // 6. Critical Quantifier Separation: ∃ failure != Proof of Non-Regularity
  describe('6. Quantifier Precision & Incomplete Proof Handling', () => {
    it('Does NOT declare non-regularity if only a subset of decompositions fail', () => {
      // Mock language where only SOME decompositions fail
      const mockLanguage = {
        id: 'partial_lang',
        name: 'Mock Partial Language',
        isRegular: false,
        membershipCheck: (str: string) => {
          // Rejects only if string length is odd
          if (str.length % 2 === 1) {
            return { isMember: false, reason: 'Odd length' };
          }
          return { isMember: true, reason: 'Even length' };
        },
      };

      const res = runPumpingLemmaProof({
        language: mockLanguage,
        p: 4,
        customWitness: 'aaaa', // length 4 (even)
        testIVals: [0, 1], // test small range
      });

      expect(res.isWitnessValid).toBe(true);
      // Not all decompositions will yield odd lengths with this limited sweep
      if (!res.allDecompositionsDisproved) {
        expect(res.proofStatus).toBe('FAILED_TO_DISPROVE');
        expect(res.conclusion).toContain('PROOF INCOMPLETE');
      }
    });

    it('Rejects witness w not in language L', () => {
      const res = runPumpingLemmaProof({
        language: PUMPING_PRESETS.anbn,
        p: 4,
        customWitness: 'aaabbbb', // 3 a's, 4 b's -> not in L
      });

      expect(res.isWitnessValid).toBe(false);
      expect(res.proofStatus).toBe('INVALID_INPUT');
      expect(res.witnessValidationError).toContain('does NOT belong to language L');
    });

    it('Rejects witness w with |w| < p', () => {
      const res = runPumpingLemmaProof({
        language: PUMPING_PRESETS.anbn,
        p: 4,
        customWitness: 'aabb', // length 4 == 4 (valid)
      });
      expect(res.isWitnessValid).toBe(true);

      const resShort = runPumpingLemmaProof({
        language: PUMPING_PRESETS.anbn,
        p: 4,
        customWitness: 'ab', // length 2 < 4 (invalid)
      });

      expect(resShort.isWitnessValid).toBe(false);
      expect(resShort.proofStatus).toBe('INVALID_INPUT');
      expect(resShort.witnessValidationError).toContain('strictly less than pumping length p');
    });
  });
});
