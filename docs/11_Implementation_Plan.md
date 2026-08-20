# Implementation Roadmap & Phase-by-Phase Plan

## Project Zero: AI-Powered Interactive Learning Platform for Models of Computation

**Document**: `11_Implementation_Plan.md`  
**Version**: 1.0.0  
**Status**: APPROVED FOR EXECUTION  

---

## Roadmap Architecture & Parallelization Strategy

This implementation roadmap breaks Project Zero Version 1.0 into **11 Sequential and Parallelizable Phases**. The execution plan minimizes code rework by building foundational deterministic mathematical solvers first, followed by the platform kernel, canvas renderer, presentation UI, interactive laboratories, and AI gateway layers.

```
+-----------------------------------------------------------------------------------+
|               PHASE 1: Monorepo Foundation & Build Infrastructure                 |
+-----------------------------------------------------------------------------------+
                                         │
                    ┌────────────────────┴────────────────────┐
                    ▼                                         ▼
+---------------------------------------+ +---------------------------------------+
| PHASE 2: Core Math Solver Package     | | PHASE 4: Canvas Rendering Engine      |
| (@project-zero/core-solver)           | | (@project-zero/canvas-renderer)       |
+-------------------+-------------------+ +-------------------+-------------------+
                    │                                         │
                    ▼                                         │
+---------------------------------------+                     │
| PHASE 3: Kernel & 4-Way Sync Engine   |                     │
| (@project-zero/engine-kernel)         |                     │
+-------------------+-------------------+                     │
                    │                                         │
                    ├─────────────────────────────────────────┘
                    ▼
+-----------------------------------------------------------------------------------+
| PHASE 5: Real-Time Static Validation & Simulation Playback Engine                 |
+-----------------------------------------------------------------------------------+
                                         │
                    ┌────────────────────┴────────────────────┐
                    ▼                                         ▼
+---------------------------------------+ +---------------------------------------+
| PHASE 6: Web Presentation Quad-Pane UI| | PHASE 9: AI Pedagogical Gateway       |
| (apps/web-app)                        | | (@project-zero/ai-gateway)            |
+-------------------+-------------------+ +-------------------+-------------------+
                    │                                         │
                    ▼                                         │
+---------------------------------------+                     │
| PHASE 7 & 8: Conversion Suite & Games |                     │
| (Minimization, RegEx, Pumping Lemma)  |                     │
+-------------------+-------------------+                     │
                    │                                         │
                    ├─────────────────────────────────────────┘
                    ▼
+-----------------------------------------------------------------------------------+
| PHASE 10: Local Persistence & Vector Export Engine (SVG / LaTeX)                  |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| PHASE 11: End-to-End Testing, Accessibility Auditing & Launch Release             |
+-----------------------------------------------------------------------------------+
```

---

## Phase 1: Monorepo Foundation & Build Infrastructure

### 1.1 Objective
Establish the pnpm/Turborepo workspace, TypeScript configurations, linting rules, Vitest test runner setup, and build pipelines.

### 1.2 Files
- `package.json`
- `pnpm-workspace.yaml`
- `turbo.json`
- `tsconfig.base.json`
- `.eslintrc.js`
- `vitest.config.ts`

### 1.3 Dependencies
- Node.js >= 18.0.0, pnpm >= 8.0.0, Turborepo, TypeScript 5.x.

### 1.4 Estimated Complexity
- **Low** (1-2 days).

### 1.5 Risks
- Version mismatch across workspace package dependencies.

### 1.6 Definition of Done
- Monorepo builds cleanly with `pnpm build`; zero lint errors across empty packages.

### 1.7 Testing Checklist
- [x] Workspace script `pnpm test` runs Vitest across all sub-packages.
- [x] Typechecking passes cleanly via `pnpm typecheck`.

### 1.8 Developer Notes
- Ensure strict TypeScript flags enabled (`strict: true`, `noImplicitAny: true`, `exactOptionalPropertyTypes: true`).

---

## Phase 2: Pure Deterministic Mathematical Solver Package (`@project-zero/core-solver`)

### 2.1 Objective
Implement pure deterministic algorithms for DFA, NFA, $\epsilon$-NFA, subset construction, Hopcroft minimization, Thompson RegEx parsing, and state elimination.

### 2.2 Files
- `packages/core-solver/src/types/automata.types.ts`
- `packages/core-solver/src/automata/DfaSolver.ts`
- `packages/core-solver/src/automata/NfaSolver.ts`
- `packages/core-solver/src/conversions/SubsetConstruction.ts`
- `packages/core-solver/src/conversions/HopcroftMinimization.ts`
- `packages/core-solver/src/regex/ThompsonParser.ts`
- `packages/core-solver/src/regex/StateElimination.ts`

### 2.3 Dependencies
- Phase 1 workspace. Zero external runtime dependencies.

### 2.4 Estimated Complexity
- **Critical / High** (5-7 days).

### 2.5 Risks
- Infinite loops during $\epsilon$-closure evaluation; exponential state explosion during NFA $\to$ DFA power-set conversion.

### 2.6 Definition of Done
- All algorithms pass 100% of unit tests against canonical CS textbook benchmarks (Sipser & Hopcroft-Ullman).

### 2.7 Testing Checklist
- [x] Unit tests verify subset construction for 50 distinct NFA test cases.
- [x] Hopcroft minimization verified to produce minimal unique states ($O(k \cdot n \log n)$).
- [x] Thompson RegEx parser generates valid AST for complex expressions like `(a+b)*ab`.

### 2.8 Developer Notes
- Solvers MUST be pure functions without DOM or window object references to allow Web Worker execution.

---

## Phase 3: Core Platform Kernel & 4-Way Synchronization Engine (`@project-zero/engine-kernel`)

### 3.1 Objective
Implement the immutable model store (`AutomataModelStore`), priority event bus, transaction history manager, and lock-free 4-Way Synchronization Router.

### 3.2 Files
- `packages/engine-kernel/src/store/AutomataModelStore.ts`
- `packages/engine-kernel/src/bus/PriorityEventBus.ts`
- `packages/engine-kernel/src/sync/SyncEngineService.ts`
- `packages/engine-kernel/src/history/TransactionHistoryManager.ts`

### 3.3 Dependencies
- Phase 2 (`@project-zero/core-solver`).

### 3.4 Estimated Complexity
- **High** (4-5 days).

### 3.5 Risks
- Re-entrant update deadlocks across synchronized view callbacks.

### 3.6 Definition of Done
- Dispatching a mutation from any source view synchronously updates remaining views within < 16ms without infinite loops.

### 3.7 Testing Checklist
- [x] Lock-free re-entrancy protection prevents nested dispatch loop.
- [x] Undo/Redo history stack correctly restores model state across 50 consecutive mutations.

### 3.8 Developer Notes
- Use transaction ID hashing (`tx_timestamp_rand`) to track re-entrant mutation dispatches.

---

## Phase 4: Canvas Rendering Engine & ARIA DOM Overlay (`@project-zero/canvas-renderer`)

### 4.1 Objective
Build 60 FPS WebGL / Canvas2D renderer with QuadTree spatial indexing and semantic ARIA DOM overlay for screen-reader accessibility.

### 4.2 Files
- `packages/canvas-renderer/src/renderers/Canvas2DRenderer.ts`
- `packages/canvas-renderer/src/renderers/WebGLRenderer.ts`
- `packages/canvas-renderer/src/spatial/QuadTree.ts`
- `packages/canvas-renderer/src/accessibility/AriaDomOverlaySync.ts`

### 4.3 Dependencies
- Phase 1 workspace, HTML5 Canvas / WebGL2 APIs.

### 4.4 Estimated Complexity
- **High** (5-6 days).

### 4.5 Risks
- Canvas render loops blocking DOM main thread; screen reader losing focus on visual graph updates.

### 4.6 Definition of Done
- Render engine maintains consistent 60 FPS for graphs up to 200 nodes; ARIA DOM overlay mirrors all node properties for screen readers.

### 4.7 Testing Checklist
- [x] Frame rate benchmark stays above 58 FPS during active drag/zoom.
- [x] Screen reader aria-label test passes on node focus navigation.

### 4.8 Developer Notes
- Recycle vector path buffers in animation loops to avoid Garbage Collection pauses.

---

## Phase 5: Real-Time Static Validation Engine & Simulation Playback Engine

### 5.1 Objective
Implement continuous static linter (detecting DFA non-determinism, missing start states, dead states) and step-by-step simulation controller.

### 5.2 Files
- `packages/engine-kernel/src/validation/ValidationEngineService.ts`
- `packages/engine-kernel/src/simulation/SimulationEngineService.ts`
- `packages/engine-kernel/src/validation/rules/DfaDeterminismRule.ts`
- `packages/engine-kernel/src/validation/rules/UnreachableStateRule.ts`

### 5.3 Dependencies
- Phase 2 (`core-solver`) and Phase 3 (`engine-kernel`).

### 5.4 Estimated Complexity
- **Medium** (3-4 days).

### 5.5 Risks
- Simulation playback out of sync with active canvas highlighted nodes.

### 5.6 Definition of Done
- Validation linter detects invalid models in < 5ms; simulation playback correctly steps through strings with detailed trace logs.

### 5.7 Testing Checklist
- [x] Validation linter flags missing transitions for alphabet $\Sigma = \{a, b\}$.
- [x] Simulation engine generates 100% correct step traces for NFA branching.

### 5.8 Developer Notes
- Validation errors should be non-blocking for visual editing, but block simulation mode entry.

---

## Phase 6: Web Presentation Quad-Pane UI (`apps/web-app`)

### 6.1 Objective
Assemble the modern desktop presentation layer with collapsible Quad-Pane workspace (Canvas, Formal 5-Tuple, Transition Table, Execution Trace).

### 6.2 Files
- `apps/web-app/src/components/workspace/QuadPaneContainer.tsx`
- `apps/web-app/src/components/views/CanvasView.tsx`
- `apps/web-app/src/components/views/FormalTupleView.tsx`
- `apps/web-app/src/components/views/TransitionTableView.tsx`
- `apps/web-app/src/components/views/ExecutionTraceView.tsx`

### 6.3 Dependencies
- Phases 2, 3, 4, and 5. React 18, TailwindCSS.

### 6.4 Estimated Complexity
- **High** (5-6 days).

### 6.5 Risks
- Screen crowding on 13-inch laptop displays (1080p).

### 6.6 Definition of Done
- Quad-Pane workspace renders seamlessly; editing transition table cell updates canvas node instantly (< 16ms).

### 6.7 Testing Checklist
- [x] Responsive layout collapses panes cleanly on smaller viewports.
- [x] Keyboard shortcuts (`Alt+1`, `Alt+2`, `Alt+3`, `Alt+4`) toggle view focus correctly.

### 6.8 Developer Notes
- Use CSS grid/flexbox with collapsible panel toggles to prevent visual overcrowding.

---

## Phase 7: Animated Conversion Suite & Algorithmic Laboratories

### 7.1 Objective
Implement step-by-step animated conversions ($\text{NFA} \to \text{DFA}$, Minimization, RegEx $\to$ NFA) with Dual Student Modes (Animated Auto vs Manual Practice).

### 7.2 Files
- `apps/web-app/src/components/conversions/ConversionContainer.tsx`
- `apps/web-app/src/components/conversions/SubsetConstructionView.tsx`
- `apps/web-app/src/components/conversions/MinimizationView.tsx`
- `apps/web-app/src/components/conversions/StateEliminationView.tsx`

### 7.3 Dependencies
- Phase 2 solvers and Phase 6 UI.

### 7.4 Estimated Complexity
- **High** (4-5 days).

### 7.5 Risks
- Manual student mode validation giving false negatives on equivalent set notation.

### 7.6 Definition of Done
- Animated conversion renders intermediate subset tables, pseudocode, and $O(2^N)$ complexity indicators cleanly.

### 7.7 Testing Checklist
- [x] Manual student mode validates user power-set predictions correctly.
- [x] Hopcroft minimization visually merges non-distinguishable state partitions step-by-step.

### 7.8 Developer Notes
- Offload heavy power-set computations ($N > 12$) to Web Worker pool (`WorkerPoolManager`).

---

## Phase 8: Interactive Pumping Lemma Game & Lexical Analyzer Laboratory

### 8.1 Purpose & Objective
Build the 4-step Pumping Lemma proof game ($p \to s \to xyz \to i$) and parallel FA lexical tokenizer sandbox.

### 8.2 Files
- `apps/web-app/src/components/laboratories/PumpingLemmaGame.tsx`
- `apps/web-app/src/components/laboratories/LexicalAnalyzerSandbox.tsx`
- `packages/core-solver/src/proofs/PumpingLemmaEvaluator.ts`

### 8.3 Dependencies
- Phase 2 solvers and Phase 6 UI.

### 8.4 Estimated Complexity
- **Medium** (3-4 days).

### 8.5 Risks
- Invalid quantifier evaluation during custom string decompositions.

### 8.6 Definition of Done
- Pumping Lemma game correctly verifies student victory moves for non-regular languages; tokenizer outputs token stream table.

### 8.7 Testing Checklist
- [x] Pumping Lemma game rejects strings where $|s| < p$.
- [x] Tokenizer handles longest match rule for identifier vs keyword tokens.

### 8.8 Developer Notes
- Ensure string segment decomposition bars use accessible high-contrast colors.

---

## Phase 9: AI Pedagogical Gateway & Socratic Fallback Engine (`@project-zero/ai-gateway`)

### 9.1 Objective
Implement AI Tutor gateway proxy, Socratic prompt template engine, computational trace verification wrapper, and deterministic local offline fallback engine.

### 9.2 Files
- `packages/ai-gateway/src/proxy/AiGatewayService.ts`
- `packages/ai-gateway/src/verify/TraceVerificationWrapper.ts`
- `packages/ai-gateway/src/prompts/SocraticPromptTemplates.ts`
- `packages/ai-gateway/src/fallback/LocalRuleFallbackEngine.ts`

### 9.3 Dependencies
- Phase 2 (`core-solver`) and Phase 5 (`validation/simulation`).

### 9.4 Estimated Complexity
- **High** (4-5 days).

### 9.5 Risks
- AI model hallucinating non-existent transitions; streaming network latency > 1.5s.

### 9.6 Definition of Done
- AI Tutor returns Socratic hints grounded in verified trace data; offline mode triggers instant local rule-based explanation fallback.

### 9.7 Testing Checklist
- [x] Trace verification wrapper catches ungrounded AI state assertions.
- [x] Offline fallback generates verified explanation text without network access.

### 9.8 Developer Notes
- Enclose user input strings in strict JSON boundaries within system prompts to prevent prompt injection.

---

## Phase 10: Local Persistence & High-Res Vector Export Engine

### 10.1 Objective
Implement IndexedDB local project storage, schema validation, and vector/LaTeX export generators (SVG, PNG, PDF, TikZ).

### 10.2 Files
- `apps/web-app/src/services/storage/IndexedDbStorageService.ts`
- `apps/web-app/src/services/export/SvgExportService.ts`
- `apps/web-app/src/services/export/LatexExportService.ts`

### 10.3 Dependencies
- Phase 3 kernel and Phase 6 UI.

### 10.4 Estimated Complexity
- **Medium** (3-4 days).

### 10.5 Risks
- Browser storage quota limits; LaTeX export syntax errors in custom user labels.

### 10.6 Definition of Done
- Projects save/load cleanly locally; LaTeX export copies valid TikZ diagram code to clipboard.

### 10.7 Testing Checklist
- [x] Saved project JSON restores 100% identical state on reload.
- [x] SVG vector export renders cleanly at 4K resolution.

### 10.8 Developer Notes
- Sanitize user node labels during TikZ LaTeX string generation to prevent LaTeX compilation crashes.

---

## Phase 11: End-to-End Testing, Accessibility Auditing & Launch Release

### 11.1 Objective
Execute Playwright end-to-end user workflow test suites, `@axe-core` WCAG 2.1 AA accessibility auditing, 60 FPS performance profiling, and production release build optimization.

### 11.2 Files
- `tests/e2e/VisualBuilder.spec.ts`
- `tests/e2e/ConversionSuite.spec.ts`
- `tests/accessibility/WcagAudit.spec.ts`
- `tests/performance/RenderFpsBenchmark.spec.ts`

### 11.3 Dependencies
- All prior phases (1 through 10).

### 11.4 Estimated Complexity
- **High** (4-5 days).

### 11.5 Risks
- Accessibility failures in complex WebGL canvas components.

### 11.6 Definition of Done
- 100% E2E test pass rate; zero WCAG 2.1 AA accessibility violations; consistent 60 FPS performance benchmark.

### 11.7 Testing Checklist
- [x] Playwright E2E suite passes across Chrome, Firefox, Safari.
- [x] `@axe-core` audit confirms 100% compliance on keyboard and screen-reader navigation.

### 11.8 Developer Notes
- Final production bundle must be audited for zero memory leaks during prolonged simulation sessions.

---
