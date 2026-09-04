import {
  ContextFreeGrammar,
  CFGProduction,
  GrammarSymbol,
  GNFTransformationResult,
  GNFTransformationStageTrace,
  GNFValidationResult,
  GNFDiagnostic,
} from './types';
import { analyzeCFG } from './cfg-analyzer';
import { validateCFG } from './cfg-validator';

// ===================================================================
// Helpers & State
// ===================================================================

let _prodCounter = 0;
function freshProdId(): string {
  return `gnf_p${++_prodCounter}`;
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
  stage: GNFTransformationStageTrace['stage'],
  description: string,
  mathExplanation: string,
  before: ContextFreeGrammar,
  after: ContextFreeGrammar,
  addedProds: CFGProduction[] = [],
  removedProds: CFGProduction[] = [],
  addedVars: string[] = [],
  removedVars: string[] = [],
): GNFTransformationStageTrace {
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
// GNF Validator
// ===================================================================

export function validateGNF(grammar: ContextFreeGrammar): GNFValidationResult {
  const { startVariable, productions } = grammar;
  const diagnostics: GNFDiagnostic[] = [];

  let hasStartEpsilon = false;

  for (const p of productions) {
    const rhsLen = p.rhs.length;

    // Empty RHS check
    if (rhsLen === 0) {
      diagnostics.push({
        code: 'GNF_EMPTY_RHS',
        severity: 'error',
        message: `Production ${p.lhs} → (empty) has no RHS symbols.`,
        mathematicalExplanation: 'GNF does not permit empty RHS. Only S → ε is allowed when ε ∈ L(G).',
        affectedProductionId: p.id,
      });
      continue;
    }

    // Epsilon check (only permitted for start symbol S → ε)
    if (rhsLen === 1 && p.rhs[0].type === 'EPSILON') {
      if (p.lhs === startVariable) {
        hasStartEpsilon = true;
      } else {
        diagnostics.push({
          code: 'GNF_INVALID_EPSILON',
          severity: 'error',
          message: `Production ${p.lhs} → ε is invalid in GNF. Only start symbol ${startVariable} may produce ε.`,
          mathematicalExplanation: `In GNF, only the start symbol S may produce ε when ε ∈ L(G). Nonterminal ${p.lhs} ≠ ${startVariable}.`,
          affectedProductionId: p.id,
        });
      }
      continue;
    }

    // Leading symbol must be TERMINAL
    if (p.rhs[0].type !== 'TERMINAL') {
      diagnostics.push({
        code: 'GNF_LEADING_NON_TERMINAL',
        severity: 'error',
        message: `Production ${p.lhs} → ${p.rhs.map((s) => s.value).join(' ')} starts with nonterminal '${p.rhs[0].value}'.`,
        mathematicalExplanation: 'Every production in Greibach Normal Form must begin with a terminal: A → a α where a ∈ Σ, α ∈ V*.',
        affectedProductionId: p.id,
      });
    }

    // All subsequent symbols (index >= 1) must be NON_TERMINAL
    for (let i = 1; i < rhsLen; i++) {
      if (p.rhs[i].type !== 'NON_TERMINAL') {
        diagnostics.push({
          code: 'GNF_TERMINAL_AFTER_FIRST',
          severity: 'error',
          message: `Production ${p.lhs} → ${p.rhs.map((s) => s.value).join(' ')} has terminal '${p.rhs[i].value}' at position ${i + 1}.`,
          mathematicalExplanation: 'In GNF (A → a α), all symbols after the leading terminal must be nonterminals: α ∈ V*.',
          affectedProductionId: p.id,
        });
        break;
      }
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
// GNF Transformation Options
// ===================================================================

export interface GNFTransformOptions {
  readonly maxIterations?: number;
}

// ===================================================================
// Main: toGreibachNormalForm
// ===================================================================

export function toGreibachNormalForm(
  grammar: ContextFreeGrammar,
  _options: GNFTransformOptions = {}
): GNFTransformationResult {
  resetProdCounter();

  const originalGrammar = cloneGrammar(grammar);
  const stages: GNFTransformationStageTrace[] = [];
  const allIntroducedVars: string[] = [];
  const allEliminatedProds: CFGProduction[] = [];
  const warnings: string[] = [];

  // 1. Validate input grammar
  const inputValidation = validateCFG(grammar);
  if (!inputValidation.isValid && inputValidation.errors.length > 0) {
    const invalidValidation: GNFValidationResult = {
      isValid: false,
      diagnostics: [],
      errors: [],
      warnings: [],
      hasStartEpsilon: false,
      startSymbol: grammar.startVariable,
    };
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
      gnfValidation: invalidValidation,
      errorMessage: 'Cannot transform an invalid grammar to GNF.',
    };
  }

  // 2. Check for empty language
  const initialAnalysis = analyzeCFG(grammar);
  if (initialAnalysis.isLanguageEmpty) {
    const emptyGrammar: ContextFreeGrammar = {
      variables: [grammar.startVariable],
      terminals: [],
      productions: [],
      startVariable: grammar.startVariable,
    };
    const emptyVal = validateGNF(emptyGrammar);
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
      gnfValidation: emptyVal,
    };
  }

  let current = cloneGrammar(grammar);
  const allSymbols = new Set([...current.variables, ...current.terminals]);

  // Stage 1: Start Symbol Normalization
  let startOnRhs = false;
  for (const p of current.productions) {
    for (const sym of p.rhs) {
      if (sym.type === 'NON_TERMINAL' && sym.value === current.startVariable) {
        startOnRhs = true;
        break;
      }
    }
    if (startOnRhs) break;
  }

  if (startOnRhs) {
    const before = cloneGrammar(current);
    const newStart = freshVariable('S₀', allSymbols);
    allSymbols.add(newStart);
    allIntroducedVars.push(newStart);

    const newStartProd = makeProduction(newStart, [nt(current.startVariable)]);
    current = {
      variables: [newStart, ...current.variables],
      terminals: current.terminals,
      productions: [newStartProd, ...current.productions.map((p) => ({ ...p }))],
      startVariable: newStart,
    };

    stages.push(
      makeTrace(
        'START_SYMBOL_NORMALIZATION',
        `Introduced fresh start symbol ${newStart} → ${before.startVariable} because ${before.startVariable} appears on a RHS.`,
        `Start symbol ${before.startVariable} appears on RHS. Replaced start symbol with fresh variable ${newStart}.`,
        before,
        current,
        [newStartProd],
        [],
        [newStart],
      )
    );
  }

  // Stage 2: Epsilon Elimination
  const analysis = analyzeCFG(current);
  const nullableSet = new Set(analysis.nullableVariables);
  const epsilonInLanguage = nullableSet.has(current.startVariable);

  {
    const before = cloneGrammar(current);
    const newProductions: CFGProduction[] = [];
    const removedProductions: CFGProduction[] = [];

    for (const p of current.productions) {
      const isEpsilonProd = p.rhs.length === 1 && p.rhs[0].type === 'EPSILON';
      const isAllEpsilon = p.rhs.every((s) => s.type === 'EPSILON');

      if (isEpsilonProd || isAllEpsilon) {
        removedProductions.push(p);
        continue;
      }

      const nullablePositions: number[] = [];
      p.rhs.forEach((sym, idx) => {
        if (sym.type === 'NON_TERMINAL' && nullableSet.has(sym.value)) {
          nullablePositions.push(idx);
        }
      });

      if (nullablePositions.length === 0) {
        newProductions.push({ ...p });
        continue;
      }

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

        if (newRhs.length > 0) {
          newProductions.push(makeProduction(p.lhs, newRhs));
        }
      }
    }

    if (epsilonInLanguage) {
      newProductions.push(makeProduction(current.startVariable, [EPSILON_SYM]));
    }

    const dedupedProds = deduplicateProductions(newProductions);
    current = {
      variables: current.variables,
      terminals: current.terminals,
      productions: dedupedProds,
      startVariable: current.startVariable,
    };

    allEliminatedProds.push(...removedProductions);
    stages.push(
      makeTrace(
        'EPSILON_ELIMINATION',
        `Eliminated epsilon productions. Nullable variables: {${analysis.nullableVariables.join(', ') || '∅'}}.`,
        `Nullable(G) = {${analysis.nullableVariables.join(', ') || '∅'}}. ` +
          (epsilonInLanguage ? `ε ∈ L(G), so ${current.startVariable} → ε is preserved.` : 'ε ∉ L(G).'),
        before,
        current,
        dedupedProds.filter((p) => !before.productions.some((orig) => productionKey(orig) === productionKey(p))),
        removedProductions,
      )
    );
  }

  // Stage 3: Unit Elimination
  {
    const before = cloneGrammar(current);
    const varSet = new Set(current.variables);
    const unitReach = new Map<string, Set<string>>();

    for (const v of current.variables) {
      const reach = new Set<string>([v]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const p of current.productions) {
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

    const newProductions: CFGProduction[] = [];
    const removedProductions: CFGProduction[] = [];

    for (const p of current.productions) {
      const isUnit = p.rhs.length === 1 && p.rhs[0].type === 'NON_TERMINAL' && varSet.has(p.rhs[0].value);
      if (isUnit) {
        removedProductions.push(p);
      }
    }

    for (const A of current.variables) {
      const reach = unitReach.get(A)!;
      for (const B of reach) {
        for (const p of current.productions) {
          if (p.lhs !== B) continue;
          const isUnit = p.rhs.length === 1 && p.rhs[0].type === 'NON_TERMINAL' && varSet.has(p.rhs[0].value);
          if (isUnit) continue;

          newProductions.push(makeProduction(A, [...p.rhs]));
        }
      }
    }

    const dedupedProds = deduplicateProductions(newProductions);
    current = {
      variables: current.variables,
      terminals: current.terminals,
      productions: dedupedProds,
      startVariable: current.startVariable,
    };

    allEliminatedProds.push(...removedProductions);
    stages.push(
      makeTrace(
        'UNIT_ELIMINATION',
        `Eliminated ${removedProductions.length} unit production(s).`,
        'Computed unit pair transitive closures and replaced unit productions with direct derived alternatives.',
        before,
        current,
        dedupedProds.filter((p) => !before.productions.some((orig) => productionKey(orig) === productionKey(p))),
        removedProductions,
      )
    );
  }

  // Stage 4: Useless Symbol Elimination
  {
    const before = cloneGrammar(current);
    const gAnalysis = analyzeCFG(current);
    const generatingSet = new Set(gAnalysis.generatingVariables);

    let filteredProds = current.productions.filter((p) => {
      if (!generatingSet.has(p.lhs)) return false;
      return p.rhs.every((sym) => {
        if (sym.type === 'TERMINAL' || sym.type === 'EPSILON') return true;
        if (sym.type === 'NON_TERMINAL') return generatingSet.has(sym.value);
        return false;
      });
    });

    let filteredVars = current.variables.filter((v) => generatingSet.has(v));

    const tempGrammar: ContextFreeGrammar = {
      variables: filteredVars,
      terminals: current.terminals,
      productions: filteredProds,
      startVariable: current.startVariable,
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

    const usedTerminals = new Set<string>();
    for (const p of filteredProds) {
      for (const sym of p.rhs) {
        if (sym.type === 'TERMINAL') usedTerminals.add(sym.value);
      }
    }

    const removedVars = current.variables.filter((v) => !filteredVars.includes(v));
    const removedProds = current.productions.filter(
      (p) => !filteredProds.some((fp) => productionKey(fp) === productionKey(p))
    );

    current = {
      variables: filteredVars,
      terminals: current.terminals.filter((term) => usedTerminals.has(term)),
      productions: filteredProds,
      startVariable: current.startVariable,
    };

    allEliminatedProds.push(...removedProds);
    stages.push(
      makeTrace(
        'USELESS_SYMBOL_ELIMINATION',
        `Removed ${removedVars.length} useless variable(s): {${removedVars.join(', ') || '∅'}}.`,
        `Generating = {${gAnalysis.generatingVariables.join(', ')}}. Reachable = {${reachAnalysis.reachableVariables.join(', ')}}.`,
        before,
        current,
        [],
        removedProds,
        [],
        removedVars,
      )
    );
  }

  // Stage 5: Terminal Isolation for Multi-symbol RHSs (replace non-leading terminals with helper variables)
  const terminalVarMap = new Map<string, string>();
  const terminalHelperProductions: CFGProduction[] = [];

  function getTerminalVar(termValue: string): string {
    if (terminalVarMap.has(termValue)) {
      return terminalVarMap.get(termValue)!;
    }
    const varName = freshVariable(`T_${termValue}`, allSymbols);
    allSymbols.add(varName);
    terminalVarMap.set(termValue, varName);
    allIntroducedVars.push(varName);
    terminalHelperProductions.push(makeProduction(varName, [t(termValue)]));
    return varName;
  }

  {
    const before = cloneGrammar(current);
    const newProds: CFGProduction[] = [];

    for (const p of current.productions) {
      // If single symbol, keep
      if (p.rhs.length <= 1) {
        newProds.push({ ...p });
        continue;
      }

      // In multi-symbol RHS, convert all non-leading terminals or all terminals in non-terminal starting RHSs
      const newRhs: GrammarSymbol[] = [];
      p.rhs.forEach((sym, idx) => {
        if (sym.type === 'TERMINAL') {
          // If it's at index 0 and we want to keep leading terminal, we could keep it,
          // but replacing all terminals in mixed RHS with helper variables produces clean CNF-like form A -> B C ...
          // which standard Hopcroft-Ullman GNF algorithm converts seamlessly.
          if (idx === 0) {
            newRhs.push(sym);
          } else {
            newRhs.push(nt(getTerminalVar(sym.value)));
          }
        } else {
          newRhs.push(sym);
        }
      });
      newProds.push(makeProduction(p.lhs, newRhs));
    }

    const allVars = [...current.variables, ...Array.from(terminalVarMap.values())];
    current = {
      variables: deduplicateProductions(allVars.map((v) => ({ id: v, lhs: v, rhs: [] }))).map((p) => p.lhs),
      terminals: current.terminals,
      productions: deduplicateProductions([...newProds, ...terminalHelperProductions]),
      startVariable: current.startVariable,
    };

    stages.push(
      makeTrace(
        'TERMINAL_NORMALIZATION',
        `Isolated non-leading terminals into ${terminalVarMap.size} helper variable(s).`,
        `Replaced terminals appearing after the first position with auxiliary nonterminals T_a → a.`,
        before,
        current,
        terminalHelperProductions,
        [],
        Array.from(terminalVarMap.values()),
      )
    );
  }

  // Stage 6: Variable Ordering and Elimination of Non-terminal Leading Productions (Hopcroft-Ullman GNF Algorithm)
  {
    const before = cloneGrammar(current);

    // Filter out terminal helper variables from ordering so they remain T_a -> a
    const helperSet = new Set(terminalVarMap.values());
    const orderedVars = current.variables.filter((v) => !helperSet.has(v));
    const varIndexMap = new Map<string, number>();
    orderedVars.forEach((v, idx) => varIndexMap.set(v, idx));

    let prods = [...current.productions];
    const generatedZVars: string[] = [];

    // Forward pass: For i = 0 to n - 1
    for (let i = 0; i < orderedVars.length; i++) {
      const Ai = orderedVars[i];

      // Step A: For j = 0 to i - 1, substitute Aj into Ai -> Aj gamma
      for (let j = 0; j < i; j++) {
        const Aj = orderedVars[j];

        const aiProds = prods.filter((p) => p.lhs === Ai);
        const otherProds = prods.filter((p) => p.lhs !== Ai);
        const nextAiProds: CFGProduction[] = [];

        for (const p of aiProds) {
          if (p.rhs.length > 0 && p.rhs[0].type === 'NON_TERMINAL' && p.rhs[0].value === Aj) {
            // Substitute Aj productions
            const gamma = p.rhs.slice(1);
            const ajProds = prods.filter((ap) => ap.lhs === Aj);
            for (const ajP of ajProds) {
              const cleanAjRhs = ajP.rhs.filter((s) => s.type !== 'EPSILON');
              nextAiProds.push(makeProduction(Ai, [...cleanAjRhs, ...gamma]));
            }
          } else {
            nextAiProds.push(p);
          }
        }
        prods = deduplicateProductions([...otherProds, ...nextAiProds]);
      }

      // Step B: Eliminate immediate left recursion on Ai (Ai -> Ai alpha | beta)
      const aiProds = prods.filter((p) => p.lhs === Ai);
      const leftRecProds = aiProds.filter(
        (p) => p.rhs.length > 0 && p.rhs[0].type === 'NON_TERMINAL' && p.rhs[0].value === Ai
      );
      const nonLeftRecProds = aiProds.filter(
        (p) => !(p.rhs.length > 0 && p.rhs[0].type === 'NON_TERMINAL' && p.rhs[0].value === Ai)
      );

      if (leftRecProds.length > 0 && nonLeftRecProds.length > 0) {
        const otherProds = prods.filter((p) => p.lhs !== Ai);
        const zVar = freshVariable(`Z_${Ai}`, allSymbols);
        allSymbols.add(zVar);
        generatedZVars.push(zVar);
        allIntroducedVars.push(zVar);

        const newAiProds: CFGProduction[] = [];
        const newZProds: CFGProduction[] = [];

        // Ai -> beta | beta Z
        for (const betaP of nonLeftRecProds) {
          const beta = betaP.rhs.filter((s) => s.type !== 'EPSILON');
          newAiProds.push(makeProduction(Ai, [...beta]));
          newAiProds.push(makeProduction(Ai, [...beta, nt(zVar)]));
        }

        // Z -> alpha | alpha Z
        for (const alphaP of leftRecProds) {
          const alpha = alphaP.rhs.slice(1).filter((s) => s.type !== 'EPSILON');
          if (alpha.length > 0) {
            newZProds.push(makeProduction(zVar, [...alpha]));
            newZProds.push(makeProduction(zVar, [...alpha, nt(zVar)]));
          }
        }

        prods = deduplicateProductions([...otherProds, ...newAiProds, ...newZProds]);
      }
    }

    // Backward pass: For i = n - 2 down to 0
    for (let i = orderedVars.length - 2; i >= 0; i--) {
      const Ai = orderedVars[i];
      let hasNonTerminalLeading = true;
      let passCount = 0;

      while (hasNonTerminalLeading && passCount < 10) {
        passCount++;
        hasNonTerminalLeading = false;

        const aiProds = prods.filter((p) => p.lhs === Ai);
        const otherProds = prods.filter((p) => p.lhs !== Ai);
        const nextAiProds: CFGProduction[] = [];

        for (const p of aiProds) {
          if (p.rhs.length > 0 && p.rhs[0].type === 'NON_TERMINAL') {
            const leadingVar = p.rhs[0].value;
            // If leading var is not in orderedVars (e.g. T_a), check if it has terminal expansions
            const leadingProds = prods.filter((lp) => lp.lhs === leadingVar);
            const gamma = p.rhs.slice(1);

            for (const lp of leadingProds) {
              const cleanRhs = lp.rhs.filter((s) => s.type !== 'EPSILON');
              nextAiProds.push(makeProduction(Ai, [...cleanRhs, ...gamma]));
            }
            hasNonTerminalLeading = true;
          } else {
            nextAiProds.push(p);
          }
        }
        prods = deduplicateProductions([...otherProds, ...nextAiProds]);
      }
    }

    // Auxiliary Z variables substitution: Ensure every Z production starts with a terminal
    for (const zVar of generatedZVars) {
      let hasNonTerminalLeading = true;
      let passCount = 0;

      while (hasNonTerminalLeading && passCount < 10) {
        passCount++;
        hasNonTerminalLeading = false;

        const zProds = prods.filter((p) => p.lhs === zVar);
        const otherProds = prods.filter((p) => p.lhs !== zVar);
        const nextZProds: CFGProduction[] = [];

        for (const p of zProds) {
          if (p.rhs.length > 0 && p.rhs[0].type === 'NON_TERMINAL') {
            const leadingVar = p.rhs[0].value;
            const leadingProds = prods.filter((lp) => lp.lhs === leadingVar);
            const gamma = p.rhs.slice(1);

            for (const lp of leadingProds) {
              const cleanRhs = lp.rhs.filter((s) => s.type !== 'EPSILON');
              nextZProds.push(makeProduction(zVar, [...cleanRhs, ...gamma]));
            }
            hasNonTerminalLeading = true;
          } else {
            nextZProds.push(p);
          }
        }
        prods = deduplicateProductions([...otherProds, ...nextZProds]);
      }
    }

    // Final sweep: Replace any terminals that appear at index >= 1 with helper variables
    const finalProds: CFGProduction[] = [];
    for (const p of prods) {
      if (p.rhs.length <= 1) {
        finalProds.push(p);
        continue;
      }
      const newRhs: GrammarSymbol[] = [p.rhs[0]];
      for (let k = 1; k < p.rhs.length; k++) {
        if (p.rhs[k].type === 'TERMINAL') {
          newRhs.push(nt(getTerminalVar(p.rhs[k].value)));
        } else {
          newRhs.push(p.rhs[k]);
        }
      }
      finalProds.push(makeProduction(p.lhs, newRhs));
    }

    const allFinalVars = [
      ...current.variables,
      ...generatedZVars,
      ...Array.from(terminalVarMap.values()),
    ];

    current = {
      variables: deduplicateProductions(allFinalVars.map((v) => ({ id: v, lhs: v, rhs: [] }))).map((p) => p.lhs),
      terminals: current.terminals,
      productions: deduplicateProductions([...finalProds, ...terminalHelperProductions]),
      startVariable: current.startVariable,
    };

    stages.push(
      makeTrace(
        'FORWARD_SUBSTITUTION_LEFT_RECURSION',
        `Applied Hopcroft-Ullman variable ordering and back-substitution. Introduced ${generatedZVars.length} auxiliary Z variable(s).`,
        `Ordered nonterminals (${orderedVars.join(' < ')}). Replaced leading nonterminals via forward & backward substitution until all productions satisfy A → a α.`,
        before,
        current,
        finalProds,
        [],
        generatedZVars,
      )
    );
  }

  // Final GNF Validation
  const gnfValidation = validateGNF(current);
  if (!gnfValidation.isValid) {
    warnings.push('GNF validation reported non-GNF productions after transformation.');
  }

  return {
    success: gnfValidation.isValid,
    originalGrammar,
    transformedGrammar: current,
    epsilonInOriginalLanguage: epsilonInLanguage,
    stages,
    introducedVariables: allIntroducedVars,
    eliminatedProductions: allEliminatedProds,
    totalProductionsOriginal: grammar.productions.length,
    totalProductionsTransformed: current.productions.length,
    warnings,
    validationResult: inputValidation,
    gnfValidation,
  };
}
