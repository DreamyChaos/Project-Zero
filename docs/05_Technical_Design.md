# Technical Design Specification

## Project Zero: AI-Powered Interactive Learning Platform for Models of Computation

**Document**: `05_Technical_Design.md`  
**Version**: 1.0.0  
**Status**: APPROVED FOR IMPLEMENTATION  

---

## Document Overview & Implementation Mandate

This Technical Design Specification provides the exact data models, interface signatures, class structures, core services, deterministic algorithm pseudocode, internal APIs, synchronization locks, caching layers, and testing strategies for **Project Zero Version 1.0**.

Implementation agents must adhere strictly to these specifications without altering function signatures or data structures.

---

## 1. Domain Models & Mathematical Data Structures

### 1.1 Core Mathematical 5-Tuple Model ($M = (Q, \Sigma, \delta, q_0, F)$)

```typescript
export type StateId = string;
export type SymbolChar = string; // Character or 'ε'

export interface IStateNode {
  id: StateId;
  label: string;
  isInitial: boolean;
  isAccepting: boolean;
  position: { x: number; y: number };
  metadata?: Record<string, unknown>;
}

export interface ITransitionEdge {
  id: string;
  fromState: StateId;
  toState: StateId;
  symbols: SymbolChar[]; // Array of symbols, e.g. ['a', 'b'] or ['ε']
  curveOffset?: number;  // For bidirectional or self-loop curved rendering
}

export interface IAutomataModel {
  id: string;
  type: 'DFA' | 'NFA' | 'EPSILON_NFA';
  states: Map<StateId, IStateNode>;
  alphabet: Set<SymbolChar>;
  transitions: Map<string, ITransitionEdge>; // Keyed by edge ID
  initialStateId: StateId | null;
  acceptingStateIds: Set<StateId>;
  version: number;
}
```

### 1.2 Simulation Trace & Step Models

```typescript
export interface IStepConfiguration {
  activeStateIds: StateId[];      // Single state for DFA, set for NFA
  readHeadIndex: number;
  remainingString: string;
}

export interface ITransitionRuleApplied {
  edgeId: string;
  fromState: StateId;
  symbol: SymbolChar;
  toState: StateId;
}

export interface ISimulationStep {
  stepIndex: number;
  configuration: IStepConfiguration;
  consumedSymbol: SymbolChar | null;
  rulesApplied: ITransitionRuleApplied[];
  selectionRationale: string;
  continuationStatus: 'CONTINUE' | 'HALT_ACCEPT' | 'HALT_REJECT' | 'DEADLOCK';
}

export interface ISimulationTrace {
  modelId: string;
  inputString: string;
  steps: ISimulationStep[];
  isAccepted: boolean;
  totalSteps: number;
  executionTimeMs: number;
}
```

---

## 2. TypeScript Interfaces & Contracts

### 2.1 Engine Service Contracts

```typescript
export interface ISolverService {
  computeEpsilonClosure(model: IAutomataModel, stateIds: StateId[]): Set<StateId>;
  convertNfaToDfa(nfaModel: IAutomataModel): { dfaModel: IAutomataModel; intermediateSteps: unknown[] };
  minimizeDfa(dfaModel: IAutomataModel): { minDfaModel: IAutomataModel; partitions: StateId[][][] };
  convertRegexToNfa(regexStr: string): { nfaModel: IAutomataModel; ast: IRegexASTNode };
  convertDfaToRegex(dfaModel: IAutomataModel): { regexStr: string; eliminationSteps: unknown[] };
}

export interface ISimulationEngine {
  initializeSimulation(model: IAutomataModel, inputString: string): ISimulationTrace;
  stepForward(): ISimulationStep;
  stepBackward(): ISimulationStep;
  reset(): ISimulationStep;
  getTrace(): ISimulationTrace;
}

export interface IValidationEngine {
  validateModel(model: IAutomataModel): IValidationError[];
}

export interface ISyncEngine {
  registerView(viewId: string, updateCallback: (model: IAutomataModel) => void): void;
  dispatchMutation(sourceViewId: string, mutation: (model: IAutomataModel) => void): void;
}
```

---

## 3. Core Services & Class Hierarchy Architecture

```
+-----------------------------------------------------------------------------------+
|                              PLATFORM KERNEL CONTAINER                            |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                           AutomataModelStore (Singleton)                    |  |
|  | - Single Source of Truth for IAutomataModel                                 |  |
|  | - Maintains Transaction History (Undo / Redo Stack)                        |  |
|  +-------------------------------------+---------------------------------------+  |
|                                        |                                          |
|            +---------------------------+---------------------------+              |
|            |                           |                           |              |
|            v                           v                           v              |
|  +-------------------+   +-------------------+   +-------------------+            |
|  | SyncEngineService |   | SimulationService |   | ValidationService |            |
|  | (4-Way Router)    |   | (Playback Engine) |   | (Static Linter)   |            |
|  +---------+---------+   +---------+---------+   +---------+---------+            |
|            |                       |                       |                      |
|            +-----------------------+-----------------------+                      |
|                                    |                                              |
|                                    v                                              |
|  +-----------------------------------------------------------------------------+  |
|  |                    MathematicalSolverService (Web Worker Pool)              |  |
|  | - Runs @project-zero/core-solver WASM/TS Binaries                            |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 4. Deterministic Algorithm Specifications & Pseudocode

### 4.1 Subset Construction Algorithm ($\text{NFA} \to \text{DFA}$)

```typescript
/**
 * Pseudocode Specification for NFA to DFA Subset Construction
 */
function convertNfaToDfa(nfa: IAutomataModel): IAutomataModel {
  const dfa = createEmptyDfa(nfa.alphabet);
  const subsetMap = new Map<string, Set<StateId>>(); // Hash(Subset) -> Subset Set
  const queue: Set<StateId>[] = [];

  // 1. Initial State: ε-closure of NFA initial state
  const startClosure = computeEpsilonClosure(nfa, [nfa.initialStateId!]);
  const startHash = hashStateSet(startClosure);
  
  const dfaStartStateId = dfa.addState(startHash, true, containsAccepting(nfa, startClosure));
  subsetMap.set(startHash, startClosure);
  queue.push(startClosure);

  // 2. Process Subset Queue
  while (queue.length > 0) {
    const currentSubset = queue.shift()!;
    const currentDfaId = hashStateSet(currentSubset);

    for (const symbol of nfa.alphabet) {
      if (symbol === 'ε') continue;

      // Move(currentSubset, symbol)
      const moveSet = new Set<StateId>();
      for (const s of currentSubset) {
        const nextStates = getTransitionsFrom(nfa, s, symbol);
        nextStates.forEach(ns => moveSet.add(ns));
      }

      // ε-closure(MoveSet)
      const nextClosure = computeEpsilonClosure(nfa, Array.from(moveSet));
      if (nextClosure.size === 0) continue; // Unreachable / Trap transition

      const nextHash = hashStateSet(nextClosure);
      if (!subsetMap.has(nextHash)) {
        subsetMap.set(nextHash, nextClosure);
        dfa.addState(nextHash, false, containsAccepting(nfa, nextClosure));
        queue.push(nextClosure);
      }

      dfa.addTransition(currentDfaId, dfaHashToId(nextHash), symbol);
    }
  }

  return dfa;
}
```

### 4.2 Hopcroft's DFA Minimization Algorithm

```typescript
/**
 * Pseudocode Specification for Hopcroft's DFA Minimization O(k * n log n)
 */
function minimizeDfa(dfa: IAutomataModel): IAutomataModel {
  // P = { F, Q \ F }
  let partitions: Set<StateId>[] = [
    new Set(dfa.acceptingStateIds),
    new Set(Array.from(dfa.states.keys()).filter(id => !dfa.acceptingStateIds.has(id)))
  ].filter(p => p.size > 0);

  const worklist: Set<StateId>[] = [...partitions];

  while (worklist.length > 0) {
    const A = worklist.pop()!;

    for (const c of dfa.alphabet) {
      // X = set of states for which a transition on 'c' leads to a state in A
      const X = getStatesLeadingToSetOnSymbol(dfa, A, c);

      for (let i = 0; i < partitions.length; i++) {
        const Y = partitions[i];
        const intersection = setIntersection(Y, X);
        const difference = setDifference(Y, X);

        if (intersection.size > 0 && difference.size > 0) {
          partitions[i] = intersection;
          partitions.push(difference);

          const wIndex = worklist.findIndex(w => isSetEqual(w, Y));
          if (wIndex !== -1) {
            worklist[wIndex] = intersection;
            worklist.push(difference);
          } else {
            if (intersection.size <= difference.size) {
              worklist.push(intersection);
            } else {
              worklist.push(difference);
            }
          }
        }
      }
    }
  }

  return constructMinimisedDfaFromPartitions(dfa, partitions);
}
```

---

## 5. Internal APIs & Event Bus Message Schema

### 5.1 Event Bus Topic Definitions

```typescript
export type EventTopic = 
  | 'MODEL_MUTATED'
  | 'SIMULATION_STEP_CHANGED'
  | 'VALIDATION_COMPLETED'
  | 'AI_HINT_REQUESTED'
  | 'UI_VIEW_MODE_CHANGED';

export interface IBaseEventPayload {
  eventId: string; // UUID v4
  timestamp: number;
  sourceViewId: string;
}

export interface IModelMutatedEventPayload extends IBaseEventPayload {
  modelId: string;
  transactionId: string;
  diff: {
    addedNodes: IStateNode[];
    removedNodeIds: StateId[];
    addedEdges: ITransitionEdge[];
    removedEdgeIds: string[];
  };
}
```

---

## 6. 4-Way Synchronization & Transaction Engine

### 6.1 Lock-Free Re-Entrancy Prevention Algorithm

To prevent recursive update deadlocks when synchronizing 4 active views:

```typescript
export class SyncEngineService implements ISyncEngine {
  private isSyncing = false;
  private activeTransactionId: string | null = null;
  private views = new Map<string, (model: IAutomataModel) => void>();

  public dispatchMutation(sourceViewId: string, mutation: (model: IAutomataModel) => void): void {
    if (this.isSyncing) {
      // Reject re-entrant mutations during an active sync frame
      console.warn(`[SyncEngine] Blocked re-entrant mutation from view: ${sourceViewId}`);
      return;
    }

    try {
      this.isSyncing = true;
      this.activeTransactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

      // 1. Mutate Single Source of Truth Store
      const updatedModel = AutomataModelStore.getInstance().applyMutation(mutation);

      // 2. Broadcast to all OTHER registered views synchronously
      this.views.forEach((updateCallback, viewId) => {
        if (viewId !== sourceViewId) {
          updateCallback(updatedModel);
        }
      });
    } finally {
      this.isSyncing = false;
      this.activeTransactionId = null;
    }
  }
}
```

---

## 7. Caching Strategy & Memory Management

### 7.1 LRU Solver Cache Specification

```typescript
export class SolverTraceCache {
  private cache = new Map<string, ISimulationTrace>();
  private readonly maxCapacity = 50;

  private generateKey(model: IAutomataModel, inputString: string): string {
    return `${model.id}_v${model.version}_${inputString}`;
  }

  public get(model: IAutomataModel, inputString: string): ISimulationTrace | undefined {
    const key = this.generateKey(model, inputString);
    const trace = this.cache.get(key);
    if (trace) {
      // LRU refresh position
      this.cache.delete(key);
      this.cache.set(key, trace);
    }
    return trace;
  }

  public set(model: IAutomataModel, inputString: string, trace: ISimulationTrace): void {
    const key = this.generateKey(model, inputString);
    if (this.cache.size >= this.maxCapacity) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, trace);
  }
}
```

---

## 8. Performance Optimization Architecture

### 8.1 Web Worker Execution Manager (`WorkerPoolManager`)

```typescript
export class WorkerPoolManager {
  private workers: Worker[] = [];
  private idleWorkerQueue: Worker[] = [];
  private poolSize = Math.max(2, navigator.hardwareConcurrency - 1);

  constructor() {
    for (let i = 0; i < this.poolSize; i++) {
      const worker = new Worker(new URL('./math-solver.worker.ts', import.meta.url));
      this.workers.push(worker);
      this.idleWorkerQueue.push(worker);
    }
  }

  public async executeTask<T>(taskType: string, payload: unknown): Promise<T> {
    const worker = await this.getIdleWorker();
    return new Promise((resolve, reject) => {
      const taskId = `task_${Date.now()}_${Math.random()}`;
      
      const messageHandler = (e: MessageEvent) => {
        if (e.data.taskId === taskId) {
          worker.removeEventListener('message', messageHandler);
          this.idleWorkerQueue.push(worker);
          if (e.data.error) reject(new Error(e.data.error));
          else resolve(e.data.result as T);
        }
      };

      worker.addEventListener('message', messageHandler);
      worker.postMessage({ taskId, taskType, payload });
    });
  }

  private async getIdleWorker(): Promise<Worker> {
    while (this.idleWorkerQueue.length === 0) {
      await new Promise(r => setTimeout(r, 10));
    }
    return this.idleWorkerQueue.pop()!;
  }
}
```

---

## 9. Testing Strategy

### 9.1 Test Suite Taxonomy

```
                            +-------------------------------+
                            |   PROJECT ZERO TEST TAXONOMY  |
                            +---------------+---------------+
                                            |
         +----------------------------------+----------------------------------+
         |                                  |                                  |
         v                                  v                                  v
+------------------+               +------------------+               +------------------+
|   UNIT TESTS     |               | INTEGRATION TESTS|               |    E2E TESTS     |
| (Vitest / WASM)  |               | (React Library)  |               |  (Playwright)    |
| - Pure Solvers   |               | - 4-Way Sync     |               | - Visual Builder |
| - Static Linter  |               | - Model Store    |               | - Full Workflows |
| - Regex AST      |               | - Canvas Render  |               | - ARIA Audits    |
+------------------+               +------------------+               +------------------+
```

### 9.2 Mathematical Accuracy Benchmark Targets
- **Coverage Requirement**: 100% unit test line coverage for `@project-zero/core-solver`.
- **Textbook Test Suite**: Standard test cases compiled from Sipser (Chapters 1 & 2) and Hopcroft-Ullman (Chapters 2, 3 & 4), containing 250 canonical automata machines.
- **Accessibility Auditing**: Automated continuous integration runs via `@axe-core/playwright` enforcing zero WCAG 2.1 AA violations on visual builder and simulation views.

---
