import {
  SolverGraphInput,
  AutomatonRegexEquivalenceResult,
  AutomataEquivalenceResult,
} from './types';
import { AutomatonType } from '@project-zero/shared';
import { validateDFA } from './dfa-validator';
import { validateNFA } from './nfa-validator';
import { convertRegexToNFA } from './regex-to-nfa';
import { compareAutomataLanguages } from './dfa-equivalence';
import { convertAutomatonToRegex } from './fa-to-regex';
import { executeDFA } from './dfa-executor';
import { executeNFA } from './nfa-executor';

/**
 * Pure function: Determines semantic language equivalence between a Finite Automaton (DFA/NFA/ε-NFA)
 * and a Regular Expression: L(FA) = L(Regex).
 *
 * Workflow:
 *  1. Parse candidate regex into a Thompson ε-NFA.
 *  2. Normalize both automata to DFAs via subset construction.
 *  3. Perform product-automaton BFS to test language equivalence.
 *  4. Synthesize GNFA State Elimination regular expression from the automaton.
 *  5. If not equivalent, extract the shortest counterexample string w ∈ L(FA) ⊕ L(Regex).
 *  6. Cross-verify generated Regex language preservation.
 */
export function checkAutomatonRegexEquivalence(
  faGraph: SolverGraphInput,
  faType: AutomatonType,
  regexInput: string
): AutomatonRegexEquivalenceResult {
  // 1. Validate Finite Automaton
  if (faType === 'DFA') {
    const valDFA = validateDFA(faGraph);
    if (!valDFA.isValid) {
      return {
        isEquivalent: false,
        faType,
        inputRegex: regexInput,
        validationError: `Finite Automaton validation failed: ${valDFA.errors[0]?.message || 'Invalid machine'}`,
      };
    }
  } else {
    const valNFA = validateNFA(faGraph);
    if (!valNFA.isValid) {
      return {
        isEquivalent: false,
        faType,
        inputRegex: regexInput,
        validationError: `Finite Automaton validation failed: ${valNFA.errors[0]?.message || 'Invalid machine'}`,
      };
    }
  }

  // 2. Synthesize Regular Expression from FA via GNFA State Elimination
  const faRegexResult = convertAutomatonToRegex(faGraph);

  // 3. Convert Input Regular Expression to Thompson ε-NFA
  const regexToNFA = convertRegexToNFA(regexInput);
  if (!regexToNFA.success) {
    return {
      isEquivalent: false,
      faType,
      inputRegex: regexInput,
      faGeneratedRegex: faRegexResult.regex,
      faSimplifiedRegex: faRegexResult.simplifiedRegex,
      stateEliminationTrace: faRegexResult.trace,
      validationError: `Regular Expression parse failed: ${regexToNFA.errorMessage || 'Invalid regular expression'}`,
    };
  }

  const regexGraph: SolverGraphInput = {
    nodes: [...regexToNFA.nodes],
    edges: [...regexToNFA.edges],
  };

  // 4. Perform Language Equivalence BFS
  const equivResult: AutomataEquivalenceResult = compareAutomataLanguages(
    faGraph,
    faType,
    regexGraph,
    'NFA'
  );

  // 5. Evaluate counterexample if not equivalent
  let acceptsFA = false;
  let acceptsRegex = false;

  if (!equivResult.isEquivalent && equivResult.counterexample !== undefined) {
    const w = equivResult.counterexample;
    if (faType === 'DFA') {
      acceptsFA = executeDFA(faGraph, w).isAccepted;
    } else {
      acceptsFA = executeNFA(faGraph, w).isAccepted;
    }
    acceptsRegex = executeNFA(regexGraph, w).isAccepted;
  }

  // 6. Automated Cross-Verification: Verify generated Regex preserves FA language
  let crossVerificationPassed = false;
  if (faRegexResult.success && faRegexResult.simplifiedRegex) {
    const crossNFA = convertRegexToNFA(faRegexResult.simplifiedRegex);
    if (crossNFA.success) {
      const crossComp = compareAutomataLanguages(
        faGraph,
        faType,
        { nodes: [...crossNFA.nodes], edges: [...crossNFA.edges] },
        'NFA'
      );
      crossVerificationPassed = crossComp.isEquivalent;
    }
  } else if (faRegexResult.success && !faRegexResult.regex) {
    // Empty language automaton
    const noAccepting = faGraph.nodes.every((n) => !n.isAccepting);
    crossVerificationPassed = noAccepting;
  }

  return {
    isEquivalent: equivResult.isEquivalent,
    counterexample: equivResult.counterexample,
    acceptsFA,
    acceptsRegex,
    faType,
    inputRegex: regexInput,
    faGeneratedRegex: faRegexResult.regex,
    faSimplifiedRegex: faRegexResult.simplifiedRegex,
    regexToNFA,
    stateEliminationTrace: faRegexResult.trace,
    productTrace: equivResult.trace,
    productStatesExplored: equivResult.productStatesExplored,
    crossVerificationPassed,
  };
}
