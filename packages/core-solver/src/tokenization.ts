export interface TokenizationResult {
  readonly success: boolean;
  readonly tokens: ReadonlyArray<string>;
  readonly invalidSymbol?: string;
}

/**
 * Strict Input Tokenization for Finite Automata string execution.
 *
 * Given an input string and the derived active alphabet Σ:
 *  - Matches symbols from Σ greedily by longest length.
 *  - Overlapping symbols in Σ (e.g. ['a', 'a1']) match longest prefix first ('a1').
 *  - If input contains any character sequence that cannot be matched to a symbol in Σ,
 *    tokenization fails explicitly (success: false).
 *  - Empty string "" returns success: true and tokens: [].
 */
export function tokenizeInputStringStrict(
  input: string,
  alphabet: ReadonlyArray<string>
): TokenizationResult {
  if (!input || input.length === 0) {
    return { success: true, tokens: [] };
  }

  const validSymbols = alphabet.filter((s) => s && s.length > 0 && s !== 'ε' && s !== 'λ');

  if (validSymbols.length === 0) {
    // Non-empty input when alphabet has no valid symbols fails tokenization
    return { success: false, tokens: [], invalidSymbol: input[0] };
  }

  // Multi-character and single-character greedy prefix matching sorted by length descending
  const sortedSymbols = [...validSymbols].sort((a, b) => b.length - a.length);
  const tokens: string[] = [];
  let index = 0;

  while (index < input.length) {
    let matched = false;
    for (const sym of sortedSymbols) {
      if (input.startsWith(sym, index)) {
        tokens.push(sym);
        index += sym.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      return { success: false, tokens: [], invalidSymbol: input[index] };
    }
  }

  return { success: true, tokens };
}

/**
 * Input Tokenization for Finite Automata string execution.
 * Wrapper that calls tokenizeInputStringStrict.
 */
export function tokenizeInputString(input: string, alphabet: ReadonlyArray<string>): string[] {
  const res = tokenizeInputStringStrict(input, alphabet);
  return res.success ? [...res.tokens] : Array.from(input);
}
