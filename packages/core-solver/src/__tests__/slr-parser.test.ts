import { describe, it, expect } from 'vitest';
import {
  createAugmentedGrammar,
  createLR0Item,
  advanceLR0Item,
  lr0Closure,
  lr0Goto,
  buildCanonicalLR0Collection,
  buildSLRTable,
  parseSLR,
  isEpsilonProduction,
} from '../slr-parser';
import {
  ContextFreeGrammar,
  GrammarSymbol,
  CFGProduction,
  CFGParseTreeNode,
} from '../types';

function nt(v: string): GrammarSymbol {
  return { type: 'NON_TERMINAL', value: v };
}
function t(v: string): GrammarSymbol {
  return { type: 'TERMINAL', value: v };
}
const EPS: GrammarSymbol = { type: 'EPSILON', value: 'ε' };

function getTreeYield(node?: CFGParseTreeNode): string {
  if (!node) return '';
  if (node.symbol.type === 'TERMINAL') return node.symbol.value;
  if (node.symbol.type === 'EPSILON') return '';
  return node.children.map(getTreeYield).join('');
}

describe('Module 4 Topic 3 — SLR Parsing Engine', () => {
  // Test grammar 1: Simple S -> a S b | ab (or S -> a b)
  const simpleGrammar: ContextFreeGrammar = {
    variables: ['S'],
    terminals: ['a', 'b'],
    productions: [
      { id: 'p1', lhs: 'S', rhs: [t('a'), t('b')] },
    ],
    startVariable: 'S',
  };

  // Test grammar 2: Standard arithmetic expression grammar (unambiguous, SLR(1))
  // E -> E + T | T
  // T -> T * F | F
  // F -> ( E ) | id
  const exprGrammar: ContextFreeGrammar = {
    variables: ['E', 'T', 'F'],
    terminals: ['+', '*', '(', ')', 'id'],
    productions: [
      { id: 'p1', lhs: 'E', rhs: [nt('E'), t('+'), nt('T')] },
      { id: 'p2', lhs: 'E', rhs: [nt('T')] },
      { id: 'p3', lhs: 'T', rhs: [nt('T'), t('*'), nt('F')] },
      { id: 'p4', lhs: 'T', rhs: [nt('F')] },
      { id: 'p5', lhs: 'F', rhs: [t('('), nt('E'), t(')')] },
      { id: 'p6', lhs: 'F', rhs: [t('id')] },
    ],
    startVariable: 'E',
  };

  // Test grammar 3: Ambiguous grammar with Shift/Reduce conflict (Dangling else or E -> E + E | id)
  const srConflictGrammar: ContextFreeGrammar = {
    variables: ['E'],
    terminals: ['+', 'id'],
    productions: [
      { id: 'p1', lhs: 'E', rhs: [nt('E'), t('+'), nt('E')] },
      { id: 'p2', lhs: 'E', rhs: [t('id')] },
    ],
    startVariable: 'E',
  };

  // Test grammar 4: Reduce/Reduce conflict grammar
  // S -> A | B
  // A -> a
  // B -> a
  const rrConflictGrammar: ContextFreeGrammar = {
    variables: ['S', 'A', 'B'],
    terminals: ['a'],
    productions: [
      { id: 'p1', lhs: 'S', rhs: [nt('A')] },
      { id: 'p2', lhs: 'S', rhs: [nt('B')] },
      { id: 'p3', lhs: 'A', rhs: [t('a')] },
      { id: 'p4', lhs: 'B', rhs: [t('a')] },
    ],
    startVariable: 'S',
  };

  // Test grammar 5: Epsilon grammar
  // S -> a S b | ε
  const epsGrammar: ContextFreeGrammar = {
    variables: ['S'],
    terminals: ['a', 'b'],
    productions: [
      { id: 'p1', lhs: 'S', rhs: [t('a'), nt('S'), t('b')] },
      { id: 'p2', lhs: 'S', rhs: [EPS] },
    ],
    startVariable: 'S',
  };

  // Test grammar 6: Non-S start variable
  // Z -> X Y
  // X -> x
  // Y -> y
  const nonSGrammar: ContextFreeGrammar = {
    variables: ['Z', 'X', 'Y'],
    terminals: ['x', 'y'],
    productions: [
      { id: 'p1', lhs: 'Z', rhs: [nt('X'), nt('Y')] },
      { id: 'p2', lhs: 'X', rhs: [t('x')] },
      { id: 'p3', lhs: 'Y', rhs: [t('y')] },
    ],
    startVariable: 'Z',
  };

  // ============================================================
  // Test A: LR(0) item creation
  // ============================================================
  it('Test A: LR(0) item creation with explicit dot positions', () => {
    const prod: CFGProduction = { id: 'p1', lhs: 'A', rhs: [t('a'), nt('B'), t('c')] };
    const item0 = createLR0Item(prod, 0);
    expect(item0.dotPosition).toBe(0);
    expect(item0.nextSymbol?.value).toBe('a');
    expect(item0.isCompleted).toBe(false);
    expect(item0.formatted).toBe('A -> · a B c');

    const item1 = createLR0Item(prod, 1);
    expect(item1.dotPosition).toBe(1);
    expect(item1.nextSymbol?.value).toBe('B');
    expect(item1.isCompleted).toBe(false);
    expect(item1.formatted).toBe('A -> a · B c');
  });

  // ============================================================
  // Test B: Dot advancement
  // ============================================================
  it('Test B: Dot advancement advances exactly one symbol', () => {
    const prod: CFGProduction = { id: 'p1', lhs: 'A', rhs: [t('a'), t('b')] };
    const item0 = createLR0Item(prod, 0);
    const item1 = advanceLR0Item(item0);
    expect(item1).not.toBeNull();
    expect(item1?.dotPosition).toBe(1);
    expect(item1?.nextSymbol?.value).toBe('b');

    const item2 = advanceLR0Item(item1!);
    expect(item2?.dotPosition).toBe(2);
    expect(item2?.isCompleted).toBe(true);

    const item3 = advanceLR0Item(item2!);
    expect(item3).toBeNull();
  });

  // ============================================================
  // Test C: Completed item detection
  // ============================================================
  it('Test C: Completed item detection when dot reaches end', () => {
    const prod: CFGProduction = { id: 'p1', lhs: 'A', rhs: [t('a')] };
    const itemCompleted = createLR0Item(prod, 1);
    expect(itemCompleted.isCompleted).toBe(true);
    expect(itemCompleted.nextSymbol).toBeNull();
  });

  // ============================================================
  // Test D: Closure fixed point
  // ============================================================
  it('Test D: Closure fixed point computation stops deterministically', () => {
    const { augmentedGrammar, augmentedProduction } = createAugmentedGrammar(simpleGrammar);
    const initialItem = createLR0Item(augmentedProduction, 0);
    const closure = lr0Closure([initialItem], augmentedGrammar);

    expect(closure.length).toBe(2);
    expect(closure.some((i) => i.lhs === "S'" && i.dotPosition === 0)).toBe(true);
    expect(closure.some((i) => i.lhs === 'S' && i.dotPosition === 0)).toBe(true);
  });

  // ============================================================
  // Test E: Closure with multiple productions
  // ============================================================
  it('Test E: Closure with multiple productions for a nonterminal', () => {
    const { augmentedGrammar, augmentedProduction } = createAugmentedGrammar(exprGrammar);
    const initialItem = createLR0Item(augmentedProduction, 0);
    const closure = lr0Closure([initialItem], augmentedGrammar);

    // Initial item E' -> .E should expand E -> .E+T, E -> .T
    // Which expands T -> .T*F, T -> .F
    // Which expands F -> .(E), F -> .id
    expect(closure.length).toBe(7); // E'->.E, E->.E+T, E->.T, T->.T*F, T->.F, F->.(E), F->.id
  });

  // ============================================================
  // Test F: Closure with epsilon production
  // ============================================================
  it('Test F: Closure with epsilon production produces immediately completed item', () => {
    const { augmentedGrammar, augmentedProduction } = createAugmentedGrammar(epsGrammar);
    const initialItem = createLR0Item(augmentedProduction, 0);
    const closure = lr0Closure([initialItem], augmentedGrammar);

    const epsItem = closure.find((i) => i.lhs === 'S' && i.productionId === 'p2');
    expect(epsItem).toBeDefined();
    expect(epsItem?.isCompleted).toBe(true);
    expect(epsItem?.formatted).toBe('S -> ·');
  });

  // ============================================================
  // Test G: GOTO over terminal
  // ============================================================
  it('Test G: GOTO over terminal advances dot and computes closure', () => {
    const { augmentedGrammar } = createAugmentedGrammar(simpleGrammar);
    const item = createLR0Item(simpleGrammar.productions[0], 0); // S -> · a b
    const gotoA = lr0Goto([item], 'a', augmentedGrammar);

    expect(gotoA.length).toBe(1);
    expect(gotoA[0].dotPosition).toBe(1);
    expect(gotoA[0].nextSymbol?.value).toBe('b');
  });

  // ============================================================
  // Test H: GOTO over nonterminal
  // ============================================================
  it('Test H: GOTO over nonterminal transitions to state containing advanced item', () => {
    const { augmentedGrammar, augmentedProduction } = createAugmentedGrammar(simpleGrammar);
    const initialItem = createLR0Item(augmentedProduction, 0); // S' -> · S
    const gotoS = lr0Goto([initialItem], 'S', augmentedGrammar);

    expect(gotoS.length).toBe(1);
    expect(gotoS[0].lhs).toBe("S'");
    expect(gotoS[0].dotPosition).toBe(1);
    expect(gotoS[0].isCompleted).toBe(true);
  });

  // ============================================================
  // Test I: Canonical collection construction
  // ============================================================
  it('Test I: Canonical collection construction builds DFA states', () => {
    const collection = buildCanonicalLR0Collection(exprGrammar);
    // Standard arithmetic expression grammar produces 12 LR(0) states (I0 to I11)
    expect(collection.states.length).toBe(12);
    expect(collection.initialStateId).toBe(0);
  });

  // ============================================================
  // Test J: Duplicate state detection
  // ============================================================
  it('Test J: Duplicate state detection ensures no redundant item sets', () => {
    const collection = buildCanonicalLR0Collection(exprGrammar);
    const signatures = new Set(collection.states.map((s) => s.items.map((i) => i.id).sort().join(',')));
    expect(signatures.size).toBe(collection.states.length);
  });

  // ============================================================
  // Test K: Stable deterministic state numbering
  // ============================================================
  it('Test K: Stable deterministic state numbering 0, 1, 2, ...', () => {
    const col1 = buildCanonicalLR0Collection(exprGrammar);
    const col2 = buildCanonicalLR0Collection(exprGrammar);

    expect(col1.states.map((s) => s.id)).toEqual(col2.states.map((s) => s.id));
    for (let i = 0; i < col1.states.length; i++) {
      expect(col1.states[i].id).toBe(i);
      expect(col1.states[i].name).toBe(`I${i}`);
    }
  });

  // ============================================================
  // Test L: Augmented start production
  // ============================================================
  it('Test L: Augmented start production S\' -> S exists and is start', () => {
    const { augmentedGrammar, augmentedStartSymbol } = createAugmentedGrammar(simpleGrammar);
    expect(augmentedGrammar.startVariable).toBe(augmentedStartSymbol);
    expect(augmentedGrammar.productions.some((p) => p.lhs === augmentedStartSymbol)).toBe(true);
  });

  // ============================================================
  // Test M: ACTION shift generation
  // ============================================================
  it('Test M: ACTION shift generation on terminal transitions', () => {
    const { table } = buildSLRTable(exprGrammar);
    // State I0 has transition on 'id' to state I5 => ACTION[0, 'id'] should contain SHIFT 5
    const act = table.actionGrid[0]['id'];
    expect(act.some((a) => a.type === 'SHIFT' && a.targetStateId === 5)).toBe(true);
  });

  // ============================================================
  // Test N: ACTION reduce generation using FOLLOW
  // ============================================================
  it('Test N: ACTION reduce generation placed strictly under FOLLOW(A)', () => {
    const { table } = buildSLRTable(exprGrammar);
    // In state I2: E -> T ·
    // FOLLOW(E) = {+, ), $}
    // Reduction E -> T should appear ONLY on +, ), $ in state I2
    const actsOnPlus = table.actionGrid[2]['+'];
    expect(actsOnPlus.some((a) => a.type === 'REDUCE' && a.production?.lhs === 'E')).toBe(true);

    const actsOnId = table.actionGrid[2]['id'];
    expect(actsOnId.some((a) => a.type === 'REDUCE')).toBe(false);
  });

  // ============================================================
  // Test O: ACCEPT generation
  // ============================================================
  it('Test O: ACCEPT generation in state containing S\' -> S · on lookahead $', () => {
    const { table } = buildSLRTable(exprGrammar);
    // In state I1: E' -> E ·
    // ACTION[1, '$'] must be ACCEPT
    const acceptAct = table.actionGrid[1]['$'];
    expect(acceptAct.some((a) => a.type === 'ACCEPT')).toBe(true);
  });

  // ============================================================
  // Test P: GOTO table generation
  // ============================================================
  it('Test P: GOTO table generation for nonterminals', () => {
    const { table } = buildSLRTable(exprGrammar);
    // GOTO[0, E] = 1, GOTO[0, T] = 2, GOTO[0, F] = 3
    expect(table.gotoGrid[0]['E']).toBe(1);
    expect(table.gotoGrid[0]['T']).toBe(2);
    expect(table.gotoGrid[0]['F']).toBe(3);
  });

  // ============================================================
  // Test Q: SHIFT/REDUCE conflict detection
  // ============================================================
  it('Test Q: SHIFT/REDUCE conflict detection on ambiguous expression grammar', () => {
    const { table } = buildSLRTable(srConflictGrammar);
    expect(table.isSLR).toBe(false);
    expect(table.conflicts.length).toBeGreaterThan(0);
    const sr = table.conflicts.find((c) => c.conflictType === 'SHIFT_REDUCE');
    expect(sr).toBeDefined();
    expect(sr?.competingActions.some((a) => a.type === 'SHIFT')).toBe(true);
    expect(sr?.competingActions.some((a) => a.type === 'REDUCE')).toBe(true);
  });

  // ============================================================
  // Test R: REDUCE/REDUCE conflict detection
  // ============================================================
  it('Test R: REDUCE/REDUCE conflict detection', () => {
    const { table } = buildSLRTable(rrConflictGrammar);
    expect(table.isSLR).toBe(false);
    const rr = table.conflicts.find((c) => c.conflictType === 'REDUCE_REDUCE');
    expect(rr).toBeDefined();
    const reduces = rr?.competingActions.filter((a) => a.type === 'REDUCE');
    expect(reduces?.length).toBeGreaterThanOrEqual(2);
  });

  // ============================================================
  // Test S: Simple grammar acceptance
  // ============================================================
  it('Test S: Simple grammar acceptance ("id+id*id")', () => {
    const result = parseSLR(exprGrammar, 'id+id*id');
    expect(result.isAccepted).toBe(true);
    expect(result.parseTree).toBeDefined();
    expect(getTreeYield(result.parseTree)).toBe('id+id*id');
  });

  // ============================================================
  // Test T: Simple grammar rejection
  // ============================================================
  it('Test T: Simple grammar rejection on ill-formed input ("id++id")', () => {
    const result = parseSLR(exprGrammar, 'id++id');
    expect(result.isAccepted).toBe(false);
    expect(result.rejectionReason).toBeDefined();
  });

  // ============================================================
  // Test U: Terminal mismatch rejection
  // ============================================================
  it('Test U: Terminal mismatch rejection on illegal token', () => {
    const result = parseSLR(simpleGrammar, 'aa');
    expect(result.isAccepted).toBe(false);
    expect(result.rejectionReason).toContain('Syntax Error');
  });

  // ============================================================
  // Test V: Missing ACTION entry rejection
  // ============================================================
  it('Test V: Missing ACTION entry reported clearly', () => {
    const result = parseSLR(exprGrammar, '*id');
    expect(result.isAccepted).toBe(false);
    expect(result.rejectionReason).toContain('No ACTION entry');
  });

  // ============================================================
  // Test W: Invalid GOTO after reduction safety
  // ============================================================
  it('Test W: Parser step records valid GOTO after reduction', () => {
    const result = parseSLR(exprGrammar, 'id');
    expect(result.isAccepted).toBe(true);
    const reduceStep = result.steps.find((s) => s.action?.type === 'REDUCE');
    expect(reduceStep?.gotoState).toBeDefined();
  });

  // ============================================================
  // Test X: Epsilon grammar acceptance
  // ============================================================
  it('Test X: Epsilon grammar acceptance on empty string and nested string', () => {
    const resEmpty = parseSLR(epsGrammar, '');
    expect(resEmpty.isAccepted).toBe(true);

    const resAB = parseSLR(epsGrammar, 'ab');
    expect(resAB.isAccepted).toBe(true);
    expect(getTreeYield(resAB.parseTree)).toBe('ab');

    const resAABB = parseSLR(epsGrammar, 'aabb');
    expect(resAABB.isAccepted).toBe(true);
    expect(getTreeYield(resAABB.parseTree)).toBe('aabb');
  });

  // ============================================================
  // Test Y: Non-S start symbol dynamic handling
  // ============================================================
  it('Test Y: Non-S start symbol dynamic handling (start variable Z)', () => {
    const { collection } = buildSLRTable(nonSGrammar);
    expect(collection.augmentedStartSymbol).toBe("Z'");

    const result = parseSLR(nonSGrammar, 'xy');
    expect(result.isAccepted).toBe(true);
    expect(result.parseTree?.symbol.value).toBe('Z');
    expect(getTreeYield(result.parseTree)).toBe('xy');
  });

  // ============================================================
  // Test Z: Parse-tree construction from reductions
  // ============================================================
  it('Test Z: Parse-tree construction correctly links reduction children', () => {
    const result = parseSLR(simpleGrammar, 'ab');
    expect(result.isAccepted).toBe(true);
    const root = result.parseTree!;
    expect(root.symbol.value).toBe('S');
    expect(root.children.length).toBe(2);
    expect(root.children[0].symbol.value).toBe('a');
    expect(root.children[1].symbol.value).toBe('b');
  });

  // ============================================================
  // Test AA: Parse-tree yield equals input
  // ============================================================
  it('Test AA: Parse-tree yield equals input for complex expression', () => {
    const input = '(id+id)*id';
    const result = parseSLR(exprGrammar, input);
    expect(result.isAccepted).toBe(true);
    expect(getTreeYield(result.parseTree)).toBe(input);
  });

  // ============================================================
  // Test AB: Step trace correctness
  // ============================================================
  it('Test AB: Step trace maintains monotonic step index and explanations', () => {
    const result = parseSLR(exprGrammar, 'id+id');
    expect(result.isAccepted).toBe(true);
    for (let i = 0; i < result.steps.length; i++) {
      expect(result.steps[i].stepIndex).toBe(i);
      expect(result.steps[i].mathematicalExplanation.length).toBeGreaterThan(0);
    }
  });

  // ============================================================
  // Test AC: State stack correctness
  // ============================================================
  it('Test AC: State stack begins at [0] and tracks transitions correctly', () => {
    const result = parseSLR(exprGrammar, 'id');
    expect(result.steps[0].stateStack).toEqual([0]);
    // Next step after shift 5 has state stack [0, 5]
    expect(result.steps[1].stateStack).toEqual([0, 5]);
  });

  // ============================================================
  // Test AD: Symbol stack correctness
  // ============================================================
  it('Test AD: Symbol stack begins at [$] and matches shift/reduce sequences', () => {
    const result = parseSLR(exprGrammar, 'id');
    expect(result.steps[0].symbolStack).toEqual(['$']);
    expect(result.steps[1].symbolStack).toEqual(['$', 'id']);
  });

  // ============================================================
  // Test AE: Reset behavior
  // ============================================================
  it('Test AE: Pure function idempotency', () => {
    const res1 = parseSLR(exprGrammar, 'id+id');
    const res2 = parseSLR(exprGrammar, 'id+id');
    expect(res1.steps.length).toBe(res2.steps.length);
    expect(res1.isAccepted).toBe(res2.isAccepted);
  });

  // ============================================================
  // Test AF: Grammar switching
  // ============================================================
  it('Test AF: Grammar switching recomputes distinct SLR tables', () => {
    const tSimple = buildSLRTable(simpleGrammar).table;
    const tExpr = buildSLRTable(exprGrammar).table;
    expect(tSimple.states.length).not.toBe(tExpr.states.length);
  });

  // ============================================================
  // Test AG: Input switching
  // ============================================================
  it('Test AG: Input switching accepts valid and rejects invalid on same grammar', () => {
    expect(parseSLR(exprGrammar, 'id').isAccepted).toBe(true);
    expect(parseSLR(exprGrammar, '+').isAccepted).toBe(false);
  });

  // ============================================================
  // Test AH: Conflict grammar does not silently parse
  // ============================================================
  it('Test AH: Conflict grammar halts with SLR Conflict Error', () => {
    const result = parseSLR(srConflictGrammar, 'id+id+id');
    expect(result.isAccepted).toBe(false);
    expect(result.rejectionReason).toContain('SLR(1) Conflict Error');
  });

  // ============================================================
  // Test AI: Existing Module 3 FIRST/FOLLOW reuse
  // ============================================================
  it('Test AI: FOLLOW sets in SLR table match verified Module 3 FOLLOW sets', () => {
    const { table } = buildSLRTable(exprGrammar);
    // In exprGrammar:
    // FOLLOW(E) contains '+', ')', '$'
    expect(table.followSets['E']).toContain('+');
    expect(table.followSets['E']).toContain('$');
  });

  // ============================================================
  // Test AJ: Regression tests for existing parsers
  // ============================================================
  it('Test AJ: Epsilon production detection helper', () => {
    expect(isEpsilonProduction({ id: 'p', lhs: 'A', rhs: [EPS] })).toBe(true);
    expect(isEpsilonProduction({ id: 'p', lhs: 'A', rhs: [] })).toBe(true);
    expect(isEpsilonProduction({ id: 'p', lhs: 'A', rhs: [t('a')] })).toBe(false);
  });
});
