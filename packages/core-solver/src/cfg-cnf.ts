import {
  ContextFreeGrammar,
  CFGProduction,
  GrammarSymbol,
  CNFTransformationResult,
  CNFTransformationStageTrace,
  CNFValidationResult,
  CNFDiagnostic,
} from './types';
import { analyzeCFG } from './cfg-analyzer';
import { validateCFG } from './cfg-validator';

// ===================================================================
// Helpers
// ===================================================================

let _prodCounter = 0;
function freshProdId(): string {
  return `cnf_p${++_prodCounter}`;
}

function resetProdCounter(): void {
  _prodCounter = 0;
}

function makeProduction(lhs: string, rhs: GrammarSymbol[]): CFGProduction {
  return { id: freshProdId(), lhs, rhs };
}

function nt(name: string): GrammarSymbol {
  return { type: 'NON_TERMINAL', value: name };
}

function t(name: string): GrammarSymbol {
  return { type: 'TERMINAL', value: name };
}

const EPSILON_SYM: GrammarSymbol = { type: 'EPSILON', value: 'ε' };

function productionKey(p: CFGProduction): string {
  return `${p.lhs}->${p.rhs.map((s) => `${s.type}:${s.value}`).join(',')}`;
}

function deduplicateProductions(prods: CFGProduction[]): CFGProduction[] {
  const seen = new Set<string>();
  const result: CFGProduction[] = [];
  for (const p of prods) {
    const key = productionKey(p);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(p);
    }
  }
  return result;
}

function cloneGrammar(g: ContextFreeGrammar): ContextFreeGrammar {
  return {
    variables: [...g.variables],
    terminals: [...g.terminals],
    productions: g.productions.map((p) => ({
      id: p.id,
      lhs: p.lhs,
      rhs: [...p.rhs],
    })),
    startVariable: g.startVariable,
  };
}

function freshVariable(base: string, existing: Set<string>): string {
  let candidate = base;
  let suffix = 0;
  while (existing.has(candidate)) {
    candidate = `${base}${suffix}`;
    suffix++;
  }
  return candidate;
}

function makeTrace(
  stage: CNFTransformationStageTrace['stage'],
  description: string,
  mathExplanation: string,
  before: ContextFreeGrammar,
  after: ContextFreeGrammar,
  addedProds: CFGProduction[] = [],
  removedProds: CFGProduction[] = [],
  addedVars: string[] = [],
  removedVars: string[] = [],
): CNFTransformationStageTrace {
  return {
    stage,
    description,
    mathematicalExplanation: mathExplanation,
    grammarBefore: before,
    grammarAfter: after,
    addedProductions: addedProds,
    removedProductions: removedProds,
    addedVariables: addedVars,
    removedVariables: removedVars,
  };
}

// ===================================================================
// Stage 1: Start Symbol Normalization
// ===================================================================

function normalizeStartSymbol(grammar: ContextFreeGrammar): {
  grammar: ContextFreeGrammar;
  trace: CNFTransformationStageTrace;
  newStartIntroduced: boolean;
} {
  const before = cloneGrammar(grammar);
  const { startVariable, productions, variables, terminals } = grammar;

  // Check if start symbol appears on any RHS
  let startOnRhs = false;
  for (const p of productions) {
    for (const sym of p.rhs) {
      if (sym.type === 'NON_TERMINAL' && sym.value === startVariable) {
        startOnRhs = true;
        break;
      }
    }
    if (startOnRhs) break;
  }

  if (!startOnRhs) {
    const after = cloneGrammar(grammar);
    return {
      grammar: after,
      trace: makeTrace(
        'START_SYMBOL_NORMALIZATION',
        'Start symbol does not appear on any RHS. No normalization needed.',
        `S = ${startVariable} does not appear in any production RHS.`,
        before,
        after,
      ),
      newStartIntroduced: false,
    };
  }

  const allSymbols = new Set([...variables, ...terminals]);
  const newStart = freshVariable('S₀', allSymbols);
  if (newStart === 'S₀' && allSymbols.has('S₀')) {
    // fallback
  }
  const newProd = makeProduction(newStart, [nt(startVariable)]);

  const after: ContextFreeGrammar = {
    variables: [newStart, ...variables],
    terminals,
    productions: [newProd, ...productions.map((p) => ({ ...p }))],
    startVariable: newStart,
  };

  return {
    grammar: after,
    trace: makeTrace(
      'START_SYMBOL_NORMALIZATION',
      `Introduced fresh start symbol ${newStart} → ${startVariable} because ${startVariable} appears on a production RHS.`,
      `${startVariable} ∈ RHS(P), so introduce ${newStart} → ${startVariable} with S' = ${newStart}.`,
      before,
      after,
      [newProd],
      [],
      [newStart],
    ),
    newStartIntroduced: true,
  };
}

// ===================================================================
// Stage 2: Epsilon Elimination
// ===================================================================

function eliminateEpsilon(grammar: ContextFreeGrammar): {
  grammar: ContextFreeGrammar;
  trace: CNFTransformationStageTrace;
  epsilonInLanguage: boolean;
} {
  const before = cloneGrammar(grammar);
  const { startVariable, productions, variables, terminals } = grammar;

  // Use the fixed-point nullable computation from cfg-analyzer
  const analysis = analyzeCFG(grammar);
  const nullableSet = new Set(analysis.nullableVariables);

  const epsilonInLanguage = nullableSet.has(startVariable);

  // Generate all nullable-expanded combinations
  const newProductions: CFGProduction[] = [];
  const removedProductions: CFGProduction[] = [];

  for (const p of productions) {
    // Skip pure epsilon productions
    const isEpsilonProd = p.rhs.length === 1 && p.rhs[0].type === 'EPSILON';
    const isAllEpsilon = p.rhs.every((s) => s.type === 'EPSILON');

    if (isEpsilonProd || isAllEpsilon) {
      removedProductions.push(p);
      continue;
    }

    // Find nullable positions (indices of NON_TERMINAL symbols that are nullable)
    const nullablePositions: number[] = [];
    p.rhs.forEach((sym, idx) => {
      if (sym.type === 'NON_TERMINAL' && nullableSet.has(sym.value)) {
        nullablePositions.push(idx);
      }
    });

    if (nullablePositions.length === 0) {
      // No nullable symbols, keep as-is
      newProductions.push({ ...p });
      continue;
    }

    // Generate all subsets of nullable positions
    const subsetCount = 1 << nullablePositions.length;
    for (let mask = 0; mask < subsetCount; mask++) {
      const newRhs: GrammarSymbol[] = [];
      const excludeIndices = new Set<number>();

      for (let bit = 0; bit < nullablePositions.length; bit++) {
        if (mask & (1 << bit)) {
          excludeIndices.add(nullablePositions[bit]);
        }
      }

      for (let i = 0; i < p.rhs.length; i++) {
        if (!excludeIndices.has(i)) {
          newRhs.push(p.rhs[i]);
        }
      }

      // Don't add empty productions (except S → ε handled separately)
      if (newRhs.length > 0) {
        newProductions.push(makeProduction(p.lhs, newRhs));
      }
    }
  }

  // If ε ∈ L(G), add S → ε for the start symbol only
  if (epsilonInLanguage) {
    newProductions.push(makeProduction(startVariable, [EPSILON_SYM]));
  }

  const dedupedProds = deduplicateProductions(newProductions);

  const after: ContextFreeGrammar = {
    variables,
    terminals,
    productions: dedupedProds,
    startVariable,
  };

  const mathExplanation = `Nullable(G) = {${analysis.nullableVariables.join(', ') || '∅'}}. ` +
    `Removed all ε-productions. Generated nullable combinations for ${productions.length} original productions. ` +
    (epsilonInLanguage ? `ε ∈ L(G), so ${startVariable} → ε is preserved.` : 'ε ∉ L(G).');

  return {
    grammar: after,
    trace: makeTrace(
      'EPSILON_ELIMINATION',
      `Eliminated epsilon productions. Nullable variables: {${analysis.nullableVariables.join(', ') || '∅'}}.`,
      mathExplanation,
      before,
      after,
      dedupedProds.filter((p) => !productions.some((orig) => productionKey(orig) === productionKey(p))),
      removedProductions,
    ),
    epsilonInLanguage,
  };
}

// ===================================================================
// Stage 3: Unit Production Elimination
// ===================================================================

function eliminateUnitProductions(grammar: ContextFreeGrammar): {
  grammar: ContextFreeGrammar;
  trace: CNFTransformationStageTrace;
} {
  const before = cloneGrammar(grammar);
  const { startVariable, productions, variables, terminals } = grammar;
  const varSet = new Set(variables);

  // Compute unit-production reachability for each variable
  // unitReach(A) = { B | A ⇒* B via unit productions }
  const unitReach = new Map<string, Set<string>>();

  for (const v of variables) {
    const reach = new Set<string>([v]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const p of productions) {
        if (!reach.has(p.lhs)) continue;
        if (
          p.rhs.length === 1 &&
          p.rhs[0].type === 'NON_TERMINAL' &&
          varSet.has(p.rhs[0].value) &&
          !reach.has(p.rhs[0].value)
        ) {
          reach.add(p.rhs[0].value);
          changed = true;
        }
      }
    }
    unitReach.set(v, reach);
  }

  // Build new productions: for each A, for each B in unitReach(A), add A → rhs
  // for every non-unit production B → rhs
  const newProductions: CFGProduction[] = [];
  const removedProductions: CFGProduction[] = [];

  for (const p of productions) {
    const isUnit = p.rhs.length === 1 && p.rhs[0].type === 'NON_TERMINAL' && varSet.has(p.rhs[0].value);
    if (isUnit) {
      removedProductions.push(p);
    }
  }

  for (const A of variables) {
    const reach = unitReach.get(A)!;
    for (const B of reach) {
      for (const p of productions) {
        if (p.lhs !== B) continue;
        const isUnit = p.rhs.length === 1 && p.rhs[0].type === 'NON_TERMINAL' && varSet.has(p.rhs[0].value);
        if (isUnit) continue;

        newProductions.push(makeProduction(A, [...p.rhs]));
      }
    }
  }

  const dedupedProds = deduplicateProductions(newProductions);

  const after: ContextFreeGrammar = {
    variables,
    terminals,
    productions: dedupedProds,
    startVariable,
  };

  return {
    grammar: after,
    trace: makeTrace(
      'UNIT_ELIMINATION',
      `Eliminated ${removedProductions.length} unit production(s).`,
      `For each A ∈ V, computed UnitReach(A) via transitive closure of unit pairs. Replaced A → B chains with direct productions.`,
      before,
      after,
      dedupedProds.filter((p) => !productions.some((orig) => productionKey(orig) === productionKey(p))),
      removedProductions,
    ),
  };
}

// ===================================================================
// Stage 4: Useless Symbol Elimination
// ===================================================================

function eliminateUselessSymbols(grammar: ContextFreeGrammar): {
  grammar: ContextFreeGrammar;
  trace: CNFTransformationStageTrace;
} {
  const before = cloneGrammar(grammar);
  const analysis = analyzeCFG(grammar);

  const generatingSet = new Set(analysis.generatingVariables);
  const { startVariable, terminals } = grammar;

  // Step 1: Keep only generating productions
  let filteredProds = grammar.productions.filter((p) => {
    if (!generatingSet.has(p.lhs)) return false;
    return p.rhs.every((sym) => {
      if (sym.type === 'TERMINAL' || sym.type === 'EPSILON') return true;
      if (sym.type === 'NON_TERMINAL') return generatingSet.has(sym.value);
      return false;
    });
  });

  let filteredVars = grammar.variables.filter((v) => generatingSet.has(v));

  // Step 2: Recompute reachability from start
  const tempGrammar: ContextFreeGrammar = {
    variables: filteredVars,
    terminals,
    productions: filteredProds,
    startVariable,
  };
  const reachAnalysis = analyzeCFG(tempGrammar);
  const reachableSet = new Set(reachAnalysis.reachableVariables);

  filteredProds = filteredProds.filter((p) => {
    if (!reachableSet.has(p.lhs)) return false;
    return p.rhs.every((sym) => {
      if (sym.type === 'NON_TERMINAL') return reachableSet.has(sym.value);
      return true;
    });
  });

  filteredVars = filteredVars.filter((v) => reachableSet.has(v));

  // Recompute terminals actually used
  const usedTerminals = new Set<string>();
  for (const p of filteredProds) {
    for (const sym of p.rhs) {
      if (sym.type === 'TERMINAL') usedTerminals.add(sym.value);
    }
  }

  const removedVars = grammar.variables.filter((v) => !filteredVars.includes(v));
  const removedProds = grammar.productions.filter(
    (p) => !filteredProds.some((fp) => productionKey(fp) === productionKey(p))
  );

  const after: ContextFreeGrammar = {
    variables: filteredVars,
    terminals: terminals.filter((term) => usedTerminals.has(term)),
    productions: filteredProds,
    startVariable,
  };

  return {
    grammar: after,
    trace: makeTrace(
      'USELESS_SYMBOL_ELIMINATION',
      `Removed ${removedVars.length} useless variable(s): {${removedVars.join(', ') || '∅'}}.`,
      `Generating(G) = {${analysis.generatingVariables.join(', ')}}. Reachable(G) = {${reachAnalysis.reachableVariables.join(', ')}}. Useless = V \\ (Generating ∩ Reachable).`,
      before,
      after,
      [],
      removedProds,
      [],
      removedVars,
    ),
  };
}

// ===================================================================
// Stage 5: Terminal Isolation
// ===================================================================

function isolateTerminals(grammar: ContextFreeGrammar): {
  grammar: ContextFreeGrammar;
  trace: CNFTransformationStageTrace;
} {
  const before = cloneGrammar(grammar);
  const { startVariable, productions, variables, terminals } = grammar;

  const allSymbols = new Set([...variables, ...terminals]);
  const terminalVarMap = new Map<string, string>();
  const newHelperProductions: CFGProduction[] = [];
  const addedVars: string[] = [];

  // For each terminal that appears in a multi-symbol RHS, introduce T_x → x
  function getTerminalVar(termValue: string): string {
    if (terminalVarMap.has(termValue)) {
      return terminalVarMap.get(termValue)!;
    }
    const varName = freshVariable(`T_${termValue}`, allSymbols);
    allSymbols.add(varName);
    terminalVarMap.set(termValue, varName);
    addedVars.push(varName);
    newHelperProductions.push(makeProduction(varName, [t(termValue)]));
    return varName;
  }

  const newProductions: CFGProduction[] = [];

  for (const p of productions) {
    // Only modify productions with RHS length > 1
    if (p.rhs.length <= 1) {
      newProductions.push({ ...p });
      continue;
    }

    // Replace terminals in the RHS with helper variables
    const newRhs: GrammarSymbol[] = p.rhs.map((sym) => {
      if (sym.type === 'TERMINAL') {
        return nt(getTerminalVar(sym.value));
      }
      return sym;
    });

    newProductions.push(makeProduction(p.lhs, newRhs));
  }

  const allProds = [...newProductions, ...newHelperProductions];
  const allVars = [...variables, ...addedVars];

  const after: ContextFreeGrammar = {
    variables: allVars,
    terminals,
    productions: deduplicateProductions(allProds),
    startVariable,
  };

  return {
    grammar: after,
    trace: makeTrace(
      'TERMINAL_ISOLATION',
      `Isolated ${terminalVarMap.size} terminal(s) into helper variables.`,
      `For each terminal a in a mixed RHS (|RHS| > 1), introduced ${Array.from(terminalVarMap.entries()).map(([term, v]) => `${v} → ${term}`).join(', ') || 'none'}.`,
      before,
      after,
      newHelperProductions,
      [],
      addedVars,
    ),
  };
}

// ===================================================================
// Stage 6: Binarization
// ===================================================================

function binarize(grammar: ContextFreeGrammar): {
  grammar: ContextFreeGrammar;
  trace: CNFTransformationStageTrace;
} {
  const before = cloneGrammar(grammar);
  const { startVariable, productions, variables, terminals } = grammar;

  const allSymbols = new Set([...variables, ...terminals]);
  const newProductions: CFGProduction[] = [];
  const addedVars: string[] = [];

  for (const p of productions) {
    if (p.rhs.length <= 2) {
      newProductions.push({ ...p });
      continue;
    }

    // A → B1 B2 B3 ... Bk  =>  A → B1 X1, X1 → B2 X2, ..., X_{k-2} → B_{k-1} Bk
    let currentLhs = p.lhs;
    for (let i = 0; i < p.rhs.length - 2; i++) {
      const chainVar = freshVariable(`${p.lhs}_BIN_${i}`, allSymbols);
      allSymbols.add(chainVar);
      addedVars.push(chainVar);

      newProductions.push(makeProduction(currentLhs, [p.rhs[i], nt(chainVar)]));
      currentLhs = chainVar;
    }
    // Last binary production
    newProductions.push(
      makeProduction(currentLhs, [p.rhs[p.rhs.length - 2], p.rhs[p.rhs.length - 1]])
    );
  }

  const allVars = [...variables, ...addedVars];

  const after: ContextFreeGrammar = {
    variables: allVars,
    terminals,
    productions: deduplicateProductions(newProductions),
    startVariable,
  };

  return {
    grammar: after,
    trace: makeTrace(
      'BINARIZATION',
      `Binarized ${productions.filter((p) => p.rhs.length > 2).length} production(s) with RHS > 2.`,
      `Each A → B1 B2 ... Bk (k > 2) is converted to a right-linear binary chain A → B1 X1, X1 → B2 X2, ..., X_{k-2} → B_{k-1} Bk.`,
      before,
      after,
      newProductions.filter((p) => !productions.some((orig) => productionKey(orig) === productionKey(p))),
      productions.filter((p) => p.rhs.length > 2),
      addedVars,
    ),
  };
}

// ===================================================================
// CNF Validator
// ===================================================================

export function validateCNF(grammar: ContextFreeGrammar): CNFValidationResult {
  const { startVariable, productions } = grammar;
  const diagnostics: CNFDiagnostic[] = [];

  let hasStartEpsilon = false;

  for (const p of productions) {
    const rhsLen = p.rhs.length;

    // Check for empty RHS (should not happen)
    if (rhsLen === 0) {
      diagnostics.push({
        code: 'CNF_EMPTY_RHS',
        severity: 'error',
        message: `Production ${p.lhs} → (empty) has no RHS symbols.`,
        mathematicalExplanation: `CNF does not permit empty RHS. Only S → ε is allowed when ε ∈ L(G).`,
        affectedProductionId: p.id,
      });
      continue;
    }

    // Check A → ε (only allowed for start symbol)
    if (rhsLen === 1 && p.rhs[0].type === 'EPSILON') {
      if (p.lhs === startVariable) {
        hasStartEpsilon = true;
      } else {
        diagnostics.push({
          code: 'CNF_INVALID_EPSILON',
          severity: 'error',
          message: `Production ${p.lhs} → ε is invalid. Only ${startVariable} may produce ε in CNF.`,
          mathematicalExplanation: `In CNF, only the start symbol S may produce ε (when ε ∈ L(G)). ${p.lhs} ≠ S.`,
          affectedProductionId: p.id,
        });
      }
      continue;
    }

    // Check A → a (single terminal)
    if (rhsLen === 1) {
      if (p.rhs[0].type !== 'TERMINAL') {
        diagnostics.push({
          code: 'CNF_UNIT_PRODUCTION',
          severity: 'error',
          message: `Production ${p.lhs} → ${p.rhs[0].value} is a unit production (non-terminal).`,
          mathematicalExplanation: `CNF requires: A → a (terminal) or A → BC (two non-terminals). Single non-terminal RHS is a unit production.`,
          affectedProductionId: p.id,
        });
      }
      continue;
    }

    // Check A → BC (exactly two non-terminals)
    if (rhsLen === 2) {
      for (const sym of p.rhs) {
        if (sym.type !== 'NON_TERMINAL') {
          diagnostics.push({
            code: 'CNF_TERMINAL_IN_BINARY',
            severity: 'error',
            message: `Production ${p.lhs} → ${p.rhs.map((s) => s.value).join(' ')} contains a terminal in a binary RHS.`,
            mathematicalExplanation: `CNF requires binary productions A → BC where B, C ∈ V. Found terminal '${sym.value}'.`,
            affectedProductionId: p.id,
          });
          break;
        }
      }
      continue;
    }

    // RHS too long
    if (rhsLen > 2) {
      diagnostics.push({
        code: 'CNF_RHS_TOO_LONG',
        severity: 'error',
        message: `Production ${p.lhs} → ${p.rhs.map((s) => s.value).join(' ')} has ${rhsLen} symbols (max 2 in CNF).`,
        mathematicalExplanation: `CNF productions have form A → BC or A → a. |RHS| = ${rhsLen} > 2.`,
        affectedProductionId: p.id,
      });
    }
  }

  const errors = diagnostics.filter((d) => d.severity === 'error');
  const warnings = diagnostics.filter((d) => d.severity === 'warning');

  return {
    isValid: errors.length === 0,
    diagnostics,
    errors,
    warnings,
    hasStartEpsilon,
    startSymbol: startVariable,
  };
}

// ===================================================================
// Main: toChomskyNormalForm
// ===================================================================

export interface CNFTransformOptions {
  readonly skipUselessElimination?: boolean;
}

export function toChomskyNormalForm(
  grammar: ContextFreeGrammar,
  options: CNFTransformOptions = {}
): CNFTransformationResult {
  resetProdCounter();

  const originalGrammar = cloneGrammar(grammar);
  const stages: CNFTransformationStageTrace[] = [];
  const allIntroducedVars: string[] = [];
  const allEliminatedProds: CFGProduction[] = [];
  const warnings: string[] = [];

  // Validate input first
  const inputValidation = validateCFG(grammar);
  if (!inputValidation.isValid && inputValidation.errors.length > 0) {
    return {
      success: false,
      originalGrammar,
      transformedGrammar: originalGrammar,
      epsilonInOriginalLanguage: false,
      stages: [],
      introducedVariables: [],
      eliminatedProductions: [],
      totalProductionsOriginal: grammar.productions.length,
      totalProductionsTransformed: grammar.productions.length,
      warnings: ['Input grammar has validation errors.'],
      validationResult: inputValidation,
      errorMessage: 'Cannot transform an invalid grammar to CNF.',
    };
  }

  // Check for empty language
  const initialAnalysis = analyzeCFG(grammar);
  if (initialAnalysis.isLanguageEmpty) {
    // Empty language: return a grammar with no productions
    const emptyGrammar: ContextFreeGrammar = {
      variables: [grammar.startVariable],
      terminals: [],
      productions: [],
      startVariable: grammar.startVariable,
    };
    return {
      success: true,
      originalGrammar,
      transformedGrammar: emptyGrammar,
      epsilonInOriginalLanguage: false,
      stages: [],
      introducedVariables: [],
      eliminatedProductions: [...grammar.productions],
      totalProductionsOriginal: grammar.productions.length,
      totalProductionsTransformed: 0,
      warnings: ['L(G) = ∅. Grammar generates the empty language.'],
      validationResult: inputValidation,
    };
  }

  let current = cloneGrammar(grammar);

  // Stage 1: Start Symbol Normalization
  const startResult = normalizeStartSymbol(current);
  current = startResult.grammar;
  stages.push(startResult.trace);
  allIntroducedVars.push(...startResult.trace.addedVariables);

  // Stage 2: Epsilon Elimination
  const epsilonResult = eliminateEpsilon(current);
  current = epsilonResult.grammar;
  stages.push(epsilonResult.trace);
  allEliminatedProds.push(...epsilonResult.trace.removedProductions);

  // Stage 3: Unit Production Elimination
  const unitResult = eliminateUnitProductions(current);
  current = unitResult.grammar;
  stages.push(unitResult.trace);
  allEliminatedProds.push(...unitResult.trace.removedProductions);

  // Stage 4: Useless Symbol Elimination
  if (!options.skipUselessElimination) {
    const uselessResult = eliminateUselessSymbols(current);
    current = uselessResult.grammar;
    stages.push(uselessResult.trace);
    allEliminatedProds.push(...uselessResult.trace.removedProductions);
  }

  // Stage 5: Terminal Isolation
  const termResult = isolateTerminals(current);
  current = termResult.grammar;
  stages.push(termResult.trace);
  allIntroducedVars.push(...termResult.trace.addedVariables);

  // Stage 6: Binarization
  const binResult = binarize(current);
  current = binResult.grammar;
  stages.push(binResult.trace);
  allIntroducedVars.push(...binResult.trace.addedVariables);

  // Final CNF Validation
  const cnfValidation = validateCNF(current);
  if (!cnfValidation.isValid) {
    warnings.push('CNF validation produced diagnostics after transformation. This may indicate a bug.');
  }

  return {
    success: cnfValidation.isValid,
    originalGrammar,
    transformedGrammar: current,
    epsilonInOriginalLanguage: epsilonResult.epsilonInLanguage,
    stages,
    introducedVariables: allIntroducedVars,
    eliminatedProductions: allEliminatedProds,
    totalProductionsOriginal: grammar.productions.length,
    totalProductionsTransformed: current.productions.length,
    warnings,
    validationResult: inputValidation,
  };
}
