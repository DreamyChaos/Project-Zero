import { SolverGraphInput, AutomatonToRegexResult, StateEliminationStep, StateEliminationTransitionUpdate } from './types';
import { normalizeSymbol, isEpsilonSymbol } from './nfa-validator';

/**
 * Checks whether an expression has top-level alternation '|' outside parentheses.
 */
function hasTopLevelUnion(expr: string): boolean {
  let depth = 0;
  for (let i = 0; i < expr.length; i++) {
    const char = expr[i];
    if (char === '(') depth++;
    else if (char === ')') depth--;
    else if (char === '|' && depth === 0) return true;
  }
  return false;
}

/**
 * Checks whether an expression is safely parenthesized or an atomic literal.
 */
function isAtomicOrParenthesized(expr: string): boolean {
  if (expr.length <= 1) return true;
  if (expr.endsWith('*') || expr.endsWith('+') || expr.endsWith('?')) {
    // Check if the postfix applies to the whole expression
    if (expr.startsWith('(') && expr[expr.length - 2] === ')') {
      let depth = 0;
      for (let i = 0; i < expr.length - 1; i++) {
        if (expr[i] === '(') depth++;
        else if (expr[i] === ')') {
          depth--;
          if (depth === 0 && i < expr.length - 2) return false;
        }
      }
      return depth === 0;
    }
  }
  if (expr.startsWith('(') && expr.endsWith(')')) {
    let depth = 0;
    for (let i = 0; i < expr.length; i++) {
      if (expr[i] === '(') depth++;
      else if (expr[i] === ')') {
        depth--;
        if (depth === 0 && i < expr.length - 1) return false;
      }
    }
    return depth === 0;
  }
  return false;
}

/**
 * Mathematical GNFA Union: R1 | R2 with algebraic simplification.
 */
function makeUnion(a: string | null, b: string | null): string | null {
  if (a === null && b === null) return null;
  if (a === null) return b;
  if (b === null) return a;
  if (a === b) return a;
  if (a === 'ε' && b === 'ε') return 'ε';

  // Split into components to deduplicate (e.g. a | a -> a)
  const partsA = hasTopLevelUnion(a) ? splitTopLevelUnion(a) : [a];
  const partsB = hasTopLevelUnion(b) ? splitTopLevelUnion(b) : [b];
  const uniqueParts = Array.from(new Set([...partsA, ...partsB])).filter(Boolean);

  if (uniqueParts.length === 0) return null;
  if (uniqueParts.length === 1) return uniqueParts[0];

  return uniqueParts.join('|');
}

function splitTopLevelUnion(expr: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < expr.length; i++) {
    const char = expr[i];
    if (char === '(') depth++;
    else if (char === ')') depth--;
    else if (char === '|' && depth === 0) {
      parts.push(expr.substring(start, i));
      start = i + 1;
    }
  }
  parts.push(expr.substring(start));
  return parts;
}

/**
 * Mathematical GNFA Concatenation: R1 · R2 with algebraic simplification.
 */
function makeConcat(a: string | null, b: string | null): string | null {
  if (a === null || b === null) return null;
  if (a === 'ε') return b;
  if (b === 'ε') return a;

  let left = a;
  let right = b;

  if (hasTopLevelUnion(left) && !isAtomicOrParenthesized(left)) {
    left = `(${left})`;
  }
  if (hasTopLevelUnion(right) && !isAtomicOrParenthesized(right)) {
    right = `(${right})`;
  }

  return `${left}${right}`;
}

/**
 * Mathematical GNFA Kleene Star: R* with algebraic simplification.
 */
function makeStar(a: string | null): string | null {
  if (a === null || a === 'ε') return 'ε';
  if (a.endsWith('*') && isAtomicOrParenthesized(a)) return a;

  if (isAtomicOrParenthesized(a)) {
    if (a.length === 1) return `${a}*`;
    return `${a}*`;
  }

  return `(${a})*`;
}

/**
 * Simplifies a regular expression using standard algebraic identities.
 */
export function simplifyRegexString(regex: string): string {
  if (!regex || regex === 'ε') return regex;

  let prev = '';
  let curr = regex;

  // Multi-pass algebraic reduction
  let iterations = 0;
  while (prev !== curr && iterations < 10) {
    prev = curr;
    iterations++;

    // 1. (R) -> R if R is already atomic or parenthesized
    if (curr.startsWith('(') && curr.endsWith(')') && isAtomicOrParenthesized(curr)) {
      const inner = curr.substring(1, curr.length - 1);
      if (!hasTopLevelUnion(inner)) {
        curr = inner;
      }
    }

    // 2. (R*)* -> R*
    curr = curr.replace(/\(([^()]+)\*\)\*/g, '($1)*');

    // 3. (a)* -> a*
    curr = curr.replace(/\(([a-zA-Z0-9_])\)\*/g, '$1*');

    // 4. (a) -> a
    curr = curr.replace(/\(([a-zA-Z0-9_])\)/g, '$1');
  }

  return curr;
}

/**
 * Pure function: Converts any valid Finite Automaton (DFA, NFA, or ε-NFA) to an equivalent Regular Expression
 * using standard Generalized Nondeterministic Finite Automaton (GNFA) State Elimination.
 *
 * Algorithm:
 *  1. Add new initial state q_start with ε-transition to original initial state q_0.
 *  2. Add new accept state q_accept with ε-transitions from all original accepting states F.
 *  3. Convert parallel transitions between states into union expressions.
 *  4. Systematically eliminate intermediate states q_rip:
 *       R'(u, v) = R(u, v) | ( R(u, q_rip) · (R(q_rip, q_rip))* · R(q_rip, v) )
 *  5. When only q_start and q_accept remain, R(q_start, q_accept) is the language's regular expression.
 */
export function convertAutomatonToRegex(graph: SolverGraphInput): AutomatonToRegexResult {
  const initialNode = graph.nodes.find((n) => n.isInitial);
  const acceptingNodes = graph.nodes.filter((n) => n.isAccepting);

  // Extract alphabet (excluding ε)
  const rawAlphabet = graph.edges
    .map((e) => normalizeSymbol(e.label))
    .filter((l) => l.length > 0 && !isEpsilonSymbol(l));
  const alphabet = Array.from(new Set(rawAlphabet)).sort();

  if (!initialNode) {
    return {
      success: false,
      regex: '',
      simplifiedRegex: '',
      trace: [],
      stateCount: graph.nodes.length,
      transitionCount: graph.edges.length,
      alphabet,
      errorMessage: 'Automaton missing initial start state.',
    };
  }

  // Handle empty language (no accepting states)
  if (acceptingNodes.length === 0) {
    return {
      success: true,
      regex: '',
      simplifiedRegex: '',
      trace: [],
      stateCount: graph.nodes.length,
      transitionCount: graph.edges.length,
      alphabet,
    };
  }

  // Handle single state with initial = accepting and no transitions
  if (
    graph.nodes.length === 1 &&
    graph.nodes[0].isInitial &&
    graph.nodes[0].isAccepting &&
    graph.edges.length === 0
  ) {
    return {
      success: true,
      regex: 'ε',
      simplifiedRegex: 'ε',
      trace: [],
      stateCount: 1,
      transitionCount: 0,
      alphabet,
    };
  }

  const startId = '__gnfa_start__';
  const acceptId = '__gnfa_accept__';

  // State ID set for GNFA
  const originalStateIds = graph.nodes.map((n) => n.id);
  const gnfaStateIds = [startId, ...originalStateIds, acceptId];

  // Adjacency Map: fromId -> toId -> regex string | null
  const transitionMatrix = new Map<string, Map<string, string | null>>();

  for (const u of gnfaStateIds) {
    transitionMatrix.set(u, new Map<string, string | null>());
    for (const v of gnfaStateIds) {
      transitionMatrix.get(u)!.set(v, null);
    }
  }

  // 1. Initial State ε-transition: q_start -> q_0
  transitionMatrix.get(startId)!.set(initialNode.id, 'ε');

  // 2. Accepting State ε-transitions: q_f -> q_accept
  for (const acc of acceptingNodes) {
    const existing = transitionMatrix.get(acc.id)?.get(acceptId) ?? null;
    transitionMatrix.get(acc.id)!.set(acceptId, makeUnion(existing, 'ε'));
  }

  // 3. Populate existing graph transitions with parallel union reduction
  for (const edge of graph.edges) {
    const src = edge.sourceNodeId;
    const tgt = edge.targetNodeId;

    if (!transitionMatrix.has(src) || !transitionMatrix.has(tgt)) continue;

    const rawSym = edge.label;
    const normSym = isEpsilonSymbol(rawSym) ? 'ε' : (rawSym || 'ε');

    const curr = transitionMatrix.get(src)?.get(tgt) ?? null;
    transitionMatrix.get(src)!.set(tgt, makeUnion(curr, normSym));
  }

  // Step-by-Step State Elimination Trace
  const trace: StateEliminationStep[] = [];
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
  let remainingIntermediateStates = [...originalStateIds];
  let stepIndex = 1;

  // 4. Eliminate intermediate states one by one
  for (const ripId of originalStateIds) {
    const ripNode = nodeMap.get(ripId);
    const ripLabel = ripNode?.label || ripId;

    const remainingNonRipStates = [
      startId,
      ...remainingIntermediateStates.filter((id) => id !== ripId),
      acceptId,
    ];

    const loopRegex = transitionMatrix.get(ripId)?.get(ripId) ?? null;
    const starLoop = makeStar(loopRegex);

    const stepUpdates: StateEliminationTransitionUpdate[] = [];

    // For all u, v in remaining states, update T(u, v) = T(u, v) | ( T(u, rip) · T(rip, rip)* · T(rip, v) )
    for (const u of remainingNonRipStates) {
      const inRegex = transitionMatrix.get(u)?.get(ripId) ?? null;
      if (inRegex === null) continue; // No incoming path from u to rip

      for (const v of remainingNonRipStates) {
        const outRegex = transitionMatrix.get(ripId)?.get(v) ?? null;
        if (outRegex === null) continue; // No outgoing path from rip to v

        const directRegex = transitionMatrix.get(u)?.get(v) ?? null;
        const viaRegex = makeConcat(makeConcat(inRegex, starLoop), outRegex);
        const newRegex = makeUnion(directRegex, viaRegex);

        transitionMatrix.get(u)!.set(v, newRegex);

        const getLabel = (id: string) => {
          if (id === startId) return 'q_start';
          if (id === acceptId) return 'q_accept';
          return nodeMap.get(id)?.label || id;
        };

        if (viaRegex !== null) {
          stepUpdates.push({
            fromState: getLabel(u),
            toState: getLabel(v),
            directRegex: directRegex || '∅',
            loopRegex: loopRegex || 'ε',
            viaRegex: viaRegex,
            resultRegex: newRegex || '∅',
          });
        }
      }
    }

    remainingIntermediateStates = remainingIntermediateStates.filter((id) => id !== ripId);

    trace.push({
      stepIndex: stepIndex++,
      eliminatedStateId: ripId,
      eliminatedStateLabel: ripLabel,
      description: `Eliminated state ${ripLabel}. Updated ${stepUpdates.length} transitions bypassing ${ripLabel}.`,
      updatedTransitions: stepUpdates,
      remainingStateIds: [
        'q_start',
        ...remainingIntermediateStates.map((id) => nodeMap.get(id)?.label || id),
        'q_accept',
      ],
    });
  }

  // 5. Final Result from q_start -> q_accept
  const finalRegexRaw = transitionMatrix.get(startId)!.get(acceptId);
  const regex = finalRegexRaw || '';
  const simplifiedRegex = simplifyRegexString(regex);

  return {
    success: true,
    regex,
    simplifiedRegex: simplifiedRegex || regex,
    trace,
    stateCount: graph.nodes.length,
    transitionCount: graph.edges.length,
    alphabet,
  };
}
