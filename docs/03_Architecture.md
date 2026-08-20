# System Architecture Specification

## Project Zero: AI-Powered Interactive Learning Platform for Models of Computation

**Document**: `03_Architecture.md`  
**Version**: 1.0.0  
**Status**: APPROVED FOR DESIGN  

---

## Executive Architectural Summary

Project Zero is an educational laboratory designed around an **Offline-First, Deterministic Math Engine Architecture** paired with a **Reactive 4-Way Synchronized Presentation Layer** and an **AI Pedagogical Gateway**.

The platform decouples formal mathematical computation (pure deterministic algorithms running in TypeScript/WASM) from visual canvas rendering (WebGL/Canvas2D with ARIA DOM accessibility overlay) and natural language AI explanations (streaming gateway with deterministic fallback).

---

## 1. High-Level Architecture

### 1.1 Architectural Style & Topology
Project Zero adopts a **Local-First Componentized Architecture**. The entire execution, validation, simulation, and graph synchronization engine operates locally inside the client web browser (main thread + Web Worker pool), ensuring zero-latency interactive modeling, full offline capability, and 100% mathematical determinism.

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT BROWSER                                    |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                       PRESENTATION LAYER (React / UI)                       |  |
|  |  +---------------+  +----------------+  +--------------+  +--------------+  |  |
|  |  | Visual Graph  |  | Formal 5-Tuple |  | Transition   |  | Execution    |  |  |
|  |  | Canvas View   |  | LaTeX View     |  | Matrix View  |  | Trace View   |  |  |
|  |  +-------+-------+  +-------+--------+  +------+-------+  +------+-------+  |  |
|  +----------|------------------|------------------|-------------------|--------+  |
|             +------------------+--------+---------+-------------------+           |
|                                         |                                         |
|                                         v                                         |
|  +-----------------------------------------------------------------------------+  |
|  |                  REACTIVE 4-WAY SYNCHRONIZATION ENGINE                      |  |
|  +-----------------------------------------------------------------------------+  |
|                                         |                                         |
|                      +------------------+------------------+                      |
|                      |                                     |                      |
|                      v                                     v                      |
|  +---------------------------------------+  +----------------------------------+  |
|  |      MAIN THREAD ENGINE ROUTER        |  |  WEB WORKER MATH SOLVER ENGINE   |  |
|  |  - Simulation Playback Controller     |  |  - @project-zero/core-solver     |  |
|  |  - Validation Engine (Static Lint)    |  |  - Subset Construction (NFA->DFA)|  |
|  |  - WebGL / Canvas2D Rendering Engine  |  |  - Hopcroft DFA Minimization     |  |
|  |  - ARIA DOM Accessibility Engine      |  |  - State Elimination (DFA->RegEx)|  |
|  +-------------------+-------------------+  +----------------------------------+  |
|                      |                                                            |
|                      v                                                            |
|  +-----------------------------------------------------------------------------+  |
|  |                 LOCAL PERSISTENCE LAYER (IndexedDB / PWA)                   |  |
|  +-----------------------------------------------------------------------------+  |
+--------------------------------------|--------------------------------------------+
                                       | HTTPS / Streaming WSS
                                       v
+-----------------------------------------------------------------------------------+
|                        EXTERNAL AI PEDAGOGICAL GATEWAY                            |
|  - Deterministic Math Trace Verification Wrapper                                  |
|  - Socratic Prompt Scaffolding Controller                                         |
|  - LLM Explanation Generator (Streaming Tokens)                                   |
+-----------------------------------------------------------------------------------+
```

### 1.2 Subsystem Breakdown & Architecture Principles
- **Purpose**: Establish clear functional boundaries, single responsibility principles, and zero-coupling interfaces across all platform components.
- **Responsibilities**: Route data between math solvers, visual canvas, presentation views, local storage, and AI endpoints.
- **Dependencies**: Web Browser APIs (WebGL2, Canvas2D, Web Workers, IndexedDB, Web Audio).
- **Public Interfaces**: `IPlatformKernel`, `IEngineRouter`, `IStorageAdapter`.
- **Failure Modes**: Network isolation triggers deterministic local AI fallback; Web Worker crashes trigger silent worker recreation and state re-hydration.
- **Scalability**: Decoupled engine design permits adding Phase 2 (CFGs/PDAs) and Phase 3 (Turing Machines) without touching core UI rendering loops.
- **Maintainability**: Strict separation between math algorithms (`@project-zero/core-solver`), state presentation, and AI prompting.

---

## 2. Module Architecture

### 2.1 Module Boundary & Isolation Contract
Every curriculum module (Module 2: Finite Automata, Phase 2: Context-Free Grammars, Phase 3: Turing Machines) exists as a self-contained feature package bound by a rigid **Syllabus Module Contract (`ISyllabusModule`)**.

```
                           +------------------------+
                           |  ISyllabusModule Contract|
                           +-----------+------------+
                                       |
           +---------------------------+---------------------------+
           |                           |                           |
           v                           v                           v
+----------------------+    +----------------------+    +----------------------+
|   MODULE 2 PACKAGE   |    |   MODULE 3 PACKAGE   |    |   MODULE 4 PACKAGE   |
| - DFA / NFA Solvers  |    | - CFG / PDA Solvers  |    | - Turing Machine     |
| - RegEx Engine       |    | - Parse Tree Engine  |    | - Tape Canvas Engine |
| - Pumping Lemma Game |    | - CYK Parser         |    | - Halting Proofs     |
+----------------------+    +----------------------+    +----------------------+
```

### 2.2 Subsystem Details
- **Purpose**: Isolate curriculum-specific solvers, quiz banks, and UI panels from platform infrastructure.
- **Responsibilities**: Register domain solvers, visual node types, validation rules, and topic theory packages during platform initialization.
- **Dependencies**: `IPlatformKernel`, `@project-zero/core-solver`.
- **Public Interfaces**: `ISyllabusModule`, `IModuleManifest`, `ITopicRegistry`.
- **Failure Modes**: Malformed module manifests are rejected at load time without crashing existing modules.
- **Scalability**: Zero-regression expansion: Module 3 registration requires adding a new manifest entry in the registry map.
- **Maintainability**: Independent versioning for each curriculum package.

---

## 3. Folder Structure

```
project-zero/
├── docs/
│   ├── 00_Project_Rules.md
│   ├── 01_Project_Idea.md
│   ├── 02_PRD.md
│   └── 03_Architecture.md
├── packages/
│   ├── core-solver/                  # Pure Deterministic TS/WASM Math Engine
│   │   ├── src/
│   │   │   ├── automata/             # DFA, NFA, Epsilon-NFA implementations
│   │   │   ├── conversions/          # NFA->DFA, DFA Minimization, RegEx->NFA
│   │   │   ├── regex/                # Thompson Parser, AST, State Elimination
│   │   │   ├── proofs/               # Pumping Lemma, Equivalence, Closures
│   │   │   └── types/                # Mathematical 5-Tuple Types
│   │   └── package.json
│   ├── engine-kernel/                # Platform Pipeline, Event Bus, Sync Router
│   │   ├── src/
│   │   │   ├── bus/                  # Priority Async Event Bus
│   │   │   ├── sync/                 # 4-Way Reactive Sync Engine
│   │   │   ├── validation/           # Static Model Linter
│   │   │   └── state/                # Immutability & Transaction History
│   │   └── package.json
│   ├── canvas-renderer/              # WebGL / Canvas2D High-Performance Renderer
│   │   ├── src/
│   │   │   ├── renderers/            # WebGL Node/Edge Renderers
│   │   │   ├── spatial/              # QuadTree Spatial Indexing
│   │   │   ├── layout/               # Force-Directed & Hierarchy Layouts
│   │   │   └── accessibility/        # ARIA DOM Screen Reader Sync Overlay
│   │   └── package.json
│   ├── ai-gateway/                   # AI Tutor Gateway Proxy & Prompt Engine
│   │   ├── src/
│   │   │   ├── verify/               # Deterministic Trace Verification Wrapper
│   │   │   ├── prompts/              # Socratic Scaffolding Prompt Templates
│   │   │   └── fallback/             # Local Rule-Based Natural Language Generator
│   │   └── package.json
│   └── modules/                      # Curriculum Feature Packages
│       ├── module-2-automata/        # Module 2 (Finite Automata & Regular Languages)
│       └── module-3-cfg/             # Phase 2 (Context-Free Grammars - Post-v1)
└── apps/
    └── web-app/                      # Next.js / Vite React Desktop Presentation UI
        ├── src/
        │   ├── components/           # Quad-Pane Workspace Components
        │   ├── store/                # UI Workspace Stores
        │   └── views/                # Progressive View Modes (Builder, Sim, Proof)
        └── package.json
```

---

## 4. Core Engine Architecture

### 4.1 Platform Kernel Architecture
- **Purpose**: Coordinate system lifecycles, manage memory pools, orchestrate event flows, and route commands between UI views and worker engines.
- **Responsibilities**: Initialize core modules, dispatch reactive state changes, supervise worker threads, and enforce immutability bounds.
- **Dependencies**: `@project-zero/core-solver`, `engine-kernel`.
- **Public Interfaces**: `IKernel`, `IEventBus`, `IStateTransaction`.
- **Failure Modes**: Unhandled thread crashes caught by Kernel supervisor, restoring last valid transaction checkpoint.
- **Scalability**: High-throughput event queues supporting 10,000 events/sec without event loop blocking.
- **Maintainability**: Zero DOM dependency in Kernel, allowing standalone unit testing in headless Node/Bun environments.

---

## 5. Simulation Engine

### 5.1 Step-by-Step Transition Evaluator
- **Purpose**: Perform deterministic, step-by-step state execution for DFA, NFA, and $\epsilon$-NFA models.
- **Responsibilities**: Compute current configurations $(Q_{active}, w_{remaining}, \text{head}_{pos})$, record full transition step traces, track non-deterministic choice trees, evaluate accept/reject criteria.
- **Dependencies**: `@project-zero/core-solver`.
- **Public Interfaces**: `ISimulationEngine`, `ISimulationTrace`, `ITransitionStep`.

```typescript
interface ITransitionStep {
  stepIndex: number;
  currentConfiguration: {
    activeStates: string[];        // Q_active (single state for DFA, set for NFA)
    readHeadPosition: number;
    remainingInput: string;
  };
  consumedSymbol: string | null;  // symbol in Sigma or null for epsilon
  transitionRuleUsed: {
    fromState: string;
    symbol: string;
    toState: string;
  }[];
  selectionRationale: string;     // Why this branch was selected/rejected
  continuationCriteria: 'CONTINUE' | 'HALT_ACCEPT' | 'HALT_REJECT' | 'DEADLOCK';
}
```

- **Failure Modes**: Infinite loop detection during cyclic $\epsilon$-move evaluation (breaks after $|Q|$ consecutive $\epsilon$-hops).
- **Scalability**: NFA multi-path expansion memory capped at $2^{20}$ active paths; auto-prunes redundant state configurations.
- **Maintainability**: Pure functional evaluation engine returning immutable trace logs.

---

## 6. Rendering Engine

### 6.1 WebGL / Canvas2D Dual Renderer with ARIA DOM Overlay
- **Purpose**: Render interactive node-link diagrams at 60 FPS while guaranteeing screen-reader accessibility.
- **Responsibilities**: Render state nodes, curved edges, self-loops, active state pulse animations; spatial query indexing (QuadTree); render ARIA DOM overlay elements mirroring visual graph nodes for screen readers.
- **Dependencies**: `canvas-renderer`, Browser HTML5 Canvas / WebGL2.
- **Public Interfaces**: `ICanvasRenderer`, `ISpatialIndex`, `IARIAOverlaySync`.
- **Failure Modes**: Fallback to Canvas2D if WebGL context is lost or unsupported.
- **Scalability**: QuadTree spatial indexing enables smooth panning/zooming over graphs up to 500 nodes and 1,000 edges.
- **Maintainability**: Rendering logic isolated from state management via declarative draw commands.

---

## 7. AI Engine

### 7.1 Socratic Gateway & Deterministic Trace Verification
- **Purpose**: Supply context-aware, Socratic educational explanations for transitions, conversions, and mistakes without hallucinating mathematical facts.
- **Responsibilities**: Intercept user help requests, manage multi-turn session state, ground LLM prompts with verified JSON computational traces from `@project-zero/core-solver`, enforce progressive hint levels (Level 1: Conceptual, Level 2: Structural, Level 3: Counter-example), stream responses, validate output against JSON schemas, and run deterministic local fallback generator when offline or unverified.
- **Dependencies**: `ai-gateway`, External LLM API Proxy.
- **Public Interfaces**: `IAIEngine`, `IAISessionManager`, `ITraceVerifier`, `IResponseValidator`, `ISocraticHintRequest`, `IEllmResponseStream`.

```typescript
interface IAISessionManager {
  sessionId: string;
  conversationHistory: { role: 'user' | 'assistant'; content: string; timestamp: number }[];
  pedagogicalStage: 'CONCEPTUAL_HINT' | 'STRUCTURAL_HINT' | 'COUNTER_EXAMPLE';
  activeModelSnapshot: string; // Hash of SSOT model
}

interface ITraceVerifier {
  verifyTrace(modelState: any, userQuery: string): IVerifiedTracePayload;
}

interface IResponseValidator {
  validateJSONSchema<T>(responseStream: string, schema: object): { isValid: boolean; parsed?: T; errors?: string[] };
}
```

- **Session Management**: Maintains stateful, multi-turn Socratic tutoring dialogues bound to specific model workspace sessions, tracking hint progression levels and preventing context loss.
- **Deterministic Solver Validation**: All user queries are wrapped with mathematically verified execution traces generated by `@project-zero/core-solver` (`ITraceVerifier`). LLMs only interpret pre-validated computational traces; they do not calculate state transitions.
- **JSON Schema Validation**: Streamed or completed LLM responses pass through real-time JSON schema validation (`IResponseValidator`). Malformed structural payloads are rejected immediately.
- **Fallback Behavior**: If network timeouts, rate-limits, solver trace mismatches, or JSON schema validation failures occur, the AI Gateway seamlessly fails over to the local, rule-based natural language template engine with zero disruption to the student.
- **Scalability**: Client-side response caching for canonical automata configurations eliminates duplicate LLM API calls.
- **Maintainability**: System prompts and JSON validation schemas decoupled into version-controlled template files.

---

## 8. Validation Engine

### 8.1 Real-Time Static Model Linter
- **Purpose**: Perform continuous mathematical static analysis on active models and provide actionable resolution guidance.
- **Responsibilities**: Detect DFA non-determinism, missing transitions over alphabet $\Sigma$, unreachable states, dead states, missing/multiple start states, malformed RegEx syntax, and invalid partition splits.
- **Dependencies**: `@project-zero/core-solver`.
- **Public Interfaces**: `IValidationEngine`, `IValidationError`, `IAutoFixAction`.

```typescript
interface IValidationError {
  errorCode: string;               // e.g. 'ERR_DFA_NON_DETERMINISTIC'
  severity: 'ERROR' | 'WARNING' | 'INFO';
  affectedElements: string[];      // Node IDs or Edge IDs
  title: string;
  mathematicalExplanation: string;
  remediationAdvice: string;
  autoFixAvailable: boolean;
  autoFixAction?: () => void;
}
```

- **Failure Modes**: Validation errors non-blocking for visual builder edits but block simulation mode entry.
- **Scalability**: Sub-millisecond static analysis (< 5ms) for models up to 100 states.
- **Maintainability**: Rule-based validation pipeline allowing simple addition of new lint checks.

---

## 9. Mathematical Solver Engine

### 9.1 Plugin-Based Deterministic Solver Engine (`@project-zero/core-solver`)
- **Purpose**: Execute formal automata conversions, minimizations, RegEx parsing, grammar derivations, and equivalence proofs through a decoupled, plugin-based architecture.
- **Plugin Architecture**: Instead of a monolithic solver, `@project-zero/core-solver` defines a standardized `ISolverPlugin` interface and an `ISolverRegistry`. Domain solvers (DFA, NFA, $\epsilon$-NFA, RegEx, CFG, PDA, and future modules) implement `ISolverPlugin` and register independently during platform or module initialization.

```typescript
export interface ISolverPlugin<TModel = any, TTrace = any> {
  readonly id: string;
  readonly name: string;
  readonly modelType: string;
  
  validate(model: TModel): IValidationError[];
  step(model: TModel, input: string, currentState?: any): TTrace;
  convert?(model: TModel, targetType: string): TModel;
  configureBudget(budget: IExecutionBudget): void;
}

export interface ISolverRegistry {
  registerPlugin(plugin: ISolverPlugin): void;
  getPlugin(modelType: string): ISolverPlugin | undefined;
  listPlugins(): string[];
}

export interface IExecutionBudget {
  maxStepDepth?: number;        // Configurable maximum path/simulation depth
  maxStateExpansion?: number;   // Configurable maximum state expansion limit
  timeBudgetMs?: number;        // Configurable execution time budget
}
```

- **Registered Solvers**:
  - **Automata Solver Plugin**: Subset / Power Set Construction ($\epsilon\text{-NFA} \to \text{NFA} \to \text{DFA}$), Hopcroft DFA Minimization ($O(k \cdot n \log n)$).
  - **RegEx Solver Plugin**: Thompson's Construction ($\text{RegEx} \to \text{NFA}$), State Elimination ($\text{DFA} \to \text{RegEx}$).
  - **Grammar Solver Plugin**: Context-Free Grammar parsing, CYK parser, PDA step evaluator.
  - **Proof Solver Plugin**: Pumping Lemma adversary game logic, closure properties, equivalence verifier.
- **Configurable Execution Budgets**: Solver plugins accept environment-configurable execution budgets (`IExecutionBudget`) to restrict execution time, step depth, and state expansion thresholds dynamically per runtime context (main thread, background Web Worker, low-power client) without hardcoding execution constants.
- **Dependencies**: Zero external dependencies (Pure TypeScript / WASM modules).
- **Public Interfaces**: `ISolverPlugin`, `ISolverRegistry`, `IExecutionBudget`, `IConversionRunner`, `IPumpingLemmaEvaluator`.
- **Failure Modes**: Exceeding a configured execution budget triggers non-blocking pagination or async progress yields, preventing UI thread lock.
- **Scalability**: Decoupled plugin pattern allows post-v1 curriculum modules to register new computational models with zero core solver refactoring.
- **Maintainability**: 100% isolated unit test suites for each registered plugin against canonical CS textbook benchmarks (Sipser, Hopcroft-Ullman).

---

## 10. Synchronization Engine

### 10.1 Reactive 4-Way Model Synchronization Engine & Single Source of Truth (SSOT)
- **Purpose**: Maintain strict mathematical and visual consistency across presentation views and AI components through a centralized **Single Source of Truth (SSOT)**.
- **Single Source of Truth (SSOT)**: The immutable data model (`IAutomataModel` in `@project-zero/core-solver`) acts as the sole authoritative state for the active workspace. Presentation views (Canvas, 5-Tuple, Transition Table, Execution Trace) do not hold independent state; they consume read-only derived projections of the SSOT.

```
                  +-------------------------------------------------+
                  |      SINGLE SOURCE OF TRUTH (IAutomataModel)    |
                  +------------------------+------------------------+
                                           |
                                           v
                  +-------------------------------------------------+
                  |            TRANSACTION MANAGER & DIFF           |
                  +-------+----------------+----------------+-------+
                          |                |                |
         +----------------+    +-----------+----+    +------+----------------+
         |                     |                |                            |
         v                     v                v                            v
  +--------------+     +---------------+  +--------------+          +------------------+
  | Visual Canvas|     | Formal 5-Tuple|  | Transition   |          | Execution Trace  |
  | (Canvas View)|     | (LaTeX View)  |  | Matrix View  |          | (Log/Tree View)  |
  +--------------+     +---------------+  +--------------+          +------------------+
         |                     |                |                            |
         +---------------------+----------------+----------------------------+
                                       |
                                       v
                     +-----------------------------------+
                     |      AI GATEWAY READ-ONLY SNAPSHOT |
                     +-----------------------------------+
```

- **Unidirectional Synchronization Model**:
  1. **Mutation Trigger**: Any user interaction originating in a presentation pane (e.g., adding an edge in Canvas, editing a transition cell in Matrix View, updating a state set in Formal 5-Tuple) emits a mutation request to the Sync Engine.
  2. **Transaction Dispatch**: The Sync Engine wraps the mutation in an atomic transaction (`IModelTransaction`), creating a unique transaction ID.
  3. **SSOT Update**: The Transaction Manager applies the mutation to the SSOT (`IAutomataModel`).
  4. **Reactive Projection Dispatch**: The Sync Engine computes model diffs (`IDiffResult`) and broadcasts updated read-only projections to all 4 presentation views simultaneously within a single render frame (< 16ms).
  5. **AI Gateway Projection**: The AI Gateway subscribes to read-only model snapshots derived strictly from the verified SSOT, ensuring Socratic hints and explanations are always perfectly synchronized with the user's active canvas.
- **Dependencies**: `engine-kernel`, `@project-zero/core-solver`.
- **Public Interfaces**: `ISyncEngine`, `IAutomataModel`, `IModelTransaction`, `IDiffResult`.
- **Failure Modes**: Cyclic loop detection via transaction ID hashing (rejects duplicate re-entrant mutations); invalid transactions roll back the SSOT to the last valid transaction snapshot.
- **Scalability**: Debounced state batching for high-frequency input streams (e.g. typing in transition matrix cells).
- **Maintainability**: Strict SSOT pattern eliminates out-of-sync representation bugs across views.

---

## 11. State Management

### 11.1 Immutable State & Transaction History Architecture
- **Purpose**: Manage workspace UI state, canvas configurations, and transaction history stacks.
- **Responsibilities**: Store current model, active view mode, selection states, simulation playback indices, and undo/redo history stacks.
- **Dependencies**: Immutability utilities (`Immer` / pure structural cloning).
- **Public Interfaces**: `IWorkspaceStore`, `ITransactionHistory`, `IUndoRedoManager`.
- **Failure Modes**: Corrupted state triggers rollback to last snapshot in history stack.
- **Scalability**: Transaction diff compression caps history stack memory footprint under 10MB.
- **Maintainability**: Centralized store selectors prevent UI component over-rendering.

---

## 12. Data Flow

### 12.1 End-to-End Pipeline Data Flow
```
[ User Interaction ] 
       │ (e.g. Add Transition in Table)
       ▼
[ Presentation View Component ]
       │ 
       ▼
[ Sync Engine Interceptor ] ──> (Create Transaction ID: tx_102)
       │
       ▼
[ Pure Math Model Update ] ──> (Update `@project-zero/core-solver` State)
       │
       ├────────────────────────┬────────────────────────┐
       ▼                        ▼                        ▼
[ Validation Engine ]   [ Web Worker Solver ]   [ 4-Way Sync Dispatcher ]
 (Run Static Linter)     (Re-compute Minimization) (Update Canvas, Tuple, Trace)
       │                        │                        │
       ▼                        ▼                        ▼
 [ Render Errors ]       [ Background Trace ]    [ 60 FPS Render Loop ]
       │                                                 │
       └────────────────────────┬────────────────────────┘
                                ▼
                   [ AI Gateway (If Requested) ]
                   (Grounded in Verified Trace)
```

---

## 13. Event Flow

### 13.1 Priority Asynchronous Event Bus Schema
- **Purpose**: Decouple subsystem communication via priority-queued asynchronous events.
- **Responsibilities**: Publish, queue, filter, and deliver system events (e.g., `MODEL_MUTATED`, `SIMULATION_STEP_CHANGED`, `VALIDATION_FAILED`, `AI_HINT_REQUESTED`).
- **Dependencies**: `engine-kernel`.
- **Public Interfaces**: `IEventBus`, `ISubscription`, `ISystemEvent`.
- **Priority Queues**:
  - `PRIORITY_HIGH` (0ms): Canvas user input, spatial transforms, state selection.
  - `PRIORITY_MEDIUM` (16ms): 4-Way Synchronization updates, static validation checks.
  - `PRIORITY_LOW` (Async/Worker): Heavy conversions, minimization, AI response generation.

---

## 14. Plugin Architecture

### 14.1 Dynamic Syllabus Module Registration Architecture
- **Purpose**: Allow post-v1 syllabus modules (Module 3 CFGs, Module 4 Turing Machines) to register seamlessly without modifying platform kernel code.
- **Responsibilities**: Register custom node types, mathematical solver handlers, specialized UI toolbars, and topic quiz generators.
- **Dependencies**: `engine-kernel`.
- **Public Interfaces**: `IPluginRegistry`, `IModuleExtension`, `IViewExtension`.
- **Failure Modes**: Unverified plugins isolated in sandboxed runtime wrappers; failure to register solver leaves base UI operable.
- **Scalability**: Zero core codebase refactoring required when registering new computational models.
- **Maintainability**: Clean plugin lifecycle hooks: `init()`, `mount()`, `unmount()`, `destroy()`.

---

## 15. Error Handling

### 15.1 Multi-Layered Defensive Error Recovery Strategy
- **Purpose**: Prevent client crashes, recover from solver exceptions, and maintain continuous interactive state.
- **Responsibilities**: Intercept UI render crashes via React Error Boundaries, catch Web Worker exceptions, recover from AI gateway streaming failures, and protect against ReDoS regex execution locks.
- **Dependencies**: Platform-wide.
- **Public Interfaces**: `IErrorHandler`, `IErrorFallbackComponent`.
- **Recovery Strategies**:
  - **Worker Crash**: Supervisor terminates unresponsive worker, launches replacement, re-hydrates model state.
  - **ReDoS Lock**: RegEx execution wrapped in worker thread with strict 500ms timeout cancellation.
  - **AI Gateway Failure**: UI displays notification and seamlessly switches to local rule-based explanation engine.

---

## 16. Logging

### 16.1 Local Structured Diagnostic Telemetry & Audit Logger
- **Purpose**: Record mathematical execution logs, user error diagnostic traces, and performance telemetry locally without violating student privacy.
- **Responsibilities**: Format structured log entries (`TIMESTAMP`, `TRACE_ID`, `SEVERITY`, `COMPONENT`, `PAYLOAD`), maintain rolling log buffer in IndexedDB, sanitize student inputs (FERPA compliant).
- **Dependencies**: Local IndexedDB.
- **Public Interfaces**: `ILogger`, `ITelemetryCollector`, `IAuditLogExporter`.
- **Failure Modes**: Storage quota full triggers rolling truncation of oldest debug log entries.
- **Maintainability**: Structured JSON log export for student bug reporting.

---

## 17. Performance Strategy

### 17.1 High-Performance Rendering & Computation Constraints
- **Rendering Benchmark**: 60 FPS consistent visual rendering on desktop browsers during pan, zoom, node drag, and playback.
- **Sync Benchmark**: 4-Way representation update completed within single render frame (< 16ms).
- **Solver Offloading**: Heavy conversions ($\text{NFA} \to \text{DFA}$, Minimization) executed inside Web Workers.
- **Power Set Sub-State Pagination**: NFAs generating $> 12$ states in power-set construction automatically convert visual output to paginated/hierarchical subset views to prevent canvas memory bloat.
- **Memory Recycling**: Node/Edge geometry buffers recycled in canvas render loops to prevent Garbage Collection pauses.

---

## 18. Security Strategy

### 18.1 Client-Side & Gateway Security Architecture
- **Content Security Policy (CSP)**: Strict script-src and style-src rules; restrict connect-src exclusively to authorized AI Gateway proxies.
- **Input Sanitization**: All node labels, transition symbols, and regular expressions sanitized against XSS and ReDoS attacks.
- **Prompt Injection Defense**: User string inputs enclosed in strict JSON structural boundaries before passing to AI Gateway templates.
- **Local Data Security**: Student local storage (IndexedDB) encrypted using browser Web Crypto API keys where sensitive practice data is stored.

---

## 19. Offline Strategy & Local Persistence

### 19.1 Local-First PWA, IndexedDB Schema Versioning & Fallback Architecture
- **Service Worker PWA**: Static assets (HTML, CSS, JS, WASM modules) cached locally for 100% offline access.
- **Local Model Persistence**: All user computational models, active workspace settings, and execution traces saved locally to IndexedDB with automatic auto-save on change.
- **IndexedDB Schema Versioning & Migration Strategy**:
  - **Database Versioning**: IndexedDB database instances maintain an integer schema version key (`schemaVersion`).
  - **Migration Pipeline (`ISchemaMigration`)**: Schema changes are managed via declarative version upgrade handlers executed inside the `onupgradeneeded` lifecycle event.
  - **Payload Data Transformers**: Serialized model payloads include a internal model version tag (`modelSchemaVersion`). Upon reading legacy models from IndexedDB, automated transformer functions update stored JSON payloads to current solver schemas in memory without data loss.

```typescript
export interface ISchemaMigration {
  readonly version: number;
  up(db: IDBDatabase, transaction: IDBTransaction): void;
  transformPayload?(rawPayload: any): any;
}
```

- **Deterministic AI Fallback Engine**: When offline, natural language transition explanations are synthesized locally using template-based natural language generators powered by `@project-zero/core-solver` trace metadata.

---

## 20. Future Expansion Strategy

### 20.1 Seamless Curriculum Scaling Roadmap (Phases 2–5)

```
+-----------------------------------------------------------------------------------+
|                        PROJECT ZERO SYSTEM KERNEL (v1.0)                          |
+-----------------------------------------------------------------------------------+
       │                                 │                                 │
       ▼                                 ▼                                 ▼
+-----------------------+     +-----------------------+     +-----------------------+
|  MODULE 2 (v1.0)      |     |  MODULE 3 (PHASE 2)   |     |  MODULE 4 (PHASE 3)   |
|  Finite Automata      | ──> |  CFGs & Pushdown      | ──> |  Turing Machines &    |
|  & Regular Languages  |     |  Automata (PDAs)      |     |  Decidability Maps    |
+-----------------------+     +-----------------------+     +-----------------------+
                                                                       │
                                                                       ▼
                                                            +-----------------------+
                                                            |  PHASE 4 & 5          |
                                                            |  Cloud Persistence &  |
                                                            |  Multimodal AI OCR    |
                                                            +-----------------------+
```

- **Phase 2 (CFGs & PDAs)**: Add Stack Memory Visualizer and Parse Tree Canvas Renderer as module extensions without altering Core Kernel or Module 2 code.
- **Phase 3 (Turing Machines)**: Extend Simulation Engine to support infinite dual-tape read/write heads and tape animation canvas views.
- **Phase 4 (Cloud Persistence & Sync)**: Upgrade `IStorageAdapter` from IndexedDB to cloud backup endpoints for remote student portfolio storage and workspace export.
- **Phase 5 (Multimodal OCR)**: Register OCR Diagram Scanner module feeding recognized graph structures directly into `4-Way Sync Engine`.

---
