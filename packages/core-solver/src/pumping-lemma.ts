import {
  PumpingDecomposition,
  PumpingEvaluation,
  DecompositionProofResult,
  PumpingProofQuantifierResult,
  PumpingProofStatus,
  PumpingPresetDefinition,
} from './types';

/**
 * Validates a specific string decomposition w = xyz against the Pumping Lemma conditions.
 *
 * Invariant 1: |xy| <= p
 * Invariant 2: |y| > 0
 * Invariant 3: x + y + z = w
 */
export function validatePumpingDecomposition(
  w: string,
  p: number,
  xLen: number,
  yLen: number
): PumpingDecomposition {
  if (p <= 0) {
    return {
      x: '',
      y: '',
      z: '',
      splitIndices: { xLen, yLen, zLen: 0 },
      isValid: false,
      validationError: 'Pumping length p must be a positive integer (p >= 1).',
    };
  }

  if (xLen < 0 || yLen < 0 || xLen + yLen > w.length) {
    return {
      x: '',
      y: '',
      z: '',
      splitIndices: { xLen, yLen, zLen: 0 },
      isValid: false,
      validationError: 'Split indices out of bounds for witness string.',
    };
  }

  const x = w.slice(0, xLen);
  const y = w.slice(xLen, xLen + yLen);
  const z = w.slice(xLen + yLen);
  const zLen = z.length;

  if (yLen === 0) {
    return {
      x,
      y,
      z,
      splitIndices: { xLen, yLen, zLen },
      isValid: false,
      validationError: 'Violation of Condition 2: |y| must be strictly greater than 0 (|y| > 0).',
    };
  }

  if (xLen + yLen > p) {
    return {
      x,
      y,
      z,
      splitIndices: { xLen, yLen, zLen },
      isValid: false,
      validationError: `Violation of Condition 1: |xy| = ${xLen + yLen} exceeds pumping length p = ${p} (|xy| <= p required).`,
    };
  }

  return {
    x,
    y,
    z,
    splitIndices: { xLen, yLen, zLen },
    isValid: true,
  };
}

/**
 * Enumerates all valid decompositions w = xyz satisfying |xy| <= p and |y| > 0.
 */
export function enumerateValidDecompositions(w: string, p: number): PumpingDecomposition[] {
  if (p <= 0 || w.length < p) {
    return [];
  }

  const maxXY = Math.min(p, w.length);
  const decompositions: PumpingDecomposition[] = [];

  for (let xLen = 0; xLen < maxXY; xLen++) {
    for (let yLen = 1; xLen + yLen <= maxXY; yLen++) {
      const decomp = validatePumpingDecomposition(w, p, xLen, yLen);
      if (decomp.isValid) {
        decompositions.push(decomp);
      }
    }
  }

  return decompositions;
}

/**
 * Computes the pumped string xy^i z for any non-negative integer i >= 0.
 */
export function pumpString(x: string, y: string, z: string, i: number): string {
  if (i < 0) {
    throw new Error(`Pumping exponent i must be non-negative (i >= 0), received ${i}`);
  }
  return x + y.repeat(i) + z;
}

/**
 * Evaluates a specific decomposition across multiple pumping values i in {0, 1, 2, ...}.
 */
export function evaluatePumpingSweep(
  decomp: PumpingDecomposition,
  membershipChecker: (str: string) => { isMember: boolean; reason: string },
  testIVals: number[] = [0, 1, 2, 3, 4]
): DecompositionProofResult {
  if (!decomp.isValid) {
    return {
      decomposition: decomp,
      evaluations: [],
      hasDisprovingI: false,
      reasoning: decomp.validationError || 'Invalid decomposition',
    };
  }

  const evaluations: PumpingEvaluation[] = [];
  let disprovingI: number | undefined = undefined;
  let disprovingString: string | undefined = undefined;

  for (const i of testIVals) {
    if (i < 0) continue;
    const pumped = pumpString(decomp.x, decomp.y, decomp.z, i);
    const check = membershipChecker(pumped);

    evaluations.push({
      i,
      pumpedString: pumped,
      length: pumped.length,
      isMember: check.isMember,
      membershipReason: check.reason,
    });

    if (!check.isMember && disprovingI === undefined) {
      disprovingI = i;
      disprovingString = pumped;
    }
  }

  const hasDisproving = disprovingI !== undefined;
  const reasoning = hasDisproving
    ? `Contradicted at i=${disprovingI}: xy^${disprovingI}z = "${disprovingString}" ∉ L. (${evaluations.find((e) => e.i === disprovingI)?.membershipReason})`
    : `All tested i ∈ {${testIVals.join(', ')}} remain inside L.`;

  return {
    decomposition: decomp,
    evaluations,
    hasDisprovingI: hasDisproving,
    disprovingI,
    disprovingString,
    reasoning,
  };
}

/**
 * Standard Educational Presets for Pumping Lemma Learning and Proofs.
 */
export const PUMPING_PRESETS: Record<string, PumpingPresetDefinition> = {
  anbn: {
    id: 'anbn',
    name: 'L = { aⁿbⁿ | n ≥ 0 }',
    latex: 'L = \\{ a^n b^n \\mid n \\ge 0 \\}',
    description: 'Classic non-regular language with equal number of a\'s and b\'s in strict sequence.',
    isRegular: false,
    suggestedP: 4,
    suggestedWitness: (p) => 'a'.repeat(p) + 'b'.repeat(p),
    membershipCheck: (str) => {
      const match = str.match(/^(a*)(b*)$/);
      if (!match) {
        return { isMember: false, reason: 'String contains out-of-order characters (expected all a\'s before b\'s)' };
      }
      const numA = match[1].length;
      const numB = match[2].length;
      if (numA === numB) {
        return { isMember: true, reason: `Equal counts: ${numA} a's and ${numB} b's` };
      }
      return { isMember: false, reason: `Unequal counts: ${numA} a's vs ${numB} b's (count(a) ≠ count(b))` };
    },
    structuralAnalysis: (p) =>
      `Since |xy| ≤ ${p}, the substring y must lie entirely within the initial block of a's (y = aᵏ where 1 ≤ k ≤ ${p}). Pumping with i = 0 yields aᵖ⁻ᵏbᵖ where number of a's (${p - 1} or fewer) < number of b's (${p}), which is not in L.`,
  },

  '0n1n': {
    id: '0n1n',
    name: 'L = { 0ⁿ1ⁿ | n ≥ 0 }',
    latex: 'L = \\{ 0^n 1^n \\mid n \\ge 0 \\}',
    description: 'Binary language with matching counts of 0s and 1s.',
    isRegular: false,
    suggestedP: 3,
    suggestedWitness: (p) => '0'.repeat(p) + '1'.repeat(p),
    membershipCheck: (str) => {
      const match = str.match(/^(0*)(1*)$/);
      if (!match) {
        return { isMember: false, reason: 'String contains out-of-order digits (expected all 0s before 1s)' };
      }
      const num0 = match[1].length;
      const num1 = match[2].length;
      if (num0 === num1) {
        return { isMember: true, reason: `Equal counts: ${num0} 0s and ${num1} 1s` };
      }
      return { isMember: false, reason: `Unequal counts: ${num0} 0s vs ${num1} 1s (count(0) ≠ count(1))` };
    },
    structuralAnalysis: (p) =>
      `Since |xy| ≤ ${p}, y = 0ᵏ (1 ≤ k ≤ ${p}). For i = 0, xy⁰z = 0ᵖ⁻ᵏ1ᵖ has fewer 0s than 1s, violating count(0) = count(1).`,
  },

  anbm_greater: {
    id: 'anbm_greater',
    name: 'L = { aⁿbᵐ | n > m ≥ 0 }',
    latex: 'L = \\{ a^n b^m \\mid n > m \\ge 0 \\}',
    description: 'Language with strictly more a\'s than b\'s.',
    isRegular: false,
    suggestedP: 3,
    suggestedWitness: (p) => 'a'.repeat(p + 1) + 'b'.repeat(p),
    membershipCheck: (str) => {
      const match = str.match(/^(a*)(b*)$/);
      if (!match) {
        return { isMember: false, reason: 'Characters out of order' };
      }
      const numA = match[1].length;
      const numB = match[2].length;
      if (numA > numB) {
        return { isMember: true, reason: `${numA} a's > ${numB} b's (strictly greater)` };
      }
      return { isMember: false, reason: `${numA} a's is not strictly greater than ${numB} b's` };
    },
    structuralAnalysis: (p) =>
      `For witness aᵖ⁺¹bᵖ, since |xy| ≤ ${p}, y = aᵏ with 1 ≤ k ≤ ${p}. Pumping down with i = 0 yields aᵖ⁺¹⁻ᵏbᵖ. Since k ≥ 1, p+1-k ≤ p, so number of a's is no longer strictly greater than b's.`,
  },

  ww_repeat: {
    id: 'ww_repeat',
    name: 'L = { ww | w ∈ {0,1}* }',
    latex: 'L = \\{ ww \\mid w \\in \\{0,1\\}^* \\}',
    description: 'Language of doubled strings (requires infinite memory to match arbitrary prefix with suffix).',
    isRegular: false,
    suggestedP: 3,
    suggestedWitness: (p) => '0'.repeat(p) + '1' + '0'.repeat(p) + '1',
    membershipCheck: (str) => {
      if (str.length % 2 !== 0) {
        return { isMember: false, reason: `Odd string length (${str.length}); cannot be split into two equal halves ww` };
      }
      const half = str.length / 2;
      const w1 = str.slice(0, half);
      const w2 = str.slice(half);
      if (w1 === w2) {
        return { isMember: true, reason: `Exact match of halves: w = "${w1}"` };
      }
      return { isMember: false, reason: `First half "${w1}" does not match second half "${w2}"` };
    },
    structuralAnalysis: (p) =>
      `For witness 0ᵖ10ᵖ1 (|w| = 2p+2), since |xy| ≤ ${p}, y = 0ᵏ (1 ≤ k ≤ ${p}) in the first half. Pumping with i = 2 yields 0ᵖ⁺ᵏ10ᵖ1. The new midpoint falls within the 0s of the second block, making the two halves distinct.`,
  },

  ansquared: {
    id: 'ansquared',
    name: 'L = { aⁿ² | n ≥ 0 }',
    latex: 'L = \\{ a^{n^2} \\mid n \\ge 0 \\}',
    description: 'Strings of a\'s whose length is a perfect square.',
    isRegular: false,
    suggestedP: 3,
    suggestedWitness: (p) => 'a'.repeat(p * p),
    membershipCheck: (str) => {
      if (!/^a*$/.test(str)) {
        return { isMember: false, reason: 'Non-a characters present' };
      }
      const len = str.length;
      const root = Math.round(Math.sqrt(len));
      if (root * root === len) {
        return { isMember: true, reason: `Length ${len} is a perfect square (${root}²)` };
      }
      return { isMember: false, reason: `Length ${len} is not a perfect square (falls between ${root * root} and ${(root + 1) * (root + 1)})` };
    },
    structuralAnalysis: (p) =>
      `For witness aᵖ², since |xy| ≤ ${p}, |y| = k with 1 ≤ k ≤ ${p}. Pumping with i = 2 yields length p² + k. Since 1 ≤ k ≤ p, p² < p² + k < p² + 2p + 1 = (p+1)², so the length falls strictly between two consecutive squares.`,
  },

  // Regular Language Demonstrations
  astar: {
    id: 'astar',
    name: 'L = a* (Regular)',
    latex: 'L = \\{ a^n \\mid n \\ge 0 \\}',
    description: 'Regular language accepting any number of a\'s. Demonstrates that regular languages satisfy the Pumping Lemma.',
    isRegular: true,
    suggestedP: 3,
    suggestedWitness: (p) => 'a'.repeat(p),
    membershipCheck: (str) => {
      if (/^a*$/.test(str)) {
        return { isMember: true, reason: 'All characters are a\'s (a*)' };
      }
      return { isMember: false, reason: 'Contains non-a character' };
    },
    regex: 'a*',
    structuralAnalysis: () =>
      `For any valid decomposition where y = aᵏ (k ≥ 1), pumping xyⁱz yields aᵖ⁺⁽ⁱ⁻¹⁾ᵏ, which is always in a* for all i ≥ 0. This satisfies the Pumping Lemma.`,
  },

  ab_star: {
    id: 'ab_star',
    name: 'L = (ab)* (Regular)',
    latex: 'L = \\{ (ab)^n \\mid n \\ge 0 \\}',
    description: 'Regular language of alternating ab pairs.',
    isRegular: true,
    suggestedP: 4,
    suggestedWitness: (p) => 'ab'.repeat(Math.ceil(p / 2)),
    membershipCheck: (str) => {
      if (/^(ab)*$/.test(str)) {
        return { isMember: true, reason: 'Valid repetition of ab' };
      }
      return { isMember: false, reason: 'Does not match (ab)* pattern' };
    },
    regex: '(ab)*',
    structuralAnalysis: () =>
      `For witness (ab)ᵖ with p=4, choosing x=ε, y=ab, z=(ab)ᵖ⁻¹ gives |xy|=2 ≤ p and |y|=2 > 0. For every i ≥ 0, xyⁱz = (ab)ⁱ(ab)ᵖ⁻¹ = (ab)ᵖ⁺ⁱ⁻¹ ∈ L.`,
  },
};

/**
 * Executes a full quantified Pumping Lemma proof analysis.
 *
 * Quantifier Semantics:
 *  - Disproving Non-Regularity requires:
 *    ∀ valid decompositions d = (x,y,z), ∃ i ≥ 0 such that pump(d, i) ∉ L.
 *  - Finding ONE failing decomposition does NOT prove non-regularity.
 *  - Finding ONE passing decomposition does NOT prove regularity.
 */
export function runPumpingLemmaProof(params: {
  language:
    | PumpingPresetDefinition
    | {
        id: string;
        name: string;
        isRegular: boolean;
        membershipCheck: (s: string) => { isMember: boolean; reason: string };
        structuralAnalysis?: (p: number) => string;
      };
  p: number;
  customWitness?: string;
  testIVals?: number[];
}): PumpingProofQuantifierResult {
  const { language, p, customWitness } = params;
  const testIVals = params.testIVals || [0, 1, 2, 3, 4];

  // 1. Validate Pumping Length p >= 1
  if (!Number.isInteger(p) || p <= 0) {
    return {
      languageId: language.id,
      languageName: language.name,
      languageSpec: language.name,
      isLanguageRegularKnown: language.isRegular,
      pumpingLength: p,
      witness: '',
      isWitnessValid: false,
      witnessValidationError: `Invalid pumping length: p must be a positive integer (p >= 1), received ${p}.`,
      totalValidDecompositions: 0,
      decompositions: [],
      allDecompositionsDisproved: false,
      proofStatus: 'INVALID_INPUT',
      proofSteps: [`Step 1: Pumping length validation failed (p = ${p}).`],
      conclusion: 'Proof cannot proceed: invalid pumping length p.',
    };
  }

  // 2. Select or validate witness string w
  const presetDef = PUMPING_PRESETS[language.id];
  const witness = customWitness !== undefined && customWitness.trim() !== ''
    ? customWitness.trim()
    : presetDef
    ? presetDef.suggestedWitness(p)
    : 'a'.repeat(p);

  // 3. Verify witness w in L and |w| >= p
  const membership = language.membershipCheck(witness);
  if (!membership.isMember) {
    return {
      languageId: language.id,
      languageName: language.name,
      languageSpec: language.name,
      isLanguageRegularKnown: language.isRegular,
      pumpingLength: p,
      witness,
      isWitnessValid: false,
      witnessValidationError: `Invalid witness: string w = "${witness}" does NOT belong to language L. (${membership.reason})`,
      totalValidDecompositions: 0,
      decompositions: [],
      allDecompositionsDisproved: false,
      proofStatus: 'INVALID_INPUT',
      proofSteps: [
        `Step 1: Pumping length p = ${p} chosen.`,
        `Step 2: Witness string w = "${witness}" selected.`,
        `Step 3: Membership check failed: w ∉ L. (${membership.reason})`,
      ],
      conclusion: 'Invalid witness: Pumping Lemma requires choosing a witness string w that belongs to L (w ∈ L).',
    };
  }

  if (witness.length < p) {
    return {
      languageId: language.id,
      languageName: language.name,
      languageSpec: language.name,
      isLanguageRegularKnown: language.isRegular,
      pumpingLength: p,
      witness,
      isWitnessValid: false,
      witnessValidationError: `Invalid witness length: |w| = ${witness.length} is strictly less than pumping length p = ${p} (|w| >= p required).`,
      totalValidDecompositions: 0,
      decompositions: [],
      allDecompositionsDisproved: false,
      proofStatus: 'INVALID_INPUT',
      proofSteps: [
        `Step 1: Pumping length p = ${p} chosen.`,
        `Step 2: Witness string w = "${witness}" selected (|w| = ${witness.length}).`,
        `Step 3: Length condition violated: |w| < p.`,
      ],
      conclusion: 'Invalid witness length: Pumping Lemma requires |w| >= p.',
    };
  }

  // 4. Enumerate ALL valid decompositions w = xyz
  const allDecomps = enumerateValidDecompositions(witness, p);
  const evaluatedDecomps: DecompositionProofResult[] = allDecomps.map((d) =>
    evaluatePumpingSweep(d, language.membershipCheck, testIVals)
  );

  const totalValidDecompositions = evaluatedDecomps.length;
  const allDisproved =
    totalValidDecompositions > 0 && evaluatedDecomps.every((d) => d.hasDisprovingI);

  // 5. Build Proof Steps & Quantifier Conclusion
  const proofSteps: string[] = [
    `1. Assume for contradiction that language ${language.name} is regular.`,
    `2. By the Pumping Lemma, there must exist a pumping length p = ${p} (p ≥ 1).`,
    `3. Choose witness string w = "${witness}" ∈ L such that |w| = ${witness.length} ≥ p.`,
    `4. The Pumping Lemma asserts that THERE EXISTS at least one valid decomposition w = xyz with |xy| ≤ ${p} and |y| > 0 where xyⁱz ∈ L for all i ≥ 0.`,
    `5. Exhaustively enumerate ALL ${totalValidDecompositions} possible valid decompositions satisfying |xy| ≤ ${p} and |y| > 0.`,
  ];

  let proofStatus: PumpingProofStatus = 'FAILED_TO_DISPROVE';
  let conclusion = '';

  if (allDisproved) {
    proofStatus = 'CONTRADICTION_PROVEN_NON_REGULAR';
    proofSteps.push(
      `6. For EVERY one of the ${totalValidDecompositions} valid decompositions, pumping with an exponent i ∈ {${testIVals.join(', ')}} produces a string NOT in L.`,
      `7. Since NO valid decomposition satisfies the condition ∀i ≥ 0, xyⁱz ∈ L, we arrive at a mathematical contradiction.`,
      `8. Therefore, the assumption that L is regular is false. L is NOT regular.`
    );
    conclusion = `CONTRADICTION ESTABLISHED: Every valid decomposition (${totalValidDecompositions}/${totalValidDecompositions}) fails pumping. Language is NOT regular.`;
  } else if (language.isRegular) {
    proofStatus = 'CONSISTENT_WITH_REGULAR';
    proofSteps.push(
      `6. Valid decomposition(s) exist where all tested pumped strings xyⁱz remain in L for all i ∈ {${testIVals.join(', ')}}.`,
      `7. This behavior is fully consistent with the Pumping Lemma for regular languages.`,
      `8. Note: Passing the Pumping Lemma is a NECESSARY condition for regular languages, not a sufficient proof. Regularity is established via its DFA/NFA/RegEx representation.`
    );
    conclusion = `CONSISTENT WITH REGULAR LANGUAGE: Valid decomposition exists where pumping preserves membership. (Regularity established via DFA/RegEx).`;
  } else {
    proofStatus = 'FAILED_TO_DISPROVE';
    const disprovedCount = evaluatedDecomps.filter((d) => d.hasDisprovingI).length;
    proofSteps.push(
      `6. Tested ${disprovedCount} / ${totalValidDecompositions} decompositions disproved under current parameters (tested i ∈ {${testIVals.join(', ')}}).`,
      `7. Not all valid decompositions were disproved with the tested i-range or selected witness.`,
      `8. Note: A failed disproof attempt does NOT prove regularity.`
    );
    conclusion = `PROOF INCOMPLETE: ${disprovedCount} of ${totalValidDecompositions} decompositions disproved. To complete a non-regularity proof, ALL valid decompositions must be disproved.`;
  }

  const structuralText =
    presetDef?.structuralAnalysis ? presetDef.structuralAnalysis(p) : undefined;

  return {
    languageId: language.id,
    languageName: language.name,
    languageSpec: language.name,
    isLanguageRegularKnown: language.isRegular,
    pumpingLength: p,
    witness,
    isWitnessValid: true,
    totalValidDecompositions,
    decompositions: evaluatedDecomps,
    allDecompositionsDisproved: allDisproved,
    proofStatus,
    proofSteps,
    conclusion,
    decompositionClassSummary: structuralText,
  };
}
