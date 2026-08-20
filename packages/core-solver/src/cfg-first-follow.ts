import {
  ContextFreeGrammar,
  CFGProduction,
  GrammarSymbol,
  ProductionSelectSet,
  LeftRecursionDiagnostic,
  LeftFactoringSuggestion,
  LL1_END_MARKER,
} from './types';
import { analyzeCFG } from './cfg-analyzer';

const EPSILON_VALUE = 'ε';

// ===================================================================
// 1. FIRST Sets Engine (Fixed-Point)
// ===================================================================

/**
 * Computes FIRST sets for every variable in a Context-Free Grammar.
 * Reaches a fixed point iteratively.
 * FIRST(A) includes 'ε' iff A ⇒* ε.
 */
export function computeFirstSets(
  grammar: ContextFreeGrammar
): Record<string, ReadonlyArray<string>> {
  const { variables, productions } = grammar;
  const firstMap = new Map<string, Set<string>>();

  for (const v of variables) {
    firstMap.set(v, new Set<string>());
  }

  const nullableSet = new Set(analyzeCFG(grammar).nullableVariables);

  let changed = true;
  while (changed) {
    changed = false;

    for (const p of productions) {
      const lhsSet = firstMap.get(p.lhs);
      if (!lhsSet) continue;

      const beforeSize = lhsSet.size;

      if (p.rhs.length === 0 || (p.rhs.length === 1 && p.rhs[0].type === 'EPSILON')) {
        lhsSet.add(EPSILON_VALUE);
      } else {
        let allNullable = true;

        for (const sym of p.rhs) {
          if (sym.type === 'EPSILON') {
            lhsSet.add(EPSILON_VALUE);
            continue;
          }

          if (sym.type === 'TERMINAL') {
            lhsSet.add(sym.value);
            allNullable = false;
            break;
          }

          if (sym.type === 'NON_TERMINAL') {
            const symFirst = firstMap.get(sym.value);
            if (symFirst) {
              for (const val of symFirst) {
                if (val !== EPSILON_VALUE) {
                  lhsSet.add(val);
                }
              }
            }

            if (!nullableSet.has(sym.value)) {
              allNullable = false;
              break;
            }
          }
        }

        if (allNullable) {
          lhsSet.add(EPSILON_VALUE);
        }
      }

      if (lhsSet.size > beforeSize) {
        changed = true;
      }
    }
  }

  const result: Record<string, ReadonlyArray<string>> = {};
  for (const v of variables) {
    const arr = Array.from(firstMap.get(v) || []);
    // Deterministic sorting: epsilon last, terminals alphabetically
    arr.sort((a, b) => {
      if (a === EPSILON_VALUE) return 1;
      if (b === EPSILON_VALUE) return -1;
      return a.localeCompare(b);
    });
    result[v] = arr;
  }

  return result;
}

// ===================================================================
// 2. FIRST of Symbol Sequence
// ===================================================================

/**
 * Computes FIRST set for an arbitrary sequence of grammar symbols.
 * Handles nullable propagation through sequence elements.
 */
export function computeFirstOfSequence(
  sequence: ReadonlyArray<GrammarSymbol>,
  firstSets: Record<string, ReadonlyArray<string>>,
  nullableSet?: Set<string>
): ReadonlyArray<string> {
  const result = new Set<string>();

  if (sequence.length === 0) {
    return [EPSILON_VALUE];
  }

  let allNullable = true;

  for (const sym of sequence) {
    if (sym.type === 'EPSILON') {
      result.add(EPSILON_VALUE);
      continue;
    }

    if (sym.type === 'TERMINAL') {
      result.add(sym.value);
      allNullable = false;
      break;
    }

    if (sym.type === 'NON_TERMINAL') {
      const symFirst = firstSets[sym.value] || [];
      const isSymNullable = nullableSet ? nullableSet.has(sym.value) : symFirst.includes(EPSILON_VALUE);

      for (const val of symFirst) {
        if (val !== EPSILON_VALUE) {
          result.add(val);
        }
      }

      if (!isSymNullable) {
        allNullable = false;
        break;
      }
    }
  }

  if (allNullable) {
    result.add(EPSILON_VALUE);
  }

  const arr = Array.from(result);
  arr.sort((a, b) => {
    if (a === EPSILON_VALUE) return 1;
    if (b === EPSILON_VALUE) return -1;
    return a.localeCompare(b);
  });

  return arr;
}

// ===================================================================
// 3. FOLLOW Sets Engine (Fixed-Point)
// ===================================================================

/**
 * Computes FOLLOW sets for every variable in a Context-Free Grammar.
 * Adds '$' to start variable. Iterates to a fixed point.
 */
export function computeFollowSets(
  grammar: ContextFreeGrammar,
  firstSets: Record<string, ReadonlyArray<string>>
): Record<string, ReadonlyArray<string>> {
  const { variables, productions, startVariable } = grammar;
  const followMap = new Map<string, Set<string>>();

  for (const v of variables) {
    followMap.set(v, new Set<string>());
  }

  // 1. Add '$' to startVariable
  if (startVariable && followMap.has(startVariable)) {
    followMap.get(startVariable)!.add(LL1_END_MARKER);
  }

  const nullableSet = new Set(analyzeCFG(grammar).nullableVariables);

  let changed = true;
  while (changed) {
    changed = false;

    for (const p of productions) {
      const { lhs, rhs } = p;
      const lhsFollow = followMap.get(lhs);

      for (let i = 0; i < rhs.length; i++) {
        const B = rhs[i];
        if (B.type !== 'NON_TERMINAL') continue;

        const bFollow = followMap.get(B.value);
        if (!bFollow) continue;

        const beforeSize = bFollow.size;

        // β is remainder sequence rhs[i+1 ... end]
        const beta = rhs.slice(i + 1);
        const betaFirst = computeFirstOfSequence(beta, firstSets, nullableSet);

        // Add FIRST(β) - {ε} to FOLLOW(B)
        for (const val of betaFirst) {
          if (val !== EPSILON_VALUE) {
            bFollow.add(val);
          }
        }

        // If β ⇒* ε (or β is empty), add FOLLOW(A) to FOLLOW(B)
        if (betaFirst.includes(EPSILON_VALUE) && lhsFollow) {
          for (const val of lhsFollow) {
            bFollow.add(val);
          }
        }

        if (bFollow.size > beforeSize) {
          changed = true;
        }
      }
    }
  }

  const result: Record<string, ReadonlyArray<string>> = {};
  for (const v of variables) {
    const arr = Array.from(followMap.get(v) || []);
    // Sort: '$' last, terminals alphabetically
    arr.sort((a, b) => {
      if (a === LL1_END_MARKER) return 1;
      if (b === LL1_END_MARKER) return -1;
      return a.localeCompare(b);
    });
    result[v] = arr;
  }

  return result;
}

// ===================================================================
// 4. Production SELECT / Prediction Sets
// ===================================================================

/**
 * Computes SELECT(A → α) prediction set:
 *   SELECT(A → α) = (FIRST(α) \ {ε}) ∪ (ε ∈ FIRST(α) ? FOLLOW(A) : ∅)
 */
export function computeProductionSelectSet(
  production: CFGProduction,
  firstSets: Record<string, ReadonlyArray<string>>,
  followSets: Record<string, ReadonlyArray<string>>,
  nullableSet?: Set<string>
): ProductionSelectSet {
  const rhsFirst = computeFirstOfSequence(production.rhs, firstSets, nullableSet);
  const isNullableRhs = rhsFirst.includes(EPSILON_VALUE);

  const selectSet = new Set<string>();

  for (const val of rhsFirst) {
    if (val !== EPSILON_VALUE) {
      selectSet.add(val);
    }
  }

  if (isNullableRhs) {
    const lhsFollow = followSets[production.lhs] || [];
    for (const val of lhsFollow) {
      selectSet.add(val);
    }
  }

  const arr = Array.from(selectSet);
  arr.sort((a, b) => {
    if (a === LL1_END_MARKER) return 1;
    if (b === LL1_END_MARKER) return -1;
    return a.localeCompare(b);
  });

  const rhsNotation = production.rhs.length === 0
    ? 'ε'
    : production.rhs.map((s) => (s.type === 'EPSILON' ? 'ε' : s.value)).join(' ');

  return {
    productionId: production.id,
    lhs: production.lhs,
    rhsNotation,
    selectSet: arr,
    isNullableRhs,
  };
}

// ===================================================================
// 5. Left Recursion Detection
// ===================================================================

export function detectLeftRecursion(grammar: ContextFreeGrammar): LeftRecursionDiagnostic {
  const { variables, productions } = grammar;
  const directVars: string[] = [];

  // Direct left recursion: A → A α
  for (const p of productions) {
    if (p.rhs.length > 0 && p.rhs[0].type === 'NON_TERMINAL' && p.rhs[0].value === p.lhs) {
      if (!directVars.includes(p.lhs)) {
        directVars.push(p.lhs);
      }
    }
  }

  // Indirect left recursion: compute directed graph of immediate left-expansions
  // A → B ... => edge A -> B
  const adjMap = new Map<string, Set<string>>();
  for (const v of variables) {
    adjMap.set(v, new Set());
  }

  for (const p of productions) {
    if (p.rhs.length > 0 && p.rhs[0].type === 'NON_TERMINAL') {
      adjMap.get(p.lhs)?.add(p.rhs[0].value);
    }
  }

  const indirectCycles: string[][] = [];
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function dfs(curr: string, path: string[]) {
    visited.add(curr);
    recStack.add(curr);
    path.push(curr);

    const neighbors = adjMap.get(curr) || new Set();
    for (const neighbor of neighbors) {
      if (recStack.has(neighbor)) {
        // Found cycle
        const cycleStartIdx = path.indexOf(neighbor);
        const cycle = path.slice(cycleStartIdx);
        if (cycle.length > 1) {
          indirectCycles.push(cycle);
        }
      } else if (!visited.has(neighbor)) {
        dfs(neighbor, [...path]);
      }
    }

    recStack.delete(curr);
  }

  for (const v of variables) {
    if (!visited.has(v)) {
      dfs(v, []);
    }
  }

  const isLeftRecursive = directVars.length > 0 || indirectCycles.length > 0;
  let explanation = 'No left recursion detected.';
  if (isLeftRecursive) {
    explanation = '';
    if (directVars.length > 0) {
      explanation += `Direct left recursion in variables: {${directVars.join(', ')}}. `;
    }
    if (indirectCycles.length > 0) {
      explanation += `Indirect left recursion cycle(s): ${indirectCycles.map((c) => c.join(' → ') + ' → ' + c[0]).join('; ')}.`;
    }
  }

  return {
    isLeftRecursive,
    directVariables: directVars,
    indirectCycles,
    explanation,
  };
}

// ===================================================================
// 6. Left Factoring Detection
// ===================================================================

export function detectLeftFactoring(grammar: ContextFreeGrammar): ReadonlyArray<LeftFactoringSuggestion> {
  const { variables, productions } = grammar;
  const suggestions: LeftFactoringSuggestion[] = [];

  for (const v of variables) {
    const vProds = productions.filter((p) => p.lhs === v);
    if (vProds.length < 2) continue;

    // Check pairs of productions for common prefix
    for (let i = 0; i < vProds.length; i++) {
      for (let j = i + 1; j < vProds.length; j++) {
        const p1 = vProds[i];
        const p2 = vProds[j];

        // Find longest common prefix
        const prefix: GrammarSymbol[] = [];
        const minLen = Math.min(p1.rhs.length, p2.rhs.length);

        for (let k = 0; k < minLen; k++) {
          const s1 = p1.rhs[k];
          const s2 = p2.rhs[k];

          if (s1.type === s2.type && s1.value === s2.value) {
            prefix.push(s1);
          } else {
            break;
          }
        }

        if (prefix.length > 0) {
          const prefixNotation = prefix.map((s) => (s.type === 'EPSILON' ? 'ε' : s.value)).join(' ');
          const prodIds = [p1.id, p2.id];

          // Avoid duplicate suggestions for same variable & prefix
          if (!suggestions.some((s) => s.variable === v && s.commonPrefixNotation === prefixNotation)) {
            suggestions.push({
              variable: v,
              commonPrefix: prefix,
              commonPrefixNotation: prefixNotation,
              productionIds: prodIds,
              explanation: `Variable ${v} has productions with common prefix "${prefixNotation}". Left factoring required to achieve LL(1).`,
            });
          }
        }
      }
    }
  }

  return suggestions;
}
