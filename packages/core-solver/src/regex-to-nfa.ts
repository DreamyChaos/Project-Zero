import { RegexASTNode, RegexToNFAResult, ThompsonStep } from './types';
import { parseRegex } from './regex-parser';
import { validateNFA } from './nfa-validator';
import { StateNode, TransitionEdge } from '@project-zero/canvas-renderer';

interface Fragment {
  startId: string;
  acceptId: string;
}

/**
 * Pure function: Builds an ε-NFA graph from a Regular Expression AST using standard Thompson Construction,
 * and records a step-by-step Thompson trace.
 */
export function buildThompsonNFA(ast: RegexASTNode): {
  nodes: StateNode[];
  edges: TransitionEdge[];
  trace: ThompsonStep[];
} {
  let stateCounter = 0;
  let edgeCounter = 1;
  let stepCounter = 1;

  const nodes: StateNode[] = [];
  const edges: TransitionEdge[] = [];
  const trace: ThompsonStep[] = [];

  function createState(): string {
    const id = `q${stateCounter++}`;
    nodes.push({
      id,
      label: id,
      x: 0,
      y: 0,
      isInitial: false,
      isAccepting: false,
    });
    return id;
  }

  function addEdge(srcId: string, tgtId: string, label: string): { id: string; sourceId: string; targetId: string; label: string } {
    const edgeObj = {
      id: `e${edgeCounter++}`,
      sourceNodeId: srcId,
      targetNodeId: tgtId,
      label,
    };
    edges.push(edgeObj);
    return { id: edgeObj.id, sourceId: srcId, targetId: tgtId, label };
  }

  function construct(node: RegexASTNode): Fragment {
    switch (node.type) {
      case 'LITERAL': {
        const startId = createState();
        const acceptId = createState();
        const e1 = addEdge(startId, acceptId, node.symbol);

        trace.push({
          stepIndex: stepCounter++,
          opType: 'LITERAL',
          label: node.symbol,
          description: `Create literal fragment for symbol '${node.symbol}'`,
          createdStateIds: [startId, acceptId],
          createdTransitions: [e1],
          fragment: { startId, acceptId },
        });

        return { startId, acceptId };
      }

      case 'EPSILON': {
        const startId = createState();
        const acceptId = createState();
        const e1 = addEdge(startId, acceptId, 'ε');

        trace.push({
          stepIndex: stepCounter++,
          opType: 'EPSILON',
          label: 'ε',
          description: 'Create empty transition fragment (ε)',
          createdStateIds: [startId, acceptId],
          createdTransitions: [e1],
          fragment: { startId, acceptId },
        });

        return { startId, acceptId };
      }

      case 'CONCAT': {
        const leftFrag = construct(node.left);
        const rightFrag = construct(node.right);
        const e1 = addEdge(leftFrag.acceptId, rightFrag.startId, 'ε');

        trace.push({
          stepIndex: stepCounter++,
          opType: 'CONCAT',
          label: '·',
          description: `Concatenate left fragment (${leftFrag.startId}→${leftFrag.acceptId}) with right fragment (${rightFrag.startId}→${rightFrag.acceptId}) via ε`,
          createdStateIds: [],
          createdTransitions: [e1],
          fragment: { startId: leftFrag.startId, acceptId: rightFrag.acceptId },
        });

        return { startId: leftFrag.startId, acceptId: rightFrag.acceptId };
      }

      case 'UNION': {
        const leftFrag = construct(node.left);
        const rightFrag = construct(node.right);
        const startId = createState();
        const acceptId = createState();

        const e1 = addEdge(startId, leftFrag.startId, 'ε');
        const e2 = addEdge(startId, rightFrag.startId, 'ε');
        const e3 = addEdge(leftFrag.acceptId, acceptId, 'ε');
        const e4 = addEdge(rightFrag.acceptId, acceptId, 'ε');

        trace.push({
          stepIndex: stepCounter++,
          opType: 'UNION',
          label: '|',
          description: `Union (|) of left fragment (${leftFrag.startId}→${leftFrag.acceptId}) and right fragment (${rightFrag.startId}→${rightFrag.acceptId})`,
          createdStateIds: [startId, acceptId],
          createdTransitions: [e1, e2, e3, e4],
          fragment: { startId, acceptId },
        });

        return { startId, acceptId };
      }

      case 'STAR': {
        const frag = construct(node.expression);
        const startId = createState();
        const acceptId = createState();

        const e1 = addEdge(startId, frag.startId, 'ε');
        const e2 = addEdge(startId, acceptId, 'ε');
        const e3 = addEdge(frag.acceptId, frag.startId, 'ε');
        const e4 = addEdge(frag.acceptId, acceptId, 'ε');

        trace.push({
          stepIndex: stepCounter++,
          opType: 'STAR',
          label: '*',
          description: `Apply Kleene Star (*) to inner fragment (${frag.startId}→${frag.acceptId})`,
          createdStateIds: [startId, acceptId],
          createdTransitions: [e1, e2, e3, e4],
          fragment: { startId, acceptId },
        });

        return { startId, acceptId };
      }

      case 'PLUS': {
        const frag = construct(node.expression);
        const startId = createState();
        const acceptId = createState();

        const e1 = addEdge(startId, frag.startId, 'ε');
        const e2 = addEdge(frag.acceptId, frag.startId, 'ε');
        const e3 = addEdge(frag.acceptId, acceptId, 'ε');

        trace.push({
          stepIndex: stepCounter++,
          opType: 'PLUS',
          label: '+',
          description: `Apply Plus (+) operator to inner fragment (${frag.startId}→${frag.acceptId})`,
          createdStateIds: [startId, acceptId],
          createdTransitions: [e1, e2, e3],
          fragment: { startId, acceptId },
        });

        return { startId, acceptId };
      }

      case 'OPTIONAL': {
        const frag = construct(node.expression);
        const startId = createState();
        const acceptId = createState();

        const e1 = addEdge(startId, frag.startId, 'ε');
        const e2 = addEdge(startId, acceptId, 'ε');
        const e3 = addEdge(frag.acceptId, acceptId, 'ε');

        trace.push({
          stepIndex: stepCounter++,
          opType: 'OPTIONAL',
          label: '?',
          description: `Apply Optional (?) operator to inner fragment (${frag.startId}→${frag.acceptId})`,
          createdStateIds: [startId, acceptId],
          createdTransitions: [e1, e2, e3],
          fragment: { startId, acceptId },
        });

        return { startId, acceptId };
      }
    }
  }

  const mainFrag = construct(ast);

  // Designate initial state and accepting state
  const finalNodes = nodes.map((n) => {
    if (n.id === mainFrag.startId) {
      return { ...n, isInitial: true, isAccepting: false };
    }
    if (n.id === mainFrag.acceptId) {
      return { ...n, isInitial: false, isAccepting: true };
    }
    return n;
  });

  // Calculate layout coordinates for Thompson NFA nodes
  const total = finalNodes.length;
  const layoutNodes = finalNodes.map((n, idx) => {
    const col = idx % Math.max(3, Math.ceil(Math.sqrt(total)));
    const row = Math.floor(idx / Math.max(3, Math.ceil(Math.sqrt(total))));
    return {
      ...n,
      x: 150 + col * 160,
      y: 150 + row * 140,
    };
  });

  return { nodes: layoutNodes, edges, trace };
}

/**
 * Pure function: Takes a Regular Expression string and builds a validated Thompson ε-NFA graph.
 */
export function convertRegexToNFA(regexInput: string): RegexToNFAResult {
  const parseRes = parseRegex(regexInput);
  if (!parseRes.success || !parseRes.ast) {
    return {
      success: false,
      inputRegex: regexInput,
      nodes: [],
      edges: [],
      alphabet: [],
      errorMessage: parseRes.errorMessage || 'Failed to parse regular expression.',
      errorPosition: parseRes.errorPosition,
    };
  }

  const { nodes, edges, trace } = buildThompsonNFA(parseRes.ast);

  // Derive alphabet (exclude ε and λ)
  const rawSymbols = edges
    .map((e) => e.label)
    .filter((l) => l && l.length > 0 && l !== 'ε' && l !== 'λ');
  const alphabet = Array.from(new Set(rawSymbols)).sort();

  const validationResult = validateNFA({ nodes, edges });

  return {
    success: true,
    inputRegex: regexInput,
    nodes,
    edges,
    alphabet,
    ast: parseRes.ast,
    trace,
    validationResult,
  };
}
