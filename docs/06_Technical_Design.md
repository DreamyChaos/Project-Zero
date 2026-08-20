# Technical Design Specification

## Project Zero: AI-Powered Interactive Learning Platform for Models of Computation

**Document**: `06_Technical_Design.md`  
**Version**: 1.0.0  
**Status**: APPROVED FOR IMPLEMENTATION  

---

## Executive Architectural Summary & Engineering Blueprint

This document establishes the definitive **Technical Design Specification** for **Project Zero**. 

Serving as the explicit software engineering blueprint, this specification translates the approved System Architecture, Feature Specification, and Mathematical Solver Specification into precise software module boundaries, package contracts, thread ownership rules, worker communication protocols, state management transactions, storage migration pipelines, and deployment architectures.

Multiple engineering teams can independently implement and integrate components based solely on this document without architectural divergence or integration mismatches.

---

## SECTION 1: Monorepo Repository Structure

Project Zero utilizes a modern monorepo layout managed by **pnpm workspaces** and **Turborepo** task orchestration.

```
project-zero/
├── apps/
│   └── web-app/                      # Primary Next.js / Vite PWA Desktop Presentation Application
├── packages/
│   ├── core-solver/                  # Pure Deterministic TS/WASM Mathematical Engine (@project-zero/core-solver)
│   ├── engine-kernel/                # Kernel Pipeline, Priority Event Bus, Transaction Manager
│   ├── canvas-renderer/              # WebGL / Canvas2D Dual Renderer & ARIA Overlay Engine
│   ├── transition-engine/            # Reactive 4-Way Model Synchronization & Diff Dispatcher
│   ├── validation-engine/            # Static Model Linter & Auto-Fix Engine
│   ├── ai-gateway/                   # Socratic AI Tutor Proxy, Trace Verifier & Response Validator
│   ├── storage/                      # IndexedDB Persistence & Schema Migration Engine
│   ├── ui/                           # Reusable UI Design System Component Library
│   └── shared/                       # Canonical Types, Interfaces & Constants (@project-zero/shared)
├── modules/
│   ├── module-2-automata/            # Module 2 Curriculum Package (FA, RegEx, Pumping Lemma)
│   └── module-3-cfg/                 # Module 3 Curriculum Package (CFGs, PDAs - Phase 2)
├── assets/                           # Static Media Assets, Icons, WOFF2 Typography
├── tests/                            # Cross-Package End-to-End & Performance Benchmark Suites
├── scripts/                          # CI/CD, Code Generation & Build Automation Scripts
└── tools/                            # Development Tooling, Benchmarking Scaffolding & Profilers
```

### Directory Purposes
- **`apps/web-app`**: User-facing application shell responsible for routing, layout presentation, quad-pane workspace composition, and service worker registration.
- **`packages/`**: Core monorepo npm packages (`@project-zero/*`) containing platform business logic, rendering engines, solver libraries, storage infrastructure, and shared types (`packages/shared`).
- **`modules/`**: Decoupled feature packages registering curriculum-specific solvers, visual toolbars, and topic quiz banks.
- **`assets/`**: Pre-compiled static assets, SVGs, and web fonts.
- **`tests/`**: Global Playwright E2E and performance benchmark integration tests.
- **`scripts/`**: Automated release, build, and validation scripts.
- **`tools/`**: Local developer diagnostic tools and solver profiling benchmarks.

---

## SECTION 2: Package Responsibilities & Ownership

### 2.1 `@project-zero/core-solver`
- **Purpose**: Pure deterministic TS/WASM mathematical computation engine.
- **Public API**: `ISolverRegistry`, `ISolverPlugin`, `IConversionRunner`, `IPumpingLemmaEvaluator`.
- **Internal Modules**: `automata/`, `conversions/`, `regex/`, `proofs/`, `types/`.
- **Dependencies**: None (Zero external dependencies).
- **Ownership**: Mathematical Solver Team.
- **Thread Ownership**: Runs primarily inside Web Worker solver threads; optional synchronous execution on Main Thread for micro-models ($|Q| \le 100$).
- **Testing Strategy**: 100% unit test coverage against textbook benchmark matrices and property-based Fast-Check tests.

### 2.2 `@project-zero/canvas-renderer`
- **Purpose**: High-performance dual WebGL / Canvas2D visual graph rendering and ARIA DOM screen reader overlay synchronization.
- **Public API**: `ICanvasRenderer`, `ISpatialIndex`, `IARIAOverlaySync`, `IAnimationController`.
- **Internal Modules**: `webgl/`, `canvas2d/`, `spatial/`, `accessibility/`, `animation/`.
- **Dependencies**: `@project-zero/shared`.
- **Ownership**: Frontend Graphics Team.
- **Thread Ownership**: Main Thread (DOM / WebGL Context bound).
- **Testing Strategy**: Visual regression testing (Playwright screenshots) and WCAG 2.1 AAA contrast/screen-reader automated audits.

### 2.3 `@project-zero/transition-engine`
- **Purpose**: Reactive 4-Way Model Synchronization Engine managing atomic SSOT state updates across presentation views.
- **Public API**: `ISyncEngine`, `IModelTransaction`, `IDiffResult`.
- **Internal Modules**: `sync/`, `diff/`, `transaction/`.
- **Dependencies**: `@project-zero/shared`, `@project-zero/core-solver`.
- **Ownership**: Core Infrastructure Team.
- **Thread Ownership**: Main Thread.
- **Testing Strategy**: Unit tests verifying single render frame (< 16ms) 4-way diff dispatching.

### 2.4 `@project-zero/validation-engine`
- **Purpose**: Real-time static model linter catching non-determinism, missing transitions, and unreachable states.
- **Public API**: `IValidationEngine`, `IValidationIssue`, `IAutoFixAction`.
- **Internal Modules**: `linter/`, `rules/`, `autofix/`.
- **Dependencies**: `@project-zero/shared`, `@project-zero/core-solver`.
- **Ownership**: Quality & Formal Verification Team.
- **Thread Ownership**: Main Thread for small models; background Web Worker for large graphs ($|Q| > 100$).
- **Testing Strategy**: Comprehensive rule unit tests against invalid automata edge cases.

### 2.5 `@project-zero/ai-gateway`
- **Purpose**: Client-side proxy managing Socratic tutoring sessions, prompt grounding, deterministic trace verification (`ITraceVerifier`), and local rule fallback.
- **Public API**: `IAIEngine`, `IAISessionManager`, `ITraceVerifier`, `IResponseValidator`.
- **Internal Modules**: `session/`, `grounding/`, `verifier/`, `validator/`, `fallback/`.
- **Dependencies**: `@project-zero/shared`, `@project-zero/core-solver`.
- **Ownership**: AI Systems Team.
- **Thread Ownership**: Main Thread / Fetch API async worker.
- **Testing Strategy**: Mock API response tests, schema validator unit tests, and local fallback verification.

### 2.6 `@project-zero/storage`
- **Purpose**: IndexedDB local persistence manager, versioned schema migration pipeline (`ISchemaMigration`), and quota recovery manager.
- **Public API**: `IStorageService`, `ISchemaMigration`, `IQuotaManager`.
- **Internal Modules**: `indexeddb/`, `migrations/`, `serialization/`, `quota/`.
- **Dependencies**: `@project-zero/shared`.
- **Ownership**: Platform Infrastructure Team.
- **Thread Ownership**: Background Web Worker / IndexedDB async thread.
- **Testing Strategy**: Migration integration tests (`v1_to_v2`), corruption recovery tests, and storage quota stress tests.

### 2.7 `@project-zero/ui`
- **Purpose**: Shared UI design system component library (Buttons, Modals, Inputs, Quad-Pane Containers).
- **Public API**: React Component exports and CSS Design Tokens.
- **Dependencies**: `@project-zero/shared`.
- **Ownership**: UX / Design System Team.
- **Thread Ownership**: Main Thread.
- **Testing Strategy**: Component Storybook unit tests and Accessibility WCAG audits.

### 2.8 `@project-zero/shared`
- **Purpose**: Canonical interfaces, types, constants, and utility helpers.
- **Public API**: TypeScript interfaces (`IAutomaton`, `IState`, `ITransition`, `ISimulationTrace`, `IExecutionBudget`).
- **Dependencies**: None.
- **Ownership**: Core Architecture Team.
- **Thread Ownership**: Universal.
- **Testing Strategy**: Type-level interface verification.

---

## SECTION 3: Public Interface Definitions

```typescript
// Core Service Contracts
export interface IAutomatonService {
  createAutomaton(type: string): IAutomaton;
  validateAutomaton(automaton: IAutomaton): IValidationIssue[];
  serialize(automaton: IAutomaton): string;
  deserialize(json: string): IAutomaton;
}

export interface ISimulationService {
  startSimulation(automaton: IAutomaton, input: string, budget?: IExecutionBudget): ISimulationTrace;
  stepForward(traceId: string): IExecutionStep;
  stepBackward(traceId: string): IExecutionStep;
  jumpToStep(traceId: string, index: number): IExecutionStep;
}

export interface IConversionService {
  convertNfaToDfa(nfa: IAutomaton): IConversionResult;
  minimizeDfa(dfa: IAutomaton): IConversionResult;
  convertRegexToEpsilonNfa(regex: string): IConversionResult;
  convertDfaToRegex(dfa: IAutomaton): IConversionResult;
}

export interface IValidationService {
  runValidation(automaton: IAutomaton, budget?: IExecutionBudget): Promise<IValidationIssue[]>;
  applyAutoFix(automaton: IAutomaton, issueCode: string): IAutomaton;
}

export interface IRenderPipeline {
  initialize(canvas: HTMLCanvasElement): void;
  render(automaton: IAutomaton, activeStates?: string[]): void;
  resize(width: number, height: number): void;
  destroy(): void;
}

export interface IAIService {
  requestHint(request: ISocraticHintRequest): Promise<string>;
  verifyTraceResponse(llmResponse: string, trace: ISimulationTrace): boolean;
}

export interface IStorageService {
  saveWorkspace(workspaceId: string, payload: any): Promise<void>;
  loadWorkspace(workspaceId: string): Promise<any>;
  runMigrations(): Promise<void>;
}

export interface IWorkspaceService {
  dispatchTransaction(transaction: IModelTransaction): IDiffResult;
  undo(): void;
  redo(): void;
}
```

---

## SECTION 4: Module Dependency Graph & Rules

```
                       +-----------------------+
                       | @project-zero/shared  |
                       +-----------+-----------+
                                   |
      +----------------------------+----------------------------+
      |                            |                            |
      v                            v                            v
+-----------------------+  +-----------------------+  +-----------------------+
|  @project-zero/storage|  |   @project-zero/ui    |  | @project-zero/solver  |
+-----------------------+  +-----------+-----------+  +-----------+-----------+
                                       |                              |
                                       v                              v
                           +-----------------------+      +-----------------------+
                           | canvas-renderer       |      | validation-engine     |
                           +-----------+-----------+      +-----------+-----------+
                                       |                              |
                                       +---------------+--------------+
                                                       |
                                                       v
                                           +-----------------------+
                                           | transition-engine     |
                                           +-----------+-----------+
                                                       |
                                                       v
                                           +-----------------------+
                                           |  @project-zero/ai-gw  |
                                           +-----------+-----------+
                                                       |
                                                       v
                                           +-----------------------+
                                           |   apps/web-app        |
                                           +-----------------------+
```

### Dependency Rules
1. **Unidirectional Flow**: Dependencies strictly flow top-down. Lower-level packages (`@project-zero/shared`, `@project-zero/core-solver`) MUST NEVER import from higher-level packages (`apps/web-app`, `@project-zero/ui`).
2. **Forbidden Cyclic Dependencies**: Circular imports between packages trigger automated build errors in Turborepo lint checks.
3. **Dependency Inversion**: High-level modules depend on abstractions (interfaces in `@project-zero/shared`), not concrete package implementations.

---

## SECTION 5: Rendering Pipeline Specification

### 5.1 Dual WebGL / Canvas2D Rendering Lifecycle
- **Context Initialization**: On mount, `canvas-renderer` attempts to acquire a WebGL2 rendering context. If context creation fails or WebGL is unsupported, it falls back seamlessly to HTML5 Canvas2D.
- **WebGL Context Loss Recovery (`IWebGLContextManager`)**: Listens for `webglcontextlost` and `webglcontextrestored` events. Upon context loss, pauses render loops gracefully; upon restoration, automatically re-compiles shader programs, re-allocates typed array geometry buffers, and restores scene state. If context restoration fails, transitions smoothly to Canvas2D fallback rendering.
- **Render Loop**: Frame scheduling managed via `requestAnimationFrame`. Rendering is **dirty-driven**: draw calls execute only when model mutations, spatial pan/zoom transforms, or simulation pulse steps occur.
- **Dirty Rectangle Optimization**: Localized redraw regions update only modified node/edge bounding boxes, preserving background grid pixels.
- **Memory Recycling**: Geometry vertex buffers for node circles and arrow curves are allocated once into reusable typed array memory pools (`Float32Array`), preventing Garbage Collection pauses during pan/zoom.

### 5.2 ARIA Overlay & Screen Reader Synchronization
- **`IARIAOverlaySync`**: Transparent DOM overlay elements mirror visual WebGL node coordinates (`x, y, radius`).
- **Screen Reader Announcements**: Focused nodes announce label, initial status, accepting status, and connected transitions. Simulation steps announce active configuration via an `aria-live="polite"` region.

---

## 6. Web Worker Architecture & Communication Protocol

```
+-----------------------------------------------------------------------------------+
|                                   MAIN THREAD                                     |
|  [ UI Components ] ──> [ Workspace Service ] ──> [ Worker Message Manager ]       |
+--------------------------------------|--------------------------------------------+
                                       | postMessage (Transferable Buffers)
                                       v
+-----------------------------------------------------------------------------------+
|                                BACKGROUND WORKER POOL                             |
|  +-----------------------------------+   +-------------------------------------+  |
|  |       SOLVER WORKER THREAD        |   |       VALIDATION WORKER THREAD      |  |
|  | - Subset Construction (NFA->DFA)  |   | - Large Graph Linting (|Q| > 100)   |  |
|  | - Hopcroft DFA Minimization       |   | - Complex Reachability Scans        |  |
|  | - State Elimination (DFA->RegEx)  |   | - Background Auto-Fix Generation    |  |
|  +-----------------------------------+   +-------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

### 6.1 Worker Message Protocol Contracts
- **Message Structure**:
  ```typescript
  interface IWorkerMessage<T = any> {
    id: string;             // Correlation GUID
    type: string;           // e.g. 'EXECUTE_SOLVER_TASK'
    payload: T;             // Task arguments
    budget?: IExecutionBudget;
    cancellationId?: string; // AbortSignal / AbortController token mapping
  }
  ```
- **Cancellation (`AbortController`)**: Main thread maintains an `AbortController` map by task ID. Dispatching `CANCEL_TASK` triggers `AbortSignal` emission; worker thread checks cancellation status during loop iterations and aborts execution cleanly without leaking resources.
- **Error Propagation**: Unhandled worker exceptions serialized into structured `IWorkerError` payloads containing stack trace and diagnostic codes, returned cleanly to Main Thread error boundaries.

---

## SECTION 7: State Management & Transaction History

### 7.1 Single Source of Truth (SSOT) & Immutable Transactions
- **SSOT**: The active workspace model (`IAutomataModel` in `@project-zero/core-solver`) acts as the single source of truth.
- **Atomic Transactions (`IModelTransaction`)**: All mutations originate as transactions containing transaction ID, timestamp, target element IDs, and mutation diff payloads.
- **Undo/Redo Stack**: Maintains immutable transaction diff snapshots, compressed via structural sharing. Caps history memory footprint under 10MB.

---

## SECTION 8: Storage Architecture & Persistence

### 8.1 IndexedDB Schema Versioning, Fallbacks & Quota Recovery
- **Database Schema**: Managed in `@project-zero/storage` using versioned object stores (`v1_projects`, `v1_telemetry`).
- **Storage Availability Fallback (`MemoryStorageAdapter`)**: If IndexedDB is restricted or unavailable (e.g. private browsing mode), `IStorageService` automatically degrades gracefully to an in-memory storage adapter (`MemoryStorageAdapter`), preserving user workspace state for the duration of the browser session without crashing.
- **Schema Migration (`ISchemaMigration`)**: Upgrades execute inside `onupgradeneeded` events. Legacy JSON payloads upgraded in memory via versioned transformers.
- **Quota Recovery (`QuotaExceededError`)**: Upon encountering storage full errors, the storage manager automatically:
  1. Truncates rolling telemetry/debug log buffers.
  2. Clears non-essential simulation step cache entries.
  3. Re-attempts save. If still full, prompts user to export `.pz.json` backup file.

---

## SECTION 9: AI Gateway Architecture & Anti-Hallucination Pipeline

### 9.1 Socratic AI Gateway Workflow
```
[ User Hint Request ] ──> [ AI Gateway Proxy ] ──> [ Extract SSOT Model Snapshot ]
                                                           │
                                                           ▼
                                                [ Run Core Solver Engine ]
                                                           │
                                                           ▼
                                                [ Emit ISimulationTrace ]
                                                           │
                                                           ▼
[ Failover to Local NLG ] <── [ Verification Fail ] <── [ Prompt Grounding ]
         │                                                 │
         ▼                                                 ▼
[ Display Local Hint ]                          [ Call External LLM API ]
                                                           │
                                                           ▼
                                                [ Stream Token Response ]
                                                           │
                                                           ▼
                                                [ ITraceVerifier Check ]
                                                           │
                                    ┌──────────────────────┴──────────────────────┐
                                    ▼                                             ▼
                          [ Verified: Display Hint ]                  [ Reject: Fallback ]
```

- **Prompt Grounding**: User queries are never sent raw. Prompts are constructed exclusively by inserting verified `ISimulationTrace` JSON data into versioned prompt templates (`v1.0.0`).
- **Deterministic Verification (`ITraceVerifier`)**: Parses streamed LLM text, extracts state IDs, transitions, and decisions, and compares every fact against `ISimulationTrace`. Contradictory responses are rejected immediately, triggering failover to the local deterministic template engine.

---

## SECTION 10: Dynamic Plugin Architecture

### 10.1 `ISolverPlugin` & `ISyllabusModule` Lifecycle
- **Plugin Lifecycle Hooks**: `init()`, `mount()`, `unmount()`, `destroy()`.
- **Module Registration**: Post-v1 curriculum packages (Module 3 CFGs, Module 4 Turing Machines) register domain solvers via `ISolverRegistry.registerPlugin()`, specialized UI toolbars via `IViewExtension`, and lint rules without modifying core platform code.

---

## SECTION 11: Error Handling & Telemetry Strategy

### 11.1 Multi-Layered Error Hierarchy
- **`PlatformError`**: Root error class.
  - **`SolverError`**: Mathematical computation failures (`ERR_DFA_NON_DETERMINISTIC`).
  - **`StorageError`**: IndexedDB and quota failures (`ERR_INDEXEDDB_QUOTA_EXCEEDED`).
  - **`AIServiceError`**: AI gateway timeouts and verification failures (`ERR_AI_VERIFICATION_FAILED`).
- **Recovery**: Main thread React Error Boundaries isolate panel crashes, preventing platform-wide application crashes.

---

## SECTION 12: Testing Architecture

- **Unit Testing**: Vitest test suites executing 100% logic coverage across `@project-zero/core-solver`, validation rules, and algorithms.
- **Property-Based Testing**: Fast-Check property test suites verifying mathematical invariance ($L(SubsetConst(M)) == L(M)$) and minimality ($Hopcroft$).
- **Visual Regression Testing**: Playwright screenshot comparison tests for canvas rendering.
- **Accessibility Testing**: Automated axe-core audits and VoiceOver/NVDA E2E keyboard navigation tests.

---

## SECTION 13: Performance Target Benchmarks

| Metric | Target SLA Benchmark | Enforcement Mechanism |
| :--- | :--- | :--- |
| **Canvas Frame Rate** | 60 FPS consistent | Dirty-driven rendering & QuadTree spatial indexing |
| **4-Way Sync Dispatch** | < 16.6ms per frame | Single render frame debounced diff updates |
| **Static Validation (Sync)** | < 5ms for $|Q| \le 100$ | In-memory bitset matrix inspection |
| **Static Validation (Async)** | Non-blocking | Web Worker offloading for $|Q| > 100$ |
| **Memory Footprint** | < 50MB Heap | Typed array recycling & history compression |
| **PWA Cold Load** | < 1.2s | Service Worker asset caching |

---

## SECTION 14: Build & CI/CD Architecture

- **Monorepo Manager**: pnpm workspaces + Turborepo build caching.
- **Bundler**: Vite / ESBuild producing optimized ESM outputs.
- **TypeScript**: Strict mode enabled (`strict: true`, `noImplicitAny: true`).
- **CI Pipeline**: GitHub Actions running linting, type-checks, Vitest unit tests, Fast-Check property tests, and Playwright E2E suites on every pull request.

---

## SECTION 15: Security & Isolation Architecture

- **Content Security Policy (CSP)**: Restrict `script-src` and `style-src` to self; restrict `connect-src` exclusively to authorized AI Gateway proxy endpoints.
- **Input Sanitization**: Node labels and RegEx expressions sanitized against XSS and ReDoS attacks.
- **Data Encryption**: Sensitive student workspace data encrypted in IndexedDB using Web Crypto API keys.

---

## SECTION 16: Deployment & PWA Architecture

- **Offline-First PWA**: Service Worker caches static assets (HTML, CSS, JS, WASM modules) for 100% offline functionality.
- **Version Upgrades**: Service Worker lifecycle updates prompt user: *"New version available. Update now?"*, triggering safe IndexedDB schema migration on reload.

---
