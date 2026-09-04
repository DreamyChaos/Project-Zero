import {
  ContextFreeGrammar,
  GrammarSymbol,
  CFGDerivationResult,
  DerivationStep,
  DerivationType,
} from './types';

export interface DerivationOptions {
  derivationType?: DerivationType;
  maxDepth?: number;
  maxStatesExplored?: number;
}

/**
 * Pure deterministic derivation engine for Context-Free Grammars.
 * Computes Leftmost, Rightmost, or General derivation sequences S ⇒* w for target string w.
 */
export function generateDerivation(
  grammar: ContextFreeGrammar,
  targetInput: string,
  options: DerivationOptions = {}
): CFGDerivationResult {
  const derivationType: DerivationType = options.derivationType || 'LEFTMOST';
  const maxDepth = options.maxDepth !== undefined ? options.maxDepth : 15;
  const maxStatesExplored = options.maxStatesExplored !== undefined ? options.maxStatesExplored : 500;

  const { productions, startVariable } = grammar;

  if (!startVariable || !grammar.variables.includes(startVariable)) {
    return {
      success: false,
      derivationType,
      targetInput,
      steps: [],
      exploredStateCount: 0,
      errorMessage: 'Invalid start variable.',
    };
  }

  interface SearchNode {
    form: GrammarSymbol[];
    steps: DerivationStep[];
    depth: number;
  }

  const initialForm: GrammarSymbol[] = [{ type: 'NON_TERMINAL', value: startVariable }];
  const initialStep: DerivationStep = {
    stepIndex: 0,
    sententialForm: initialForm,
    derivationType,
    mathematicalNotation: startVariable,
  };

  const queue: SearchNode[] = [{ form: initialForm, steps: [initialStep], depth: 0 }];
  const visited = new Set<string>();

  const getFormKey = (form: GrammarSymbol[]) =>
    form.map((s) => `${s.type}:${s.value}`).join(' ');

  let exploredStateCount = 0;
  let truncatedByLimit = false;

  const formatSententialForm = (form: GrammarSymbol[]) => {
    if (form.length === 0) return 'ε';
    return form.map((s) => (s.type === 'EPSILON' ? 'ε' : s.value)).join('');
  };

  const extractTerminalString = (form: GrammarSymbol[]): string | null => {
    let str = '';
    for (const sym of form) {
      if (sym.type === 'NON_TERMINAL') return null; // Contains non-terminal
      if (sym.type === 'TERMINAL') str += sym.value;
      // EPSILON contributes empty string
    }
    return str;
  };

  const countTerminals = (form: GrammarSymbol[]): number => {
    let count = 0;
    for (const sym of form) {
      if (sym.type === 'TERMINAL') count += sym.value.length;
    }
    return count;
  };

  while (queue.length > 0) {
    if (exploredStateCount >= maxStatesExplored) {
      truncatedByLimit = true;
      break;
    }

    const current = queue.shift()!;
    exploredStateCount++;

    // Check if current form is a complete terminal string matching targetInput
    const termStr = extractTerminalString(current.form);
    if (termStr !== null && termStr === targetInput) {
      return {
        success: true,
        derivationType,
        targetInput,
        steps: current.steps,
        exploredStateCount,
      };
    }

    // Prune if terminal symbols already exceed target input length
    if (countTerminals(current.form) > targetInput.length) {
      continue;
    }

    if (current.depth >= maxDepth) {
      truncatedByLimit = true;
      continue;
    }

    // Identify target variable position according to derivationType
    const nonTermIndices: number[] = [];
    current.form.forEach((sym, idx) => {
      if (sym.type === 'NON_TERMINAL') nonTermIndices.push(idx);
    });

    if (nonTermIndices.length === 0) {
      continue;
    }

    let targetIndices: number[] = [];
    if (derivationType === 'LEFTMOST') {
      targetIndices = [nonTermIndices[0]];
    } else if (derivationType === 'RIGHTMOST') {
      targetIndices = [nonTermIndices[nonTermIndices.length - 1]];
    } else {
      targetIndices = nonTermIndices;
    }

    for (const pos of targetIndices) {
      const varSym = current.form[pos];
      const matchingProductions = productions.filter((p) => p.lhs === varSym.value);

      for (const p of matchingProductions) {
        // Construct next sentential form
        const nextForm: GrammarSymbol[] = [];
        for (let i = 0; i < current.form.length; i++) {
          if (i === pos) {
            // Replace EPSILON RHS with actual EPSILON symbol or empty array if single EPSILON
            p.rhs.forEach((rSym) => {
              if (rSym.type !== 'EPSILON') {
                nextForm.push(rSym);
              }
            });
          } else {
            nextForm.push(current.form[i]);
          }
        }

        const key = getFormKey(nextForm);
        if (visited.has(key)) continue;
        visited.add(key);

        const prodNotation = `${p.lhs} → ${p.rhs.map((r) => r.value).join('') || 'ε'}`;
        const prevNotation = current.steps[current.steps.length - 1].mathematicalNotation;
        const nextNotation = `${prevNotation} ⇒ ${formatSententialForm(nextForm)}`;

        const nextStep: DerivationStep = {
          stepIndex: current.steps.length,
          sententialForm: nextForm,
          productionId: p.id,
          productionNotation: prodNotation,
          expandedVariable: p.lhs,
          expandedPosition: pos,
          derivationType,
          mathematicalNotation: nextNotation,
        };

        queue.push({
          form: nextForm,
          steps: [...current.steps, nextStep],
          depth: current.depth + 1,
        });
      }
    }
  }

  return {
    success: false,
    derivationType,
    targetInput,
    steps: [],
    exploredStateCount,
    errorMessage: truncatedByLimit
      ? `Target string "${targetInput}" could not be derived within bounds (maxDepth: ${maxDepth}, maxStatesExplored: ${maxStatesExplored}).`
      : undefined,
  };
}

