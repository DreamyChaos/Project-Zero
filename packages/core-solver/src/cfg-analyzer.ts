import { ContextFreeGrammar, CFGAnalysisResult } from './types';

/**
 * Pure deterministic mathematical analysis engine for Context-Free Grammars.
 * Uses fixed-point algorithms to compute generating variables, nullable variables, reachable variables, useless variables, and language emptiness.
 */
export function analyzeCFG(grammar: ContextFreeGrammar): CFGAnalysisResult {
  const { variables, terminals, productions, startVariable } = grammar;

  const varSet = new Set(variables);

  // 1. Fixed-Point Computation: Generating / Productive Variables
  // G_0 = ∅
  // G_k = G_{k-1} ∪ { A ∈ V | ∃ (A → α) s.t. ∀ sym ∈ α, sym ∈ Σ ∨ sym ∈ G_{k-1} ∨ sym is EPSILON }
  const generatingSet = new Set<string>();
  let changed = true;

  while (changed) {
    changed = false;
    for (const p of productions) {
      if (generatingSet.has(p.lhs)) continue;

      const isRhsGenerating = p.rhs.every((sym) => {
        if (sym.type === 'TERMINAL' || sym.type === 'EPSILON') return true;
        if (sym.type === 'NON_TERMINAL') return generatingSet.has(sym.value);
        return false;
      });

      if (isRhsGenerating) {
        generatingSet.add(p.lhs);
        changed = true;
      }
    }
  }

  // 2. Fixed-Point Computation: Nullable Variables (A ⇒* ε)
  // N_0 = ∅
  // N_k = N_{k-1} ∪ { A ∈ V | ∃ (A → α) s.t. ∀ sym ∈ α, sym is EPSILON ∨ sym ∈ N_{k-1} }
  const nullableSet = new Set<string>();
  changed = true;

  while (changed) {
    changed = false;
    for (const p of productions) {
      if (nullableSet.has(p.lhs)) continue;

      const isRhsNullable = p.rhs.every((sym) => {
        if (sym.type === 'EPSILON') return true;
        if (sym.type === 'NON_TERMINAL') return nullableSet.has(sym.value);
        return false;
      });

      if (isRhsNullable) {
        nullableSet.add(p.lhs);
        changed = true;
      }
    }
  }

  // 3. Fixed-Point Computation: Reachable Variables from Start Symbol S
  // R_0 = { S }
  // R_k = R_{k-1} ∪ { B ∈ V | ∃ A ∈ R_{k-1}, (A → α) with B appearing in α }
  const reachableSet = new Set<string>();
  if (startVariable && varSet.has(startVariable)) {
    reachableSet.add(startVariable);
  }

  changed = true;
  while (changed) {
    changed = false;
    for (const p of productions) {
      if (!reachableSet.has(p.lhs)) continue;

      for (const sym of p.rhs) {
        if (sym.type === 'NON_TERMINAL' && !reachableSet.has(sym.value)) {
          reachableSet.add(sym.value);
          changed = true;
        }
      }
    }
  }

  // 4. Useless Variables = V \ (Reachable ∩ Generating)
  const uselessVariables: string[] = [];
  variables.forEach((v) => {
    if (!reachableSet.has(v) || !generatingSet.has(v)) {
      uselessVariables.push(v);
    }
  });

  // 5. Language Emptiness: L(G) = ∅ iff startVariable ∉ generatingSet
  const isLanguageEmpty = Boolean(startVariable && !generatingSet.has(startVariable));

  // 6. Direct & Immediate Left Recursion Detection
  let hasLeftRecursion = false;
  for (const p of productions) {
    if (p.rhs.length > 0 && p.rhs[0].type === 'NON_TERMINAL' && p.rhs[0].value === p.lhs) {
      hasLeftRecursion = true;
      break;
    }
  }

  return {
    variables,
    terminals,
    reachableVariables: Array.from(reachableSet),
    generatingVariables: Array.from(generatingSet),
    nullableVariables: Array.from(nullableSet),
    uselessVariables,
    isLanguageEmpty,
    hasLeftRecursion,
    productionCount: productions.length,
  };
}
