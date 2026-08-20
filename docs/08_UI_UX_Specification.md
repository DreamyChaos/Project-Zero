# Comprehensive User Experience & Interface Specification

## Project Zero: AI-Powered Interactive Learning Platform for Models of Computation

**Document**: `08_UI_UX_Specification.md`  
**Version**: 1.0.0  
**Status**: APPROVED FOR IMPLEMENTATION  

---

## SECTION 1: UX Vision, Philosophy & Interaction Paradigms

### 1.1 Aesthetic & Operational Vibe
Project Zero is a **desktop-grade educational IDE** tailored for undergraduate and graduate computer science students, researchers, and professors. It moves away from traditional web app forms toward a fluid, dark-mode native desktop atmosphere combining six iconic design languages:
- **Linear**: Sub-16ms tactile motion, keyboard-first navigation, sleek dark surfaces (`#0A0D14`), crisp typography.
- **Figma**: Infinity canvas with smooth vector zoom/pan, multi-node marquee selection, snap alignment guides.
- **VS Code**: Command palette (`Ctrl + K`), quad-pane layout composition, status bar telemetry, split views.
- **Raycast**: Instant universal search, contextual action triggers, fuzzy command matching.
- **Excalidraw**: Direct canvas manipulation, clean visual feedback halo rings, intuitive state node creation.
- **Notion**: Beautiful academic LaTeX math rendering, inline markdown hint cards, structured syllabus blocks.

### 1.2 Core UX Principles
1. **Zero-Latency Visual Feedback**: Every canvas click, drag, or keypress updates visual states under 16.6ms (60 FPS).
2. **Keyboard-First Omnipresence**: 100% of visual canvas actions, simulation controls, and navigation drawers accessible without mouse interaction.
3. **Quad-Pane Synchronized SSOT**: Editing in any pane (Canvas, Transition Table, Formal Definition, RegEx) instantly mutates all sibling views synchronously.
4. **Pedagogical Socratic Guardrails**: AI Tutor assists through progressive hint escalation (Conceptual $\to$ Structural $\to$ Counter-Example), never revealing direct solution graphs.
5. **Universal Accessibility Baseline**: Native WCAG 2.1 AA/AAA compliance, 2px visible yellow focus rings in high-contrast mode, full screen-reader ARIA live region announcements.

---

## SECTION 2: Universal Layout, Quad-Pane & Docking Framework

```
+-----------------------------------------------------------------------------------+
| GLOBAL HEADER: Project Title | Workspace Status | Save Indicator | Help | Settings  |
+-----------------------------------------------------------------------------------+
| TOOLBAR: Pointer | Add State | Add Edge | Delete | Simulate | Convert | AI Tutor |
+-------------------+-------------------------------------------+-------------------+
| SIDEBAR / NAV     | QUAD-PANE WORKSPACE                       | PROPERTY INSPECTOR|
| - Project Explorer| +--------------------+--------------------+ | - State Label     |
| - Syllabus Topics | | 1. Visual Canvas   | 2. Transition Table| | - Initial / Final |
| - Saved Models    | +--------------------+--------------------+ | - Edge Symbols    |
| - Quiz Banks      | | 3. Formal Math Spec| 4. RegEx / AST     | | - Position (x, y) |
|                   | +--------------------+--------------------+ |                   |
+-------------------+-------------------------------------------+-------------------+
| STATUS BAR: Mode | Zoom Level | Active States | Node Count | FPS | Keyboard Map   |
+-----------------------------------------------------------------------------------+
```

### 2.1 Resizable Panels & Layout Persistence
- **Grid Dividers**: 1px solid `--border-subtle` with 4px invisible hover/drag resize handles (`cursor: col-resize` / `row-resize`).
- **Panel Collapsibility**: Panels collapse to 36px icon strips via double-clicking divider borders or pressing `Ctrl + B` (Sidebar) / `Ctrl + Shift + P` (Inspector).
- **Layout Persistence**: Window dimensions, splitter ratios, pane visibility states, and active tabs serialize automatically to local storage (`v1_workspace_layout`).

### 2.2 Touch & Tablet Interaction Model (Criterion 14)
- **Minimum Hit Targets**: All touch targets enforce a minimum $48 \times 48\text{dp}$ touch bounding box.
- **Gesture Mappings**:
  - **Single Finger Tap**: Select node/edge element or focus input field.
  - **Two-Finger Drag**: Pan visual canvas spatially.
  - **Pinch-to-Zoom**: Smooth canvas vector zoom centered at pinch centroid.
  - **Long-Press (500ms)**: Trigger contextual right-click menu at finger position with haptic feedback.
  - **Divider Drag**: Touch handles on pane dividers expand to 16dp touch zones during active touch interaction.

### 2.3 Responsive Breakpoint Tiers & Pane Priority (Criterion 15)
- **Breakpoint Tiers**:
  - **Desktop Extra-Wide (`xl >= 1440px`)**: Full 4-Pane Grid active simultaneously.
  - **Desktop Standard (`lg >= 1024px`)**: Dual-Pane view with collapsible right-side drawer panels.
  - **Tablet (`md >= 768px`)**: Single-Pane tabbed view (`Canvas` | `Table` | `Math Spec` | `Simulation Trace`).
  - **Mobile (`sm < 768px`)**: Stacked single-column view with bottom sheet controls.
- **Pane Stacking Priority Order**: `Visual Canvas` (Priority 1) > `Property Inspector` (Priority 2) > `Simulation Trace` (Priority 3) > `Transition Table` (Priority 4).

### 2.4 Unified Error-State Taxonomy (Criterion 16)
- **Inline Warnings**: Non-blocking input validation warnings (e.g. non-deterministic transition in DFA mode) render as amber glowing node badges and inline field warning texts.
- **Toast Notifications**: Transient operational feedback (e.g. auto-save notification, non-fatal network reconnect) render as 5-second auto-dismissing toasts in bottom-right corner.
- **Modal Failover Dialogs**: Critical system failures (`ERR_SIMULATION_PATH_LIMIT_EXCEEDED`, `ERR_INDEXEDDB_QUOTA_EXCEEDED`, WebGL context loss) display full modal dialogs with explicit diagnostic error codes and 1-click remediation buttons.

### 2.5 Universal Empty-State Patterns (Criterion 17)
- **Empty Canvas**: Centered watermark illustration: *"Double-click anywhere or press 'S' to place initial state $q_0$"*.
- **Empty Transition Table**: Prompt message: *"Add alphabet symbols in the toolbar to populate transition matrix."*
- **Empty Search Results**: Clean vector icon with message: *"No matching projects, states, or commands found."*

---

## SECTION 3: Screen Specifications (19-Point Standardized Format)

### 3.1 Primary Workspace & Visual Graph Canvas

#### 1. Purpose
Provide an infinite 2D vector graph canvas for creating, editing, and inspecting Finite Automata (DFA, NFA, $\epsilon$-NFA) with visual feedback.

#### 2. Target User
Students building or debugging state diagrams; professors demonstrating machine transitions during lectures.

#### 3. Layout
Occupies top-left or full pane of the Quad-Pane IDE layout with floating canvas toolbar overlay (top-center) and spatial zoom controls (bottom-right).

#### 4. Component Hierarchy
`CanvasPaneContainer` $\to$ `FloatingToolbarPod` + `WebGL2CanvasLayer` + `ARIAOverlayDOMTree` + `ZoomWidgetPod`.

#### 5. Navigation Flow
`Dashboard` $\to$ Select Project $\to$ `Visual Graph Canvas` $\leftrightarrow$ Toggle Simulation Mode (`Space`) $\leftrightarrow$ Toggle AI Tutor (`Ctrl + K`).

#### 6. Toolbar
Contains tool selection buttons: Select (`V`), Add State (`S`), Add Transition (`T`), Erase (`E`), Center View (`Home`), Zoom In (`+`), Zoom Out (`-`).

#### 7. Sidebar
Displays Automaton Tree listing states ($q_0, q_1, \dots$), transition rules, connected alphabet symbols, and validation linter badges.

#### 8. Property Inspector
Displays active selection details: State Label input, `isInitial` checkbox, `isAccepting` checkbox, position coordinates $(x, y)$, and connected edge transition rules.

#### 9. Keyboard Shortcuts
- `V`: Pointer tool
- `S`: Add State tool (click canvas to drop state)
- `T`: Add Transition tool (drag from source to target node)
- `Delete` / `Backspace`: Remove selected nodes/edges
- `Space`: Toggle Simulation Play/Pause
- `Ctrl + MouseWheel`: Zoom canvas in/out

#### 10. Mouse Behaviour
- **Left Click Node**: Select node (highlights with 2px indigo halo ring).
- **Left Click Canvas Drag**: Box marquee multi-selection.
- **Middle Click / Right Click Drag**: Pan canvas view.
- **Double Click Canvas**: Instant state creation at cursor position.
- **Double Click Node Label**: Inline text edit state label.

#### 11. Touch Behaviour
- **Pinch-to-Zoom**: Smooth canvas zoom centered at pinch midpoint.
- **Two-Finger Drag**: Pan canvas.
- **Single Finger Tap Node**: Select state node.

#### 12. Animations
- **State Selection**: Node ring scale expansion $1.0 \to 1.08$ with `--ease-bounce` (150ms).
- **Edge Drawing**: Dynamic vector spring curve tracking cursor position during edge drag.
- **Simulation Active State**: Glowing cyan pulse ring (`--semantic-info`) around active state during execution steps.

#### 13. Loading States
Faint animated skeleton pulse on canvas grid during model load (< 50ms).

#### 14. Empty States
Centered watermark prompt: *"Double-click anywhere or press 'S' to place initial state $q_0$"*.

#### 15. Error States
Red glowing outline badge on nodes violating formal rules (e.g. non-deterministic transitions in DFA mode).

#### 16. Success States
Green checkmark flash badge when canvas passes validation lint pass.

#### 17. Accessibility
- Full screen reader DOM overlay mirroring node positions.
- Keyboard node traversal via `Tab` / `Arrow` keys.
- ARIA announcements: `"State q0 selected, initial state, non-accepting, 2 outgoing transitions."`

#### 18. Performance Expectations
- 60 FPS continuous rendering during pan/zoom with 100+ nodes.
- Redraw execution under 5ms per frame.

#### 19. Acceptance Criteria
- **Given** an empty canvas, **When** user double-clicks, **Then** state node $q_0$ is created, designated initial state, and announced via screen reader.

---

### 3.2 Transition Table Editor Pane

#### 1. Purpose
Display and edit automata transitions in a 2D matrix format ($Q \times \Sigma$).

#### 2. Target User
Students verifying total transition functions; instructors building formal matrix representations.

#### 3. Layout
Quad-Pane top-right container. Fixed row headers (State IDs), fixed column headers ($\Sigma$ symbols + $\epsilon$).

#### 4. Component Hierarchy
`TransitionTablePane` $\to$ `TableHeaderRow` + `MatrixGridScrollContainer` $\to$ `TableCellInput[]`.

#### 5. Navigation Flow
Synchronized side-by-side with Visual Canvas. Clicking a cell highlights corresponding canvas node and edge.

#### 6. Toolbar
Contains: Add Alphabet Symbol (`+Symbol`), Add State (`+State`), Toggle Deterministic Mode.

#### 7. Sidebar
N/A (Uses main workspace sidebar).

#### 8. Property Inspector
Updates to display target cell transition details when a table cell is focused.

#### 9. Keyboard Shortcuts
- `Tab` / `Shift + Tab`: Move cell focus right/left.
- `Enter` / `Down Arrow`: Move cell focus down.
- `Escape`: Cancel cell edit mode.

#### 10. Mouse Behaviour
- **Single Click Cell**: Focus cell for editing.
- **Double Click Header**: Edit alphabet symbol character.

#### 11. Touch Behaviour
Tap cell to trigger soft keyboard and edit transition targets.

#### 12. Animations
Subtle row highlight fade on canvas selection sync (100ms `--ease-out`).

#### 13. Loading States
Grid lines render instantly; cells populate via batch micro-task dispatch.

#### 14. Empty States
Placeholder message: *"Add alphabet symbols in the toolbar to populate transition matrix."*

#### 15. Error States
Cell turns amber with warning icon if entry introduces non-determinism in DFA mode.

#### 16. Success States
Cell border flashes green on valid transition entry commit.

#### 17. Accessibility
Renders as standard HTML `<table>` with `th scope="col/row"` headers and keyboard grid navigation (`role="grid"`).

#### 18. Performance Expectations
Table re-renders under 4ms on state/symbol mutations.

#### 19. Acceptance Criteria
- **Given** state $q_0$ and symbol 'a', **When** user enters `q1` in cell $(q_0, a)$, **Then** canvas creates directed edge $q_0 \xrightarrow{a} q_1$ synchronously.

---

### 3.3 Formal Definition Editor Pane

#### 1. Purpose
Display the formal 5-tuple mathematical definition $M = (Q, \Sigma, \delta, q_0, F)$ rendered in LaTeX formatting.

#### 2. Target User
Students studying formal definitions; professors demonstrating mathematical rigorousness.

#### 3. Layout
Quad-Pane bottom-left container. Styled academic paper layout with LaTeX rendering.

#### 4. Component Hierarchy
`FormalDefPane` $\to$ `LaTeXRenderBlock` $\to$ `TupleSection[Q, Sigma, Delta, q0, F]`.

#### 5. Navigation Flow
Read-only or structured text input mode synchronized with canvas state.

#### 6. Toolbar
Copy LaTeX Source (`Ctrl + Shift + C`), Export PDF, Toggle Raw/LaTeX view.

#### 7. Sidebar
N/A.

#### 8. Property Inspector
Displays tuple set cardinality ($|Q|, |\Sigma|, |F|$).

#### 9. Keyboard Shortcuts
- `Ctrl + Shift + C`: Copy LaTeX snippet to clipboard.

#### 10. Mouse Behaviour
- **Hover Tuple Component**: Highlights corresponding canvas element (e.g. hovering $F$ highlights accepting nodes).

#### 11. Touch Behaviour
Long-press equation block to display copy menu.

#### 12. Animations
Equation text smooth cross-fade on model mutation (150ms).

#### 13. Loading States
Skeleton lines matching 5-tuple layout structure.

#### 14. Empty States
Renders base 5-tuple template with empty set brackets ($M = (\emptyset, \emptyset, \delta, -, \emptyset)$).

#### 15. Error States
Red highlight under incomplete tuple elements (e.g. missing initial state $q_0$).

#### 16. Success States
Green checkmark icon next to formal tuple title when 5-tuple is mathematically total.

#### 17. Accessibility
TeX math formatted with ARIA labels describing set content (e.g. `aria-label="Set of states Q equals q0, q1"`).

#### 18. Performance Expectations
KaTeX re-render completed in < 10ms upon model edit.

#### 19. Acceptance Criteria
- **Given** a canvas with states $q_0, q_1$, **When** $q_1$ is marked accepting, **Then** Formal Definition automatically updates $F = \{q_1\}$ in LaTeX.

---

### 3.4 Simulation Workspace & Execution Trace Pane

#### 1. Purpose
Execute multi-step string evaluations, step playback, branch tree visualization, and step trace logging.

#### 2. Target User
Students testing input strings against their machines; instructors illustrating step-by-step state changes.

#### 3. Layout
Bottom workspace bar or Quad-Pane bottom-right container. Contains Step Controls (Play, Pause, Step Fwd, Step Back, Reset), Input String Bar, Step Trace Log Table, and Branch Tree View.

#### 4. Component Hierarchy
`SimulationPane` $\to$ `ControlBar` + `InputTape` + `StepTraceTable` + `BranchTreeView`.

#### 5. Navigation Flow
`Visual Canvas` $\to$ Enter Test String $\to$ Press `Space` $\to$ `Simulation Mode Active`.

#### 6. Toolbar
Contains: Input String Field, Run (`Space`), Step Forward (`Right Arrow`), Step Backward (`Left Arrow`), Reset (`R`), Speed Slider (0.5x to 4x).

#### 7. Sidebar
Displays Batch String Tester drawer (test array of strings simultaneously with pass/fail badges).

#### 8. Property Inspector
Displays current step details: Active States $Q_{active}$, Consumed Symbol, Remaining Suffix, Applied Transition Rule.

#### 9. Keyboard Shortcuts
- `Space`: Play / Pause Simulation
- `Right Arrow`: Step Forward
- `Left Arrow`: Step Backward
- `R`: Reset Simulation to Step 0

#### 10. Mouse Behaviour
- **Click Step Row**: Jump directly to target step configuration.
- **Click Play Button**: Start automatic step playback.

#### 11. Touch Behaviour
Tap control buttons; swipe left/right across input string tape to step forward/backward.

#### 12. Animations
- **Tape Movement**: Input tape slides left as symbols are consumed (200ms ease-out).
- **Active Node Pulse**: Active canvas node emits info halo glow.

#### 13. Loading States
Spinning indicator on string entry submit while solver calculates trace payload (< 5ms).

#### 14. Empty States
Prompt: *"Enter an input string above and press Run to simulate execution."*

#### 15. Error States
Red status banner: `HALT_REJECT` with explanation of missing transition or non-accepting halt state.

#### 16. Success States
Green status banner: `HALT_ACCEPT` with celebration checkmark badge.

#### 17. Accessibility
- `aria-live="polite"` region speaks each step transition: `"Step 2: Consumed symbol 'a', transitioned to state q1, 1 symbol remaining."`
- Full keyboard focus loop across playback controls.

#### 18. Performance Expectations
Instant step jumps (< 1ms) over pre-computed `ISimulationTrace` payloads.

#### 19. Acceptance Criteria
- **Given** DFA accepting `ab` and input string `ab`, **When** user steps forward twice, **Then** step 2 highlights accepting state $q_2$ in green and status displays `HALT_ACCEPT`.

---

### 3.5 AI Tutor & Socratic Hint Panel

#### 1. Purpose
Supply progressive Socratic guidance, mistake explanations, and counter-examples without outputting direct target solutions.

#### 2. Target User
Students struggling with exercise problems or debugging failing test cases.

#### 3. Layout
Right-side sliding drawer overlay (360px wide) or modal chat view.

#### 4. Component Hierarchy
`AITutorDrawer` $\to$ `HeaderBar` + `PedagogicalStageIndicator` + `MessageListScrollArea` + `PromptInputBox`.

#### 5. Navigation Flow
Click "Ask AI Tutor" button or press `Ctrl + K` $\to$ `AI Drawer Slides In`.

#### 6. Toolbar
Contains: Stage Badge (Level 1: Conceptual / Level 2: Structural / Level 3: Counter-Example), Clear Chat, Close Drawer (`Escape`).

#### 7. Sidebar
N/A.

#### 8. Property Inspector
N/A.

#### 9. Keyboard Shortcuts
- `Ctrl + K`: Open / Focus AI Tutor Chat Box.
- `Escape`: Close AI Tutor Drawer.
- `Enter`: Send message prompt.

#### 10. Mouse Behaviour
- **Click State Link in Chat**: Highlight mentioned state node on canvas.
- **Click "Explain Violation"**: Submit static linter error to AI Tutor for explanation.

#### 11. Touch Behaviour
Tap chat input; swipe right to close drawer.

#### 12. Animations
Drawer slide-in from right edge (250ms `--ease-out`); message character typing streaming animation.

#### 13. Loading States
Animated 3-dot pulsing indicator while AI Gateway grounds prompt and verifies response (< 1.5s).

#### 14. Empty States
Suggested prompt chips: *"Why does my machine fail on string 'aab'?"*, *"Explain DFA determinism"*, *"Give me a hint"*.

#### 15. Error States
Yellow warning banner: `"Offline Mode: Using local rule engine"`.

#### 16. Success States
Streamed response complete with syntax-highlighted LaTeX equations and clickable state badges.

#### 17. Accessibility
Chat messages announced via `aria-live="polite"`; chat drawer captures focus loop while open.

#### 18. Performance Expectations
Local template fallback responds in < 50ms; streamed online LLM response starts under 1.5s.

#### 19. Acceptance Criteria
- **Given** a student machine failing string `aab`, **When** student requests a hint, **Then** AI Tutor returns a Level 1 conceptual clue and counter-example string `aab` without outputting full solution graph.

---

### 3.6 Challenge Mode & Pumping Lemma Proof Workspace

#### 1. Purpose
Engage students in a turn-based proof game demonstrating language non-regularity via the Pumping Lemma ($s = xyz, |xy| \le p, |y| > 0$).

#### 2. Target User
Advanced students practicing formal proofs and non-regularity concepts.

#### 3. Layout
Full-screen interactive game board with String Decomposition Bar ($x, y, z$ segments), Stage Progress Tracker, and Adversary Chat Box.

#### 4. Component Hierarchy
`PumpingLemmaWorkspace` $\to$ `StageTracker` + `DecompositionBar` + `PumpingControls` + `ProofLogPanel`.

#### 5. Navigation Flow
`Dashboard` $\to$ `Challenge Mode` $\to$ Select Language $L = \{a^n b^n\}$ $\to$ `Game Loop (States 1–5)`.

#### 6. Toolbar
Contains: Language Selector, Restart Game, Show Formal Proof Rules.

#### 7. Sidebar
Displays Proof History Log recording all chosen strings and pumping exponents.

#### 8. Property Inspector
Displays string segment cardinalities ($|x|, |y|, |z|, |xy|$).

#### 9. Keyboard Shortcuts
- `Left / Right Arrow`: Adjust string split boundaries for $x$ and $y$.
- `Enter`: Submit pumping move.

#### 10. Mouse Behaviour
- **Drag Segment Handles**: Drag vertical sliders to adjust $x$ and $y$ string boundaries.
- **Click Exponent Buttons**: Select $i=0, 2, 3$.

#### 11. Touch Behaviour
Drag segment handles; tap exponent pills.

#### 12. Animations
String segment expansion animation when pumping $y^i$ (300ms spring curve).

#### 13. Loading States
Adversary "thinking" animation during computer turn (< 300ms).

#### 14. Empty States
Language selection screen prompting student to choose target proof.

#### 15. Error States
Red message badge if student selects string $s \notin L$ or $|s| < p$.

#### 16. Success States
Victory screen overlay: `"Proof Complete! You proved L is non-regular by pumping y^2 to produce string a^4 b^3 not in L."`

#### 17. Accessibility
String splits formatted as accessible text: `x="a", y="aa", z="bbb", Pumped (i=2): "aaaaabbb"`.

#### 18. Performance Expectations
String pumping and language membership evaluation completed under 10ms.

#### 19. Acceptance Criteria
- **Given** $L = \{a^n b^n\}$, $p=3$, $s=a^3 b^3$, **When** student pumps $i=2$, **Then** string $a^4 b^3$ is generated, flagged $a^4 b^3 \notin L$, and victory screen triggers.

---

## SECTION 4: End-to-End User Journeys

### 4.1 First-Time Student Onboarding Journey
1. **Landing Page**: Student arrives at Project Zero, greeted by hero demo showing interactive DFA simulation.
2. **Launch Workspace**: Student clicks "Launch Sandbox" $\to$ workspace initializes instantly in offline PWA mode.
3. **Interactive Guided Tour**: Unobtrusive tooltip spotlight highlights Canvas, Transition Table, and AI Tutor.
4. **First Machine Creation**: Student drops initial state $q_0$ and accepting state $q_1$, draws transition $q_0 \xrightarrow{a} q_1$.
5. **First Simulation**: Student types string `a` in simulation bar and hits `Space` $\to$ glowing pulse advances state to $q_1$ with `HALT_ACCEPT`.

### 4.2 Professor Classroom Demonstration Journey
1. **Open Project Manager**: Professor presses `Ctrl + O` to open saved lecture projects.
2. **Load Benchmark Machine**: Professor loads complex 8-state NFA project.
3. **Toggle Presentation Density**: Professor hits `F11` for full-screen mode and toggles High-Contrast mode for classroom projector clarity.
4. **Step-by-Step Simulation**: Professor steps through multi-path NFA evaluation; branch tree view illustrates parallel computation paths clearly to students.
5. **1-Click Conversion**: Professor clicks "Convert NFA $\to$ DFA" $\to$ algorithm converts graph step-by-step, displaying subset state mappings ($D_1 = \{q_0, q_1\}$) live.

---

## SECTION 5: Global UX Behaviors & Accessibility Workflows

### 5.1 Focus Management & Keyboard Traversal
- **Logical Tab Order**: Focus moves top-to-bottom, left-to-right through Header $\to$ Toolbar $\to$ Active Quad-Pane $\to$ Inspector $\to$ Status Bar.
- **Canvas Keyboard Navigation**: Pressing `Tab` cycles through canvas nodes. Pressing `Arrow Keys` moves focused node spatially. Pressing `Enter` toggles node accepting status.

### 5.2 Reduced Motion & High Contrast Overrides
- **`prefers-reduced-motion`**: Disables spring animations, halo pulses, and sliding drawers, replacing them with instant opacity cross-fades (0ms duration).
- **High Contrast Theme**: Forces 7:1 contrast ratio, 2px solid yellow focus outlines (`#FFFF00`), and pure black canvas backdrop (`#000000`).

---
