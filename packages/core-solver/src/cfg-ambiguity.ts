import {
  ContextFreeGrammar,
  GrammarSymbol,
  DerivationStep,
  CFGDerivationResult,
  CFGParseTreeNode,
  CFGAmbiguityResult,
  CFGProduction,
} from './types';
import { validateCFG } from './cfg-validator';
import { validateAlphabetSymbols } from './cfg-membership';

export interface AmbiguityOptions {
  maxDepth?: number;
  maxStatesExplored?: number;
  maxParsesToFind?: number;
}

/**
 * Computes a canonical structural signature for a parse tree.
 * Invariant to UI element IDs, random numbers, or timestamps.
 */
export function getParseTreeSignature(node: CFGParseTreeNode): string {
  const childSigs = node.children.map(getParseTreeSignature).join(',');
  const prodTag = node.productionId ? `:${node.productionId}` : '';
  return `(${node.symbol.type}:${node.symbol.value}${prodTag}[${childSigs}])`;
}

/**
 * Constructs a structural CFGParseTreeNode from a sequence of leftmost derivation steps.
 */
export function buildParseTreeFromLeftmostSteps(
  startVariable: string,
  steps: ReadonlyArray<DerivationStep>,
  productions: ReadonlyArray<CFGProduction>
): CFGParseTreeNode {
  let counter = 0;
  const nextId = () => `pt_node_${counter++}`;

  interface MutableNode {
    id: string;
    symbol: GrammarSymbol;
    productionId?: string;
    children: MutableNode[];
    depth: number;
  }

  const root: MutableNode = {
    id: nextId(),
    symbol: { type: 'NON_TERMINAL', value: startVariable },
    children: [],
    depth: 0,
  };

  const getUnexpandedLeftmostLeaf = (node: MutableNode): MutableNode | null => {
    if (node.symbol.type === 'NON_TERMINAL' && node.children.length === 0) {
      return node;
    }
    for (const child of node.children) {
      const leaf = getUnexpandedLeftmostLeaf(child);
      if (leaf) return leaf;
    }
    return null;
  };

  for (let i = 1; i < steps.length; i++) {
    const step = steps[i];
    const targetLeaf = getUnexpandedLeftmostLeaf(root);
    if (!targetLeaf) break;

    targetLeaf.productionId = step.productionId;

    const prod = productions.find((p) => p.id === step.productionId);
    const rhsSymbols = prod ? prod.rhs : [];

    if (rhsSymbols.length === 0 || (rhsSymbols.length === 1 && rhsSymbols[0].type === 'EPSILON')) {
      targetLeaf.children.push({
        id: nextId(),
        symbol: { type: 'EPSILON', value: 'ε' },
        children: [],
        depth: targetLeaf.depth + 1,
      });
    } else {
      for (const sym of rhsSymbols) {
        targetLeaf.children.push({
          id: nextId(),
          symbol: sym,
          children: [],
          depth: targetLeaf.depth + 1,
        });
      }
    }
  }

  const freeze = (node: MutableNode): CFGParseTreeNode => ({
    id: node.id,
    symbol: node.symbol,
    productionId: node.productionId,
    children: node.children.map(freeze),
    depth: node.depth,
  });

  return freeze(root);
}

/**
 * Constructs a corresponding Rightmost derivation sequence from a parse tree.
 */
export function buildRightmostDerivationFromTree(
  tree: CFGParseTreeNode,
  targetInput: string
): CFGDerivationResult {
  const steps: DerivationStep[] = [];

  const formatSententialForm = (form: GrammarSymbol[]) => {
    if (form.length === 0) return 'ε';
    return form.map((s) => (s.type === 'EPSILON' ? 'ε' : s.value)).join('');
  };

  // Initial step
  steps.push({
    stepIndex: 0,
    sententialForm: [tree.symbol],
    derivationType: 'RIGHTMOST',
    mathematicalNotation: tree.symbol.value,
  });

  // Track nodes in frontier
  interface FrontierItem {
    node: CFGParseTreeNode;
    isExpanded: boolean;
  }

  let frontier: FrontierItem[] = [{ node: tree, isExpanded: false }];

  while (frontier.some((item) => !item.isExpanded && item.node.symbol.type === 'NON_TERMINAL')) {
    // Find rightmost unexpanded non-terminal
    let targetIdx = -1;
    for (let i = frontier.length - 1; i >= 0; i--) {
      if (!frontier[i].isExpanded && frontier[i].node.symbol.type === 'NON_TERMINAL') {
        targetIdx = i;
        break;
      }
    }

    if (targetIdx === -1) break;

    const targetItem = frontier[targetIdx];
    targetItem.isExpanded = true;

    // Replace with its children in frontier
    const newItems: FrontierItem[] = targetItem.node.children.map((child) => ({
      node: child,
      isExpanded: child.children.length === 0,
    }));

    frontier = [
      ...frontier.slice(0, targetIdx),
      ...newItems,
      ...frontier.slice(targetIdx + 1),
    ];

    const currentForm: GrammarSymbol[] = frontier
      .map((item) => item.node.symbol)
      .filter((sym) => sym.type !== 'EPSILON');

    const prodNotation = `${targetItem.node.symbol.value} → ${
      targetItem.node.children.map((c) => (c.symbol.type === 'EPSILON' ? 'ε' : c.symbol.value)).join('') || 'ε'
    }`;
    const prevNotation = steps[steps.length - 1].mathematicalNotation;
    const nextNotation = `${prevNotation} ⇒ ${formatSententialForm(currentForm)}`;

    steps.push({
      stepIndex: steps.length,
      sententialForm: currentForm,
      productionId: targetItem.node.productionId,
      productionNotation: prodNotation,
      expandedVariable: targetItem.node.symbol.value,
      expandedPosition: targetIdx,
      derivationType: 'RIGHTMOST',
      mathematicalNotation: nextNotation,
    });
  }

  return {
    success: true,
    derivationType: 'RIGHTMOST',
    targetInput,
    steps,
    exploredStateCount: steps.length,
  };
}

/**
 * Pure deterministic ambiguity analysis engine for Context-Free Grammars.
 * Determines whether candidate string w ∈ L(G) admits ≥ 2 structurally distinct parse trees.
 */
export function analyzeGrammarAmbiguity(
  grammar: ContextFreeGrammar,
  targetInput: string,
  options: AmbiguityOptions = {}
): CFGAmbiguityResult {
  const maxDepth = options.maxDepth !== undefined ? options.maxDepth : 16;
  const maxStatesExplored = options.maxStatesExplored !== undefined ? options.maxStatesExplored : 1200;
  const maxParsesToFind = options.maxParsesToFind !== undefined ? options.maxParsesToFind : 4;

  const normalizedInput = targetInput === 'ε' ? '' : targetInput;

  // 1. Structural CFG Validation
  const validation = validateCFG(grammar);
  if (!validation.isValid) {
    return {
      status: 'INVALID_GRAMMAR',
      isAmbiguous: false,
      witnessString: targetInput,
      distinctParseCount: 0,
      parseTrees: [],
      derivations: [],
      exploredStates: 0,
      searchDepthLimit: maxDepth,
      reason: `Invalid CFG: ${validation.errors.map((e) => e.message).join('; ')}`,
    };
  }

  // 2. Terminal Alphabet Compliance Check
  const alphabetCheck = validateAlphabetSymbols(grammar, normalizedInput);
  if (!alphabetCheck.isValid) {
    return {
      status: 'INVALID_ALPHABET',
      isAmbiguous: false,
      witnessString: targetInput,
      distinctParseCount: 0,
      parseTrees: [],
      derivations: [],
      exploredStates: 0,
      searchDepthLimit: maxDepth,
      reason: `Alphabet Mismatch: String contains symbol(s) {${alphabetCheck.invalidSymbols.join(', ')}} not in terminal alphabet Σ.`,
    };
  }

  const { productions, startVariable } = grammar;

  // 3. Multi-Derivation Search (Leftmost Search)
  interface SearchNode {
    form: GrammarSymbol[];
    steps: DerivationStep[];
    depth: number;
  }

  const initialForm: GrammarSymbol[] = [{ type: 'NON_TERMINAL', value: startVariable }];
  const initialStep: DerivationStep = {
    stepIndex: 0,
    sententialForm: initialForm,
    derivationType: 'LEFTMOST',
    mathematicalNotation: startVariable,
  };

  const queue: SearchNode[] = [{ form: initialForm, steps: [initialStep], depth: 0 }];
  let exploredStates = 0;
  let hitLimit = false;

  const discoveredTrees: CFGParseTreeNode[] = [];
  const discoveredDerivations: CFGDerivationResult[] = [];
  const seenSignatures = new Set<string>();

  const countTerminals = (form: GrammarSymbol[]): number => {
    let count = 0;
    for (const sym of form) {
      if (sym.type === 'TERMINAL') count += sym.value.length;
    }
    return count;
  };

  const extractTerminalString = (form: GrammarSymbol[]): string | null => {
    let str = '';
    for (const sym of form) {
      if (sym.type === 'NON_TERMINAL') return null;
      if (sym.type === 'TERMINAL') str += sym.value;
    }
    return str;
  };

  const formatSententialForm = (form: GrammarSymbol[]) => {
    if (form.length === 0) return 'ε';
    return form.map((s) => (s.type === 'EPSILON' ? 'ε' : s.value)).join('');
  };

  while (queue.length > 0 && discoveredTrees.length < maxParsesToFind) {
    if (exploredStates >= maxStatesExplored) {
      hitLimit = true;
      break;
    }

    const current = queue.shift()!;
    exploredStates++;

    // Check complete match
    const termStr = extractTerminalString(current.form);
    if (termStr !== null && termStr === normalizedInput) {
      const tree = buildParseTreeFromLeftmostSteps(startVariable, current.steps, productions);
      const signature = getParseTreeSignature(tree);

      if (!seenSignatures.has(signature)) {
        seenSignatures.add(signature);
        discoveredTrees.push(tree);
        discoveredDerivations.push({
          success: true,
          derivationType: 'LEFTMOST',
          targetInput: normalizedInput,
          steps: current.steps,
          exploredStateCount: exploredStates,
        });
      }
      continue;
    }

    // Prune forms whose terminal length exceeds target string
    if (countTerminals(current.form) > normalizedInput.length) {
      continue;
    }

    if (current.depth >= maxDepth) {
      hitLimit = true;
      continue;
    }

    // Leftmost non-terminal expansion
    const pos = current.form.findIndex((s) => s.type === 'NON_TERMINAL');
    if (pos === -1) continue;

    const varSym = current.form[pos];
    const matchingProductions = productions.filter((p) => p.lhs === varSym.value);

    for (const p of matchingProductions) {
      const nextForm: GrammarSymbol[] = [];
      for (let i = 0; i < current.form.length; i++) {
        if (i === pos) {
          p.rhs.forEach((r) => {
            if (r.type !== 'EPSILON') nextForm.push(r);
          });
        } else {
          nextForm.push(current.form[i]);
        }
      }

      const prodNotation = `${p.lhs} → ${p.rhs.map((r) => r.value).join('') || 'ε'}`;
      const prevNotation = current.steps[current.steps.length - 1].mathematicalNotation;
      const nextNotation = `${prevNotation} ⇒ ${formatSententialForm(nextForm)}`;

      const nextStep: DerivationStep = {
        stepIndex: current.steps.length,
        sententialForm: nextForm,
        productionId: p.id,
        productionNotation: prodNotation,
        expandedVariable: p.lhs,
        expandedPosition: pos,
        derivationType: 'LEFTMOST',
        mathematicalNotation: nextNotation,
      };

      queue.push({
        form: nextForm,
        steps: [...current.steps, nextStep],
        depth: current.depth + 1,
      });
    }
  }

  // Construct Rightmost derivations for discovered trees
  const rightmostDerivations = discoveredTrees.map((t) =>
    buildRightmostDerivationFromTree(t, normalizedInput)
  );

  const displayStr = normalizedInput === '' ? 'ε' : normalizedInput;

  // 4. Result State Synthesis
  if (discoveredTrees.length >= 2) {
    return {
      status: 'AMBIGUITY_WITNESS_FOUND',
      isAmbiguous: true,
      witnessString: displayStr,
      distinctParseCount: discoveredTrees.length,
      parseTrees: discoveredTrees,
      derivations: discoveredDerivations,
      rightmostDerivations,
      exploredStates,
      searchDepthLimit: maxDepth,
      reason: `Ambiguity Witness Found! String "${displayStr}" ∈ L(G) has ${discoveredTrees.length} structurally distinct parse trees.`,
    };
  }

  if (discoveredTrees.length === 1) {
    if (hitLimit) {
      return {
        status: 'SEARCH_LIMIT_REACHED',
        isAmbiguous: false,
        witnessString: displayStr,
        distinctParseCount: 1,
        parseTrees: discoveredTrees,
        derivations: discoveredDerivations,
        rightmostDerivations,
        exploredStates,
        searchDepthLimit: maxDepth,
        reason: `Search limit reached (${exploredStates} states explored). Exactly 1 parse tree discovered so far, but full space could not be exhaustively searched.`,
      };
    }

    return {
      status: 'ONE_PARSE_FOUND_WITHIN_BOUND',
      isAmbiguous: false,
      witnessString: displayStr,
      distinctParseCount: 1,
      parseTrees: discoveredTrees,
      derivations: discoveredDerivations,
      rightmostDerivations,
      exploredStates,
      searchDepthLimit: maxDepth,
      reason: `One parse tree found within search bound (Depth ≤ ${maxDepth}). Note: A single parse tree on a test string does not prove universal unambiguity for arbitrary CFGs.`,
    };
  }

  // 0 parses found
  if (hitLimit) {
    return {
      status: 'SEARCH_LIMIT_REACHED',
      isAmbiguous: false,
      witnessString: displayStr,
      distinctParseCount: 0,
      parseTrees: [],
      derivations: [],
      exploredStates,
      searchDepthLimit: maxDepth,
      reason: `Search limit reached (${exploredStates} states explored). Membership or ambiguity could not be determined within depth bounds.`,
    };
  }

  return {
    status: 'NOT_IN_LANGUAGE',
    isAmbiguous: false,
    witnessString: displayStr,
    distinctParseCount: 0,
    parseTrees: [],
    derivations: [],
    exploredStates,
    searchDepthLimit: maxDepth,
    reason: `String "${displayStr}" ∉ L(G). Cannot evaluate ambiguity for strings outside the language.`,
  };
}
