import {
  ContextFreeGrammar,
  CFGProduction,
  GrammarSymbol,
  ProductionSelectSet,
  LeftRecursionDiagnostic,
  LeftRecursionClassification,
  LeftFactoringSuggestion,
  LeftFactoringGroup,
  LeftFactoringDiagnostic,
  FirstFollowAnalysisResult,
  FirstFollowIterationStep,
  SymbolFirstFollowExplanation,
  LL1_END_MARKER,
} from './types';
import { analyzeCFG } from './cfg-analyzer';
import { validateCFG } from './cfg-validator';

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
// 3.5. Detailed FIRST & FOLLOW Analysis Engine (with fixed-point iterations & explanations)
// ===================================================================

/**
 * Computes comprehensive FIRST & FOLLOW sets with iterative step-by-step history,
 * symbol-level mathematical explanations, rule contributions, and dependencies.
 */
export function computeDetailedFirstFollowAnalysis(
  grammar: ContextFreeGrammar
): FirstFollowAnalysisResult {
  const validation = validateCFG(grammar);
  if (!validation.isValid) {
    return {
      isValid: false,
      variables: grammar.variables || [],
      terminals: grammar.terminals || [],
      startVariable: grammar.startVariable || '',
      nullableVariables: [],
      firstSets: {},
      followSets: {},
      firstIterations: [],
      followIterations: [],
      explanations: {},
      diagnostics: validation.errors.map((e) => e.message),
    };
  }

  const { variables, terminals, productions, startVariable } = grammar;

  // 1. Nullable Analysis with explicit rationale
  const nullableSet = new Set<string>();
  const nullableReasons = new Map<string, string>();
  let nullableChanged = true;

  while (nullableChanged) {
    nullableChanged = false;
    for (const p of productions) {
      if (nullableSet.has(p.lhs)) continue;

      if (p.rhs.length === 0 || (p.rhs.length === 1 && p.rhs[0].type === 'EPSILON')) {
        nullableSet.add(p.lhs);
        nullableReasons.set(p.lhs, `Direct ε-production: ${p.lhs} → ε`);
        nullableChanged = true;
      } else {
        const isRhsNullable = p.rhs.every((sym) => {
          if (sym.type === 'EPSILON') return true;
          if (sym.type === 'NON_TERMINAL') return nullableSet.has(sym.value);
          return false;
        });

        if (isRhsNullable) {
          nullableSet.add(p.lhs);
          const rhsSyms = p.rhs.map((s) => s.value).join('');
          nullableReasons.set(p.lhs, `All RHS symbols derive ε in ${p.lhs} → ${rhsSyms}`);
          nullableChanged = true;
        }
      }
    }
  }

  const nullableVariables = Array.from(nullableSet).sort();

  // Helper for formatting RHS
  const formatRhs = (rhs: ReadonlyArray<GrammarSymbol>) => {
    if (rhs.length === 0) return 'ε';
    return rhs.map((s) => (s.type === 'EPSILON' ? 'ε' : s.value)).join(' ');
  };

  // Helper for sorting FIRST sets
  const sortFirstArray = (set: Set<string>): string[] => {
    const arr = Array.from(set);
    arr.sort((a, b) => {
      if (a === EPSILON_VALUE) return 1;
      if (b === EPSILON_VALUE) return -1;
      return a.localeCompare(b);
    });
    return arr;
  };

  // Helper for sorting FOLLOW sets
  const sortFollowArray = (set: Set<string>): string[] => {
    const arr = Array.from(set);
    arr.sort((a, b) => {
      if (a === LL1_END_MARKER) return 1;
      if (b === LL1_END_MARKER) return -1;
      return a.localeCompare(b);
    });
    return arr;
  };

  // 2. FIRST Sets with Iteration History & Explanations
  const firstMap = new Map<string, Set<string>>();
  const firstRulesMap = new Map<string, Set<string>>();
  const firstDepsMap = new Map<string, Set<string>>();

  for (const v of variables) {
    firstMap.set(v, new Set<string>());
    firstRulesMap.set(v, new Set<string>());
    firstDepsMap.set(v, new Set<string>());
  }

  const firstIterations: FirstFollowIterationStep[] = [];

  // Snapshot initial empty state (Iteration 0)
  const initialFirstSnapshot: Record<string, ReadonlyArray<string>> = {};
  for (const v of variables) {
    initialFirstSnapshot[v] = [];
  }
  firstIterations.push({ iteration: 0, sets: initialFirstSnapshot, changed: true });

  let firstPass = 0;
  let firstChanged = true;

  while (firstChanged && firstPass < 30) {
    firstPass++;
    firstChanged = false;

    for (const p of productions) {
      const lhsSet = firstMap.get(p.lhs);
      if (!lhsSet) continue;

      const rhsText = formatRhs(p.rhs);

      if (p.rhs.length === 0 || (p.rhs.length === 1 && p.rhs[0].type === 'EPSILON')) {
        if (!lhsSet.has(EPSILON_VALUE)) {
          lhsSet.add(EPSILON_VALUE);
          firstChanged = true;
          firstRulesMap.get(p.lhs)!.add(`Production ${p.lhs} → ε: add ε to FIRST(${p.lhs})`);
        }
      } else {
        let allNullable = true;

        for (const sym of p.rhs) {
          if (sym.type === 'EPSILON') {
            continue;
          }

          if (sym.type === 'TERMINAL') {
            if (!lhsSet.has(sym.value)) {
              lhsSet.add(sym.value);
              firstChanged = true;
              firstRulesMap.get(p.lhs)!.add(`Production ${p.lhs} → ${rhsText}: first non-nullable symbol is terminal '${sym.value}', add '${sym.value}' to FIRST(${p.lhs})`);
            }
            allNullable = false;
            break;
          }

          if (sym.type === 'NON_TERMINAL') {
            firstDepsMap.get(p.lhs)!.add(sym.value);
            const symFirst = firstMap.get(sym.value);
            if (symFirst) {
              for (const val of symFirst) {
                if (val !== EPSILON_VALUE && !lhsSet.has(val)) {
                  lhsSet.add(val);
                  firstChanged = true;
                  firstRulesMap.get(p.lhs)!.add(`Production ${p.lhs} → ${rhsText}: add FIRST(${sym.value}) \\ {ε} ('${val}') to FIRST(${p.lhs})`);
                }
              }
            }

            if (!nullableSet.has(sym.value)) {
              allNullable = false;
              break;
            }
          }
        }

        if (allNullable && !lhsSet.has(EPSILON_VALUE)) {
          lhsSet.add(EPSILON_VALUE);
          firstChanged = true;
          firstRulesMap.get(p.lhs)!.add(`Production ${p.lhs} → ${rhsText}: all symbols on RHS derive ε, add ε to FIRST(${p.lhs})`);
        }
      }
    }

    const snapshot: Record<string, ReadonlyArray<string>> = {};
    for (const v of variables) {
      snapshot[v] = sortFirstArray(firstMap.get(v)!);
    }
    firstIterations.push({ iteration: firstPass, sets: snapshot, changed: firstChanged });
  }

  const finalFirstSets: Record<string, ReadonlyArray<string>> = {};
  for (const v of variables) {
    finalFirstSets[v] = sortFirstArray(firstMap.get(v)!);
  }

  // 3. FOLLOW Sets with Iteration History & Explanations
  const followMap = new Map<string, Set<string>>();
  const followRulesMap = new Map<string, Set<string>>();
  const followDepsMap = new Map<string, Set<string>>();

  for (const v of variables) {
    followMap.set(v, new Set<string>());
    followRulesMap.set(v, new Set<string>());
    followDepsMap.set(v, new Set<string>());
  }

  const followIterations: FirstFollowIterationStep[] = [];

  // Start variable initialization
  if (startVariable && followMap.has(startVariable)) {
    followMap.get(startVariable)!.add(LL1_END_MARKER);
    followRulesMap.get(startVariable)!.add(`Designated start symbol S = '${startVariable}': add end-marker '$' to FOLLOW(${startVariable})`);
  }

  const initialFollowSnapshot: Record<string, ReadonlyArray<string>> = {};
  for (const v of variables) {
    initialFollowSnapshot[v] = sortFollowArray(followMap.get(v)!);
  }
  followIterations.push({ iteration: 0, sets: initialFollowSnapshot, changed: true });

  let followPass = 0;
  let followChanged = true;

  while (followChanged && followPass < 30) {
    followPass++;
    followChanged = false;

    for (const p of productions) {
      const { lhs, rhs } = p;
      const lhsFollow = followMap.get(lhs);
      const rhsText = formatRhs(rhs);

      for (let i = 0; i < rhs.length; i++) {
        const B = rhs[i];
        if (B.type !== 'NON_TERMINAL') continue;

        const bFollow = followMap.get(B.value);
        if (!bFollow) continue;

        // β is remainder sequence rhs[i+1 ... end]
        const beta = rhs.slice(i + 1);
        const betaFirst = computeFirstOfSequence(beta, finalFirstSets, nullableSet);
        const betaText = formatRhs(beta);

        // Add FIRST(β) - {ε} to FOLLOW(B)
        for (const val of betaFirst) {
          if (val !== EPSILON_VALUE && !bFollow.has(val)) {
            bFollow.add(val);
            followChanged = true;
            followRulesMap.get(B.value)!.add(
              `Production ${lhs} → ${rhsText}: '${B.value}' is followed by '${betaText}', add FIRST(${betaText}) \\ {ε} ('${val}') to FOLLOW(${B.value})`
            );
          }
        }

        // If β ⇒* ε (or β is empty), add FOLLOW(lhs) to FOLLOW(B)
        if (betaFirst.includes(EPSILON_VALUE) && lhsFollow) {
          followDepsMap.get(B.value)!.add(lhs);
          for (const val of lhsFollow) {
            if (!bFollow.has(val)) {
              bFollow.add(val);
              followChanged = true;
              followRulesMap.get(B.value)!.add(
                `Production ${lhs} → ${rhsText}: '${B.value}' appears at end / followed by nullable suffix '${betaText}', propagate FOLLOW(${lhs}) ('${val}') to FOLLOW(${B.value})`
              );
            }
          }
        }
      }
    }

    const snapshot: Record<string, ReadonlyArray<string>> = {};
    for (const v of variables) {
      snapshot[v] = sortFollowArray(followMap.get(v)!);
    }
    followIterations.push({ iteration: followPass, sets: snapshot, changed: followChanged });
  }

  const finalFollowSets: Record<string, ReadonlyArray<string>> = {};
  for (const v of variables) {
    finalFollowSets[v] = sortFollowArray(followMap.get(v)!);
  }

  // 4. Compile Per-Symbol Explanations & Dependencies
  const explanations: Record<string, SymbolFirstFollowExplanation> = {};
  for (const v of variables) {
    const isNullable = nullableSet.has(v);
    const nullableReason = nullableReasons.get(v);
    const firstRules = Array.from(firstRulesMap.get(v) || []);
    const followRules = Array.from(followRulesMap.get(v) || []);
    const firstDependsOn = Array.from(firstDepsMap.get(v) || []).sort();
    const followDependsOn = Array.from(followDepsMap.get(v) || []).sort();

    explanations[v] = {
      variable: v,
      isNullable,
      nullableReason,
      firstSet: finalFirstSets[v] || [],
      firstRules,
      followSet: finalFollowSets[v] || [],
      followRules,
      dependencies: {
        firstDependsOn,
        followDependsOn,
      },
    };
  }

  return {
    isValid: true,
    variables,
    terminals,
    startVariable,
    nullableVariables,
    firstSets: finalFirstSets,
    followSets: finalFollowSets,
    firstIterations,
    followIterations,
    explanations,
  };
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
  const directProds: CFGProduction[] = [];

  // Direct left recursion: A → A α
  for (const p of productions) {
    if (p.rhs.length > 0 && p.rhs[0].type === 'NON_TERMINAL' && p.rhs[0].value === p.lhs) {
      directProds.push(p);
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

  const leftCornerDeps: Record<string, ReadonlyArray<string>> = {};
  for (const v of variables) {
    leftCornerDeps[v] = Array.from(adjMap.get(v) || []).sort();
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
          // Avoid duplicate permutations of the same cycle
          const cycleStr = cycle.join(' → ');
          if (!indirectCycles.some((c) => c.join(' → ') === cycleStr)) {
            indirectCycles.push(cycle);
          }
        }
      } else if (!visited.has(neighbor)) {
        dfs(neighbor, [...path]);
      }
    }

    recStack.delete(curr);
  }

  for (const v of variables) {
    visited.clear();
    recStack.clear();
    dfs(v, []);
  }

  const isDirect = directVars.length > 0;
  const isIndirect = indirectCycles.length > 0;
  const isLeftRecursive = isDirect || isIndirect;

  let classification: LeftRecursionClassification = 'NO_LEFT_RECURSION';
  if (isDirect && isIndirect) {
    classification = 'BOTH';
  } else if (isDirect) {
    classification = 'IMMEDIATE_LEFT_RECURSION';
  } else if (isIndirect) {
    classification = 'INDIRECT_LEFT_RECURSION';
  }

  let explanation = 'No left recursion detected. (Right-recursive and non-recursive productions are safe).';
  if (isLeftRecursive) {
    explanation = '';
    if (isDirect) {
      explanation += `Immediate left recursion detected in variable(s): {${directVars.join(', ')}}. `;
    }
    if (isIndirect) {
      explanation += `Indirect left recursion cycle(s) detected: ${indirectCycles.map((c) => c.join(' → ') + ' → ' + c[0]).join('; ')}.`;
    }
  }

  return {
    isLeftRecursive,
    classification,
    directVariables: directVars,
    directProductions: directProds,
    indirectCycles,
    leftCornerDependencies: leftCornerDeps,
    explanation,
  };
}


// ===================================================================
// 6. Left Factoring Detection
// ===================================================================

export function computeLongestCommonPrefix(
  rhs1: ReadonlyArray<GrammarSymbol>,
  rhs2: ReadonlyArray<GrammarSymbol>
): GrammarSymbol[] {
  const clean1 = rhs1.filter((s) => s.type !== 'EPSILON');
  const clean2 = rhs2.filter((s) => s.type !== 'EPSILON');
  const prefix: GrammarSymbol[] = [];
  const minLen = Math.min(clean1.length, clean2.length);

  for (let k = 0; k < minLen; k++) {
    const s1 = clean1[k];
    const s2 = clean2[k];
    if (s1.type === s2.type && s1.value === s2.value) {
      prefix.push(s1);
    } else {
      break;
    }
  }

  return prefix;
}

export function detectLeftFactoring(grammar: ContextFreeGrammar): LeftFactoringDiagnostic {
  const { variables, productions } = grammar;
  const groups: LeftFactoringGroup[] = [];
  const factorableVars = new Set<string>();

  for (const v of variables) {
    const vProds = productions.filter((p) => p.lhs === v);
    if (vProds.length < 2) continue;

    const validProds = vProds.filter((p) => p.rhs.some((s) => s.type !== 'EPSILON'));
    if (validProds.length < 2) continue;

    // Collect all candidate common prefixes
    const candidatePrefixes: GrammarSymbol[][] = [];

    for (let i = 0; i < validProds.length; i++) {
      for (let j = i + 1; j < validProds.length; j++) {
        const prefix = computeLongestCommonPrefix(validProds[i].rhs, validProds[j].rhs);
        if (prefix.length > 0) {
          const prefixKey = prefix.map((s) => `${s.type}:${s.value}`).join(',');
          if (!candidatePrefixes.some((cp) => cp.map((s) => `${s.type}:${s.value}`).join(',') === prefixKey)) {
            candidatePrefixes.push(prefix);
          }
        }
      }
    }

    // Sort candidate prefixes by length descending so longest common prefixes are evaluated first
    candidatePrefixes.sort((a, b) => b.length - a.length);

    const processedProdIds = new Set<string>();

    for (const prefix of candidatePrefixes) {
      const prefixNotation = prefix.map((s) => (s.type === 'EPSILON' ? 'ε' : s.value)).join(' ');

      // Find all productions for v that start with this prefix
      const matched = validProds.filter((p) => {
        const cleanRhs = p.rhs.filter((s) => s.type !== 'EPSILON');
        if (cleanRhs.length < prefix.length) return false;
        for (let k = 0; k < prefix.length; k++) {
          if (cleanRhs[k].type !== prefix[k].type || cleanRhs[k].value !== prefix[k].value) {
            return false;
          }
        }
        return true;
      });

      if (matched.length >= 2) {
        const unconsumed = matched.filter((p) => !processedProdIds.has(p.id));
        if (unconsumed.length >= 2) {
          for (const p of matched) {
            processedProdIds.add(p.id);
          }

          const suffixes = matched.map((p) => {
            const cleanRhs = p.rhs.filter((s) => s.type !== 'EPSILON');
            const rem = cleanRhs.slice(prefix.length);
            const suffixSymbols: GrammarSymbol[] = rem.length === 0 ? [{ type: 'EPSILON', value: 'ε' }] : rem;
            const suffixNotation = suffixSymbols.map((s) => (s.type === 'EPSILON' ? 'ε' : s.value)).join(' ');
            return {
              productionId: p.id,
              suffixSymbols,
              suffixNotation,
            };
          });

          const plannedTransformation = `${v} → ${prefixNotation} ${v}' ; ${v}' → ${suffixes.map((s) => s.suffixNotation).join(' | ')}`;

          groups.push({
            variable: v,
            commonPrefix: prefix,
            commonPrefixNotation: prefixNotation,
            matchedProductions: matched,
            suffixes,
            plannedTransformation,
          });

          factorableVars.add(v);
        }
      }
    }
  }

  const requiresFactoring = groups.length > 0;
  let explanation = 'No left factoring required (all production alternatives have distinct leading symbols).';
  if (requiresFactoring) {
    explanation = `Left factoring available for ${factorableVars.size} variable(s): {${Array.from(factorableVars).join(', ')}} across ${groups.length} prefix group(s).`;
  }

  return {
    requiresFactoring,
    groups,
    factorableVariables: Array.from(factorableVars),
    totalPrefixGroups: groups.length,
    explanation,
  };
}

export function detectLeftFactoringSuggestions(grammar: ContextFreeGrammar): ReadonlyArray<LeftFactoringSuggestion> {
  const diag = detectLeftFactoring(grammar);
  return diag.groups.map((g) => ({
    variable: g.variable,
    commonPrefix: g.commonPrefix,
    commonPrefixNotation: g.commonPrefixNotation,
    productionIds: g.matchedProductions.map((p) => p.id),
    explanation: `Variable ${g.variable} has productions with common prefix "${g.commonPrefixNotation}". Left factoring required to achieve LL(1).`,
  }));
}

