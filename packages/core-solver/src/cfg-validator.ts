import {
  ContextFreeGrammar,
  CFGValidationResult,
  CFGDiagnostic,
} from './types';
import { analyzeCFG } from './cfg-analyzer';

/**
 * Pure deterministic validator for Context-Free Grammars G = (V, Σ, P, S).
 * Evaluates structural validity, undefined variables, namespace collisions, invalid epsilon usages, and useless variables.
 */
export function validateCFG(grammar: ContextFreeGrammar): CFGValidationResult {
  const diagnostics: CFGDiagnostic[] = [];

  const { variables, terminals, productions, startVariable } = grammar;

  // 1. Check No Variables
  if (!variables || variables.length === 0) {
    diagnostics.push({
      code: 'CFG_NO_VARIABLES',
      severity: 'error',
      message: 'Grammar contains no variables (V = ∅).',
      mathematicalExplanation: 'A Context-Free Grammar requires a non-empty finite set of variables V.',
    });
  }

  // 2. Check Duplicate Variables
  const seenVars = new Set<string>();
  variables.forEach((v) => {
    if (seenVars.has(v)) {
      diagnostics.push({
        code: 'CFG_DUPLICATE_VARIABLE',
        severity: 'error',
        message: `Duplicate variable declaration '${v}' in V.`,
        mathematicalExplanation: 'The set of variables V must contain unique symbol identifiers.',
        affectedVariable: v,
      });
    }
    seenVars.add(v);
  });

  // 3. Check Duplicate Terminals
  const seenTerms = new Set<string>();
  terminals.forEach((t) => {
    if (seenTerms.has(t)) {
      diagnostics.push({
        code: 'CFG_DUPLICATE_TERMINAL',
        severity: 'error',
        message: `Duplicate terminal declaration '${t}' in Σ.`,
        mathematicalExplanation: 'The set of terminals Σ must contain unique symbol identifiers.',
      });
    }
    seenTerms.add(t);
  });

  // 4. Namespace Collision Check (V ∩ Σ = ∅)
  variables.forEach((v) => {
    if (seenTerms.has(v)) {
      diagnostics.push({
        code: 'CFG_NAMESPACE_COLLISION',
        severity: 'error',
        message: `Symbol '${v}' declared in both Variables (V) and Terminals (Σ).`,
        mathematicalExplanation: 'In G = (V, Σ, P, S), variables V and terminals Σ must be disjoint sets: V ∩ Σ = ∅.',
        affectedVariable: v,
      });
    }
  });

  // 5. Check Start Variable
  if (!startVariable) {
    diagnostics.push({
      code: 'CFG_NO_START_VARIABLE',
      severity: 'error',
      message: 'Grammar lacks a designated start variable S.',
      mathematicalExplanation: 'A Context-Free Grammar requires a start variable S ∈ V.',
    });
  } else if (!seenVars.has(startVariable)) {
    diagnostics.push({
      code: 'CFG_INVALID_START_VARIABLE',
      severity: 'error',
      message: `Start variable S = '${startVariable}' is not declared in V.`,
      mathematicalExplanation: 'The start variable S must be an element of the set of variables V.',
      affectedVariable: startVariable,
    });
  }

  // 6. Check Production Validity
  productions.forEach((p) => {
    // LHS must be a declared variable
    if (!seenVars.has(p.lhs)) {
      diagnostics.push({
        code: 'CFG_UNDEFINED_VARIABLE',
        severity: 'error',
        message: `Production '${p.id}' specifies undeclared variable '${p.lhs}' on LHS.`,
        mathematicalExplanation: 'The LHS of a CFG production must be a single variable A ∈ V.',
        affectedVariable: p.lhs,
        affectedProductionId: p.id,
      });
    }

    if (!p.rhs || p.rhs.length === 0) {
      diagnostics.push({
        code: 'CFG_EMPTY_PRODUCTION',
        severity: 'error',
        message: `Production '${p.id}' has empty RHS array. Use EPSILON symbol for ε productions.`,
        mathematicalExplanation: 'A CFG production RHS must contain symbols or explicit EPSILON.',
        affectedProductionId: p.id,
      });
    }

    // Check RHS Symbols
    p.rhs.forEach((sym) => {
      if (sym.type === 'NON_TERMINAL') {
        if (!seenVars.has(sym.value)) {
          diagnostics.push({
            code: 'CFG_UNDEFINED_VARIABLE',
            severity: 'error',
            message: `Production '${p.id}' references undeclared variable '${sym.value}' on RHS.`,
            mathematicalExplanation: 'All non-terminal symbols on the RHS of productions must be in V.',
            affectedVariable: sym.value,
            affectedProductionId: p.id,
          });
        }
      } else if (sym.type === 'TERMINAL') {
        if (!seenTerms.has(sym.value)) {
          diagnostics.push({
            code: 'CFG_NO_TERMINALS_WHEN_REQUIRED',
            severity: 'warning',
            message: `Production '${p.id}' uses terminal '${sym.value}' which is not explicitly declared in Σ.`,
            mathematicalExplanation: 'All terminal symbols on the RHS of productions should be declared in Σ.',
            affectedProductionId: p.id,
          });
        }
      } else if (sym.type === 'EPSILON') {
        if (p.rhs.length > 1) {
          diagnostics.push({
            code: 'CFG_INVALID_EPSILON_USAGE',
            severity: 'error',
            message: `Production '${p.id}' mixes EPSILON with other symbols on RHS.`,
            mathematicalExplanation: 'An epsilon production A → ε must have RHS containing solely the EPSILON symbol.',
            affectedProductionId: p.id,
          });
        }
      }
    });
  });

  // 7. Check Reachable & Generating Variables (Warnings for useless structure)
  if (seenVars.size > 0 && startVariable && seenVars.has(startVariable)) {
    const analysis = analyzeCFG(grammar);

    analysis.variables.forEach((v) => {
      if (!analysis.reachableVariables.includes(v)) {
        diagnostics.push({
          code: 'CFG_UNREACHABLE_VARIABLE',
          severity: 'warning',
          message: `Variable '${v}' is unreachable from start variable '${startVariable}'.`,
          mathematicalExplanation: 'Variable A is unreachable if no derivation S ⇒* α A β exists.',
          affectedVariable: v,
        });
      }

      if (!analysis.generatingVariables.includes(v)) {
        diagnostics.push({
          code: 'CFG_NON_GENERATING_VARIABLE',
          severity: 'warning',
          message: `Variable '${v}' is non-generating (cannot derive any terminal string w ∈ Σ*).`,
          mathematicalExplanation: 'Variable A is non-generating if no derivation A ⇒* w exists for w ∈ Σ*.',
          affectedVariable: v,
        });
      }
    });
  }

  const errors = diagnostics.filter((d) => d.severity === 'error');
  const warnings = diagnostics.filter((d) => d.severity === 'warning');

  return {
    isValid: errors.length === 0,
    diagnostics,
    errors,
    warnings,
  };
}
