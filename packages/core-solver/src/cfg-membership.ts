import {
  ContextFreeGrammar,
  CFGMembershipResult,
  CFGBatchEvaluationEntry,
  GrammarSymbol,
} from './types';
import { generateDerivation, DerivationOptions } from './cfg-derivation';
import { validateCFG } from './cfg-validator';

/**
 * Validates whether an input string contains characters not declared in the grammar's terminal alphabet Σ.
 */
export function validateAlphabetSymbols(
  grammar: ContextFreeGrammar,
  input: string
): { isValid: boolean; invalidSymbols: string[] } {
  if (!input || input === 'ε' || input === '') {
    return { isValid: true, invalidSymbols: [] };
  }

  const { terminals } = grammar;
  const termSet = new Set(terminals);

  // Check multi-character terminals first (e.g. "id", "num", "+")
  // For standard single/multi-char terminals:
  const invalidSymbols: string[] = [];
  const chars = Array.from(input);

  for (const c of chars) {
    if (!termSet.has(c) && !terminals.some((t) => t.includes(c))) {
      if (!invalidSymbols.includes(c)) {
        invalidSymbols.push(c);
      }
    }
  }

  return {
    isValid: invalidSymbols.length === 0,
    invalidSymbols,
  };
}

/**
 * Pure deterministic membership evaluation engine for Context-Free Grammars.
 * Evaluates w ∈ L(G) via bounded derivation search, returning structured derivation proof on success.
 */
export function evaluateCFGMembership(
  grammar: ContextFreeGrammar,
  targetInput: string,
  options: DerivationOptions = {}
): CFGMembershipResult {
  const normalizedInput = targetInput === 'ε' ? '' : targetInput;

  // 1. Check Grammar Structural Validity
  const validation = validateCFG(grammar);
  if (!validation.isValid) {
    const errorMsg = validation.errors.map((e) => e.message).join('; ');
    return {
      isAccepted: false,
      targetInput,
      exploredStates: 0,
      reason: `Invalid CFG: ${errorMsg}`,
      boundedByLimit: false,
      hasInvalidAlphabetSymbols: false,
      invalidSymbols: [],
    };
  }

  // 2. Check Terminal Alphabet Compliance
  const alphabetCheck = validateAlphabetSymbols(grammar, normalizedInput);
  if (!alphabetCheck.isValid) {
    return {
      isAccepted: false,
      targetInput,
      exploredStates: 0,
      reason: `Alphabet Mismatch: String contains symbol(s) {${alphabetCheck.invalidSymbols.join(', ')}} not in terminal alphabet Σ.`,
      boundedByLimit: false,
      hasInvalidAlphabetSymbols: true,
      invalidSymbols: alphabetCheck.invalidSymbols,
    };
  }

  // 3. Evaluate Derivation Search S ⇒* w
  const derivationRes = generateDerivation(grammar, normalizedInput, options);

  if (derivationRes.success) {
    const displayStr = normalizedInput === '' ? 'ε' : normalizedInput;
    return {
      isAccepted: true,
      targetInput,
      derivation: derivationRes,
      exploredStates: derivationRes.exploredStateCount,
      reason: `String "${displayStr}" ∈ L(G). Derivation exists in ${derivationRes.steps.length - 1} step(s).`,
      boundedByLimit: false,
      hasInvalidAlphabetSymbols: false,
      invalidSymbols: [],
    };
  }

  const bounded = Boolean(derivationRes.errorMessage?.includes('bounds'));
  const displayStr = normalizedInput === '' ? 'ε' : normalizedInput;

  return {
    isAccepted: false,
    targetInput,
    exploredStates: derivationRes.exploredStateCount,
    reason: bounded
      ? `Search Limit Reached (${derivationRes.exploredStateCount} states explored). Conclusive membership could not be determined within depth bounds.`
      : `String "${displayStr}" ∉ L(G). No valid derivation S ⇒* "${displayStr}" exists.`,
    boundedByLimit: bounded,
    hasInvalidAlphabetSymbols: false,
    invalidSymbols: [],
  };
}

/**
 * Evaluates a batch list of candidate strings against a Context-Free Grammar.
 */
export function evaluateCFGBatchMembership(
  grammar: ContextFreeGrammar,
  inputs: ReadonlyArray<string>,
  options: DerivationOptions = {}
): ReadonlyArray<CFGBatchEvaluationEntry> {
  return inputs.map((input) => {
    const res = evaluateCFGMembership(grammar, input, options);
    return {
      input,
      isAccepted: res.isAccepted,
      reason: res.reason,
      boundedByLimit: res.boundedByLimit,
      hasInvalidAlphabetSymbols: Boolean(res.hasInvalidAlphabetSymbols),
      invalidSymbols: res.invalidSymbols || [],
      stepCount: res.derivation ? res.derivation.steps.length - 1 : undefined,
    };
  });
}

/**
 * Generates a bounded sample of terminal strings belonging to L(G) with length ≤ maxLength.
 * Note: This produces a finite witness sample, NOT the entire (potentially infinite) language.
 */
export function generateBoundedLanguageSample(
  grammar: ContextFreeGrammar,
  maxLength: number = 6,
  maxCount: number = 15
): ReadonlyArray<string> {
  const { productions, startVariable, variables } = grammar;
  if (!startVariable || !variables.includes(startVariable)) return [];

  const results = new Set<string>();
  const visited = new Set<string>();

  interface BFSNode {
    form: GrammarSymbol[];
    depth: number;
  }

  const queue: BFSNode[] = [
    { form: [{ type: 'NON_TERMINAL', value: startVariable }], depth: 0 },
  ];

  const getFormKey = (form: GrammarSymbol[]) =>
    form.map((s) => `${s.type}:${s.value}`).join(' ');

  let states = 0;
  const maxStates = 400;

  while (queue.length > 0 && results.size < maxCount && states < maxStates) {
    const { form, depth } = queue.shift()!;
    states++;

    // Calculate current terminal string length
    let termLen = 0;
    let isAllTerminals = true;
    let termStr = '';

    for (const sym of form) {
      if (sym.type === 'NON_TERMINAL') {
        isAllTerminals = false;
        termLen += 1; // Minimum length lower bound
      } else if (sym.type === 'TERMINAL') {
        termLen += sym.value.length;
        termStr += sym.value;
      }
    }

    if (termLen > maxLength + 2) continue;

    if (isAllTerminals) {
      if (termStr.length <= maxLength) {
        results.add(termStr === '' ? 'ε' : termStr);
      }
      continue;
    }

    if (depth >= 10) continue;

    // Expand first non-terminal (Leftmost expansion)
    const pos = form.findIndex((s) => s.type === 'NON_TERMINAL');
    if (pos === -1) continue;

    const varName = form[pos].value;
    const matchingProds = productions.filter((p) => p.lhs === varName);

    for (const p of matchingProds) {
      const nextForm: GrammarSymbol[] = [];
      for (let i = 0; i < form.length; i++) {
        if (i === pos) {
          p.rhs.forEach((r) => {
            if (r.type !== 'EPSILON') nextForm.push(r);
          });
        } else {
          nextForm.push(form[i]);
        }
      }

      const key = getFormKey(nextForm);
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({ form: nextForm, depth: depth + 1 });
      }
    }
  }

  return Array.from(results).sort((a, b) => {
    if (a === 'ε') return -1;
    if (b === 'ε') return 1;
    if (a.length !== b.length) return a.length - b.length;
    return a.localeCompare(b);
  });
}
