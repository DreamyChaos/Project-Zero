import { describe, it, expect } from 'vitest';
import {
  PROGRAM_CONSTRUCT_PRESETS,
  getProgramConstructPresets,
  getProgramConstructById,
  evaluateConstructBatch,
} from '../program-constructs';
import { parseRegex } from '../regex-parser';
import { convertRegexToNFA } from '../regex-to-nfa';
import { executeNFA } from '../nfa-executor';
import { validateNFA } from '../nfa-validator';

describe('Module 2 Topic 2: Program Constructs using Regular Expression Tests', () => {
  it('1. All curated program construct presets are syntactically valid in Regex parser', () => {
    const presets = getProgramConstructPresets();
    expect(presets.length).toBeGreaterThanOrEqual(10);

    for (const preset of presets) {
      const parseRes = parseRegex(preset.regex);
      expect(
        parseRes.success,
        `Preset "${preset.name}" (${preset.id}) failed to parse regex "${preset.regex}": ${parseRes.errorMessage}`
      ).toBe(true);
      expect(parseRes.ast).toBeDefined();
    }
  });

  it('2. Thompson construction succeeds for every program construct preset', () => {
    const presets = getProgramConstructPresets();

    for (const preset of presets) {
      const nfaRes = convertRegexToNFA(preset.regex);
      expect(
        nfaRes.success,
        `Thompson conversion failed for "${preset.name}": ${nfaRes.errorMessage}`
      ).toBe(true);

      expect(nfaRes.nodes.length).toBeGreaterThan(0);
      expect(nfaRes.edges.length).toBeGreaterThan(0);

      // Verify Thompson Invariants
      const initialNodes = nfaRes.nodes.filter((n) => n.isInitial);
      const acceptingNodes = nfaRes.nodes.filter((n) => n.isAccepting);
      expect(initialNodes).toHaveLength(1);
      expect(acceptingNodes).toHaveLength(1);

      // Verify graph validity
      const val = validateNFA({ nodes: nfaRes.nodes, edges: nfaRes.edges });
      expect(val.isValid).toBe(true);
    }
  });

  it('3. Presets accurately accept all designated valid sample strings', () => {
    for (const preset of PROGRAM_CONSTRUCT_PRESETS) {
      const nfa = convertRegexToNFA(preset.regex);
      expect(nfa.success).toBe(true);

      for (const validStr of preset.sampleValid) {
        const exec = executeNFA({ nodes: nfa.nodes, edges: nfa.edges }, validStr);
        expect(
          exec.isAccepted,
          `Preset "${preset.name}" (${preset.id}) unexpectedly rejected valid string "${validStr}" with regex "${preset.regex}"`
        ).toBe(true);
      }
    }
  });

  it('4. Presets accurately reject all designated invalid sample strings', () => {
    for (const preset of PROGRAM_CONSTRUCT_PRESETS) {
      const nfa = convertRegexToNFA(preset.regex);
      expect(nfa.success).toBe(true);

      for (const invalidStr of preset.sampleInvalid) {
        const exec = executeNFA({ nodes: nfa.nodes, edges: nfa.edges }, invalidStr);
        expect(
          exec.isAccepted,
          `Preset "${preset.name}" (${preset.id}) unexpectedly accepted invalid string "${invalidStr}" with regex "${preset.regex}"`
        ).toBe(false);
      }
    }
  });

  it('5. evaluateConstructBatch dynamically executes batch test cases against active NFA', () => {
    const identPreset = getProgramConstructById('ident-simple')!;
    expect(identPreset).toBeDefined();

    const nfa = convertRegexToNFA(identPreset.regex);
    expect(nfa.success).toBe(true);

    const testCases = [
      { input: 'a', expected: true },
      { input: 'abc', expected: true },
      { input: 'x1', expected: true },
      { input: '0a', expected: false },
      { input: '1', expected: false },
    ];

    const results = evaluateConstructBatch({ nodes: nfa.nodes, edges: nfa.edges }, testCases);
    expect(results).toHaveLength(5);

    for (const res of results) {
      expect(res.status).toBe('PASS');
      expect(res.isAccepted).toBe(res.expected);
      expect(res.stepsCount).toBeGreaterThanOrEqual(0);
    }
  });

  it('6. Multiple pattern switching maintains clean state isolation and independent metrics', () => {
    // Construct 1: Integer
    const intPreset = getProgramConstructById('num-int')!;
    const intNFA = convertRegexToNFA(intPreset.regex);
    expect(intNFA.success).toBe(true);
    expect(executeNFA({ nodes: intNFA.nodes, edges: intNFA.edges }, '42').isAccepted).toBe(true);
    expect(executeNFA({ nodes: intNFA.nodes, edges: intNFA.edges }, 'abc').isAccepted).toBe(false);

    // Construct 2: Identifier
    const identPreset = getProgramConstructById('ident-simple')!;
    const identNFA = convertRegexToNFA(identPreset.regex);
    expect(identNFA.success).toBe(true);
    expect(executeNFA({ nodes: identNFA.nodes, edges: identNFA.edges }, 'abc').isAccepted).toBe(true);
    expect(executeNFA({ nodes: identNFA.nodes, edges: identNFA.edges }, '42').isAccepted).toBe(false);

    // Re-verify Construct 1: Integer isolation
    const intNFA2 = convertRegexToNFA(intPreset.regex);
    expect(intNFA2.nodes.length).toBe(intNFA.nodes.length);
    expect(intNFA2.edges.length).toBe(intNFA.edges.length);
    expect(executeNFA({ nodes: intNFA2.nodes, edges: intNFA2.edges }, '42').isAccepted).toBe(true);
    expect(executeNFA({ nodes: intNFA2.nodes, edges: intNFA2.edges }, 'abc').isAccepted).toBe(false);
  });
});
