import { CFGDerivationResult, CFGParseTreeNode, GrammarSymbol } from './types';

/**
 * Pure deterministic parse tree builder: Converts a CFGDerivationResult into an immutable parse tree structure.
 */
export function buildParseTreeFromDerivation(derivationResult: CFGDerivationResult): CFGParseTreeNode | null {
  if (!derivationResult.success || derivationResult.steps.length === 0) {
    return null;
  }

  let nodeCounter = 0;
  const nextId = () => `node_${nodeCounter++}`;

  const startSym: GrammarSymbol = {
    type: 'NON_TERMINAL',
    value: derivationResult.steps[0].mathematicalNotation,
  };

  const root: CFGParseTreeNode = {
    id: nextId(),
    symbol: startSym,
    children: [],
    depth: 0,
  };

  // Mutable helper node for tree construction
  interface MutableNode {
    id: string;
    symbol: GrammarSymbol;
    productionId?: string;
    children: MutableNode[];
    depth: number;
  }

  const mutableRoot: MutableNode = {
    id: root.id,
    symbol: startSym,
    children: [],
    depth: 0,
  };

  // Helper to collect all non-terminal nodes in pre-order / left-to-right order
  const getNonTerminalNodes = (node: MutableNode): MutableNode[] => {
    const res: MutableNode[] = [];
    if (node.symbol.type === 'NON_TERMINAL' && node.children.length === 0) {
      res.push(node);
    }
    for (const child of node.children) {
      res.push(...getNonTerminalNodes(child));
    }
    return res;
  };

  // Apply derivation steps in order
  for (let i = 1; i < derivationResult.steps.length; i++) {
    const step = derivationResult.steps[i];
    const leaves = getNonTerminalNodes(mutableRoot);

    const pos = step.expandedPosition !== undefined ? step.expandedPosition : 0;
    const targetNode = leaves[pos] || leaves[0];

    if (targetNode) {
      targetNode.productionId = step.productionId;

      // Extract new symbols added in this step
      const stepForm = step.sententialForm;
      if (stepForm.length === 0) {
        // Epsilon production
        targetNode.children.push({
          id: nextId(),
          symbol: { type: 'EPSILON', value: 'ε' },
          children: [],
          depth: targetNode.depth + 1,
        });
      } else {
        stepForm.forEach((sym) => {
          targetNode.children.push({
            id: nextId(),
            symbol: sym,
            children: [],
            depth: targetNode.depth + 1,
          });
        });
      }
    }
  }

  // Freeze mutable tree into immutable CFGParseTreeNode
  const freezeNode = (node: MutableNode): CFGParseTreeNode => {
    return {
      id: node.id,
      symbol: node.symbol,
      productionId: node.productionId,
      children: node.children.map(freezeNode),
      depth: node.depth,
    };
  };

  return freezeNode(mutableRoot);
}
