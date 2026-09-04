import {
  SolverGraphInput,
  TMCanonicalizationMap,
  TMDecodeResult,
  TMEncodedRepresentation,
  TMEncodedTransition,
  TMEncodingFormat,
  TMEncodingOptions,
  TMMoveDirection,
  UTMPairDecodeResult,
  UTMPairEncoding,
} from './types';
import { DEFAULT_BLANK_SYMBOL, parseTMEdgeMetadata, validateTM } from './tm-validator';
import { StateNode, TransitionEdge } from '@project-zero/canvas-renderer';

// Direction Canonicalization: L -> 1, R -> 2, S -> 3
export const DIRECTION_TO_INDEX: Record<TMMoveDirection, number> = {
  L: 1,
  R: 2,
  S: 3,
};

export const INDEX_TO_DIRECTION: Record<number, TMMoveDirection> = {
  1: 'L',
  2: 'R',
  3: 'S',
};

/**
 * Deterministically constructs a canonical numbering map for states and symbols
 * of a Project Zero Turing Machine M = (Q, Σ, Γ, δ, q0, B, F).
 *
 * CANONICAL INDEXING RULES:
 * 1. Initial State: Always assigned index 1 (q1).
 * 2. Accepting States (F): Sorted alphabetically by label and assigned indices 2 ... 1 + |F|.
 * 3. Remaining States: Sorted alphabetically by label, assigned indices 2 + |F| ... |Q|.
 * 4. Input Symbols (Σ): Derived from edges & inputs, sorted alphabetically, assigned X1 ... X_|Σ|.
 * 5. Blank Symbol (B): Always explicitly indexed at X_|Σ|+1.
 * 6. Work/Scratch Symbols (Γ \ (Σ ∪ {B})): Sorted alphabetically, assigned X_|Σ|+2 ... X_|Γ|.
 * 7. Movement Directions: L -> 1, R -> 2, S -> 3.
 */
export function buildTMCanonicalizationMap(
  graph: SolverGraphInput,
  optionsOrBlank?: string | TMEncodingOptions
): TMCanonicalizationMap {
  const { nodes, edges } = graph;
  const blankSymbol = typeof optionsOrBlank === 'string'
    ? optionsOrBlank
    : optionsOrBlank?.blankSymbol ?? DEFAULT_BLANK_SYMBOL;
  const explicitInputAlphabet: string[] | undefined = typeof optionsOrBlank === 'object' && optionsOrBlank?.inputAlphabet
    ? Array.from(new Set(optionsOrBlank.inputAlphabet)).filter((s): s is string => typeof s === 'string' && s !== blankSymbol && s !== '')
    : undefined;

  // 1. Identify Initial State
  const initialNode = nodes.find((n) => n.isInitial);
  const initialId = initialNode ? initialNode.id : (nodes[0]?.id ?? 'q0');

  // 2. Identify Accepting States
  const acceptingNodes = nodes
    .filter((n) => n.isAccepting && n.id !== initialId)
    .sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id));

  // If initial is also accepting, record it
  const isInitialAccepting = initialNode?.isAccepting ?? false;

  // 3. Other Non-accepting, Non-initial States
  const otherNodes = nodes
    .filter((n) => !n.isAccepting && n.id !== initialId)
    .sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id));

  const stateToCanonicalIndex: Record<string, number> = {};
  const canonicalIndexToStateLabel: Record<number, string> = {};

  let stateIdx = 1;
  stateToCanonicalIndex[initialId] = stateIdx;
  canonicalIndexToStateLabel[stateIdx] = initialNode?.label ?? 'q0';

  for (const node of acceptingNodes) {
    stateIdx++;
    stateToCanonicalIndex[node.id] = stateIdx;
    canonicalIndexToStateLabel[stateIdx] = node.label;
  }

  for (const node of otherNodes) {
    stateIdx++;
    stateToCanonicalIndex[node.id] = stateIdx;
    canonicalIndexToStateLabel[stateIdx] = node.label;
  }

  const statesCount = nodes.length > 0 ? nodes.length : 1;

  // Collect all distinct symbols from edges
  const rawSymbols = new Set<string>();
  for (const edge of edges) {
    const parsed = parseTMEdgeMetadata(
      edge.id,
      edge.sourceNodeId,
      edge.targetNodeId,
      edge.label,
      edge.readSymbol,
      edge.writeSymbol,
      edge.moveDirection
    );
    if (!('error' in parsed)) {
      rawSymbols.add(parsed.readSymbol);
      rawSymbols.add(parsed.writeSymbol);
    }
  }

  // Canonical Symbol Ordering with Explicit Σ / Work Symbols Distinction:
  // If explicitInputAlphabet is provided, use it directly as Σ.
  // Otherwise, if any edge writes a symbol not read, or if all symbols appear in both,
  // we default Σ to all non-blank symbols.
  let inputSymbols: string[];
  let scratchSymbols: string[];

  if (explicitInputAlphabet !== undefined) {
    inputSymbols = explicitInputAlphabet.sort((a, b) => a.localeCompare(b));
    scratchSymbols = Array.from(rawSymbols)
      .filter((s) => s !== blankSymbol && s !== '' && !inputSymbols.includes(s))
      .sort((a, b) => a.localeCompare(b));
  } else {
    // Default fallback when not explicitly partitioned:
    // All non-blank symbols encountered in machine are considered Σ
    inputSymbols = Array.from(rawSymbols)
      .filter((s) => s !== blankSymbol && s !== '')
      .sort((a, b) => a.localeCompare(b));
    scratchSymbols = [];
  }

  const symbolToCanonicalIndex: Record<string, number> = {};
  const canonicalIndexToSymbol: Record<number, string> = {};

  let symIdx = 1;
  // 1. Input alphabet symbols Σ -> 1 ... |Σ|
  for (const sym of inputSymbols) {
    symbolToCanonicalIndex[sym] = symIdx;
    canonicalIndexToSymbol[symIdx] = sym;
    symIdx++;
  }
  const inputSymbolsCount = inputSymbols.length;

  // 2. Blank symbol B is ALWAYS placed immediately after Σ at index |Σ| + 1
  symbolToCanonicalIndex[blankSymbol] = symIdx;
  canonicalIndexToSymbol[symIdx] = blankSymbol;
  const blankCanonicalIndex = symIdx;
  symIdx++;

  // 3. Scratch / work symbols (Γ \ (Σ ∪ {B})) placed at |Σ| + 2 ... |Γ|
  for (const sym of scratchSymbols) {
    symbolToCanonicalIndex[sym] = symIdx;
    canonicalIndexToSymbol[symIdx] = sym;
    symIdx++;
  }

  const acceptingCanonicalIndices: number[] = [];
  if (isInitialAccepting) {
    acceptingCanonicalIndices.push(1);
  }
  for (const node of acceptingNodes) {
    acceptingCanonicalIndices.push(stateToCanonicalIndex[node.id]);
  }

  const tapeAlphabet = Object.values(canonicalIndexToSymbol);

  return {
    stateToCanonicalIndex,
    canonicalIndexToStateLabel,
    symbolToCanonicalIndex,
    canonicalIndexToSymbol,
    directionToCanonicalIndex: DIRECTION_TO_INDEX,
    canonicalIndexToDirection: INDEX_TO_DIRECTION,
    statesCount,
    symbolsCount: Object.keys(symbolToCanonicalIndex).length,
    inputSymbolsCount,
    inputAlphabet: inputSymbols,
    tapeAlphabet,
    initialCanonicalIndex: 1,
    acceptingCanonicalIndices,
    blankCanonicalIndex,
  };
}

/**
 * Encodes a Turing Machine graph into both standard binary code and symbolic tuple code.
 *
 * BINARY CANONICAL FORMAT:
 * Transitions are encoded as: 0^i 1 0^j 1 0^k 1 0^l 1 0^m
 * Transitions are sorted deterministically by (i, j) and joined by "11".
 * Header encodes accepting states: 0^{acc_1} 1 0^{acc_2} ... followed by "111" delimiter.
 */
export function encodeTM(
  graph: SolverGraphInput,
  optionsOrBlank: string | TMEncodingOptions = DEFAULT_BLANK_SYMBOL,
  format: TMEncodingFormat = 'BINARY_CANONICAL'
): TMEncodedRepresentation {
  const canonicalMap = buildTMCanonicalizationMap(graph, optionsOrBlank);
  const blankSymbol = typeof optionsOrBlank === 'string'
    ? optionsOrBlank
    : optionsOrBlank?.blankSymbol ?? DEFAULT_BLANK_SYMBOL;
  const { edges } = graph;

  // Parse and map all edges
  const transitionTuples: TMEncodedTransition[] = [];

  for (const edge of edges) {
    const parsed = parseTMEdgeMetadata(
      edge.id,
      edge.sourceNodeId,
      edge.targetNodeId,
      edge.label,
      edge.readSymbol,
      edge.writeSymbol,
      edge.moveDirection
    );

    if (!('error' in parsed)) {
      const srcIdx = canonicalMap.stateToCanonicalIndex[parsed.sourceNodeId] ?? 1;
      const readIdx = canonicalMap.symbolToCanonicalIndex[parsed.readSymbol] ?? canonicalMap.blankCanonicalIndex;
      const tgtIdx = canonicalMap.stateToCanonicalIndex[parsed.targetNodeId] ?? 1;
      const writeIdx = canonicalMap.symbolToCanonicalIndex[parsed.writeSymbol] ?? canonicalMap.blankCanonicalIndex;
      const dirIdx = canonicalMap.directionToCanonicalIndex[parsed.moveDirection] ?? 2;

      const binaryCode = `${'0'.repeat(srcIdx)}1${'0'.repeat(readIdx)}1${'0'.repeat(tgtIdx)}1${'0'.repeat(writeIdx)}1${'0'.repeat(dirIdx)}`;

      const srcLabel = canonicalMap.canonicalIndexToStateLabel[srcIdx] || `q${srcIdx}`;
      const tgtLabel = canonicalMap.canonicalIndexToStateLabel[tgtIdx] || `q${tgtIdx}`;
      const readSym = canonicalMap.canonicalIndexToSymbol[readIdx] || '?';
      const writeSym = canonicalMap.canonicalIndexToSymbol[writeIdx] || '?';
      const dir = canonicalMap.canonicalIndexToDirection[dirIdx] || 'R';

      const symbolicCode = `δ(${srcLabel}, ${readSym}) → (${tgtLabel}, ${writeSym}, ${dir})`;

      transitionTuples.push({
        sourceStateIndex: srcIdx,
        readSymbolIndex: readIdx,
        targetStateIndex: tgtIdx,
        writeSymbolIndex: writeIdx,
        moveDirectionIndex: dirIdx,
        binaryCode,
        symbolicCode,
      });
    }
  }

  // Deterministic transition ordering: sort by (sourceStateIndex, readSymbolIndex)
  transitionTuples.sort((a, b) => {
    if (a.sourceStateIndex !== b.sourceStateIndex) {
      return a.sourceStateIndex - b.sourceStateIndex;
    }
    return a.readSymbolIndex - b.readSymbolIndex;
  });

  // --------------------------------------------------------------------------
  // MATHEMATICAL DELIMITER INVARIANCE & PREFIX-FREE STRUCTURE:
  // In our canonical unary-block representation:
  // Every integer value is strictly positive (n >= 1), encoded as 0^n.
  // Because n >= 1, every 1 is guaranteed to be preceded by at least one '0'.
  // Therefore, consecutive '1's can NEVER occur inside a data field:
  //   - Exactly one '1' separates fields within a tuple (0^i 1 0^j 1 0^k 1 0^l 1 0^m).
  //   - Exactly two '1's ("11") separate transition quintuples.
  //   - Exactly three '1's ("111") terminate the machine header.
  //   - Exactly four '1's ("1111") separate the machine <M> from input word <w>.
  // Since every field is non-empty (positive zeros), runs of '1's can ONLY occur at
  // structural boundaries. The count of consecutive '1's (1, 2, 3, 4) deterministically
  // and uniquely partitions the bitstream into its exact semantic tokens.
  // --------------------------------------------------------------------------
  // Header: 0^statesCount 1 0^symbolsCount 1 0^inputSymbolsCount 1 0^blankIdx [1 0^acc ...] 111
  const headerParts: string[] = [
    '0'.repeat(canonicalMap.statesCount),
    '0'.repeat(canonicalMap.symbolsCount),
    '0'.repeat(canonicalMap.inputSymbolsCount),
    '0'.repeat(canonicalMap.blankCanonicalIndex),
  ];
  for (const accIdx of canonicalMap.acceptingCanonicalIndices) {
    headerParts.push('0'.repeat(accIdx));
  }
  const headerBinary = headerParts.join('1');

  const transitionsBinary = transitionTuples.map((t) => t.binaryCode).join('11');
  const binaryEncoding = transitionsBinary.length > 0
    ? `${headerBinary}111${transitionsBinary}`
    : `${headerBinary}111`;

  // Build Symbolic Code
  const stateLabels = Object.values(canonicalMap.canonicalIndexToStateLabel);
  const acceptingLabels = canonicalMap.acceptingCanonicalIndices
    .map((idx) => canonicalMap.canonicalIndexToStateLabel[idx])
    .filter(Boolean);

  const initialLabel = canonicalMap.canonicalIndexToStateLabel[1] || 'q0';

  const symbolicHeader = `TM[Q={${stateLabels.join(', ')}}; Σ={${canonicalMap.inputAlphabet.join(', ')}}; Γ={${canonicalMap.tapeAlphabet.join(', ')}}; q0=${initialLabel}; B=${blankSymbol}; F={${acceptingLabels.join(', ')}}]`;
  const symbolicTransitions = transitionTuples.map((t) => t.symbolicCode).join('; ');
  const symbolicEncoding = symbolicTransitions.length > 0
    ? `${symbolicHeader} | ${symbolicTransitions}`
    : symbolicHeader;

  return {
    format,
    canonicalMap,
    transitions: transitionTuples,
    binaryEncoding,
    symbolicEncoding,
    statesCount: canonicalMap.statesCount,
    symbolsCount: canonicalMap.symbolsCount,
    inputSymbolsCount: canonicalMap.inputSymbolsCount,
    inputAlphabet: canonicalMap.inputAlphabet,
    tapeAlphabet: canonicalMap.tapeAlphabet,
    transitionsCount: transitionTuples.length,
    blankSymbol,
  };
}

/**
 * Decodes a canonical binary or symbolic TM string back into a valid SolverGraphInput.
 */
export function decodeTM(
  encodedString: string,
  _format: TMEncodingFormat = 'BINARY_CANONICAL'
): TMDecodeResult {
  const trimmed = encodedString.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Empty encoding string provided.' };
  }

  // Safety length guard against malicious oversized input
  if (trimmed.length > 100000) {
    return { isValid: false, error: 'Encoding exceeds maximum allowed length (100,000 chars).' };
  }

  // Check if string is symbolic format
  if (trimmed.startsWith('TM[')) {
    return decodeSymbolicTM(trimmed);
  }

  // Default: Decode Binary Canonical Format
  return decodeBinaryTM(trimmed);
}

/**
 * Decodes standard binary canonical encoding:
 * Header: 0^states 1 0^symbols 1 0^inputSymbols 1 0^blank [1 0^acc ...] 111 transitions
 */
function decodeBinaryTM(binaryStr: string): TMDecodeResult {
  // Validate binary alphabet {0, 1}
  if (!/^[01]+$/.test(binaryStr)) {
    return { isValid: false, error: 'Malformed binary encoding: contains non-binary characters.' };
  }

  if (!binaryStr.includes('111')) {
    return { isValid: false, error: 'Malformed binary encoding: missing header/transition delimiter "111".' };
  }

  const parts = binaryStr.split('111');
  const headerStr = parts[0];
  const transitionsStr = parts.slice(1).join('111');

  const headerTokens = headerStr.split('1');
  if (headerTokens.length < 4) {
    return { isValid: false, error: 'Malformed header: expected at least statesCount, symbolsCount, inputSymbolsCount, and blankIndex.' };
  }

  const statesCount = headerTokens[0].length;
  const symbolsCount = headerTokens[1].length;
  const inputSymbolsCount = headerTokens[2].length;
  const blankIndex = headerTokens[3].length;

  if (statesCount < 1) {
    return { isValid: false, error: 'Invalid states count in header (must be >= 1).' };
  }
  if (symbolsCount < 1) {
    return { isValid: false, error: 'Invalid symbols count in header (must be >= 1).' };
  }
  if (inputSymbolsCount < 0 || inputSymbolsCount > symbolsCount) {
    return { isValid: false, error: `Invalid input symbols count ${inputSymbolsCount} for symbols count ${symbolsCount}.` };
  }
  if (blankIndex < 1 || blankIndex > symbolsCount) {
    return { isValid: false, error: `Invalid blank symbol index ${blankIndex} for symbols count ${symbolsCount}.` };
  }

  // Remaining header tokens are accepting state indices
  const acceptingIndices = new Set<number>();
  for (let i = 4; i < headerTokens.length; i++) {
    const accIdx = headerTokens[i].length;
    if (accIdx >= 1 && accIdx <= statesCount) {
      acceptingIndices.add(accIdx);
    }
  }

  // Reconstruct States
  const nodes: StateNode[] = [];
  for (let i = 1; i <= statesCount; i++) {
    const isInitial = i === 1;
    const isAccepting = acceptingIndices.has(i);
    const label = `q${i}`;
    nodes.push({
      id: `state_${i}`,
      label,
      x: 100 + ((i - 1) % 4) * 160,
      y: 100 + Math.floor((i - 1) / 4) * 120,
      isInitial,
      isAccepting,
    });
  }

  // Reconstruct Symbols
  // Deterministic canonical convention:
  // Indices 1 ... inputSymbolsCount -> input alphabet Σ.
  // When |Σ| == 2, they represent '0' and '1'. If |Σ| == 1, '0'. Otherwise 'X1', 'X2', ...
  // Index blankIndex -> blank symbol '□'.
  // Remaining indices -> scratch symbols 'X', 'Y' or 'X_j'.
  const blankSymbol = DEFAULT_BLANK_SYMBOL;
  const indexToSymbol: Record<number, string> = {};

  for (let j = 1; j <= symbolsCount; j++) {
    if (j === blankIndex) {
      indexToSymbol[j] = blankSymbol;
    } else if (j <= inputSymbolsCount) {
      if (inputSymbolsCount === 2) {
        indexToSymbol[j] = j === 1 ? '0' : '1';
      } else if (inputSymbolsCount === 1) {
        indexToSymbol[j] = '0';
      } else {
        indexToSymbol[j] = `X${j}`;
      }
    } else {
      // Scratch symbol
      const scratchRank = j - inputSymbolsCount - (j > blankIndex ? 1 : 0);
      if (scratchRank === 1) indexToSymbol[j] = 'X';
      else if (scratchRank === 2) indexToSymbol[j] = 'Y';
      else indexToSymbol[j] = `S${scratchRank}`;
    }
  }

  const inputAlphabet: string[] = [];
  for (let j = 1; j <= inputSymbolsCount; j++) {
    if (indexToSymbol[j]) {
      inputAlphabet.push(indexToSymbol[j]);
    }
  }
  const tapeAlphabet = Object.values(indexToSymbol);

  // Reconstruct Transitions
  const edges: TransitionEdge[] = [];
  if (transitionsStr.trim().length > 0) {
    const transitionTokens = transitionsStr.split('11');
    let edgeCounter = 0;

    for (const tToken of transitionTokens) {
      if (!tToken) continue;
      const subTokens = tToken.split('1');
      if (subTokens.length !== 5) {
        return { isValid: false, error: `Malformed transition quintuple: expected 5 elements, got ${subTokens.length}.` };
      }

      const srcIdx = subTokens[0].length;
      const readIdx = subTokens[1].length;
      const tgtIdx = subTokens[2].length;
      const writeIdx = subTokens[3].length;
      const dirIdx = subTokens[4].length;

      if (srcIdx < 1 || srcIdx > statesCount) {
        return { isValid: false, error: `Invalid source state index ${srcIdx} in transition.` };
      }
      if (tgtIdx < 1 || tgtIdx > statesCount) {
        return { isValid: false, error: `Invalid target state index ${tgtIdx} in transition.` };
      }
      if (readIdx < 1 || readIdx > symbolsCount) {
        return { isValid: false, error: `Invalid read symbol index ${readIdx} in transition.` };
      }
      if (writeIdx < 1 || writeIdx > symbolsCount) {
        return { isValid: false, error: `Invalid write symbol index ${writeIdx} in transition.` };
      }
      if (dirIdx < 1 || dirIdx > 3) {
        return { isValid: false, error: `Invalid movement direction index ${dirIdx} (must be 1:L, 2:R, 3:S).` };
      }

      const readSymbol = indexToSymbol[readIdx];
      const writeSymbol = indexToSymbol[writeIdx];
      const moveDirection = INDEX_TO_DIRECTION[dirIdx] || 'R';
      const edgeId = `e_decoded_${edgeCounter++}`;

      edges.push({
        id: edgeId,
        sourceNodeId: `state_${srcIdx}`,
        targetNodeId: `state_${tgtIdx}`,
        label: `${readSymbol} → ${writeSymbol}, ${moveDirection}`,
        readSymbol,
        writeSymbol,
        moveDirection,
      });
    }
  }

  const graph: SolverGraphInput = { nodes, edges };
  const validation = validateTM(graph, blankSymbol);

  return {
    isValid: validation.isValid,
    graph,
    inputAlphabet,
    tapeAlphabet,
    blankSymbol,
    error: validation.errors.length > 0 ? validation.errors[0].message : undefined,
  };
}

/**
 * Decodes human-readable symbolic representation:
 * TM[Q={q0, q1}; Σ={0, 1}; Γ={0, 1, □}; q0=q0; B=□; F={q1}] | δ(q0, 0) -> (q1, 1, R); ...
 */
function decodeSymbolicTM(symbolicStr: string): TMDecodeResult {
  try {
    const mainParts = symbolicStr.split('|').map((p) => p.trim());
    const headerMatch = mainParts[0].match(/TM\[([^\]]+)\]/);
    if (!headerMatch) {
      return { isValid: false, error: 'Malformed symbolic header: missing "TM[...]".' };
    }

    const headerContent = headerMatch[1];
    const fields: Record<string, string> = {};
    for (const item of headerContent.split(';')) {
      const eqIdx = item.indexOf('=');
      if (eqIdx !== -1) {
        const k = item.slice(0, eqIdx).trim();
        const v = item.slice(eqIdx + 1).trim();
        fields[k] = v;
      }
    }

    const qStr = fields['Q']?.replace(/[{}]/g, '') || '';
    const stateLabels = qStr.split(',').map((s) => s.trim()).filter(Boolean);
    if (stateLabels.length === 0) {
      return { isValid: false, error: 'Missing or empty state set Q.' };
    }

    const sigmaStr = fields['Σ']?.replace(/[{}]/g, '') || '';
    const inputAlphabet = sigmaStr.split(',').map((s) => s.trim()).filter(Boolean);

    const gammaStr = fields['Γ']?.replace(/[{}]/g, '') || '';
    const tapeAlphabet = gammaStr.split(',').map((s) => s.trim()).filter(Boolean);

    const initialLabel = fields['q0'] || stateLabels[0];
    const blankSymbol = fields['B'] || DEFAULT_BLANK_SYMBOL;
    const fStr = fields['F']?.replace(/[{}]/g, '') || '';
    const acceptingLabels = new Set(fStr.split(',').map((s) => s.trim()).filter(Boolean));

    const labelToId: Record<string, string> = {};
    const nodes: StateNode[] = stateLabels.map((label, idx) => {
      const id = `state_${idx + 1}`;
      labelToId[label] = id;
      return {
        id,
        label,
        x: 100 + (idx % 4) * 160,
        y: 100 + Math.floor(idx / 4) * 120,
        isInitial: label === initialLabel,
        isAccepting: acceptingLabels.has(label),
      };
    });

    const edges: TransitionEdge[] = [];
    if (mainParts.length > 1 && mainParts[1].trim().length > 0) {
      const transitionRules = mainParts[1].split(';').map((s) => s.trim()).filter(Boolean);
      let edgeCounter = 0;

      for (const rule of transitionRules) {
        const match = rule.match(/δ\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)\s*(?:->|→)\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([LRS])\s*\)/i);
        if (match) {
          const srcLabel = match[1].trim();
          const readSym = match[2].trim();
          const tgtLabel = match[3].trim();
          const writeSym = match[4].trim();
          const dir = match[5].toUpperCase() as TMMoveDirection;

          const srcId = labelToId[srcLabel];
          const tgtId = labelToId[tgtLabel];

          if (!srcId || !tgtId) {
            return { isValid: false, error: `Transition references unknown state: "${srcLabel}" or "${tgtLabel}".` };
          }

          edges.push({
            id: `e_sym_${edgeCounter++}`,
            sourceNodeId: srcId,
            targetNodeId: tgtId,
            label: `${readSym} → ${writeSym}, ${dir}`,
            readSymbol: readSym,
            writeSymbol: writeSym,
            moveDirection: dir,
          });
        }
      }
    }

    const graph: SolverGraphInput = { nodes, edges };
    const validation = validateTM(graph, blankSymbol);

    return {
      isValid: validation.isValid,
      graph,
      inputAlphabet,
      tapeAlphabet,
      blankSymbol,
      error: validation.errors.length > 0 ? validation.errors[0].message : undefined,
    };
  } catch (err) {
    return { isValid: false, error: `Failed to parse symbolic TM: ${String(err)}` };
  }
}

/**
 * Encodes a pair <M, w> combining a Turing Machine M and an input word w.
 *
 * PAIR ENCODING FORMAT:
 * In canonical binary format, the encoded machine <M> and encoded input word <w>
 * are separated by "1111":
 *   <M, w> = <M> 1111 <w>
 *
 * Each symbol w[k] is encoded as 0^j where j is its canonical index in the machine's
 * symbol alphabet, separated by single '1's:
 *   <w> = 0^{j_1} 1 0^{j_2} 1 ... 0^{j_n}
 * An empty string w = ε is encoded as "0" (special empty marker).
 */
export function encodePair(
  graph: SolverGraphInput,
  inputString: string,
  optionsOrBlank: string | TMEncodingOptions = DEFAULT_BLANK_SYMBOL,
  format: TMEncodingFormat = 'BINARY_CANONICAL'
): UTMPairEncoding {
  const encodedM = encodeTM(graph, optionsOrBlank, format);
  const blankSymbol = typeof optionsOrBlank === 'string'
    ? optionsOrBlank
    : optionsOrBlank?.blankSymbol ?? DEFAULT_BLANK_SYMBOL;

  if (format === 'SYMBOLIC_TUPLE') {
    const fullPairString = `<${encodedM.symbolicEncoding}, "${inputString}">`;
    return {
      encodedMachine: encodedM.symbolicEncoding,
      encodedInput: inputString,
      fullPairString,
      format,
      blankSymbol,
    };
  }

  // Canonical Binary Pair Encoding
  // An empty string w = ε is encoded as "E" (or empty string after delimiter 1111).
  // More specifically, if inputString is empty, the string after "1111" is empty "".
  // If non-empty, symbols are encoded as 0^{symIdx} separated by '1'.
  // Since symIdx >= 1, non-empty word encodings always contain at least one '0'.
  let encodedInput = '';
  if (inputString.length > 0) {
    const symbolCodes: string[] = [];
    for (const char of inputString) {
      const idx = encodedM.canonicalMap.symbolToCanonicalIndex[char] ?? encodedM.canonicalMap.blankCanonicalIndex;
      symbolCodes.push('0'.repeat(idx));
    }
    encodedInput = symbolCodes.join('1');
  }

  // Combined pair delimiter: '1111' cleanly separates machine from word
  const fullPairString = `${encodedM.binaryEncoding}1111${encodedInput}`;

  return {
    encodedMachine: encodedM.binaryEncoding,
    encodedInput,
    fullPairString,
    format,
    blankSymbol,
  };
}

/**
 * Decodes a pair <M, w> back into a valid graph and input string.
 */
export function decodePair(
  pairString: string,
  _format: TMEncodingFormat = 'BINARY_CANONICAL'
): UTMPairDecodeResult {
  const trimmed = pairString.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Empty pair string provided.' };
  }

  // Safety length guard
  if (trimmed.length > 100000) {
    return { isValid: false, error: 'Pair string exceeds maximum allowed length (100,000 chars).' };
  }

  // Check symbolic format: <TM[...], "word">
  if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
    const inner = trimmed.slice(1, -1).trim();
    const lastCommaIdx = inner.lastIndexOf(',');
    if (lastCommaIdx !== -1) {
      const machinePart = inner.slice(0, lastCommaIdx).trim();
      let inputPart = inner.slice(lastCommaIdx + 1).trim();
      // Unquote string
      if (inputPart.startsWith('"') && inputPart.endsWith('"')) {
        inputPart = inputPart.slice(1, -1);
      }
      const decodeM = decodeTM(machinePart, 'SYMBOLIC_TUPLE');
      if (!decodeM.isValid || !decodeM.graph) {
        return { isValid: false, error: decodeM.error || 'Failed to decode machine in pair.' };
      }
      return {
        isValid: true,
        graph: decodeM.graph,
        inputAlphabet: decodeM.inputAlphabet,
        tapeAlphabet: decodeM.tapeAlphabet,
        inputString: inputPart,
        blankSymbol: decodeM.blankSymbol,
      };
    }
  }

  // Binary Pair Decoding (separated by '1111')
  const pairParts = trimmed.split('1111');
  if (pairParts.length !== 2) {
    return { isValid: false, error: 'Malformed binary pair encoding: missing delimiter "1111".' };
  }

  const machineBinary = pairParts[0];
  const inputBinary = pairParts[1];

  const decodeM = decodeTM(machineBinary, 'BINARY_CANONICAL');
  if (!decodeM.isValid || !decodeM.graph) {
    return { isValid: false, error: decodeM.error || 'Failed to decode machine component of pair.' };
  }

  // Reconstruct symbols map from decoded machine
  const canonicalMap = buildTMCanonicalizationMap(decodeM.graph, {
    blankSymbol: decodeM.blankSymbol,
    inputAlphabet: decodeM.inputAlphabet,
  });

  // Decode word
  let inputString = '';
  if (inputBinary.length > 0) {
    const symbolTokens = inputBinary.split('1');
    const chars: string[] = [];

    for (const symToken of symbolTokens) {
      const symIdx = symToken.length;
      const char = canonicalMap.canonicalIndexToSymbol[symIdx];
      if (char === undefined) {
        return { isValid: false, error: `Invalid symbol index ${symIdx} in encoded input word.` };
      }
      chars.push(char);
    }
    inputString = chars.join('');
  }

  return {
    isValid: true,
    graph: decodeM.graph,
    inputAlphabet: decodeM.inputAlphabet,
    tapeAlphabet: decodeM.tapeAlphabet,
    inputString,
    blankSymbol: decodeM.blankSymbol,
  };
}
