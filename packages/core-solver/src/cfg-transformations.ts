import {
  ContextFreeGrammar,
  CFGProduction,
  GrammarSymbol,
  GrammarTransformationResult,
  GrammarTransformationStep,
  LanguagePreservationStatus,
  LeftRecursionEliminationResult,
  LeftFactoringResult,
} from './types';
import { analyzeLL1 } from './ll1-parser';
import { evaluateCFGMembership } from './cfg-membership';
import { detectLeftRecursion, detectLeftFactoring, computeLongestCommonPrefix } from './cfg-first-follow';




// ===================================================================
// Helper Utilities
// ===================================================================

let _prodIdCounter = 0;
function freshProdId(): string {
  return `trans_p${++_prodIdCounter}`;
}

function resetProdIdCounter(): void {
  _prodIdCounter = 0;
}

export function makeProduction(lhs: string, rhs: GrammarSymbol[]): CFGProduction {
  return { id: freshProdId(), lhs, rhs };
}

export function nt(name: string): GrammarSymbol {
  return { type: 'NON_TERMINAL', value: name };
}

export function term(name: string): GrammarSymbol {
  return { type: 'TERMINAL', value: name };
}

export const EPSILON_SYM: GrammarSymbol = { type: 'EPSILON', value: 'ε' };

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

function productionNotation(p: CFGProduction): string {
  const rhsStr = p.rhs.length === 0
    ? 'ε'
    : p.rhs.map((s) => (s.type === 'EPSILON' ? 'ε' : s.value)).join(' ');
  return `${p.lhs} → ${rhsStr}`;
}

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

function generateFreshVariable(baseName: string, existingSymbols: Set<string>): string {
  let candidate = `${baseName}'`;
  while (existingSymbols.has(candidate)) {
    candidate += "'";
  }
  existingSymbols.add(candidate);
  return candidate;
}

// ===================================================================
// Phase 7: Bounded Language Preservation Verification
// ===================================================================

export function verifyBoundedLanguagePreservation(
  originalGrammar: ContextFreeGrammar,
  transformedGrammar: ContextFreeGrammar,
  customCorpus?: string[]
): { status: LanguagePreservationStatus; mismatchDetails?: string } {
  // Default test corpus combining empty string and short terminal strings
  const corpus = customCorpus ?? [
    '',
    'a',
    'b',
    'ab',
    'ba',
    'aabb',
    'id',
    'id+id',
    'id*id',
    '(id)',
  ];

  for (const input of corpus) {
    // Evaluate membership on original vs transformed using bounded search
    const origRes = evaluateCFGMembership(originalGrammar, input, { maxDepth: 15, maxStatesExplored: 3000 });
    const transRes = evaluateCFGMembership(transformedGrammar, input, { maxDepth: 15, maxStatesExplored: 3000 });

    if (!origRes.boundedByLimit && !transRes.boundedByLimit) {
      if (origRes.isAccepted !== transRes.isAccepted) {
        return {
          status: 'MISMATCH_DETECTED',
          mismatchDetails: `Language mismatch detected on input "${input}": Original returned ${origRes.isAccepted}, Transformed returned ${transRes.isAccepted}.`,
        };
      }
    }
  }

  return { status: 'VERIFIED_BOUNDED' };
}

// ===================================================================
// Phase 2: Direct Left Recursion Elimination
// ===================================================================

export function eliminateDirectLeftRecursion(
  grammar: ContextFreeGrammar
): GrammarTransformationResult {
  resetProdIdCounter();
  const originalGrammar = cloneGrammar(grammar);
  const beforeLL1 = analyzeLL1(grammar);

  const steps: GrammarTransformationStep[] = [];
  const generatedSymbolNames: string[] = [];
  const warnings: string[] = [];

  const existingSymbols = new Set([...grammar.variables, ...grammar.terminals]);
  const currentVariables = [...grammar.variables];
  let currentProductions = [...grammar.productions];
  let changed = false;

  for (const v of grammar.variables) {
    const vProds = currentProductions.filter((p) => p.lhs === v);
    const alphaList: GrammarSymbol[][] = []; // Recursive RHS tails (after v)
    const betaList: GrammarSymbol[][] = [];  // Non-recursive RHSs

    for (const p of vProds) {
      if (p.rhs.length > 0 && p.rhs[0].type === 'NON_TERMINAL' && p.rhs[0].value === v) {
        alphaList.push(p.rhs.slice(1));
      } else {
        betaList.push([...p.rhs]);
      }
    }

    if (alphaList.length === 0) {
      continue; // No direct left recursion for variable v
    }

    changed = true;

    // Hostile check: every production for v is left recursive (no beta)
    if (betaList.length === 0) {
      warnings.push(`Variable ${v} has only left-recursive productions (no non-recursive β base case). Cannot generate valid finite derivations.`);
      // Fallback: introduce A → ε as β so parsing does not crash
      betaList.push([EPSILON_SYM]);
    }

    // Generate collision-safe fresh variable V'
    const newVar = generateFreshVariable(v, existingSymbols);
    generatedSymbolNames.push(newVar);
    currentVariables.push(newVar);

    // Build new productions for A and A'
    // A → β1 A' | β2 A' ...
    const newAProds: CFGProduction[] = [];
    for (const beta of betaList) {
      // If beta is ε, then A → A'
      const cleanBeta = beta.filter((s) => s.type !== 'EPSILON');
      newAProds.push(makeProduction(v, [...cleanBeta, nt(newVar)]));
    }

    // A' → α1 A' | α2 A' | ... | ε
    const newAPrimedProds: CFGProduction[] = [];
    for (const alpha of alphaList) {
      const cleanAlpha = alpha.filter((s) => s.type !== 'EPSILON');
      newAPrimedProds.push(makeProduction(newVar, [...cleanAlpha, nt(newVar)]));
    }
    // Epsilon base case for A'
    newAPrimedProds.push(makeProduction(newVar, [EPSILON_SYM]));

    // Replace old v productions with new productions
    currentProductions = currentProductions.filter((p) => p.lhs !== v);
    currentProductions.push(...newAProds, ...newAPrimedProds);

    const stepNotation = `${v} → ${vProds.map((p) => productionNotation(p)).join(' | ')}  ==>  ` +
      `${v} → ${newAProds.map((p) => productionNotation(p)).join(' | ')} ; ${newVar} → ${newAPrimedProds.map((p) => productionNotation(p)).join(' | ')}`;

    steps.push({
      stepIndex: steps.length,
      type: 'DIRECT_LEFT_RECURSION_ELIMINATION',
      title: `Eliminated Direct Left Recursion for ${v}`,
      description: `Replaced direct left-recursive productions of ${v} with right-recursive helper variable ${newVar}.`,
      mathematicalNotation: stepNotation,
      affectedVariable: v,
      beforeProductions: vProds,
      afterProductions: [...newAProds, ...newAPrimedProds],
      generatedVariables: [newVar],
    });
  }

  const transformedGrammar: ContextFreeGrammar = {
    variables: currentVariables,
    terminals: grammar.terminals,
    productions: deduplicateProductions(currentProductions),
    startVariable: grammar.startVariable,
  };

  const afterLL1 = analyzeLL1(transformedGrammar);
  const pres = verifyBoundedLanguagePreservation(originalGrammar, transformedGrammar);

  return {
    success: true,
    originalGrammar,
    transformedGrammar,
    transformationType: 'DIRECT_LEFT_RECURSION_ELIMINATION',
    changed,
    steps,
    generatedSymbolNames,
    warnings,
    diagnostics: afterLL1.diagnostics,
    languagePreservationStatus: pres.status,
    mismatchDetails: pres.mismatchDetails,
    beforeLL1Analysis: beforeLL1,
    afterLL1Analysis: afterLL1,
    iterations: 1,
    boundedByLimit: false,
  };
}

// ===================================================================
// Phase 3: Indirect Left Recursion Elimination
// ===================================================================

export function eliminateIndirectLeftRecursion(
  grammar: ContextFreeGrammar
): GrammarTransformationResult {
  resetProdIdCounter();
  const originalGrammar = cloneGrammar(grammar);
  const beforeLL1 = analyzeLL1(grammar);

  const steps: GrammarTransformationStep[] = [];
  const generatedSymbolNames: string[] = [];
  const warnings: string[] = [];

  const existingSymbols = new Set([...grammar.variables, ...grammar.terminals]);
  const vars = [...grammar.variables]; // Deterministic variable ordering A1, A2, ..., An
  let currentProductions = [...grammar.productions];
  let changed = false;

  steps.push({
    stepIndex: 0,
    type: 'VARIABLE_ORDERING',
    title: 'Variable Ordering Established',
    description: `Established variable order: [${vars.join(', ')}].`,
    mathematicalNotation: `Ordering: ${vars.join(' < ')}`,
    beforeProductions: grammar.productions,
    afterProductions: grammar.productions,
    generatedVariables: [],
  });

  for (let i = 0; i < vars.length; i++) {
    const Ai = vars[i];

    for (let j = 0; j < i; j++) {
      const Aj = vars[j];

      // Find productions Ai → Aj γ
      const aiProds = currentProductions.filter((p) => p.lhs === Ai);
      const targetProds = aiProds.filter(
        (p) => p.rhs.length > 0 && p.rhs[0].type === 'NON_TERMINAL' && p.rhs[0].value === Aj
      );

      if (targetProds.length === 0) continue;

      changed = true;
      const ajProds = currentProductions.filter((p) => p.lhs === Aj);
      const newAiProds: CFGProduction[] = [];

      for (const pAi of aiProds) {
        if (pAi.rhs.length > 0 && pAi.rhs[0].type === 'NON_TERMINAL' && pAi.rhs[0].value === Aj) {
          const gamma = pAi.rhs.slice(1);
          // Replace Ai → Aj γ with Ai → δ γ for each Aj → δ
          for (const pAj of ajProds) {
            const delta = pAj.rhs.filter((s) => s.type !== 'EPSILON');
            newAiProds.push(makeProduction(Ai, [...delta, ...gamma]));
          }
        } else {
          newAiProds.push(pAi);
        }
      }

      currentProductions = currentProductions.filter((p) => p.lhs !== Ai);
      currentProductions.push(...newAiProds);

      steps.push({
        stepIndex: steps.length,
        type: 'INDIRECT_SUBSTITUTION',
        title: `Substituted ${Aj} in productions of ${Ai}`,
        description: `Substituted all ${Aj} productions into ${Ai} to convert indirect left recursion into direct left recursion.`,
        mathematicalNotation: `${Ai} → ${Aj} γ  ==>  ${Ai} → δ γ (for all ${Aj} → δ)`,
        affectedVariable: Ai,
        beforeProductions: aiProds,
        afterProductions: newAiProds,
        generatedVariables: [],
      });
    }

    // Now eliminate direct left recursion for Ai
    const aiProdsAfterSub = currentProductions.filter((p) => p.lhs === Ai);
    const alphaList: GrammarSymbol[][] = [];
    const betaList: GrammarSymbol[][] = [];

    for (const p of aiProdsAfterSub) {
      if (p.rhs.length > 0 && p.rhs[0].type === 'NON_TERMINAL' && p.rhs[0].value === Ai) {
        alphaList.push(p.rhs.slice(1));
      } else {
        betaList.push([...p.rhs]);
      }
    }

    if (alphaList.length > 0) {
      changed = true;
      if (betaList.length === 0) {
        betaList.push([EPSILON_SYM]);
      }

      const newVar = generateFreshVariable(Ai, existingSymbols);
      generatedSymbolNames.push(newVar);
      if (!vars.includes(newVar)) {
        vars.push(newVar);
      }

      const newAiProds: CFGProduction[] = [];
      for (const beta of betaList) {
        const cleanBeta = beta.filter((s) => s.type !== 'EPSILON');
        newAiProds.push(makeProduction(Ai, [...cleanBeta, nt(newVar)]));
      }

      const newAPrimedProds: CFGProduction[] = [];
      for (const alpha of alphaList) {
        const cleanAlpha = alpha.filter((s) => s.type !== 'EPSILON');
        newAPrimedProds.push(makeProduction(newVar, [...cleanAlpha, nt(newVar)]));
      }
      newAPrimedProds.push(makeProduction(newVar, [EPSILON_SYM]));

      currentProductions = currentProductions.filter((p) => p.lhs !== Ai);
      currentProductions.push(...newAiProds, ...newAPrimedProds);

      steps.push({
        stepIndex: steps.length,
        type: 'DIRECT_LEFT_RECURSION_ELIMINATION',
        title: `Eliminated Direct Left Recursion for ${Ai}`,
        description: `Eliminated resulting direct left recursion on ${Ai} using helper variable ${newVar}.`,
        mathematicalNotation: `${Ai} → ${betaList.map((b) => b.map((s) => s.value).join('')).join(' | ')} ${newVar}`,
        affectedVariable: Ai,
        beforeProductions: aiProdsAfterSub,
        afterProductions: [...newAiProds, ...newAPrimedProds],
        generatedVariables: [newVar],
      });
    }
  }

  const transformedGrammar: ContextFreeGrammar = {
    variables: vars,
    terminals: grammar.terminals,
    productions: deduplicateProductions(currentProductions),
    startVariable: grammar.startVariable,
  };

  const afterLL1 = analyzeLL1(transformedGrammar);
  const pres = verifyBoundedLanguagePreservation(originalGrammar, transformedGrammar);

  return {
    success: true,
    originalGrammar,
    transformedGrammar,
    transformationType: 'INDIRECT_LEFT_RECURSION_ELIMINATION',
    changed,
    steps,
    generatedSymbolNames,
    warnings,
    diagnostics: afterLL1.diagnostics,
    languagePreservationStatus: pres.status,
    mismatchDetails: pres.mismatchDetails,
    beforeLL1Analysis: beforeLL1,
    afterLL1Analysis: afterLL1,
    iterations: 1,
    boundedByLimit: false,
  };
}

// ===================================================================
// Phase 4: Unified Left Recursion Elimination (Direct & Indirect)
// ===================================================================

export function eliminateLeftRecursion(
  grammar: ContextFreeGrammar
): LeftRecursionEliminationResult {
  const detectionBefore = detectLeftRecursion(grammar);

  if (!detectionBefore.isLeftRecursive) {
    const originalGrammar = cloneGrammar(grammar);
    const beforeLL1 = analyzeLL1(grammar);
    return {
      success: true,
      originalGrammar,
      transformedGrammar: originalGrammar,
      transformationType: 'DIRECT_LEFT_RECURSION_ELIMINATION',
      changed: false,
      steps: [
        {
          stepIndex: 0,
          type: 'TRANSFORMATION_START',
          title: 'No Left Recursion Detected',
          description: 'Grammar does not contain direct or indirect left recursion. No transformation required.',
          mathematicalNotation: "G' = G (isLeftRecursive = false)",
          beforeProductions: grammar.productions,
          afterProductions: grammar.productions,
          generatedVariables: [],
        },
      ],
      generatedSymbolNames: [],
      warnings: ['No left recursion detected. Grammar is already free of left-recursive productions.'],
      diagnostics: beforeLL1.diagnostics,
      languagePreservationStatus: 'VERIFIED_BOUNDED',
      beforeLL1Analysis: beforeLL1,
      afterLL1Analysis: beforeLL1,
      iterations: 0,
      boundedByLimit: false,
      detectionBefore,
      detectionAfter: detectionBefore,
    };
  }

  // If indirect left recursion exists, use ordered substitution/elimination algorithm
  const result = detectionBefore.indirectCycles.length > 0
    ? eliminateIndirectLeftRecursion(grammar)
    : eliminateDirectLeftRecursion(grammar);

  const detectionAfter = detectLeftRecursion(result.transformedGrammar);

  return {
    ...result,
    detectionBefore,
    detectionAfter,
  };
}


// ===================================================================
// Phase 5: Left Factoring
// ===================================================================

// ===================================================================
// Phase 5: Left Factoring
// ===================================================================

export function leftFactorGrammar(
  grammar: ContextFreeGrammar
): LeftFactoringResult {
  resetProdIdCounter();
  const detectionBefore = detectLeftFactoring(grammar);
  const originalGrammar = cloneGrammar(grammar);
  const beforeLL1 = analyzeLL1(grammar);

  if (!detectionBefore.requiresFactoring) {
    return {
      success: true,
      originalGrammar,
      transformedGrammar: originalGrammar,
      transformationType: 'LEFT_FACTORING',
      changed: false,
      steps: [
        {
          stepIndex: 0,
          type: 'TRANSFORMATION_START',
          title: 'No Left Factoring Required',
          description: 'All production alternatives for every nonterminal have distinct leading grammar symbols.',
          mathematicalNotation: "G' = G (requiresFactoring = false)",
          beforeProductions: grammar.productions,
          afterProductions: grammar.productions,
          generatedVariables: [],
        },
      ],
      generatedSymbolNames: [],
      warnings: ['No left factoring required. Grammar alternatives already possess distinct leading prefixes.'],
      diagnostics: beforeLL1.diagnostics,
      languagePreservationStatus: 'VERIFIED_BOUNDED',
      beforeLL1Analysis: beforeLL1,
      afterLL1Analysis: beforeLL1,
      iterations: 0,
      boundedByLimit: false,
      detectionBefore,
      detectionAfter: detectionBefore,
    };
  }

  const steps: GrammarTransformationStep[] = [];
  const generatedSymbolNames: string[] = [];
  const warnings: string[] = [];

  const existingSymbols = new Set([...grammar.variables, ...grammar.terminals]);
  const currentVariables = [...grammar.variables];
  let currentProductions = [...grammar.productions];
  let changed = false;

  let factoringPasses = 0;
  const maxPasses = 15;

  while (factoringPasses < maxPasses) {
    let passChanged = false;

    for (const v of [...currentVariables]) {
      const vProds = currentProductions.filter((p) => p.lhs === v);
      if (vProds.length < 2) continue;

      const validProds = vProds.filter((p) => p.rhs.some((s) => s.type !== 'EPSILON'));
      if (validProds.length < 2) continue;

      // Find best common prefix among validProds
      let bestPrefix: GrammarSymbol[] = [];
      let bestMatchingProds: CFGProduction[] = [];

      for (let i = 0; i < validProds.length; i++) {
        for (let j = i + 1; j < validProds.length; j++) {
          const prefix = computeLongestCommonPrefix(validProds[i].rhs, validProds[j].rhs);
          if (prefix.length === 0) continue;

          // Find all productions matching this prefix
          const matching = validProds.filter((p) => {
            const cleanRhs = p.rhs.filter((s) => s.type !== 'EPSILON');
            if (cleanRhs.length < prefix.length) return false;
            for (let k = 0; k < prefix.length; k++) {
              if (cleanRhs[k].type !== prefix[k].type || cleanRhs[k].value !== prefix[k].value) {
                return false;
              }
            }
            return true;
          });

          if (matching.length >= 2) {
            // Pick longest prefix, breaking ties by number of matching productions
            if (
              prefix.length > bestPrefix.length ||
              (prefix.length === bestPrefix.length && matching.length > bestMatchingProds.length)
            ) {
              bestPrefix = prefix;
              bestMatchingProds = matching;
            }
          }
        }
      }

      if (bestPrefix.length === 0 || bestMatchingProds.length < 2) {
        continue;
      }

      passChanged = true;
      changed = true;

      // Generate collision-safe fresh variable A', A'', etc.
      const newVar = generateFreshVariable(v, existingSymbols);
      generatedSymbolNames.push(newVar);
      if (!currentVariables.includes(newVar)) {
        currentVariables.push(newVar);
      }

      // Construct new factored production A → α A'
      const factoredAProd = makeProduction(v, [...bestPrefix, nt(newVar)]);

      // Construct A' → β1 | β2 ...
      const newFactProds: CFGProduction[] = [];
      for (const p of bestMatchingProds) {
        const cleanRhs = p.rhs.filter((s) => s.type !== 'EPSILON');
        const remainder = cleanRhs.slice(bestPrefix.length);
        if (remainder.length === 0) {
          newFactProds.push(makeProduction(newVar, [EPSILON_SYM]));
        } else {
          newFactProds.push(makeProduction(newVar, remainder));
        }
      }

      // Replace matched productions in currentProductions
      const matchIds = new Set(bestMatchingProds.map((p) => p.id));
      currentProductions = currentProductions.filter((p) => !matchIds.has(p.id));
      currentProductions.push(factoredAProd, ...newFactProds);

      const prefixNotation = bestPrefix.map((s) => s.value).join(' ');
      steps.push({
        stepIndex: steps.length,
        type: 'LEFT_FACTORIZATION_APPLIED',
        title: `Left Factored Variable ${v}`,
        description: `Extracted longest common prefix "${prefixNotation}" from ${bestMatchingProds.length} alternative(s) using auxiliary nonterminal ${newVar}.`,
        mathematicalNotation: `${v} → ${prefixNotation} ${newVar} ; ${newVar} → ${newFactProds.map((p) => p.rhs.length === 0 ? 'ε' : p.rhs.map(s => s.type === 'EPSILON' ? 'ε' : s.value).join(' ')).join(' | ')}`,
        affectedVariable: v,
        beforeProductions: bestMatchingProds,
        afterProductions: [factoredAProd, ...newFactProds],
        generatedVariables: [newVar],
      });

      break; // Restart scan over variables to handle nested / chained factoring passes
    }

    if (!passChanged) break;
    factoringPasses++;
  }

  if (factoringPasses >= maxPasses) {
    warnings.push('FACTORIZATION LIMIT REACHED: Maximum factoring passes reached. Transformation halted to prevent runaway expansion.');
  }

  const transformedGrammar: ContextFreeGrammar = {
    variables: currentVariables,
    terminals: grammar.terminals,
    productions: deduplicateProductions(currentProductions),
    startVariable: grammar.startVariable,
  };

  const afterLL1 = analyzeLL1(transformedGrammar);
  const detectionAfter = detectLeftFactoring(transformedGrammar);
  const pres = verifyBoundedLanguagePreservation(originalGrammar, transformedGrammar);

  return {
    success: true,
    originalGrammar,
    transformedGrammar,
    transformationType: 'LEFT_FACTORING',
    changed,
    steps,
    generatedSymbolNames,
    warnings,
    diagnostics: afterLL1.diagnostics,
    languagePreservationStatus: pres.status,
    mismatchDetails: pres.mismatchDetails,
    beforeLL1Analysis: beforeLL1,
    afterLL1Analysis: afterLL1,
    iterations: factoringPasses,
    boundedByLimit: factoringPasses >= maxPasses,
    detectionBefore,
    detectionAfter,
  };
}


// ===================================================================
// Phase 6: Full Predictive Transformation Pipeline
// ===================================================================

export interface PredictiveTransformOptions {
  readonly maxIterations?: number;
}

export function transformToPredictiveGrammar(
  grammar: ContextFreeGrammar,
  options: PredictiveTransformOptions = {}
): GrammarTransformationResult {
  resetProdIdCounter();
  const maxIterations = options.maxIterations ?? 5;

  const originalGrammar = cloneGrammar(grammar);
  const beforeLL1 = analyzeLL1(grammar);

  const allSteps: GrammarTransformationStep[] = [];
  const allGeneratedSymbols: string[] = [];
  const warnings: string[] = [];

  // Step 0: Transformation Start
  allSteps.push({
    stepIndex: 0,
    type: 'TRANSFORMATION_START',
    title: 'Predictive Transformation Pipeline Initialized',
    description: `Original grammar analyzed. Initial LL(1) status: ${beforeLL1.isLL1 ? 'LL(1)' : 'NOT LL(1)'} (${beforeLL1.conflicts.length} conflict(s)).`,
    mathematicalNotation: `Start G0: |V|=${grammar.variables.length}, |P|=${grammar.productions.length}, conflicts=${beforeLL1.conflicts.length}`,
    beforeProductions: grammar.productions,
    afterProductions: grammar.productions,
    generatedVariables: [],
  });

  if (beforeLL1.isLL1) {
    return {
      success: true,
      originalGrammar,
      transformedGrammar: originalGrammar,
      transformationType: 'PREDICTIVE_TRANSFORMATION_PIPELINE',
      changed: false,
      steps: allSteps,
      generatedSymbolNames: [],
      warnings: ['Grammar is already LL(1). No transformation needed.'],
      diagnostics: beforeLL1.diagnostics,
      languagePreservationStatus: 'VERIFIED_BOUNDED',
      beforeLL1Analysis: beforeLL1,
      afterLL1Analysis: beforeLL1,
      iterations: 0,
      boundedByLimit: false,
    };
  }

  let currentGrammar = cloneGrammar(grammar);
  let iteration = 0;
  let changed = false;

  while (iteration < maxIterations) {
    iteration++;
    let iterChanged = false;

    // 1. Indirect & Direct Left Recursion Elimination
    const lrResult = eliminateIndirectLeftRecursion(currentGrammar);
    if (lrResult.changed) {
      iterChanged = true;
      changed = true;
      currentGrammar = lrResult.transformedGrammar;
      allSteps.push(...lrResult.steps.slice(1)); // Exclude duplicate ordering step
      allGeneratedSymbols.push(...lrResult.generatedSymbolNames);
    }

    // 2. Left Factoring
    const lfResult = leftFactorGrammar(currentGrammar);
    if (lfResult.changed) {
      iterChanged = true;
      changed = true;
      currentGrammar = lfResult.transformedGrammar;
      allSteps.push(...lfResult.steps);
      allGeneratedSymbols.push(...lfResult.generatedSymbolNames);
    }

    const currentLL1 = analyzeLL1(currentGrammar);

    allSteps.push({
      stepIndex: allSteps.length,
      type: 'LL1_REANALYSIS',
      title: `Iteration ${iteration} LL(1) Re-analysis`,
      description: `Re-evaluated FIRST/FOLLOW and parse table. Conflicts remaining: ${currentLL1.conflicts.length}.`,
      mathematicalNotation: `Iteration ${iteration}: isLL1=${currentLL1.isLL1}, conflicts=${currentLL1.conflicts.length}`,
      beforeProductions: currentGrammar.productions,
      afterProductions: currentGrammar.productions,
      generatedVariables: [],
    });

    if (currentLL1.isLL1 || !iterChanged) {
      break;
    }
  }

  const finalLL1 = analyzeLL1(currentGrammar);
  const pres = verifyBoundedLanguagePreservation(originalGrammar, currentGrammar);

  if (!finalLL1.isLL1) {
    warnings.push(`Grammar could not be fully transformed to LL(1) after ${iteration} iteration(s). ${finalLL1.conflicts.length} conflict(s) remain.`);
  }

  allSteps.push({
    stepIndex: allSteps.length,
    type: 'TRANSFORMATION_COMPLETE',
    title: 'Transformation Pipeline Completed',
    description: `Pipeline finished in ${iteration} iteration(s). Resulting LL(1) status: ${finalLL1.isLL1 ? 'STRICTLY LL(1)' : 'NOT LL(1)'}.`,
    mathematicalNotation: `Final G': |V|=${currentGrammar.variables.length}, |P|=${currentGrammar.productions.length}, LL(1)=${finalLL1.isLL1}`,
    beforeProductions: originalGrammar.productions,
    afterProductions: currentGrammar.productions,
    generatedVariables: allGeneratedSymbols,
  });

  return {
    success: finalLL1.isLL1,
    originalGrammar,
    transformedGrammar: currentGrammar,
    transformationType: 'PREDICTIVE_TRANSFORMATION_PIPELINE',
    changed,
    steps: allSteps,
    generatedSymbolNames: allGeneratedSymbols,
    warnings,
    diagnostics: finalLL1.diagnostics,
    languagePreservationStatus: pres.status,
    mismatchDetails: pres.mismatchDetails,
    beforeLL1Analysis: beforeLL1,
    afterLL1Analysis: finalLL1,
    iterations: iteration,
    boundedByLimit: iteration >= maxIterations,
  };
}
