import {
  PCPDomino,
  PCPInstance,
  PCPSearchOptions,
  PCPSearchResult,
  PCPPrefixComparison,
  PCPDistinctionItem,
} from './types';

/**
 * ============================================================
 * MODULE 5 — TOPIC 7: POST CORRESPONDENCE PROBLEM (PCP)
 * ============================================================
 *
 * Formal Problem Specification:
 * An instance of PCP consists of a finite set of domino pairs over alphabet Σ:
 *   P = [ (u_1, v_1), (u_2, v_2), ..., (u_n, v_n) ]
 *
 * Question:
 * Does there exist a finite non-empty sequence of indices i_1, i_2, ..., i_k (k ≥ 1)
 * such that:
 *   u_{i_1} u_{i_2} ... u_{i_k} = v_{i_1} v_{i_2} ... v_{i_k} ?
 *
 * Classical Invariants:
 * 1. Same index sequence on both top and bottom.
 * 2. Dominoes may be reused indefinitely.
 * 3. Sequence must be non-empty (k ≥ 1).
 * 4. Index order matters: [1, 2] != [2, 1].
 * 5. Equality is verified AFTER complete concatenation. Individual u_i != v_i is normal.
 * 6. Proper-prefix partial matches are in-progress candidates, not solutions.
 * 7. Non-prefix mismatches can NEVER be repaired by further concatenation.
 * 8. Bounded search exhaustion (depth ≤ N) does NOT prove no solution exists in general!
 *
 * Emil Post's Undecidability Theorem (1946):
 * The Post Correspondence Problem is Undecidable.
 * There exists no general algorithm to decide whether an arbitrary PCP instance has a match.
 */

export const PCP_DEFINITION = {
  problemName: 'Post Correspondence Problem (PCP)',
  formalNotation:
    'Given P = [(u_1, v_1), ..., (u_n, v_n)], ∃ non-empty sequence i_1, ..., i_k s.t. u_{i_1}...u_{i_k} = v_{i_1}...v_{i_k}',
  decidabilityClassification: 'UNDECIDABLE (Emil Post, 1946)',
  recognizabilityClassification: 'RECURSIVELY ENUMERABLE (Turing-Recognizable)',
  undecidabilityProofMethod:
    'Reduction from the Halting Problem / TM acceptance via Valid Computation Histories',
  mpcpDistinction:
    'In Modified PCP (MPCP), the first domino must be (u_1, v_1). MPCP reduces to standard PCP.',
};

/**
 * Distinction items preventing common student traps and misconceptions.
 */
export const PCP_DISTINCTIONS: ReadonlyArray<PCPDistinctionItem> = [
  {
    topic: 'Individual Dominoes vs Concatenation',
    correctConcept:
      'Individual dominoes do NOT need u_i = v_i. Equality is checked only after concatenating the entire sequence.',
    misconception: 'Expecting each chosen domino to have identical top and bottom strings.',
    safetyWarning: 'A domino where u_i = v_i is trivially a length-1 solution, but interesting PCP instances require multiple differing dominoes.',
  },
  {
    topic: 'Same-Sequence Invariant',
    correctConcept:
      'The exact same index sequence [i_1, ..., i_k] must be applied to both the top row and the bottom row.',
    misconception: 'Thinking top and bottom can choose different domino indices or rearrange order.',
    safetyWarning: 'Top and bottom share the identical sequence of domino choices.',
  },
  {
    topic: 'Domino Reuse',
    correctConcept:
      'Dominoes can be reused an arbitrary number of times in the sequence (e.g., [1, 2, 1, 1, 3]).',
    misconception: 'Assuming each domino can be used at most once.',
    safetyWarning: 'Without reuse, the problem would be finite and trivially decidable. Domino reuse makes the search space infinite.',
  },
  {
    topic: 'Prefix Mismatches Can Never Be Repaired',
    correctConcept:
      'If neither string is a prefix of the other (they diverge at some index m), appending further symbols can never restore equality.',
    misconception: 'Hoping that a mismatched character in the middle will cancel out with future dominoes.',
    safetyWarning: 'String concatenation only appends to the right; mismatched characters remain mismatched forever.',
  },
  {
    topic: 'Bounded Search vs Undecidability',
    correctConcept:
      'A bounded search that finds no match within depth N proves only that no solution of length ≤ N exists.',
    misconception: 'Claiming that a search timeout or bound exhaustion proves that PCP has no solution.',
    safetyWarning: 'Never state "no solution exists" based on a bounded search exhaustion.',
  },
];

/**
 * Validates whether a PCP instance is well-formed.
 */
export function validatePCPInstance(instance: {
  dominoes: ReadonlyArray<PCPDomino>;
}): { isValid: boolean; error?: string } {
  if (!instance.dominoes || instance.dominoes.length === 0) {
    return { isValid: false, error: 'PCP instance must contain at least one domino pair.' };
  }
  for (const domino of instance.dominoes) {
    if (typeof domino.top !== 'string' || typeof domino.bottom !== 'string') {
      return { isValid: false, error: `Domino ${domino.id} must contain valid string pairs.` };
    }
    if (domino.top.length === 0 && domino.bottom.length === 0) {
      return { isValid: false, error: `Domino ${domino.id} cannot have both top and bottom empty.` };
    }
  }
  return { isValid: true };
}

/**
 * Compares top and bottom concatenations for an explicit index sequence.
 */
export function comparePCPSequence(
  dominoes: ReadonlyArray<PCPDomino>,
  sequence: ReadonlyArray<number>
): PCPPrefixComparison {
  if (sequence.length === 0) {
    return {
      status: 'MATCH',
      topString: '',
      bottomString: '',
      commonPrefix: '',
      residualSuffix: '',
      canBeExtended: true,
    };
  }

  const dominoMap = new Map<number, PCPDomino>();
  for (const d of dominoes) {
    dominoMap.set(d.id, d);
  }

  let top = '';
  let bottom = '';

  for (const idx of sequence) {
    const d = dominoMap.get(idx);
    if (!d) {
      return {
        status: 'MISMATCH',
        topString: top,
        bottomString: bottom,
        commonPrefix: '',
        residualSuffix: '',
        canBeExtended: false,
      };
    }
    top += d.top;
    bottom += d.bottom;
  }

  if (top === bottom) {
    return {
      status: 'MATCH',
      topString: top,
      bottomString: bottom,
      commonPrefix: top,
      residualSuffix: '',
      canBeExtended: true,
    };
  }

  if (bottom.startsWith(top)) {
    return {
      status: 'TOP_IS_PREFIX',
      topString: top,
      bottomString: bottom,
      commonPrefix: top,
      residualSuffix: bottom.slice(top.length),
      canBeExtended: true,
    };
  }

  if (top.startsWith(bottom)) {
    return {
      status: 'BOTTOM_IS_PREFIX',
      topString: top,
      bottomString: bottom,
      commonPrefix: bottom,
      residualSuffix: top.slice(bottom.length),
      canBeExtended: true,
    };
  }

  // Find index of first divergence
  let commonLen = 0;
  const minLen = Math.min(top.length, bottom.length);
  while (commonLen < minLen && top[commonLen] === bottom[commonLen]) {
    commonLen++;
  }

  return {
    status: 'MISMATCH',
    topString: top,
    bottomString: bottom,
    commonPrefix: top.slice(0, commonLen),
    residualSuffix: `Divergence at pos ${commonLen}: '${top[commonLen]}' != '${bottom[commonLen]}'`,
    canBeExtended: false,
  };
}

/**
 * Search node for Bounded BFS solver.
 */
interface PCPSearchNode {
  readonly sequence: ReadonlyArray<number>;
  readonly top: string;
  readonly bottom: string;
  readonly depth: number;
}

/**
 * Solves a PCP instance within strict finite bounds using Breadth-First Search
 * and mathematically proven prefix/residual pruning.
 */
export function solvePCPBounded(
  dominoes: ReadonlyArray<PCPDomino>,
  options?: PCPSearchOptions
): PCPSearchResult {
  const startTime = Date.now();
  const validation = validatePCPInstance({ dominoes });
  if (!validation.isValid) {
    return {
      status: 'INVALID_INSTANCE',
      nodesExplored: 0,
      maxDepthReached: 0,
      executionTimeMs: 0,
      explanation: validation.error || 'Invalid PCP instance.',
      epistemologicalNote: 'Instance malformed; cannot search.',
    };
  }

  const maxDepth = Math.max(1, Math.min(options?.maxDepth ?? 8, 12));
  const maxNodes = Math.max(10, Math.min(options?.maxNodes ?? 5000, 20000));
  const maxStringLength = options?.maxStringLength ?? 80;

  // Queue of candidate search nodes
  const queue: PCPSearchNode[] = [];
  let nodesExplored = 0;
  let maxDepthReached = 0;

  // Initialize queue with length-1 sequences
  for (const d of dominoes) {
    // Check if single domino is already a match
    if (d.top === d.bottom) {
      return {
        status: 'SOLUTION_FOUND',
        witness: {
          sequence: [d.id],
          topConcatenation: d.top,
          bottomConcatenation: d.bottom,
          length: 1,
          isExactMatch: true,
        },
        nodesExplored: 1,
        maxDepthReached: 1,
        executionTimeMs: Date.now() - startTime,
        explanation: `Immediate solution found with single domino [${d.id}].`,
        epistemologicalNote: 'Exact solution witness verified by string equality.',
      };
    }

    // Pruning invariant: only keep if one is prefix of other
    if (d.bottom.startsWith(d.top) || d.top.startsWith(d.bottom)) {
      queue.push({
        sequence: [d.id],
        top: d.top,
        bottom: d.bottom,
        depth: 1,
      });
    }
    nodesExplored++;
  }

  maxDepthReached = 1;

  while (queue.length > 0) {
    if (nodesExplored >= maxNodes) {
      break;
    }

    const current = queue.shift()!;
    if (current.depth > maxDepthReached) {
      maxDepthReached = current.depth;
    }

    // If at maxDepth, do not expand further
    if (current.depth >= maxDepth) {
      continue;
    }

    // Branch on all available dominoes (domino reuse allowed)
    for (const d of dominoes) {
      nodesExplored++;
      const nextSeq = [...current.sequence, d.id];
      const nextTop = current.top + d.top;
      const nextBottom = current.bottom + d.bottom;
      const nextDepth = current.depth + 1;

      // Check for exact match
      if (nextTop === nextBottom) {
        return {
          status: 'SOLUTION_FOUND',
          witness: {
            sequence: nextSeq,
            topConcatenation: nextTop,
            bottomConcatenation: nextBottom,
            length: nextSeq.length,
            isExactMatch: true,
          },
          nodesExplored,
          maxDepthReached: Math.max(maxDepthReached, nextDepth),
          executionTimeMs: Date.now() - startTime,
          explanation: `Solution witness found: sequence [${nextSeq.join(', ')}] produced matching string "${nextTop}".`,
          epistemologicalNote: 'Exact match verified: TOP === BOTTOM across the identical index sequence.',
        };
      }

      // Check string length guard
      if (nextTop.length > maxStringLength || nextBottom.length > maxStringLength) {
        continue;
      }

      // Residual pruning: keep only if top is prefix of bottom OR bottom is prefix of top
      if (nextBottom.startsWith(nextTop) || nextTop.startsWith(nextBottom)) {
        queue.push({
          sequence: nextSeq,
          top: nextTop,
          bottom: nextBottom,
          depth: nextDepth,
        });
      }
      // If mismatch, mathematically pruned (Invariant 7)!
    }
  }

  return {
    status: 'BOUND_EXHAUSTED_NO_SOLUTION',
    nodesExplored,
    maxDepthReached,
    executionTimeMs: Date.now() - startTime,
    explanation: `No matching sequence found within search bound (depth ≤ ${maxDepth}, explored ${nodesExplored} nodes).`,
    epistemologicalNote:
      'CRITICAL SAFETY GUARD: Bound exhaustion proves only that no solution of length ≤ ' +
      maxDepth +
      ' exists. Because PCP has an infinite search space, this does NOT prove the instance is unsolvable in general!',
  };
}

/**
 * Curated presets for interactive experimentation.
 */
export const PCP_PRESETS: ReadonlyArray<PCPInstance> = [
  {
    id: 'pcp-classic-yes',
    name: 'Classic Minimal YES Instance',
    description: 'A standard minimal solvable PCP instance with a 2-domino solution: [1, 2].',
    alphabet: ['a', 'b'],
    dominoes: [
      { id: 1, top: 'a', bottom: 'ab' },
      { id: 2, top: 'ba', bottom: 'a' },
      { id: 3, top: 'b', bottom: 'bb' },
    ],
    knownSolution: [1, 2],
    isMathematicallySolvable: true,
  },
  {
    id: 'pcp-reuse-yes',
    name: 'Domino Reuse YES Instance',
    description: 'Requires reusing domino 2 multiple times: solution [2, 1, 3, 2, 4].',
    alphabet: ['a', 'b', 'c'],
    dominoes: [
      { id: 1, top: 'b', bottom: 'ca' },
      { id: 2, top: 'a', bottom: 'ab' },
      { id: 3, top: 'ca', bottom: 'a' },
      { id: 4, top: 'abc', bottom: 'c' },
    ],
    knownSolution: [2, 1, 3, 2, 4],
    isMathematicallySolvable: true,
  },
  {
    id: 'pcp-disjoint-no',
    name: 'Disjoint First Symbol NO Instance',
    description: 'For all dominoes, the first symbol of top differs from bottom. Provably NO solution can ever start!',
    alphabet: ['a', 'b'],
    dominoes: [
      { id: 1, top: 'a', bottom: 'b' },
      { id: 2, top: 'ab', bottom: 'ba' },
    ],
    isMathematicallySolvable: false,
  },
  {
    id: 'pcp-length-disparity-no',
    name: 'Length Disparity Instance (Bound Exhaustion)',
    description: 'Every domino has |top| > |bottom|. Total top length always strictly exceeds bottom length.',
    alphabet: ['a', 'b'],
    dominoes: [
      { id: 1, top: 'ab', bottom: 'a' },
      { id: 2, top: 'ba', bottom: 'b' },
    ],
    isMathematicallySolvable: false,
  },
];
