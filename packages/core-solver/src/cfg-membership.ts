import { ContextFreeGrammar, CFGMembershipResult } from './types';
import { generateDerivation, DerivationOptions } from './cfg-derivation';

/**
 * Pure deterministic membership evaluation engine for Context-Free Grammars.
 * Evaluates w ∈ L(G) via bounded derivation search, returning structured derivation proof on success.
 */
export function evaluateCFGMembership(
  grammar: ContextFreeGrammar,
  targetInput: string,
  options: DerivationOptions = {}
): CFGMembershipResult {
  const derivationRes = generateDerivation(grammar, targetInput, options);

  if (derivationRes.success) {
    return {
      isAccepted: true,
      targetInput,
      derivation: derivationRes,
      exploredStates: derivationRes.exploredStateCount,
      reason: `String "${targetInput}" is in L(G). Derived in ${derivationRes.steps.length - 1} step(s).`,
      boundedByLimit: false,
    };
  }

  const bounded = Boolean(derivationRes.errorMessage?.includes('bounds'));

  return {
    isAccepted: false,
    targetInput,
    exploredStates: derivationRes.exploredStateCount,
    reason: bounded
      ? `Search bounded by limit (${derivationRes.exploredStateCount} states explored). String "${targetInput}" not derived.`
      : `String "${targetInput}" is NOT in L(G).`,
    boundedByLimit: bounded,
  };
}
