# Complete System Feature Specification

## Project Zero: AI-Powered Interactive Learning Platform for Models of Computation

**Document**: `04_Feature_Specification.md`  
**Version**: 1.0.0  
**Status**: APPROVED FOR IMPLEMENTATION  

---

## Executive Overview & Engineering Specification Standards

This document establishes the definitive, zero-ambiguity Feature Specification for **Project Zero (Module 2: Finite Automata & Regular Languages)**. 

Acting under the joint oversight of Senior Product Management, Senior UX Design, Principal Frontend Architecture, and Theoretical Computer Science Pedagogy, this specification defines the explicit functional mechanisms, user interactions, error handling, validation constraints, keyboard shortcuts, touch gestures, AI behaviors, accessibility overlays, and Given-When-Then acceptance criteria for every feature in the platform.

Nothing in this document is left to developer interpretation.

---

## 1. DFA Builder

### 1.1 Purpose
Enable students to visually construct, inspect, and modify valid Deterministic Finite Automata (DFA) $M = (Q, \Sigma, \delta, q_0, F)$ under strict determinism rules.

### 1.2 User Goals
- Visually build DFAs from scratch or templates.
- Enforce the formal requirement that every state $q \in Q$ has exactly one outgoing transition for every symbol $\sigma \in \Sigma$.
- Easily set initial states ($q_0$) and accepting state sets ($F$).

### 1.3 Functional Description
The DFA Builder provides a structured canvas environment tailored for deterministic automata. It enforces $\Sigma$-completeness and single-transition determinism during node and edge creation, dynamically flagging non-deterministic or incomplete states.

### 1.4 User Workflow
1. User selects "DFA Mode" from the mode selector toolbar.
2. User creates states by double-clicking canvas or pressing `N`.
3. User connects states by dragging from a state border handle to a target state.
4. User selects transition symbols from the alphabet picker modal/popover.
5. User toggles Initial State (press `I`) or Accepting State (press `A`).
6. System continuously lints the DFA for completeness over alphabet $\Sigma$.

### 1.5 User Interface Behaviour
- Canvas toolbar highlights "DFA Mode".
- DFA states render as blue single circles ($Q$), accepting states as concentric double circles ($F$), and initial state with an incoming arrow labeled "Start".
- Outgoing transitions display alphabet labels (e.g. `a, b`). Missing transitions trigger an amber outline on the incomplete node.

### 1.6 Mouse Interactions
- **Left-Click State**: Select state node.
- **Left-Click + Drag State**: Reposition node with force-directed snap grid.
- **Drag from State Ring Handle**: Draw new transition edge to target node or self-loop.
- **Double-Click State**: Toggle accepting state status.
- **Right-Click State**: Context menu (Mark Initial, Toggle Accepting, Rename, Delete).

### 1.7 Keyboard Shortcuts
- `N`: Create new state at current cursor position.
- `I`: Toggle initial state for selected node.
- `A`: Toggle accepting state for selected node.
- `Delete` / `Backspace`: Remove selected node or edge.
- `Ctrl + Z` / `Ctrl + Y`: Undo / Redo DFA mutation.

### 1.8 Touch Behaviour (Future Compatibility)
- **Tap State**: Select state.
- **Drag State**: Move state node.
- **Two-Finger Drag from Ring**: Draw transition arrow to target state.
- **Long-Press State**: Open context menu.

### 1.9 Validation Rules
- **Initial State Constraint**: Exactly one initial state $|q_0| = 1$.
- **Determinism Constraint**: For every state $q \in Q$ and symbol $a \in \Sigma$, $|\delta(q, a)| = 1$.
- **No Epsilon Transitions**: $\epsilon$-transitions strictly prohibited in DFA Mode.

### 1.10 Error States
- **ERR_DFA_INCOMPLETE**: State $q_i$ lacks an outgoing transition for symbol $\sigma \in \Sigma$.
- **ERR_DFA_NON_DETERMINISTIC**: State $q_i$ has multiple outgoing transitions for symbol $\sigma$.

### 1.11 Recovery Behaviour
- System provides a 1-Click "Add Sink/Dead State ($q_{dead}$)" auto-fix button to automatically satisfy $\Sigma$-completeness.

### 1.12 AI Behaviour
- AI Tutor detects missing transitions and prompts: *"To complete this DFA, where should state q1 transition when reading symbol 'b'?"*

### 1.13 Animation Behaviour
- Node creation pop-in (200ms spring curve).
- Non-deterministic error pulse (amber halo glow, 300ms ease-in-out).

### 1.14 Accessibility Behaviour
- States announced via ARIA overlay: `"State q0, Initial State, Accepting State, 2 outgoing transitions"`.
- Keyboard Tab/Arrow navigation moves focus across states.

### 1.15 Performance Expectations
- Sub-millisecond determinism checks (< 2ms) for graphs up to 100 states. 60 FPS rendering.

### 1.16 Edge Cases
- Deleting an initial state prompts automatic reassignment or flags `ERR_MISSING_INITIAL_STATE`.

### 1.17 Acceptance Criteria
- **Given** a DFA canvas with alphabet $\Sigma = \{a, b\}$, **When** state $q_0$ has outgoing transitions for 'a' and 'b', **Then** $q_0$ validation indicator displays green valid checkmark.

### 1.18 Future Extension Points
- Support for Mealy and Moore state machine outputs in Phase 4.

---

## 2. NFA Builder

### 2.1 Purpose
Allow students to construct Non-Deterministic Finite Automata (NFA) $M = (Q, \Sigma, \delta, q_0, F)$ supporting zero, one, or multiple outgoing transitions per symbol.

### 2.2 User Goals
- Model multi-path non-deterministic computation graphs.
- Understand parallel state transitions without strict DFA completeness requirements.

### 2.3 Functional Description
The NFA Builder relaxes DFA transition constraints, allowing multiple transitions on identical symbols from any state, as well as dead-end branches.

### 2.4 User Workflow
1. Select "NFA Mode" from the workspace mode bar.
2. Add states ($q_0, q_1, \dots$).
3. Draw multiple transitions from state $q_0$ using symbol 'a' pointing to both $q_1$ and $q_2$.
4. Test strings in the simulation engine to visualize branching computational trees.

### 2.5 User Interface Behaviour
- Canvas toolbar displays "NFA Mode".
- Multi-branching transitions display comma-separated symbols; parallel transitions between the same state pair render with split curved arcs.

### 2.6 Mouse Interactions
- Same as DFA Builder; drawing duplicate symbol transitions from a state does not raise non-determinism error badges.

### 2.7 Keyboard Shortcuts
- `N`: Create state.
- `I`: Set initial state.
- `A`: Set accepting state.
- `Delete`: Delete element.

### 2.8 Touch Behaviour (Future Compatibility)
- Touch tap-and-drag for multi-target edge creation.

### 2.9 Validation Rules
- Exactly one initial state $|q_0| = 1$.
- Transition function mapping $\delta: Q \times \Sigma \to \mathcal{P}(Q)$.

### 2.10 Error States
- **ERR_NO_INITIAL_STATE**: No initial state designated.
- **ERR_INVALID_SYMBOL**: Transition symbol not in alphabet $\Sigma$.

### 2.11 Recovery Behaviour
- Inline prompt asking user to click any state to mark as $q_0$.

### 2.12 AI Behaviour
- AI Tutor explains non-determinism: *"State q0 now branches into two simultaneous active computation paths on symbol 'a'."*

### 2.13 Animation Behaviour
- Multi-edge splitting animation (250ms smooth arc expansion).

### 2.14 Accessibility Behaviour
- ARIA label lists set of destination states: `"State q0, outgoing transition on 'a' to states q1 and q2"`.

### 2.15 Performance Expectations
- Multi-path transition parsing completed in < 5ms.

### 2.16 Edge Cases
- Unreachable states highlighted with low-contrast opacity warning.

### 2.17 Acceptance Criteria
- **Given** an NFA, **When** state $q_0$ has transitions for symbol 'a' to both $q_1$ and $q_2$, **Then** system accepts the configuration without non-determinism errors.

### 2.18 Future Extension Points
- Visual conversion shortcut directly into Subset Construction engine.

---

## 3. ε-NFA Builder

### 3.1 Purpose
Provide visual building tools for Non-Deterministic Finite Automata with Epsilon ($\epsilon$) transitions, permitting spontaneous state hops without consuming input symbols.

### 3.2 User Goals
- Build $\epsilon$-NFA models to understand spontaneous transitions and $\epsilon$-closures.
- Prepare machines for Thompson's RegEx conversion algorithms.

### 3.3 Functional Description
Extends NFA functionality by introducing $\epsilon$ (epsilon/null) transition capabilities. Users can insert $\epsilon$ transitions via explicit keyboard shortcuts or symbol selection.

### 3.4 User Workflow
1. Select "$\epsilon$-NFA Mode".
2. Draw an edge between $q_0$ and $q_1$.
3. Select symbol $\epsilon$ (or type `eps` / `\e`).
4. System renders a distinct dashed transition arrow labeled $\varepsilon$.

### 3.5 User Interface Behaviour
- $\varepsilon$ transitions render as dashed/dotted curved arrows with Greek letter $\varepsilon$.
- $\epsilon$-closure sets $\text{ECL}(q)$ automatically highlighted when selecting a state node.

### 3.6 Mouse Interactions
- Standard drawing interaction; right-clicking an edge provides "Convert to $\varepsilon$-transition" quick action.

### 3.7 Keyboard Shortcuts
- `E` (while drawing edge): Insert $\varepsilon$ transition immediately.
- `C` (with state selected): Highlight $\epsilon$-closure set on canvas.

### 3.8 Touch Behaviour (Future Compatibility)
- Long-press edge $\to$ select "Make $\varepsilon$-Transition".

### 3.9 Validation Rules
- Transition mapping $\delta: Q \times (\Sigma \cup \{\varepsilon\}) \to \mathcal{P}(Q)$.
- Detection of cyclic $\epsilon$-loops (e.g. $q_0 \xrightarrow{\varepsilon} q_1 \xrightarrow{\varepsilon} q_0$).

### 3.10 Error States
- **WARN_EPSILON_CYCLE**: Infinite $\epsilon$-loop detected; system flags cycle states without locking simulation.

### 3.11 Recovery Behaviour
- System automatically caps $\epsilon$-hop traversal depth during simulation to prevent infinite call stacks.

### 3.12 AI Behaviour
- Explains $\epsilon$-closures: *"The ε-closure of state q0 includes {q0, q1, q2} because the machine can reach them without reading any input symbol."*

### 3.13 Animation Behaviour
- Dashed $\varepsilon$ arrow line animation (continuous slow pulse along direction of path).

### 3.14 Accessibility Behaviour
- Screen reader announces: `"Epsilon transition from q0 to q1, spontaneous hop"`.

### 3.15 Performance Expectations
- $\epsilon$-closure calculation $\text{ECL}(Q)$ completes in < 3ms for up to 100 states.

### 3.16 Edge Cases
- Self-loop on $\varepsilon$ automatically pruned with warning (redundant spontaneous hop).

### 3.17 Acceptance Criteria
- **Given** an edge from $q_0$ to $q_1$, **When** user types `\e`, **Then** edge transforms into a dashed arrow labeled $\varepsilon$ and $q_1 \in \text{ECL}(q_0)$.

### 3.18 Future Extension Points
- Direct export into Thompson's Construction step visualizer.

---

## 4. Regular Expression Builder & AST Parser

### 4.1 Purpose
Allow users to enter, parse, validate, and inspect Regular Expressions (RegEx), visualizing their Abstract Syntax Trees (AST).

### 4.2 User Goals
- Input formal regular expressions using standard operators ($+$, $\cdot$, $*$).
- Inspect the hierarchical AST structure of a RegEx.
- Convert RegEx directly into equivalent $\epsilon$-NFA / DFA models.

### 4.3 Functional Description
Features an IDE-grade expression input bar with real-time operator syntax highlighting, bracket matching, error diagnosis, and interactive AST visual tree rendering.

### 4.4 User Workflow
1. User focuses RegEx Input Bar (`Ctrl + Shift + R`).
2. User types expression (e.g. `(a+b)*ab`).
3. System parses expression in real-time, building the AST.
4. AST panel below input bar updates visually with operator nodes ($\cup$, $\circ$, $*$) and leaf symbol nodes.
5. User clicks "Convert to NFA (Thompson)" to generate equivalent automaton.

### 4.5 User Interface Behaviour
- Input bar features syntax highlighting: Operators (Purple), Symbols (Blue), Parentheses (Yellow matching pairs).
- AST Tree panel renders interactive SVG tree nodes. Clicking an AST node highlights corresponding expression substring.

### 4.6 Mouse Interactions
- **Click AST Node**: Highlight expression range in text bar.
- **Hover Operator Node**: Tooltip explains operator semantics (e.g., "Kleene Star: 0 or more repetitions").

### 4.7 Keyboard Shortcuts
- `Ctrl + Shift + R`: Focus RegEx input bar.
- `Enter` (in RegEx bar): Trigger AST parse and NFA conversion.

### 4.8 Touch Behaviour (Future Compatibility)
- Tap AST tree nodes to expand/collapse subtree branches.

### 4.9 Validation Rules
- Syntax validation: Balanced parentheses `()`, valid binary operator placement ($a+b$), valid postfix operator placement ($a^*$).
- Alphabet extraction: Automatically populates $\Sigma$ from leaf symbols.

### 4.10 Error States
- **ERR_REGEX_UNBALANCED_PAREN**: Unmatched opening/closing parenthesis at index $N$.
- **ERR_REGEX_EMPTY_OPERAND**: Trailing operator without operand (e.g. `a+`).

### 4.11 Recovery Behaviour
- Red squiggly underline at exact error character index with inline fix suggestion.

### 4.12 AI Behaviour
- Explains expression structure: *"This RegEx matches any sequence of 'a's and 'b's that ends strictly with the substring 'ab'."*

### 4.13 Animation Behaviour
- AST Tree branch expansion (300ms ease-out tree layout transition).

### 4.14 Accessibility Behaviour
- AST rendered as nested accessible HTML tree structure (`<ul role="tree">`).

### 4.15 Performance Expectations
- AST parsing and visual tree generation < 10ms for expressions up to 200 characters.

### 4.16 Edge Cases
- Redundant operators (e.g. `(a*)*`) automatically simplified in AST while preserving raw user text.

### 4.17 Acceptance Criteria
- **Given** input `a(b+c)*`, **When** parsed, **Then** AST tree displays Concatenation root node with left leaf `a` and right Kleene Star subtree `(b+c)*`.

### 4.18 Future Extension Points
- Direct conversion to Regular Grammar rules for Module 3.

---

## 5. Transition Table Editor

### 5.1 Purpose
Provide a tabular matrix representation $Q \times \Sigma \to \mathcal{P}(Q)$ for editing and inspecting automata transitions.

### 5.2 User Goals
- View and edit transitions in an accessible tabular matrix format.
- Rapidly fill out transition rules for large state sets.

### 5.3 Functional Description
A two-dimensional grid with states $Q$ as rows and alphabet symbols $\Sigma \cup \{\varepsilon\}$ as columns. Cell values represent destination state sets.

### 5.4 User Workflow
1. User opens Transition Table panel (`Alt + 3`).
2. User clicks a table cell (e.g., Row $q_0$, Column `a`).
3. User types destination state name (e.g. `q1` or `q1, q2` for NFA).
4. Pressing `Enter` or `Tab` commits change and moves to adjacent cell.
5. Canvas and Formal Definition update in real-time.

### 5.5 User Interface Behaviour
- Grid headers display states with icons ($\rightarrow$ for Initial, $\odot$ for Accepting).
- Active editing cell highlights with blue border. Invalid state entries flash red border.

### 5.6 Mouse Interactions
- **Single-Click Cell**: Select cell for inline text editing.
- **Double-Click Row Header**: Rename state node.
- **Right-Click Row Header**: Delete state row.

### 5.7 Keyboard Shortcuts
- `Tab` / `Shift + Tab`: Move to next/previous cell in grid.
- `Arrow Keys`: Navigate grid cells.
- `Enter`: Commit cell value and move down.

### 5.8 Touch Behaviour (Future Compatibility)
- Tap cell to bring up virtual keyboard with quick state-name suggestion chips.

### 5.9 Validation Rules
- Entered state names must exist in state set $Q$. Typing non-existent state $q_{new}$ prompts: "Create new state $q_{new}$?".
- DFA cells accept strictly 1 state name.

### 5.10 Error States
- **ERR_TABLE_INVALID_STATE**: State name entered does not exist and auto-creation was declined.

### 5.11 Recovery Behaviour
- Cell reverts to previous valid value upon pressing `Escape`.

### 5.12 AI Behaviour
- AI flags blank cells in DFA mode: *"Cell (q1, b) is empty. DFAs require a transition for every symbol."*

### 5.13 Animation Behaviour
- Cell mutation flash (yellow background highlight, 400ms fade).

### 5.14 Accessibility Behaviour
- Rendered using standard semantic `<table>` markup with `scope="col"` and `scope="row"` headers.

### 5.15 Performance Expectations
- Grid cell commit to SSOT update < 5ms.

### 5.16 Edge Cases
- Adding a new symbol to alphabet $\Sigma$ automatically appends a new column to the grid.

### 5.17 Acceptance Criteria
- **Given** cell $(q_0, a)$, **When** user enters `q1`, **Then** canvas draws edge $q_0 \xrightarrow{a} q_1$ within < 16ms.

### 5.18 Future Extension Points
- Export transition table directly to CSV / Markdown table format.

---

## 6. Formal Definition Editor (LaTeX 5-Tuple)

### 6.1 Purpose
Render and edit the formal 5-tuple mathematical definition $M = (Q, \Sigma, \delta, q_0, F)$ using formatted LaTeX mathematical notation.

### 6.2 User Goals
- View mathematical set representations of active automata.
- Copy LaTeX code directly into homework, assignments, and research publications.

### 6.3 Functional Description
Provides a real-time rendered LaTeX mathematical view displaying $Q = \{q_0, q_1, \dots\}$, $\Sigma = \{a, b\}$, $\delta$ transition rules, $q_0$, and $F = \{q_f\}$.

### 6.4 User Workflow
1. Open Formal 5-Tuple panel (`Alt + 2`).
2. View real-time rendered LaTeX notation.
3. Click "Copy LaTeX Code" button to copy raw `\mathbb` / `\delta` code to clipboard.
4. Optionally click "Edit Formal Text" to modify set declarations ($F = \{q_1\}$) via text.

### 6.5 User Interface Behaviour
- Crisp KaTeX rendered equations with clear set brackets and greek symbols.
- Hovering over a set in the 5-tuple (e.g. $F = \{q_1\}$) highlights corresponding nodes on the canvas.

### 6.6 Mouse Interactions
- **Click Set Element**: Highlight corresponding state/edge in Canvas.
- **Click "Copy LaTeX"**: Trigger clipboard copy.

### 6.7 Keyboard Shortcuts
- `Alt + 2`: Toggle Formal Definition Panel.
- `Ctrl + Shift + C` (when panel focused): Copy LaTeX code.

### 6.8 Touch Behaviour (Future Compatibility)
- Long-press LaTeX snippet to trigger native share/copy sheet.

### 6.9 Validation Rules
- Textual edits to formal sets must maintain valid set syntax (e.g., $F \subseteq Q$).

### 6.10 Error States
- **ERR_FORMAL_SUBSET_VIOLATION**: Accepting set $F$ contains state $q_x \notin Q$.

### 6.11 Recovery Behaviour
- Inline error tooltip highlighting syntax mismatch, restoring last valid LaTeX string on `Escape`.

### 6.12 AI Behaviour
- Explains 5-tuple components: *"The formal definition M = (Q, Σ, δ, q0, F) defines Q as the set of states and F as accepting states."*

### 6.13 Animation Behaviour
- Text transition fade when formal set contents change (150ms ease-in-out).

### 6.14 Accessibility Behaviour
- LaTeX equations rendered with hidden ARIA math text alternative (e.g. `aria-label="M equals tuple Q, Sigma, delta, q0, F"`).

### 6.15 Performance Expectations
- KaTeX rendering pipeline < 10ms upon model mutation.

### 6.16 Edge Cases
- Empty accepting set $F = \emptyset$ formatted correctly as `\emptyset` symbol.

### 6.17 Acceptance Criteria
- **Given** an accepting state $q_1$, **When** $q_1$ is marked as accepting, **Then** LaTeX panel updates $F = \{q_1\}$ instantly.

### 6.18 Future Extension Points
- Direct export into formal LaTeX document template wrappers.

---

## 7. Interactive Graph Canvas

### 7.1 Purpose
Serve as the central visual workspace for interactive node-link diagram rendering, spatial navigation, and visual graph editing.

### 7.2 User Goals
- Drag, zoom, pan, and layout automata diagrams effortlessly.
- Support smooth 60 FPS visual rendering for complex state graphs.

### 7.3 Functional Description
High-performance dual WebGL / Canvas2D rendering viewport backed by QuadTree spatial indexing and ARIA DOM screen reader overlay synchronization.

### 7.4 User Workflow
1. User moves cursor over canvas.
2. User drags nodes to adjust spatial layout.
3. User zooms in/out via mouse wheel (`Ctrl + Wheel`) or pinch gesture.
4. User pans canvas using `Space + Drag` or middle-mouse drag.
5. User selects multiple nodes via marquee selection box (`Shift + Drag`).

### 7.5 User Interface Behaviour
- Canvas displays subtle dot-grid background that scales with zoom level.
- Selected nodes display glowing selection rings; active drag edges follow cursor smoothly.

### 7.6 Mouse Interactions
- **Wheel**: Zoom canvas viewport (10% to 500%).
- **Middle-Click + Drag**: Pan canvas viewport.
- **Shift + Drag**: Draw marquee selection box to select multiple nodes.
- **Click Background**: Deselect all nodes.

### 7.7 Keyboard Shortcuts
- `Space + Drag`: Pan canvas.
- `Ctrl + 0`: Reset zoom and center graph.
- `Ctrl + +` / `Ctrl + -`: Zoom in / Zoom out.
- `Shift + Click`: Toggle node multi-selection.

### 7.8 Touch Behaviour (Future Compatibility)
- **Pinch to Zoom**: Scale viewport.
- **Two-Finger Drag**: Pan canvas viewport.
- **One-Finger Drag State**: Move node position.

### 7.9 Validation Rules
- Nodes constrained within spatial boundary limits; QuadTree indexes node coordinates dynamically.

### 7.10 Error States
- **WARN_WEBGL_CONTEXT_LOST**: WebGL context lost; system automatically falls back to Canvas2D renderer seamlessly.

### 7.11 Recovery Behaviour
- Canvas2D fallback restores graph rendering instantly without state loss.

### 7.12 AI Behaviour
- AI can trigger automated graph auto-layout (Force-Directed) if nodes overlap excessively.

### 7.13 Animation Behaviour
- Smooth pan/zoom interpolation; force-directed layout spring animation (300ms easing).

### 7.14 Accessibility Behaviour
- ARIA DOM overlay elements mirror visual node coordinates, allowing screen-reader navigation and keyboard movement.

### 7.15 Performance Expectations
- 60 FPS rendering up to 500 nodes and 1,000 edges. Render frame duration < 16.6ms.

### 7.16 Edge Cases
- Extremely dense graph topologies trigger automated edge curvature adjustments to prevent visual arc collisions.

### 7.17 Acceptance Criteria
- **Given** 100 nodes on canvas, **When** user pans and zooms, **Then** framerate remains solid 60 FPS without jank.

### 7.18 Future Extension Points
- 3D graph visualization mode for complex state machines in Phase 5.

---

## 8. Step-by-Step Simulation Engine & Execution Controls

### 8.1 Purpose
Execute step-by-step string evaluation on automata with visual playback, active state pulsing, and explicit transition tracking.

### 8.2 User Goals
- Trace input string processing step-by-step.
- Observe active state changes, branching, and accept/reject outcomes.

### 8.3 Functional Description
Provides deterministic step execution controls (Play, Pause, Step Forward, Step Backward, Reset) paired with visual read-head highlighting and state pulse animations.

### 8.4 User Workflow
1. User enters string $w$ into simulation bar (e.g. `abbab`).
2. User clicks "Start Simulation" (or `Ctrl + Enter`).
3. User uses simulation playback controls:
   - **Play/Pause** (`Space`)
   - **Step Forward** (`Right Arrow`)
   - **Step Backward** (`Left Arrow`)
   - **Reset** (`R`)
4. Active states pulse green (valid step) or red (rejection/deadlock).

### 8.5 User Interface Behaviour
- Input string display box shows current read-head position underlined and highlighted.
- Active states pulse with glowing halos; active transition edges highlight along directional curve.

### 8.6 Mouse Interactions
- **Click Play/Pause**: Toggle auto-stepping playback.
- **Click Step Slider**: Jump directly to step $N$ in execution trace.

### 8.7 Keyboard Shortcuts
- `Space`: Toggle Play/Pause simulation.
- `Right Arrow`: Step Forward 1 step.
- `Left Arrow`: Step Backward 1 step.
- `R`: Reset simulation to initial state.

### 8.8 Touch Behaviour (Future Compatibility)
- Swipe Right / Swipe Left on simulation bar to step forward / backward.

### 8.9 Validation Rules
- Simulation disabled if machine has no initial state $q_0$.
- Input string symbols must belong to alphabet $\Sigma$.

### 8.10 Error States
- **HALT_REJECT**: String ends in non-accepting state $q_k$.
- **HALT_DEADLOCK**: No transition exists for current symbol from active state $q_k$.

### 8.11 Recovery Behaviour
- Inspection panel displays exact step and state where deadlock occurred with "Explain Failure" button.

### 8.12 AI Behaviour
- AI Tutor explains step rationale: *"At step 3, symbol 'b' was consumed. Machine transitioned from q0 to q1."*

### 8.13 Animation Behaviour
- State glow pulse (300ms cubic-bezier); read-head underline slide animation.

### 8.14 Accessibility Behaviour
- Step updates announced via `aria-live="polite"`: `"Step 2: Consumed 'a'. Active state q1. Remaining string 'bb'."`

### 8.15 Performance Expectations
- Execution step calculations < 1ms; smooth animation playback up to 10 steps/sec.

### 8.16 Edge Cases
- Non-deterministic branching executes parallel multi-path state sets $\{q_1, q_2\}$ simultaneously.

### 8.17 Acceptance Criteria
- **Given** string `ab` and initial state $q_0$, **When** user steps forward, **Then** symbol `a` is consumed and active state updates to $\delta(q_0, a)$.

### 8.18 Future Extension Points
- Dual read/write tape head simulation for Phase 3 Turing Machines.

---

## 9. Execution Trace & Inspection Inspector

### 9.1 Purpose
Display structured, detailed step-by-step logs and multi-path execution trees for simulation runs.

### 9.2 User Goals
- Inspect complete computational path history.
- Debug non-deterministic branching trees and deadlock reasons.

### 9.3 Functional Description
A dedicated inspection log panel rendering step index, active configuration $(Q_{active}, w_{remaining})$, consumed symbol, transition rule used, and selection rationale.

### 9.4 User Workflow
1. User opens Execution Trace panel (`Alt + 4`).
2. As simulation steps execute, new log entries append to tree log view.
3. User clicks any past step log entry $\to$ Canvas and simulation controls jump back to that exact step state.

### 9.5 User Interface Behaviour
- Tree view for NFA multi-path branching; linear list for DFA execution.
- Highlights active branch paths in green and rejected/deadlocked paths in red.

### 9.6 Mouse Interactions
- **Click Trace Entry**: Jump simulation state to selected step.
- **Hover Branch Node**: Highlight corresponding state path on visual canvas.

### 9.7 Keyboard Shortcuts
- `Alt + 4`: Toggle Execution Trace Panel.
- `Up / Down Arrow`: Navigate trace log list entries.

### 9.8 Touch Behaviour (Future Compatibility)
- Tap trace entry to jump playback head.

### 9.9 Validation Rules
- Trace log entries generated immutably from `@project-zero/core-solver` simulation outputs.

### 9.10 Error States
- **ERR_TRACE_MEMORY_CAP**: NFA branching exceeds path memory budget ($> 2^{20}$ active paths); trace auto-prunes redundant branches.

### 9.11 Recovery Behaviour
- Displays warning banner: *"Branch tree pruned redundant configurations to preserve memory."*

### 9.12 AI Behaviour
- AI uses verified JSON trace payload to generate accurate Socratic hints without hallucinations.

### 9.13 Animation Behaviour
- Log entry slide-in animation (150ms ease-out).

### 9.14 Accessibility Behaviour
- Rendered as an accessible semantic `<ol role="tree">` list.

### 9.15 Performance Expectations
- Log render update < 5ms per step.

### 9.16 Edge Cases
- Cyclic $\epsilon$-moves capped in log output to prevent infinite scroll DOM bloat.

### 9.17 Acceptance Criteria
- **Given** a 5-step simulation, **When** user clicks step 3 in trace log, **Then** canvas highlights configuration at step 3.

### 9.18 Future Extension Points
- Export trace execution logs as structured JSON / Markdown audit reports.

---

## 10. Animated Conversion Suite

### 10.1 Purpose
Provide step-by-step animated algorithms for automata conversions ($\epsilon\text{-NFA} \to \text{NFA} \to \text{DFA}$, DFA Minimization, $\text{RegEx} \to \text{NFA}$, $\text{DFA} \to \text{RegEx}$).

### 10.2 User Goals
- Master textbook automata conversion algorithms visually.
- Practice manual subset construction in interactive student mode.

### 10.3 Functional Description
Supports two operational modes: (1) **Animated Auto Mode** (step-by-step visual execution with pseudocode highlighting), and (2) **Manual Student Mode** (interactive prompt testing student predictions).

### 10.4 User Workflow
1. User selects "Conversions" menu $\to$ chooses "NFA to DFA (Subset Construction)".
2. User chooses "Auto Animated" or "Manual Student Practice".
3. In Auto Mode: Step through power-set state creation ($P_0, P_1, \dots$). Canvas morphs NFA state clusters into combined DFA nodes.
4. In Manual Mode: System prompts: *"What is the ε-closure of {q0}?"*. Student inputs set; system validates.

### 10.5 User Interface Behaviour
- Dual-pane view: Left pane displays original machine; Right pane displays converted machine assembling in real time.
- Bottom panel shows side-by-side algorithm pseudocode and $O(2^N)$ computational complexity indicators.

### 10.6 Mouse Interactions
- **Click Step Button**: Advance conversion algorithm step.
- **Click Pseudocode Line**: Highlight corresponding graph transformation.

### 10.7 Keyboard Shortcuts
- `Space`: Advance next conversion step.
- `M`: Toggle between Auto and Manual Student Mode.

### 10.8 Touch Behaviour (Future Compatibility)
- Swipe left to advance conversion algorithm step.

### 10.9 Validation Rules & Deterministic Ordering Rules
- **Canonical Ordering Rules**: State subsets, power-set tuples, and transition lists follow strict lexicographic ordering (e.g. state IDs sorted $q_0 < q_1 < q_2$, alphabet symbols sorted $a < b < c$). Intermediate conversion steps emit canonical state labels sorted deterministically.
- **Equivalent-Solution Validation**: In Manual Student Mode, student input validation operates on mathematical set equivalence rather than strict string order. A student entering $\{q_1, q_0\}$ is recognized as identical to canonical $\{q_0, q_1\}$, preventing false error flags.
- **Solver Contract**: Manual Mode predictions are validated against deterministic solver output (`@project-zero/core-solver`) via `IConversionResult`.

### 10.10 Error States
- **ERR_CONVERSION_STUDENT_INCORRECT**: Student entered incorrect subset state; system highlights missing or extra states relative to canonical set.

### 10.11 Recovery Behaviour
- System provides "Show Hint" or "Reveal Step" buttons to guide student forward.

### 10.12 AI Behaviour
- Explains conversion logic: *"Subset state {q0, q1} was formed because reading symbol 'a' from q0 can reach either q0 or q1."*

### 10.13 Animation Behaviour
- State merging spring animation (400ms morph transition).

### 10.14 Accessibility Behaviour
- Intermediate subset tables rendered as accessible HTML data tables with `aria-live` updates.

### 10.15 Performance Expectations
- Conversion step calculation < 10ms; animation rendered at 60 FPS.

### 10.16 Edge Cases
- Large state spaces ($N > 12$) trigger warning and switch to paginated subset view.

### 10.17 Acceptance Criteria
- **Given** an NFA, **When** subset construction completes, **Then** generated DFA is mathematically equivalent and passes equivalence testing.

### 10.18 Future Extension Points
- Support for Chomsky Normal Form (CNF) grammar conversions in Phase 2.

---

## 11. Real-Time Mathematical Validation Engine

### 11.1 Purpose
Perform continuous mathematical linting on active models to catch errors (non-determinism, missing transitions, dead states) with 1-click auto-fixes.

### 11.2 User Goals
- Receive instant feedback on model mathematical errors.
- Understand formal constraints violated and apply automated repairs.

### 11.3 Functional Description
Background static analysis linter operating under 5ms, continuously evaluating model correctness against formal definitions.

### 11.4 User Workflow
1. User edits model on canvas or table.
2. Validation Engine runs static analysis pass.
3. If error exists, warning badge appears on node and in Validation List.
4. User clicks "Explain & Fix" $\to$ Modal displays formal theorem violated and offers 1-Click Auto-Fix.

### 11.5 User Interface Behaviour
- Validation panel list categorizes items as Errors (Red), Warnings (Amber), or Info (Blue).
- Badges display icon indicator directly on affected canvas nodes.

### 11.6 Mouse Interactions
- **Click Validation Item**: Focus affected canvas node and open explanation drawer.
- **Click 1-Click Auto-Fix**: Apply automated repair transaction.

### 11.7 Keyboard Shortcuts
- `Ctrl + Shift + V`: Trigger manual validation pass.

### 11.8 Touch Behaviour (Future Compatibility)
- Tap validation badge on canvas node to open diagnostic popup.

### 11.9 Validation Rules & Complexity Thresholds
- **Validation Suite**: Checks: (1) Initial state count $= 1$, (2) DFA completeness, (3) DFA determinism, (4) Unreachable states, (5) Dead/sink states without accepting path, (6) RegEx parenthesis validity.
- **Configurable Complexity Thresholds**: Validation execution dynamically adjusts mode based on active model size ($|Q|, |\Sigma|, |\delta|$):
  - **Synchronous Mode**: Small models below configured complexity thresholds run instant synchronous validation on the main thread during edits.
  - **Asynchronous Mode**: Models exceeding complexity thresholds automatically offload static linter passes to background Web Worker threads with debounced input scheduling.
- **Dynamic Execution Budgets**: Validation passes respect environment-configured execution budgets (`IExecutionBudget`), preventing UI thread locks without relying on static timing guarantees.

### 11.10 Error States
- **ERR_DFA_NON_DETERMINISTIC**: Multiple outgoing transitions on same symbol in DFA.
- **ERR_UNREACHABLE_STATE**: State cannot be reached from initial state $q_0$.

### 11.11 Recovery Behaviour
- Auto-Fix action applies atomic transaction (e.g. adding dead state or removing unreachable node).

### 11.12 AI Behaviour
- Explains formal rules: *"In a DFA, the transition function δ must be total, meaning every state must have a defined transition for every symbol in Σ."*

### 11.13 Animation Behaviour
- Error badge red pulse (300ms ease-in-out).

### 11.14 Accessibility Behaviour
- Error list rendered with `role="alert"` for critical errors, supporting screen reader navigation.

### 11.15 Performance Expectations
- Validation passes complete responsively within environment execution budget thresholds without blocking frame render loops.

### 11.16 Edge Cases
- Validation errors do not lock visual builder edits, but block entering Simulation Mode.

### 11.17 Acceptance Criteria
- **Given** a DFA with state $q_0$ having two 'a' transitions, **When** static linter runs, **Then** `ERR_DFA_NON_DETERMINISTIC` is raised immediately.

### 11.18 Future Extension Points
- Custom validation rule scripts for course instructors.

---

## 12. Context-Aware Socratic AI Tutor & Debugger

### 12.1 Purpose
Provide intelligent, progressive Socratic tutoring, mistake diagnosis, and counter-example generation without outputting direct homework solutions.

### 12.2 User Goals
- Receive step-by-step guidance when stuck.
- Understand why a machine fails specific test cases.

### 12.3 Functional Description
An AI pedagogical agent integrated with `ai-gateway`. Uses verified JSON traces from `@project-zero/core-solver` to generate progressive multi-level hints and counter-examples.

### 12.4 User Workflow
1. Student clicks "Ask AI Tutor" (`Ctrl + K`) or fails a test case.
2. AI analyzes current SSOT model snapshot and execution trace.
3. AI returns progressive hint:
   - **Level 1 (Conceptual)**: Clue about formal rules.
   - **Level 2 (Structural)**: Clue about specific state/edge errors.
   - **Level 3 (Counter-Example)**: Specific string $w$ that machine misclassifies.
4. If offline, local deterministic template engine handles query.

### 12.5 User Interface Behaviour
- Chat drawer slides out from right side of screen.
- Streamed responses render character-by-character with syntax-highlighted LaTeX and state references.

### 12.6 Mouse Interactions
- **Click "Ask AI Tutor" Button**: Open chat drawer.
- **Click State Reference in Chat**: Highlight mentioned state on visual canvas.

### 12.7 Keyboard Shortcuts
- `Ctrl + K`: Open/Focus AI Tutor Chat Interface.
- `Escape`: Close chat drawer.

### 12.8 Touch Behaviour (Future Compatibility)
- Swipe left from right edge to open AI Tutor drawer.

### 12.9 Grounding Workflow, Deterministic Verification & Response Validation
- **Grounding Workflow**: User queries are never sent raw to external LLMs. The AI Gateway intercepts requests, extracts the SSOT snapshot (`IAutomaton`), executes the solver to produce a deterministic trace payload (`ISimulationTrace`), and embeds the verified trace directly into structured prompt scaffolding.
- **Deterministic Verification (`ITraceVerifier`)**: Evaluates LLM text outputs against the exact execution trace (`ISimulationTrace`) generated by `@project-zero/core-solver`. If an LLM response contains state assertions that contradict the verified solver trace, the response is discarded.
- **Response Validation (`IResponseValidator`)**: Streamed or completed responses pass through real-time structural validation against versioned JSON Schema definitions. Malformed responses trigger instant rejection.
- **Prompt Versioning**: Socratic prompt templates are version-controlled text artifacts (`v1.0.0`, `v1.1.0`) with explicit pedagogical stage bounds (`CONCEPTUAL_HINT`, `STRUCTURAL_HINT`, `COUNTER_EXAMPLE`).
- **Fallback Behaviour**: On network failure, rate limiting, LLM hallucination/verification rejection, or schema validation failure, the system silently fails over to the local deterministic rule-based template engine.

### 12.10 Error States
- **ERR_AI_OFFLINE**: Network unavailable; system switches to local template engine with notification badge: `"Offline Mode: Using local rule engine"`.
- **ERR_AI_VERIFICATION_FAILED**: LLM response rejected by `ITraceVerifier`; system fails over to local rule engine.

### 12.11 Recovery Behaviour
- Local template generator provides instant deterministic hint without error dialogs or broken chat state.

### 12.12 AI Behaviour
- Socratic Guardrail: Enforces progressive hint level escalation. Refuses direct requests to "draw the complete answer".

### 12.13 Animation Behaviour
- Chat drawer slide-in (250ms ease-in-out); message typing streaming animation.

### 12.14 Accessibility Behaviour
- Chat messages announced via `aria-live="polite"` region; full keyboard focus loop within drawer.

### 12.15 Performance Expectations
- Online response streaming starts < 1.5s; local fallback instant (< 50ms).

### 12.16 Edge Cases
- Rapid repeated prompt requests debounced to prevent API rate-limiting.

### 12.17 Acceptance Criteria
- **Given** a student machine failing string `aab`, **When** student requests a hint, **Then** AI Tutor returns a Level 1 conceptual clue and counter-example string `aab` without outputting full solution graph.

### 12.18 Future Extension Points
- Multimodal diagram OCR scanner input in Phase 5.

---

## 13. Progressive Pedagogical Hint Engine

### 13.1 Purpose
Manage progressive hint level escalation (Level 1 $\to$ Level 2 $\to$ Level 3) to prevent answer disclosure and encourage problem-solving.

### 13.2 User Goals
- Get minimal assistance first, escalating to detailed counter-examples only when needed.

### 13.3 Functional Description
Stateful engine (`IAISessionManager`) tracking student hint history per problem, controlling hint level unlocks and pedagogical progression.

### 13.4 User Workflow
1. Student clicks "Get Hint".
2. System provides Level 1 (Conceptual Hint). Hint button label updates to "Get Deeper Hint (Level 2)".
3. Student clicks again $\to$ Level 2 (Structural Hint) unlocks.
4. Student clicks third time $\to$ Level 3 (Counter-Example) unlocks.

### 13.5 User Interface Behaviour
- Progressive hint cards display a 3-step indicator bar (● ○ ○ $\to$ ● ● ○ $\to$ ● ● ●).

### 13.6 Mouse Interactions
- **Click "Get Deeper Hint"**: Unlock next progression stage.

### 13.7 Keyboard Shortcuts
- `Ctrl + Shift + H`: Trigger next hint level.

### 13.8 Touch Behaviour (Future Compatibility)
- Tap hint card step chip to view previously unlocked hints.

### 13.9 Validation Rules
- Hint levels unlock sequentially; Level 3 cannot be accessed without receiving Level 1 and 2 first.

### 13.10 Error States
- **ERR_HINT_SESSION_EXPIRED**: Problem reset by student; hint level resets to Level 1.

### 13.11 Recovery Behaviour
- Re-initializes hint session state cleanly upon problem selection.

### 13.12 AI Behaviour
- Tailors hint content based on active stage (`CONCEPTUAL_HINT`, `STRUCTURAL_HINT`, `COUNTER_EXAMPLE`).

### 13.13 Animation Behaviour
- Step indicator fill animation (200ms ease-out); card height expansion (250ms easing).

### 13.14 Accessibility Behaviour
- Hint level changes announced: `"Unlocked Level 2 Structural Hint"`.

### 13.15 Performance Expectations
- Hint state evaluation < 2ms.

### 13.16 Edge Cases
- Modifying canvas model resets hint level to Level 1 for new validation pass.

### 13.17 Acceptance Criteria
- **Given** a new problem, **When** student requests first hint, **Then** system outputs Level 1 hint and sets progression indicator to 1/3.

### 13.18 Future Extension Points
- Adaptive learning analytics tracking hint reliance over time.

---

## 14. Practice Mode & Automated Test Bench

### 14.1 Purpose
Provide an interactive problem-solving workbench where students build automata to satisfy formal language specifications and run automated test suites.

### 14.2 User Goals
- Practice building machines for specific target languages (e.g. $L = \{w \mid w \text{ contains an even number of 'a's}\}$).
- Run automated test benches with pass/fail test case matrices.

### 14.3 Functional Description
Integrates problem description, target specification, interactive builder, and an automated Test Bench running strings against student machines in parallel.

### 14.4 User Workflow
1. Student selects problem from Practice Catalogue.
2. Problem panel displays target language specification and test cases (Accepted Strings, Rejected Strings).
3. Student constructs machine on canvas.
4. Student clicks "Run Test Suite" (`Ctrl + Enter`).
5. Test Bench runs string suite: Green checkmarks for passed strings, Red X badges for failed test cases.

### 14.5 User Interface Behaviour
- Test Bench table lists: Test String, Expected Result, Actual Result, Status (PASS/FAIL).
- Clicking a failed test string loads it directly into the Simulation Engine for debugging.

### 14.6 Mouse Interactions
- **Click "Run Test Suite"**: Execute test batch.
- **Click Failed Test Row**: Load string into Simulation Engine.

### 14.7 Keyboard Shortcuts
- `Ctrl + Enter`: Run Test Suite batch.

### 14.8 Touch Behaviour (Future Compatibility)
- Tap test result row to view execution trace popup.

### 14.9 Validation Rules
- Test suite evaluates strings against `@project-zero/core-solver` execution engine. Machine marked "Complete" only when 100% test cases pass.

### 14.10 Error States
- **TEST_SUITE_FAIL**: 1 or more test cases failed; progress status remains "In Progress".

### 14.11 Recovery Behaviour
- Failed test case offers "Debug in Simulation" button.

### 14.12 AI Behaviour
- AI Tutor analyzes failed test case matrix to offer targeted guidance.

### 14.13 Animation Behaviour
- Test case pass/fail row status pop-in animation (50ms stagger per row).

### 14.14 Accessibility Behaviour
- Test results announced via `aria-live`: `"Test suite completed: 4 passed, 1 failed."`

### 14.15 Performance Expectations
- Batch execution of 50 test strings < 15ms.

### 14.16 Edge Cases
- Hidden test cases evaluated upon final submission to prevent over-fitting.

### 14.17 Acceptance Criteria
- **Given** a problem with 10 test strings, **When** student machine correctly accepts/rejects all 10, **Then** problem status updates to "SOLVED" with celebration animation.

### 14.18 Future Extension Points
- Teacher portal for uploading custom test suites.

---

## 15. Quiz Mode & Formative Assessment

### 15.1 Purpose
Deliver structured formative assessment quizzes (multiple choice, theoretical concept checks, machine completion tasks) with instant feedback.

### 15.2 User Goals
- Assess theoretical understanding of formal regular languages.
- Complete timed or untimed module knowledge checks.

### 15.3 Functional Description
A quiz interface presenting theoretical and practical questions, tracking score, time elapsed, and detailed answer explanations upon completion.

### 15.4 User Workflow
1. Student enters Quiz Mode for Module 2.
2. System presents Question 1 of $N$ (e.g. "Which of the following languages is regular?").
3. Student selects option or completes interactive canvas task.
4. Student clicks "Next Question" or "Submit Quiz".
5. Results screen displays final score, time taken, and detailed mathematical explanations for each question.

### 15.5 User Interface Behaviour
- Clean card layout with progress bar ($N/M$ completed) and optional countdown timer.
- Selected options highlight with blue border; submitted correct answers display green, incorrect red.

### 15.6 Mouse Interactions
- **Click Option Card**: Select answer.
- **Click "Submit Quiz"**: Finalize submission.

### 15.7 Keyboard Shortcuts
- `1 - 4`: Select corresponding option choice.
- `Enter`: Advance to next question.

### 15.8 Touch Behaviour (Future Compatibility)
- Tap option card to select.

### 15.9 Validation Rules
- All questions must be answered prior to submission (or explicit confirmation prompted).

### 15.10 Error States
- **ERR_UNANSWERED_QUESTIONS**: Confirmation modal: *"You have 2 unanswered questions. Submit anyway?"*.

### 15.11 Recovery Behaviour
- Allows returning to unanswered questions before final lock.

### 15.12 AI Behaviour
- AI Tutor provides post-quiz breakdown explaining core concept misconceptions.

### 15.13 Animation Behaviour
- Question card slide transition (200ms ease-in-out); progress bar fill.

### 15.14 Accessibility Behaviour
- Options group formatted as standard accessible `<fieldset>` with radio buttons.

### 15.15 Performance Expectations
- Quiz state transitions instant (< 5ms).

### 15.16 Edge Cases
- Browser refresh during quiz preserves active answers in IndexedDB local draft state.

### 15.17 Acceptance Criteria
- **Given** a 5-question quiz, **When** student submits with 4 correct answers, **Then** results screen displays "Score: 80%" with detailed explanations.

### 15.18 Future Extension Points
- LMS (Canvas/Moodle) gradebook export integration in Phase 4.

---

## 16. Challenge Mode & Pumping Lemma Proof Game

### 16.1 Purpose
Engage students in an interactive adversarial game proving non-regularity of languages using the Pumping Lemma ($s = xyz, |xy| \le p, |y| > 0$).

### 16.2 User Goals
- Master Pumping Lemma non-regularity proofs through interactive game mechanics.
- Defeat the computer adversary by selecting winning string decompositions and pumping exponents.

### 16.3 Functional Description & Finite State Workflow
A formal 5-stage finite state workflow staging Adversary moves vs Student moves to construct mathematical contradiction proofs demonstrating non-regularity.

### 16.4 User Workflow & Game State Transitions
- **STATE 1: `STATE_PICK_LANGUAGE`**: Student selects target non-regular language (e.g. $L = \{a^n b^n \mid n \ge 0\}$). Workflow transitions to State 2.
- **STATE 2: `STATE_ADVERSARY_PUMPING_LENGTH`**: System (Adversary) selects pumping length $p$ (e.g. $p=3$). Workflow transitions to State 3.
- **STATE 3: `STATE_STUDENT_STRING_SELECTION`**: Student enters string $s \in L$ satisfying $|s| \ge p$ (e.g. $s = a^3 b^3$). System validates membership; workflow transitions to State 4.
- **STATE 4: `STATE_ADVERSARY_DECOMPOSITION`**: System evaluates all valid decompositions $s = xyz$ satisfying $|xy| \le p$ and $|y| > 0$. Workflow transitions to State 5.
- **STATE 5: `STATE_STUDENT_PUMPING_EXPONENT`**: Student selects pumping exponent $i \neq 1$ (e.g. $i=0$ or $i=2$). System evaluates $xy^i z$; if $xy^i z \notin L$, student wins and proof completes.

### 16.5 User Interface Behaviour
- Visual game board displaying active state phase indicator (State 1 through 5).
- String decomposition bar with color-coded segments: $x$ (Blue), $y$ (Orange), $z$ (Green).
- Pumping animation repeats $y$ segment $i$ times visually, highlighting language violation.

### 16.6 Mouse Interactions
- **Drag Split Sliders**: Adjust string split boundaries for $x$ and $y$.
- **Click Exponent Buttons**: Set $i=0, 2, 3$.

### 16.7 Keyboard Shortcuts
- `Enter`: Submit move step.
- `Left / Right Arrow`: Adjust split indices.

### 16.8 Touch Behaviour (Future Compatibility)
- Drag segment handles to split string.

### 16.9 Validation Rules
- Enforces formal Pumping Lemma rules: $s \in L$, $|s| \ge p$, $|xy| \le p$, $|y| > 0$. Validates string non-membership after pumping.

### 16.10 Error States
- **ERR_INVALID_STRING_CHOICE**: Student selected $s \notin L$ or $|s| < p$.

### 16.11 Recovery Behaviour
- System explains rule violation and prompts student to pick a valid string $s$.

### 16.12 AI Behaviour
- Proof Advisor: *"Great choice setting i=2! Notice how xy^2z has 4 'a's but 3 'b's, which breaks the condition for L = {a^n b^n}."*

### 16.13 Animation Behaviour
- String segment expansion animation when pumping $y^i$ (300ms spring curve).

### 16.14 Accessibility Behaviour
- String splits formatted as text: `x="a", y="aa", z="bbb", Pumped (i=2): "aaaaabbb"`.

### 16.15 Performance Expectations
- Membership testing and string pumping evaluation < 10ms.

### 16.16 Edge Cases
- Handles empty $x$ segment ($|x|=0$) correctly when $y$ starts at index 0.

### 16.17 Acceptance Criteria
- **Given** $L = \{a^n b^n\}$, $p=3$, $s=a^3 b^3$, **When** student pumps $i=2$, **Then** string $a^4 b^3$ is generated, flagged $a^4 b^3 \notin L$, and victory screen triggers.

### 16.18 Future Extension Points
- Extension to Pumping Lemma for Context-Free Languages ($uvwxy$) in Phase 2.

---

## 17. Project Save & Persistence (IndexedDB)

### 17.1 Purpose
Persist user computational models, active workspace layouts, and exercise progress locally in browser IndexedDB with automatic auto-save.

### 17.2 User Goals
- Retain all work locally without risk of data loss upon browser refresh or close.
- Support 100% offline persistence without external cloud backend dependencies.

### 17.3 Functional Description
Uses browser IndexedDB storage managed by an auto-save manager and schema migration pipeline (`ISchemaMigration`).

### 17.4 User Workflow
1. User creates or edits machine on canvas.
2. System auto-saves workspace state to IndexedDB (debounced at 500ms after last edit).
3. Auto-save status indicator in header displays "Saved locally" with green checkmark.
4. Pressing `Ctrl + S` triggers immediate manual save pass.

### 17.5 User Interface Behaviour
- Header status indicator transitions: "Saving..." (Amber spinning dot) $\to$ "Saved locally" (Green checkmark).

### 17.6 Mouse Interactions
- **Click "Save" Icon**: Trigger immediate manual save.

### 17.7 Keyboard Shortcuts
- `Ctrl + S`: Save Project immediately.

### 17.8 Touch Behaviour (Future Compatibility)
- Tap save indicator icon to view local storage version details.

### 17.9 Validation Rules, Schema Versioning & Migration Behaviour
- **Model Schema Validation**: Serialized workspace JSON payloads validate against `ProjectSchema_v1.0` JSON Schema definitions.
- **IndexedDB Schema Versioning**: Local IndexedDB database instances maintain an integer version counter (`schemaVersion`).
- **Migration Pipeline (`ISchemaMigration`)**: Schema updates execute declarative version migration scripts during IndexedDB `onupgradeneeded` events. Legacy model payloads loaded into memory are upgraded automatically via payload transformers without data loss.

### 17.10 Error States
- **ERR_INDEXEDDB_QUOTA_EXCEEDED**: Storage quota full (`QuotaExceededError`).
- **ERR_SCHEMA_VERSION_MISMATCH**: Legacy payload format detected requiring schema migration.

### 17.11 Quota Recovery & Fallback Behaviour
- **Quota Recovery Strategy**: Upon encountering `QuotaExceededError`, the system executes automated quota recovery: (1) Truncates oldest rolling telemetry/debug log entries in IndexedDB, (2) Clears non-essential simulation step cache buffers, and (3) Re-attempts project commit. If quota remains full, prompts user to export local project `.pz.json` backup.
- **Migration Fallback**: If schema migration encounters unknown legacy formats, loads project in safe mode preserving raw model structure.

### 17.12 AI Behaviour
- N/A.

### 17.13 Animation Behaviour
- Status icon rotation and checkmark fade (200ms ease-out).

### 17.14 Accessibility Behaviour
- Save status announced via `aria-live="polite"`: `"Project saved locally."`

### 17.15 Performance Expectations
- IndexedDB commit operation completed in < 20ms in background Web Worker thread.

### 17.16 Edge Cases
- Handles multi-tab open workspaces by locking active project instance via Web Locks API.

### 17.17 Acceptance Criteria
- **Given** an edited DFA, **When** browser is refreshed, **Then** workspace re-loads exact graph state, node coordinates, and test results from IndexedDB.

### 17.18 Future Extension Points
- Cloud sync backup endpoints in Phase 4.

---

## 18. Project Load & JSON Schema Importer

### 18.1 Purpose
Load saved projects from IndexedDB or import `.pz.json` project files, validating schema compatibility and executing payload migrations.

### 18.2 User Goals
- Open previously saved projects.
- Import shared project files from instructors or peers safely.

### 18.3 Functional Description
Features a Project File Importer backed by a JSON Schema validator and schema migration transformer pipeline (`ISchemaMigration`).

### 18.4 User Workflow
1. User clicks "File" $\to$ "Open Project" (`Ctrl + O`).
2. Project Manager modal displays list of locally saved IndexedDB projects and an "Import File" button.
3. User selects a local project or uploads a `.pz.json` file.
4. Schema validator verifies file format. If legacy version detected, migration pipeline upgrades payload in memory.
5. Canvas and workspace state re-hydrate cleanly.

### 18.5 User Interface Behaviour
- File Drop Zone highlights with dashed blue outline during file drag-and-drop.
- Loading spinner displays during project hydration.

### 18.6 Mouse Interactions
- **Click Project Item**: Load project.
- **Drag & Drop File**: Drop `.pz.json` file onto canvas to open.

### 18.7 Keyboard Shortcuts
- `Ctrl + O`: Open Project Manager dialog.

### 18.8 Touch Behaviour (Future Compatibility)
- Tap project item card to open.

### 18.9 Validation Rules
- Files validated against `ProjectSchema_v1.0` JSON Schema. Malformed structures rejected.

### 18.10 Error States
- **ERR_INVALID_JSON_SCHEMA**: File is not valid JSON or violates schema requirements (missing $Q$ or $\delta$).

### 18.11 Recovery Behaviour
- Modal displays exact validation line error and offers "Load Sample Project" fallback.

### 18.12 AI Behaviour
- N/A.

### 18.13 Animation Behaviour
- Modal fade-in (150ms ease-out); drop zone pulse.

### 18.14 Accessibility Behaviour
- Open file dialog controls fully operable via keyboard; status announced to screen readers.

### 18.15 Performance Expectations
- Project parsing and canvas re-hydration < 25ms.

### 18.16 Edge Cases
- Legacy version payloads automatically transformed via `transformPayload()` without user intervention.

### 18.17 Acceptance Criteria
- **Given** a valid `.pz.json` file dropped onto canvas, **When** processed, **Then** machine renders on canvas accurately within < 25ms.

### 18.18 Future Extension Points
- Import legacy JFLAP (`.jff`) files in Phase 3.

---

## 19. Project Export Engine (SVG, PNG, LaTeX TikZ, JSON)

### 19.1 Purpose
Export user computational models in publication-ready vector formats (SVG), high-res images (PNG), LaTeX TikZ code, and portable JSON files.

### 19.2 User Goals
- Export machine diagrams for inclusion in homework reports, slides, and papers.
- Save portable `.pz.json` project backups.

### 19.3 Functional Description
A multi-format Export Engine generating vector diagrams, formatted LaTeX TikZ code, 4K PNG images, and structured JSON files.

### 19.4 User Workflow
1. User clicks "Export" button (`Ctrl + E`).
2. Export Modal presents format options:
   - **SVG Vector**: Scalable vector graphics.
   - **PNG Image**: High-res bitmap image (1x, 2x, 4x scale).
   - **LaTeX TikZ**: Standalone TikZ state diagram code & 5-tuple text.
   - **JSON Project**: Raw `.pz.json` backup file.
3. User configures options (e.g. Transparent Background, Include 5-Tuple).
4. User clicks "Download" or "Copy to Clipboard".

### 19.5 User Interface Behaviour
- Export Modal shows live export preview thumbnail.
- "Copy Code" button displays temporary "Copied!" green checkmark badge upon click.

### 19.6 Mouse Interactions
- **Click Export Option Card**: Select format.
- **Click "Download"**: Trigger browser file download.

### 19.7 Keyboard Shortcuts
- `Ctrl + E`: Open Export Modal.
- `Enter`: Trigger download for selected format.

### 19.8 Touch Behaviour (Future Compatibility)
- Tap format card to select; tap share button to trigger native mobile share sheet.

### 19.9 Validation Rules
- Export generated directly from active SSOT model instance (`IAutomataModel`).

### 19.10 Error States
- **ERR_EXPORT_CANVAS_BLANK**: Canvas contains zero nodes; export disabled with warning message.

### 19.11 Recovery Behaviour
- Prompts user to create at least one state before exporting.

### 19.12 AI Behaviour
- N/A.

### 19.13 Animation Behaviour
- Export modal slide-in (200ms easing); preview image fade-in.

### 19.14 Accessibility Behaviour
- Export dialog keyboard navigable; copied LaTeX code announced via `aria-live`.

### 19.15 Performance Expectations
- SVG/LaTeX generation < 50ms; 4K PNG canvas render export < 150ms.

### 19.16 Edge Cases
- Custom state node labels with special LaTeX characters sanitized for TikZ compatibility.

### 19.17 Acceptance Criteria
- **Given** a 5-state DFA, **When** user exports LaTeX TikZ, **Then** output contains valid compiles-out-of-the-box TikZ `\begin{tikzpicture}` code.

### 19.18 Future Extension Points
- Direct export into animated GIF / WebM simulation recording files in Phase 4.

---

## 20. Theme System (Dark/Light/High Contrast Accessibility)

### 20.1 Purpose
Supply curated, accessible visual themes (Dark Mode, Light Mode, High-Contrast Accessibility Mode) satisfying WCAG 2.1 AAA color contrast standards.

### 20.2 User Goals
- Customize visual aesthetics for low-light or high-light environments.
- Enable High-Contrast mode for visual impairment accessibility compliance.

### 20.3 Functional Description
A CSS custom property tokenized design system (`tokens.css`) supporting dynamic theme switching without re-rendering canvas WebGL contexts.

### 20.4 User Workflow
1. User clicks Theme Switcher in top navigation bar (or presses `Alt + T`).
2. Theme drops down options: "Dark (Default)", "Light", "High Contrast (AAA)".
3. User selects theme $\to$ Entire UI and visual canvas palette swap instantly.
4. Preference saved to `localStorage` for future sessions.

### 20.5 User Interface Behaviour
- **Dark Mode**: Rich slate background (`#0F172A`), electric blue node strokes (`#38BDF8`), neon accent nodes.
- **Light Mode**: Crisp white/gray background (`#F8FAFC`), deep navy node strokes (`#1E293B`).
- **High Contrast**: Pure black background (`#000000`), stark yellow node strokes (`#FFFF00`), thick outlines.

### 20.6 Mouse Interactions
- **Click Theme Switcher**: Toggle theme dropdown.

### 20.7 Keyboard Shortcuts
- `Alt + T`: Cycle through available themes.

### 20.8 Touch Behaviour (Future Compatibility)
- Tap theme toggle chip.

### 20.9 Validation Rules
- All theme color pairs must satisfy WCAG 2.1 AA (4.5:1 ratio) for text and AAA (7:1 ratio) in High Contrast mode.

### 20.10 Error States
- N/A.

### 20.11 Recovery Behaviour
- Defaults to system preference (`prefers-color-scheme`) if invalid stored theme key detected.

### 20.12 AI Behaviour
- N/A.

### 20.13 Animation Behaviour
- Smooth color theme cross-fade transition (200ms ease-in-out).

### 20.14 Accessibility Behaviour
- Full WCAG 2.1 AAA compliance in High Contrast mode; respects `prefers-contrast` media queries.

### 20.15 Performance Expectations
- Theme swap completed in < 16ms across UI and WebGL shaders without context reload.

### 20.16 Edge Cases
- Canvas WebGL node shader uniforms update colors dynamically without clearing node geometry buffers.

### 20.17 Acceptance Criteria
- **Given** High Contrast mode selected, **When** tested with accessibility contrast analyzer, **Then** all text and canvas elements pass 7:1 contrast ratio.

### 20.18 Future Extension Points
- User-customizable accent color picker.

---

## 21. Global Keyboard Navigation & Shortcuts System

### 21.1 Purpose
Provide full keyboard-driven workspace control, allowing mouse-free platform operation for power users and accessible navigation.

### 21.2 User Goals
- Perform all visual builder, simulation, and editing actions entirely via keyboard.
- Access global shortcut cheatsheet instantly.

### 21.3 Functional Description
A centralized keyboard shortcut registry and event bus interceptor (`IKeyboardRegistry`) managing shortcut keybindings, modal focus traps, and spatial node navigation.

### 21.4 User Workflow
1. User presses `?` or `Ctrl + /` anywhere in workspace.
2. Keyboard Shortcut Cheatsheet modal opens displaying categorized keybindings.
3. User presses `N` to add state, `Tab` to navigate nodes, `I` to set initial state, `Space` to run simulation.

### 21.5 User Interface Behaviour
- Focused canvas elements display high-visibility focus indicator ring (3px solid cyan).
- Cheatsheet modal displays keybindings with styled `<kbd>` chips.

### 21.6 Mouse Interactions
- **Click Cheatsheet Button**: Open shortcut help modal.

### 21.7 Keyboard Shortcuts
- `?` / `Ctrl + /`: Open Keyboard Shortcuts Cheatsheet.
- `N`: New State.
- `I`: Toggle Initial State.
- `A`: Toggle Accepting State.
- `Delete` / `Backspace`: Delete selected element.
- `Space`: Play/Pause simulation.
- `Right Arrow` / `Left Arrow`: Step Forward / Step Backward.
- `Ctrl + Z` / `Ctrl + Y`: Undo / Redo.
- `Alt + 1` to `Alt + 4`: Switch Workspace Panes.
- `Ctrl + K`: Open AI Tutor.
- `Ctrl + S`: Save Project.
- `Ctrl + O`: Open Project.
- `Ctrl + E`: Export Diagram.

### 21.8 Touch Behaviour (Future Compatibility)
- On-screen floating action button to trigger virtual keyboard shortcut palette.

### 21.9 Validation Rules
- Shortcuts disabled while typing inside text input fields or table cells (except `Esc` and `Enter`).

### 21.10 Error States
- **ERR_SHORTCUT_CONFLICT**: Keybinding registered twice; registry resolves precedence to active focused panel.

### 21.11 Recovery Behaviour
- Pressing `Escape` cancels active keybinding operations and closes open modals.

### 21.12 AI Behaviour
- AI can remind user of relevant shortcuts: *"Tip: Press 'Space' to step through this simulation faster."*

### 21.13 Animation Behaviour
- Shortcut modal fade-in (150ms easing).

### 21.14 Accessibility Behaviour
- Implements WAI-ARIA Keyboard Navigation patterns with focus trap management inside active dialogs.

### 21.15 Performance Expectations
- Key event dispatch and action execution < 2ms.

### 21.16 Edge Cases
- Cross-platform key mapping automatically converts `Ctrl` to `Cmd` on macOS devices.

### 21.17 Acceptance Criteria
- **Given** an active canvas, **When** user presses `N` then `I` then `A`, **Then** a new state is created, marked initial, and marked accepting without touching the mouse.

### 21.18 Future Extension Points
- Customizable user keybinding remapping panel.

---

## 22. Universal Screen-Reader Accessibility & ARIA Overlay Engine

### 22.1 Purpose
Guarantee 100% screen-reader accessibility (WCAG 2.1 AA / AAA compliant) across the visual graph canvas and interactive workspace.

### 22.2 User Goals
- Enable visually impaired students using NVDA, JAWS, or VoiceOver to build, edit, simulate, and inspect theoretical computation models.

### 22.3 Functional Description
An ARIA DOM Sync Overlay (`IARIAOverlaySync` in `canvas-renderer/accessibility/`) that mirrors visual WebGL canvas elements into accessible, focusable DOM elements synchronized in real time with graph state.

### 22.4 User Workflow
1. Screen-reader user navigates to canvas area (`Tab`).
2. Focus enters ARIA DOM overlay container. Screen reader announces: `"Automata Canvas Region. 3 States, 4 Transitions. Focused on State q0, Initial State."`
3. User uses `Tab` and `Arrow Keys` to move focus across states and transitions.
4. User presses `Enter` to open state properties or `Context Menu Key` for action menu.
5. During simulation, `aria-live` region announces step execution details in real time.

### 22.5 User Interface Behaviour
- ARIA DOM overlay elements are positioned transparently over visual canvas nodes, maintaining exact spatial alignment for screen-magnifier tools.
- Focused DOM elements render high-contrast focus rings (`outline: 3px solid #00FFFF`).

### 22.6 Mouse Interactions
- Transparent ARIA DOM overlay elements pass mouse events through to visual WebGL canvas underneath.

### 22.7 Keyboard Shortcuts
- `Tab` / `Shift + Tab`: Navigate between canvas ARIA nodes and UI panels.
- `Arrow Keys`: Move focused ARIA node spatially on canvas.
- `Enter` / `Space`: Activate focused node/button.

### 22.8 Touch Behaviour (Future Compatibility)
- Accessible VoiceOver / TalkBack touch exploration gestures across canvas elements.

### 22.9 Validation Rules
- All visual nodes, edges, labels, lint warnings, and simulation steps must have corresponding text alternatives in the ARIA tree.

### 22.10 Error States
- **ERR_ARIA_SYNC_LAG**: ARIA overlay tree out of sync with canvas; auto-resynchronizes on next render frame (< 16ms).

### 22.11 Recovery Behaviour
- Immediate ARIA DOM tree rebuild triggered if state node count mismatches DOM node count.

### 22.12 AI Behaviour
- AI explanations formatted with semantic markdown headers and ARIA live announcements for screen-reader readability.

### 22.13 Animation Behaviour
- Focus ring transition (100ms ease-out).

### 22.14 Accessibility Behaviour
- Complies with WCAG 2.1 AA and AAA standards. Tested against NVDA, VoiceOver, and JAWS screen readers. Uses semantic landmarks (`<main>`, `<nav>`, `<section>`), `aria-live="polite"` regions, and `aria-expanded` state attributes.

### 22.15 Performance Expectations
- ARIA DOM node sync completed in < 5ms per frame; zero screen-reader announcement lag.

### 22.16 Edge Cases
- Canvas graphs with 100+ nodes virtualize ARIA DOM elements outside the visible viewport to prevent DOM tree bloat while preserving accessibility navigation.

### 22.17 Acceptance Criteria
- **Given** VoiceOver running, **When** user tabs onto canvas, **Then** screen reader accurately speaks state label, initial status, accepting status, and connected transitions.

### 22.18 Future Extension Points
- Audio-tactile graph sonification mode (pitch represents node height, tone represents state type) for enhanced non-visual spatial orientation.

---

## Appendix A: Canonical Data Contracts

This section defines the conceptual data contracts governing inter-feature communication, state synchronization, validation, solver traces, and conversions across the platform.

### A.1 `IAutomaton`
Conceptual contract representing the formal 5-tuple mathematical definition $M = (Q, \Sigma, \delta, q_0, F)$ and workspace representation:
- **`id`**: Unique string identifier for the automaton model instance.
- **`type`**: Model type classification (`DFA`, `NFA`, `EPSILON_NFA`).
- **`states`**: Collection of `IState` objects representing $Q$.
- **`alphabet`**: `IAlphabet` object representing $\Sigma$.
- **`transitions`**: Collection of `ITransition` objects representing $\delta$.
- **`initialStateId`**: Reference ID to the single designated initial state $q_0 \in Q$.
- **`acceptingStateIds`**: Set of reference IDs to accepting states $F \subseteq Q$.

### A.2 `IState`
Conceptual contract representing an individual state node $q \in Q$:
- **`id`**: Unique state identifier string.
- **`label`**: Display label (e.g. `q0`, `q1`).
- **`position`**: Spatial canvas coordinates $(x, y)$.
- **`isInitial`**: Boolean flag indicating if state is $q_0$.
- **`isAccepting`**: Boolean flag indicating if state $\in F$.

### A.3 `ITransition`
Conceptual contract representing a transition rule $\delta(q_i, \sigma) \to q_j$:
- **`id`**: Unique transition rule identifier string.
- **`fromStateId`**: Source state ID $q_i$.
- **`toStateId`**: Destination state ID $q_j$.
- **`symbols`**: Array of consumed alphabet symbols $\sigma \in \Sigma$.
- **`isEpsilon`**: Boolean flag indicating if transition is a spontaneous $\epsilon$-hop.

### A.4 `IAlphabet`
Conceptual contract representing the formal input alphabet $\Sigma$:
- **`symbols`**: Set of unique valid input characters.
- **`epsilonSymbol`**: Canonical string token representing $\epsilon$ (e.g. `\e` / `ε`).

### A.5 `ISimulationTrace`
Conceptual contract representing the complete step-by-step execution history of an input string evaluation:
- **`inputString`**: The raw string $w$ evaluated.
- **`steps`**: Chronological sequence of `IExecutionStep` records.
- **`finalStatus`**: Execution outcome (`HALT_ACCEPT`, `HALT_REJECT`, `DEADLOCK`).
- **`activePathsCount`**: Total active NFA computation branch paths evaluated.

### A.6 `IExecutionStep`
Conceptual contract representing a single step within a simulation trace:
- **`stepIndex`**: Integer step index (0-based).
- **`activeStateIds`**: Set of active state IDs $Q_{active}$ at this step.
- **`remainingInput`**: Unconsumed suffix substring of $w$.
- **`consumedSymbol`**: Symbol $\sigma$ consumed during this step, or `null` for $\epsilon$-hops.
- **`transitionRulesUsed`**: Collection of `ITransition` rules executed in this step.

### A.7 `IValidationIssue`
Conceptual contract representing a static mathematical linting diagnostic:
- **`code`**: Unique error identifier code (e.g. `ERR_DFA_NON_DETERMINISTIC`).
- **`severity`**: Severity classification (`ERROR`, `WARNING`, `INFO`).
- **`title`**: Human-readable short summary.
- **`affectedElementIds`**: Array of state IDs or transition IDs causing the issue.
- **`mathematicalExplanation`**: Formal explanation of the violated theorem or definition.
- **`remediationAdvice`**: Actionable guidance for resolving the issue.
- **`autoFixAction`**: Optional 1-click remediation transaction closure.

### A.8 `IConversionResult`
Conceptual contract representing the output of an automated algorithm conversion pass:
- **`algorithmId`**: Identifier of conversion algorithm executed (e.g. `NFA_TO_DFA_SUBSET`).
- **`sourceAutomaton`**: Original input `IAutomaton` instance.
- **`targetAutomaton`**: Resulting converted `IAutomaton` instance.
- **`intermediateSteps`**: Array of structural conversion trace steps.
- **`isEquivalent`**: Boolean flag confirming formal mathematical equivalence.

---
