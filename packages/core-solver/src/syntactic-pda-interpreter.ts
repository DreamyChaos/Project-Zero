import {
  ContextFreeGrammar,
  CFGProduction,
  SyntacticPDAInterpretationStep,
  SyntacticPDAInterpretationResult,
  SyntacticPDAActionType,
  SolverGraphInput,
} from './types';
import { validateCFG } from './cfg-validator';
import { convertCFGToPDA } from './pda-cfg-translation';
import { formatInstantaneousDescription } from './pda-executor';

export interface SyntacticPDAOptions {
  maxSteps?: number;
  maxConfigurations?: number;
  initialStackSymbol?: string;
}

/**
 * Splits an input statement into tokens matching the grammar's terminal vocabulary.
 * Automatically skips whitespace unless whitespace is explicitly declared as a terminal.
 */
export function tokenizeSyntacticStatement(
  input: string,
  terminals: ReadonlyArray<string>
): string[] | null {
  const trimmed = input.trim();
  if (trimmed.length === 0 || trimmed === 'ε' || trimmed === 'λ') {
    return [];
  }

  // Sort terminals descending by length for greedy longest-match
  const sorted = [...terminals].sort((a, b) => b.length - a.length);

  const tokens: string[] = [];
  let pos = 0;

  while (pos < input.length) {
    // Skip whitespace if space is not an explicit terminal symbol
    if (/\s/.test(input[pos]) && !terminals.includes(input[pos])) {
      pos++;
      continue;
    }

    let matched = false;
    for (const term of sorted) {
      if (term.length === 0) continue;
      if (input.startsWith(term, pos)) {
        tokens.push(term);
        pos += term.length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      return null; // Unrecognized token character
    }
  }

  return tokens;
}

/**
 * Computes the sentential form representation from the consumed prefix and the stack contents.
 * Since the stack stores symbols in bottom-to-top order (with stack[stack.length - 1] at the TOP),
 * the remaining sentential form suffix is stack.slice(1).reverse().
 */
function computeSententialForm(
  matchedTokens: ReadonlyArray<string>,
  stack: ReadonlyArray<string>
): { sententialForm: string; matchedPrefix: string } {
  const prefix = matchedTokens.join(' ');
  // Filter out the bottom stack marker Z0
  const expectedSuffix = stack
    .slice(1) // exclude Z0 at bottom
    .reverse()
    .join(' ');

  let sententialForm = prefix;
  if (expectedSuffix.length > 0) {
    sententialForm = prefix.length > 0 ? `${prefix} ${expectedSuffix}` : expectedSuffix;
  }

  return {
    sententialForm: sententialForm.length > 0 ? sententialForm : 'ε',
    matchedPrefix: prefix.length > 0 ? prefix : 'ε',
  };
}

/**
 * Lightweight search node during exploration.
 * Full strings, instantaneous descriptions, and explanations are generated
 * ONLY on the selected trace at the conclusion of the search.
 */
interface CompactSearchNode {
  readonly id: number;
  readonly parentId: number | null;
  readonly actionType: SyntacticPDAActionType;
  readonly productionUsed?: CFGProduction;
  readonly matchedTerminal?: string;
  readonly state: string;
  readonly inputIndex: number;
  readonly stack: string[]; // stack[0] is Z0, stack[stack.length - 1] is top
  readonly depth: number;
  readonly consecutiveExpansions: number;
}

/**
 * Module 4 Topic 6: Interpretation of Syntactic Statements using a Pushdown Automaton.
 *
 * Mathematically executes a Top-Down Pushdown Automaton interpreter for any Context-Free Grammar:
 *  - q0 (INIT): Bootstraps the derivation by pushing start variable S above Z0 via δ(q0, ε, Z0) = {(q1, S Z0)}.
 *  - q1 (EXPAND_VARIABLE): Non-terminal A at stack top expands via production A -> α via δ(q1, ε, A) ∋ (q1, α).
 *  - q1 (MATCH_TERMINAL): Terminal a at stack top matches input lookahead via δ(q1, a, a) = {(q1, ε)}.
 *  - q2 (ACCEPT): When all input is consumed and stack clears to Z0, δ(q1, ε, Z0) = {(q2, Z0)}.
 */
export function interpretSyntacticStatementWithPDA(
  grammar: ContextFreeGrammar,
  inputStatement: string,
  options: SyntacticPDAOptions = {}
): SyntacticPDAInterpretationResult {
  const initialStackSymbol = options.initialStackSymbol || 'Z0';
  const maxConfigurations = options.maxConfigurations || 1200;
  const maxSteps = options.maxSteps || 60;

  // 1. Construct the target top-down PDA graph using existing conversion engine
  const pdaConversion = convertCFGToPDA(grammar, { initialStackSymbol, testCorpus: [] });
  const targetPDAGraph: SolverGraphInput = pdaConversion.targetPDAGraph;

  // 2. Validate Grammar
  const cfgVal = validateCFG(grammar);
  if (!cfgVal.isValid) {
    return {
      status: 'REJECT',
      isAccepted: false,
      inputStatement,
      tokens: [],
      grammar,
      steps: [],
      exploredConfigurationsCount: 0,
      explanation: `Input grammar is invalid: ${cfgVal.errors.map((e) => e.message).join('; ')}`,
      targetPDAGraph,
    };
  }

  // 3. Tokenize input statement using grammar terminals
  const tokens = tokenizeSyntacticStatement(inputStatement, grammar.terminals);
  if (tokens === null) {
    return {
      status: 'REJECT',
      isAccepted: false,
      inputStatement,
      tokens: [],
      grammar,
      steps: [
        {
          stepIndex: 0,
          actionType: 'ERROR_MISMATCH',
          currentState: 'q0',
          inputIndex: 0,
          remainingInput: inputStatement,
          currentLookahead: null,
          stack: [initialStackSymbol],
          topSymbol: initialStackSymbol,
          instantaneousDescription: formatInstantaneousDescription('q0', inputStatement, [initialStackSymbol]),
          sententialForm: grammar.startVariable,
          matchedPrefix: 'ε',
          explanation: `Lexical error: Input statement '${inputStatement}' contains characters not recognized by the grammar terminal alphabet Σ = {${grammar.terminals.join(', ')}}.`,
          mathematicalNotation: `w \\notin \\Sigma^*`,
          isAccepting: false,
          isHalted: true,
          pdaTransitionLabel: 'none',
        },
      ],
      exploredConfigurationsCount: 0,
      explanation: `Input statement contains invalid tokens outside grammar terminals Σ = {${grammar.terminals.join(', ')}}.`,
      targetPDAGraph,
    };
  }

  const validTokens: string[] = tokens;
  const startVar = grammar.startVariable;
  const initialStack = [initialStackSymbol];
  const bootedStack = [initialStackSymbol, startVar];

  const allNodes: CompactSearchNode[] = [];

  const node0: CompactSearchNode = {
    id: 0,
    parentId: null,
    actionType: 'INIT',
    state: 'q0',
    inputIndex: 0,
    stack: initialStack,
    depth: 0,
    consecutiveExpansions: 0,
  };
  allNodes.push(node0);

  const startNode: CompactSearchNode = {
    id: 1,
    parentId: 0,
    actionType: 'INIT',
    state: 'q1',
    inputIndex: 0,
    stack: bootedStack,
    depth: 1,
    consecutiveExpansions: 0,
  };
  allNodes.push(startNode);

  const queue: CompactSearchNode[] = [startNode];
  const visitedKeys = new Set<string>();

  const makeConfigKey = (state: string, inputIndex: number, stack: string[]) =>
    `${state}|${inputIndex}|${stack.join(',')}`;

  visitedKeys.add(makeConfigKey(startNode.state, startNode.inputIndex, startNode.stack));

  let exploredCount = 0;
  let acceptingNode: CompactSearchNode | null = null;
  let acceptedPathsCount = 0;
  let limitReached = false;
  let longestDeadEndNode: CompactSearchNode = startNode;

  // Maximum consecutive variable expansions without consuming a token.
  // Prevents infinite left-recursive loops such as E -> E + E -> E + E + E ...
  const maxConsecutiveExpansions = Math.max(grammar.variables.length * 2 + 1, 5);
  // Maximum stack depth based on input length
  const maxStackDepth = Math.max(validTokens.length * 3 + 4, 16);

  let queueHead = 0;
  while (queueHead < queue.length) {
    if (exploredCount >= maxConfigurations || queue.length >= maxConfigurations) {
      limitReached = true;
      break;
    }

    const curr = queue[queueHead++];
    exploredCount++;

    if (
      curr.inputIndex > longestDeadEndNode.inputIndex ||
      (curr.inputIndex === longestDeadEndNode.inputIndex && curr.depth > longestDeadEndNode.depth)
    ) {
      longestDeadEndNode = curr;
    }

    const top = curr.stack[curr.stack.length - 1];
    const isAtInputEnd = curr.inputIndex === validTokens.length;
    const lookahead = isAtInputEnd ? null : validTokens[curr.inputIndex];

    // 1. Check for Acceptance: Stack has Z0, input exhausted
    if (top === initialStackSymbol && isAtInputEnd) {
      const finalNode: CompactSearchNode = {
        id: allNodes.length,
        parentId: curr.id,
        actionType: 'ACCEPT',
        state: 'q2',
        inputIndex: curr.inputIndex,
        stack: [initialStackSymbol],
        depth: curr.depth + 1,
        consecutiveExpansions: 0,
      };
      allNodes.push(finalNode);

      acceptedPathsCount++;
      if (!acceptingNode) {
        acceptingNode = finalNode;
      }
      continue;
    }

    if (curr.depth >= maxSteps) {
      limitReached = true;
      continue;
    }

    // 2. Variable Expansion: Top of stack is Non-Terminal A in V
    if (grammar.variables.includes(top)) {
      if (curr.consecutiveExpansions >= maxConsecutiveExpansions) {
        // Prune deep left-recursive or non-consuming cycles
        continue;
      }

      const matchingProds = grammar.productions.filter((p) => p.lhs === top);
      if (matchingProds.length === 0) {
        continue;
      }

      for (const prod of matchingProds) {
        const newStack = [...curr.stack];
        newStack.pop(); // Pop non-terminal A

        const isEps =
          prod.rhs.length === 0 ||
          (prod.rhs.length === 1 && prod.rhs[0].type === 'EPSILON');

        const rhsSymbols: string[] = [];
        if (!isEps) {
          for (const sym of prod.rhs) {
            if (sym.type !== 'EPSILON') {
              rhsSymbols.push(sym.value);
            }
          }
        }

        // Push replacement right-to-left so rhsSymbols[0] is at the TOP of the stack
        for (let i = rhsSymbols.length - 1; i >= 0; i--) {
          newStack.push(rhsSymbols[i]);
        }

        if (newStack.length > maxStackDepth) {
          continue;
        }

        const key = makeConfigKey('q1', curr.inputIndex, newStack);
        if (!visitedKeys.has(key)) {
          visitedKeys.add(key);
          const nextNode: CompactSearchNode = {
            id: allNodes.length,
            parentId: curr.id,
            actionType: 'EXPAND_VARIABLE',
            productionUsed: prod,
            state: 'q1',
            inputIndex: curr.inputIndex,
            stack: newStack,
            depth: curr.depth + 1,
            consecutiveExpansions: curr.consecutiveExpansions + 1,
          };
          allNodes.push(nextNode);
          queue.push(nextNode);
        }
      }
      continue;
    }

    // 3. Terminal Matching: Top of stack is Terminal a in Σ
    if (grammar.terminals.includes(top)) {
      if (lookahead === top) {
        // Matched! Consume lookahead token and pop stack
        const newStack = [...curr.stack];
        newStack.pop(); // Pop matched terminal

        const nextInputIdx = curr.inputIndex + 1;
        const key = makeConfigKey('q1', nextInputIdx, newStack);
        if (!visitedKeys.has(key)) {
          visitedKeys.add(key);
          const nextNode: CompactSearchNode = {
            id: allNodes.length,
            parentId: curr.id,
            actionType: 'MATCH_TERMINAL',
            matchedTerminal: top,
            state: 'q1',
            inputIndex: nextInputIdx,
            stack: newStack,
            depth: curr.depth + 1,
            consecutiveExpansions: 0, // Reset expansion count upon input consumption
          };
          allNodes.push(nextNode);
          queue.push(nextNode);
        }
      }
    }
  }

  // Materializes full educational step objects from a chosen compact node path
  function materializePath(targetNode: CompactSearchNode): SyntacticPDAInterpretationStep[] {
    const chain: CompactSearchNode[] = [];
    let p: CompactSearchNode | null = targetNode;
    while (p !== null) {
      chain.unshift(p);
      p = p.parentId !== null ? allNodes[p.parentId] : null;
    }

    const steps: SyntacticPDAInterpretationStep[] = [];

    for (let idx = 0; idx < chain.length; idx++) {
      const node = chain[idx];
      const remainingTokens = validTokens.slice(node.inputIndex);
      const remainingStr = remainingTokens.join(' ') || 'ε';
      const lookahead = node.inputIndex < validTokens.length ? validTokens[node.inputIndex] : null;
      const topSymbol = node.stack[node.stack.length - 1] ?? null;
      const id = formatInstantaneousDescription(node.state, remainingStr, node.stack);
      const { sententialForm, matchedPrefix } = computeSententialForm(
        validTokens.slice(0, node.inputIndex),
        node.stack
      );

      let explanation = '';
      let mathematicalNotation = '';
      let pdaTransitionLabel = 'none';
      let isAccepting = false;
      let isHalted = false;

      if (node.actionType === 'INIT') {
        if (node.state === 'q0') {
          explanation = `Bootstrapping: PDA starts at state q0. Preparing to push grammar start symbol '${startVar}' above stack bottom marker '${initialStackSymbol}'.`;
          mathematicalNotation = `\\delta(q_0, \\varepsilon, ${initialStackSymbol}) = \\{(q_1, ${startVar}${initialStackSymbol})\\}`;
          pdaTransitionLabel = `ε, ${initialStackSymbol} / ${startVar} ${initialStackSymbol}`;
        } else {
          explanation = `Start symbol initialized: Stack now holds '${startVar}'. PDA enters main parsing state q1 expecting to derive the syntactic statement.`;
          mathematicalNotation = `(q_0, w, ${initialStackSymbol}) \\vdash (q_1, w, ${startVar}${initialStackSymbol})`;
          pdaTransitionLabel = `ε, ${initialStackSymbol} / ${startVar} ${initialStackSymbol}`;
        }
      } else if (node.actionType === 'EXPAND_VARIABLE') {
        const prod = node.productionUsed!;
        const isEps =
          prod.rhs.length === 0 ||
          (prod.rhs.length === 1 && prod.rhs[0].type === 'EPSILON');
        const rhsStr = isEps ? 'ε' : prod.rhs.map((s) => s.value).join(' ');
        explanation = isEps
          ? `Epsilon expansion: Popped non-terminal '${prod.lhs}' via production ${prod.lhs} → ε. No symbols pushed.`
          : `Production expansion: Replaced non-terminal '${prod.lhs}' with '${rhsStr}' via production ${prod.lhs} → ${rhsStr}. Next expectation is '${topSymbol}'.`;
        mathematicalNotation = `(q_1, w, ${prod.lhs}\\beta) \\vdash (q_1, w, ${rhsStr.replace(/ /g, '')}\\beta)`;
        pdaTransitionLabel = `ε, ${prod.lhs} / ${rhsStr}`;
      } else if (node.actionType === 'MATCH_TERMINAL') {
        const term = node.matchedTerminal!;
        explanation = `Terminal matched: Expected terminal '${term}' matches input token '${term}'. Consumed from statement and popped from stack.`;
        mathematicalNotation = `(q_1, ${term}w, ${term}\\beta) \\vdash (q_1, w, \\beta)`;
        pdaTransitionLabel = `${term}, ${term} / ε`;
      } else if (node.actionType === 'ACCEPT') {
        explanation = `Syntactic statement accepted: All input tokens consumed and stack cleared to '${initialStackSymbol}'. PDA moves to accepting state q2.`;
        mathematicalNotation = `(q_1, \\varepsilon, ${initialStackSymbol}) \\vdash (q_2, \\varepsilon, ${initialStackSymbol}) \\quad [q_2 \\in F]`;
        pdaTransitionLabel = `ε, ${initialStackSymbol} / ${initialStackSymbol}`;
        isAccepting = true;
        isHalted = true;
      }

      steps.push({
        stepIndex: idx,
        actionType: node.actionType,
        currentState: node.state,
        inputIndex: node.inputIndex,
        remainingInput: remainingStr,
        currentLookahead: lookahead,
        stack: node.stack,
        topSymbol,
        instantaneousDescription: id,
        productionUsed: node.productionUsed,
        matchedTerminal: node.matchedTerminal,
        sententialForm,
        matchedPrefix,
        explanation,
        mathematicalNotation,
        isAccepting,
        isHalted,
        pdaTransitionLabel,
      });
    }

    return steps;
  }

  // Final Results Determination
  if (acceptingNode) {
    const acceptedSteps = materializePath(acceptingNode);
    return {
      status: 'ACCEPT',
      isAccepted: true,
      inputStatement,
      tokens,
      grammar,
      steps: acceptedSteps,
      exploredConfigurationsCount: exploredCount,
      explanation: `Syntactic statement '${inputStatement || 'ε'}' was successfully parsed and validated by the Pushdown Automaton interpreter (${acceptedSteps.length} steps).`,
      targetPDAGraph,
      isAmbiguousDerivation: acceptedPathsCount > 1,
    };
  }

  if (limitReached) {
    const deadEndSteps = materializePath(longestDeadEndNode);
    return {
      status: 'SEARCH_LIMIT_REACHED',
      isAccepted: false,
      inputStatement,
      tokens,
      grammar,
      steps: deadEndSteps,
      exploredConfigurationsCount: exploredCount,
      explanation: `Search limit reached (${exploredCount} configurations explored) without establishing acceptance or rejection within bounds.`,
      targetPDAGraph,
    };
  }

  // Construct rejected step trace from longest explored branch
  const baseSteps = materializePath(longestDeadEndNode);
  const deadEndTop = longestDeadEndNode.stack[longestDeadEndNode.stack.length - 1];
  const deadEndLookahead =
    longestDeadEndNode.inputIndex < validTokens.length ? validTokens[longestDeadEndNode.inputIndex] : 'ε';
  const remainingStr = validTokens.slice(longestDeadEndNode.inputIndex).join(' ') || 'ε';
  const { sententialForm, matchedPrefix } = computeSententialForm(
    validTokens.slice(0, longestDeadEndNode.inputIndex),
    longestDeadEndNode.stack
  );

  let failureReason = `Syntax error: Terminal mismatch. Stack expected '${deadEndTop}', but input provided '${deadEndLookahead}'.`;
  let actionType: SyntacticPDAActionType = 'ERROR_MISMATCH';

  if (longestDeadEndNode.inputIndex === validTokens.length && deadEndTop !== initialStackSymbol) {
    failureReason = `Syntax error: Incomplete syntactic statement. Input exhausted but expected syntactic element '${deadEndTop}' remains unfulfilled on the stack.`;
    actionType = 'ERROR_NO_RULE';
  } else if (deadEndTop === initialStackSymbol && longestDeadEndNode.inputIndex < validTokens.length) {
    failureReason = `Syntax error: Extraneous input tokens remaining '${remainingStr}'. PDA finished parsing before entire input was consumed.`;
    actionType = 'ERROR_MISMATCH';
  }

  const failureStep: SyntacticPDAInterpretationStep = {
    stepIndex: baseSteps.length,
    actionType,
    currentState: longestDeadEndNode.state,
    inputIndex: longestDeadEndNode.inputIndex,
    remainingInput: remainingStr,
    currentLookahead: deadEndLookahead === 'ε' ? null : deadEndLookahead,
    stack: longestDeadEndNode.stack,
    topSymbol: deadEndTop,
    instantaneousDescription: formatInstantaneousDescription(
      longestDeadEndNode.state,
      remainingStr,
      longestDeadEndNode.stack
    ),
    sententialForm,
    matchedPrefix,
    explanation: failureReason,
    mathematicalNotation: `(q_1, ${remainingStr}, ${deadEndTop}\\dots) \\not\\vdash`,
    isAccepting: false,
    isHalted: true,
    pdaTransitionLabel: 'none',
  };

  return {
    status: 'REJECT',
    isAccepted: false,
    inputStatement,
    tokens: validTokens,
    grammar,
    steps: [...baseSteps, failureStep],
    exploredConfigurationsCount: exploredCount,
    explanation: failureReason,
    targetPDAGraph,
  };
}
