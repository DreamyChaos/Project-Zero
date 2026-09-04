import { describe, it, expect } from 'vitest';
import {
  MAPPING_REDUCTION_DEFINITION,
  REDUCIBILITY_DISTINCTIONS,
  REDUCTION_PRESETS,
  executeMappingReduction,
  composeReductions,
} from '../reducibility';

describe('Module 5 — Topic 5: Reducibility', () => {
  // ============================================================
  // Category A: Formal Definitions, Transfer Theorems & Invariants
  // ============================================================
  describe('Category A: Formal Definitions & Directionality Invariants', () => {
    it('defines mapping reduction A <=m B with total computable function requirement', () => {
      expect(MAPPING_REDUCTION_DEFINITION.notation).toBe('A ≤m B');
      expect(MAPPING_REDUCTION_DEFINITION.formalStatement).toContain('total computable function f');
      expect(MAPPING_REDUCTION_DEFINITION.formalStatement).toContain('x ∈ A ⇔ f(x) ∈ B');
    });

    it('documents the correct solvability and contrapositive transfer directions', () => {
      expect(MAPPING_REDUCTION_DEFINITION.transferTheorem).toContain(
        'If A ≤m B and B is decidable, then A is decidable'
      );
      expect(MAPPING_REDUCTION_DEFINITION.contrapositiveTheorem).toContain(
        'If A ≤m B and A is undecidable, then B is undecidable'
      );
    });

    it('contains distinction items guarding against reversed arrows and complexity conflation', () => {
      expect(REDUCIBILITY_DISTINCTIONS.length).toBeGreaterThanOrEqual(4);

      const directionItem = REDUCIBILITY_DISTINCTIONS.find((d) => d.topic.includes('Direction'));
      expect(directionItem?.reducibilityMeans).toContain('B is at least as hard as A');
      expect(directionItem?.doesNotMean).toContain('does NOT mean A is at least as hard as B');

      const complexityItem = REDUCIBILITY_DISTINCTIONS.find((d) => d.topic.includes('Complexity'));
      expect(complexityItem?.doesNotMean).toContain('does NOT mean A and B have the same time or space complexity');

      const timeoutItem = REDUCIBILITY_DISTINCTIONS.find((d) => d.topic.includes('Finite Experiments'));
      expect(timeoutItem?.doesNotMean).toContain('does NOT prove a language is undecidable');
    });
  });

  // ============================================================
  // Category B: Reflexivity Property (A <=m A)
  // ============================================================
  describe('Category B: Reflexivity (Identity Reduction)', () => {
    const identityPreset = REDUCTION_PRESETS.find((p) => p.id === 'identity-reduction')!;

    it('verifies that any language reduces to itself via identity function f(x) = x', () => {
      expect(identityPreset).toBeDefined();
      expect(identityPreset.transformFn('010')).toBe('010');
      expect(identityPreset.transformFn('')).toBe('');

      // Test execution on member and non-member strings
      const certMember = executeMappingReduction(identityPreset, '0');
      expect(certMember.isSourceAccepted).toBe(true);
      expect(certMember.isTargetAccepted).toBe(true);
      expect(certMember.isEquivalencePreserved).toBe(true);

      const certNonMember = executeMappingReduction(identityPreset, '1');
      expect(certNonMember.isSourceAccepted).toBe(false);
      expect(certNonMember.isTargetAccepted).toBe(false);
      expect(certNonMember.isEquivalencePreserved).toBe(true);
    });
  });

  // ============================================================
  // Category C: Executable Reductions & Reduction Certificates
  // ============================================================
  describe('Category C: Executable Mapping Reductions & Verification Certificates', () => {
    const alphabetPreset = REDUCTION_PRESETS.find((p) => p.id === 'alphabet-encoding-reduction')!;
    const prefixPreset = REDUCTION_PRESETS.find((p) => p.id === 'prefix-embedding-reduction')!;

    it('correctly executes Alphabet Isomorphism reduction with genuine membership preservation', () => {
      expect(alphabetPreset.transformFn('0101')).toBe('abab');

      // Test all curated test cases
      for (const tc of alphabetPreset.testCases) {
        const cert = executeMappingReduction(alphabetPreset, tc.sourceInput);
        expect(cert.transformedTargetInput).toBe(tc.expectedTargetInput);
        expect(cert.isSourceAccepted).toBe(tc.isSourceMember);
        expect(cert.isTargetAccepted).toBe(tc.isTargetMember);
        expect(cert.isEquivalencePreserved).toBe(true);

        // Certificate claims
        expect(cert.totalityClaim).toContain('TOTAL');
        expect(cert.computabilityClaim).toContain('COMPUTABLE');
        expect(cert.boundedExecutionNote).toContain('finite input');
      }
    });

    it('correctly executes Prefix Embedding reduction with genuine membership preservation', () => {
      expect(prefixPreset.transformFn('0011')).toBe('#0011');

      for (const tc of prefixPreset.testCases) {
        const cert = executeMappingReduction(prefixPreset, tc.sourceInput);
        expect(cert.transformedTargetInput).toBe(tc.expectedTargetInput);
        expect(cert.isSourceAccepted).toBe(tc.isSourceMember);
        expect(cert.isTargetAccepted).toBe(tc.isTargetMember);
        expect(cert.isEquivalencePreserved).toBe(true);
      }
    });
  });

  // ============================================================
  // Category D: Transitivity & Composition (A <=m B and B <=m C => A <=m C)
  // ============================================================
  describe('Category D: Transitivity / Composition of Reductions', () => {
    it('composes two mapping reductions A <=m B and B <=m C preserving membership across the chain', () => {
      const reductionAB = REDUCTION_PRESETS.find((p) => p.id === 'prefix-embedding-reduction')!;
      const reductionBC = REDUCTION_PRESETS.find((p) => p.id === 'prefix-to-wrapped-reduction')!;

      // Member: '01' ∈ L_0n1n  ==f==> '#01' ∈ L_#0n1n  ==g==> '#01$' ∈ L_#0n1n$
      const composedMember = composeReductions(reductionAB, reductionBC, '01');
      expect(composedMember.intermediateInputY).toBe('#01');
      expect(composedMember.finalTargetInputZ).toBe('#01$');
      expect(composedMember.isMemberA).toBe(true);
      expect(composedMember.isMemberB).toBe(true);
      expect(composedMember.isMemberC).toBe(true);
      expect(composedMember.isChainEquivalencePreserved).toBe(true);

      // Non-member: '0' ∉ L_0n1n  ==f==> '#0' ∉ L_#0n1n  ==g==> '#0$' ∉ L_#0n1n$
      const composedNonMember = composeReductions(reductionAB, reductionBC, '0');
      expect(composedNonMember.intermediateInputY).toBe('#0');
      expect(composedNonMember.finalTargetInputZ).toBe('#0$');
      expect(composedNonMember.isMemberA).toBe(false);
      expect(composedNonMember.isMemberB).toBe(false);
      expect(composedNonMember.isMemberC).toBe(false);
      expect(composedNonMember.isChainEquivalencePreserved).toBe(true);
    });
  });
});
