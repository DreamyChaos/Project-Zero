# 09. Canvas Engine Specification

## Document Overview
This document defines the formal, implementation-independent engineering specification for the **Canvas Engine Subsystem** of **Project Zero**. The Canvas Engine is responsible for high-performance visual rendering, spatial indexing, hit testing, camera management, selection state tracking, and interactive manipulation of Finite Automata (DFA/NFA/Turing Machine) graph node-link diagrams.

This specification serves as the frozen architectural blueprint prior to Milestone 3 implementation. It contains zero implementation code, framework bindings, or language-specific code. All sections strictly enforce a 10-part structural breakdown to ensure complete architectural rigor.

---

## 1. Rendering Philosophy

### Objective
Establish foundational architectural design tenets for the visual canvas to guarantee deterministic, scalable, sub-frame visual feedback and immediate interactive responsiveness under heavy graph workloads.

### Responsibilities
- Maintain strict separation of visual rendering concerns from underlying mathematical solver logic and state graph data models.
- Ensure strict frame-budget compliance (60 FPS baseline / 120 FPS target) regardless of viewport zoom level or node scale targets.
- Enforce declarative, deterministic render pass scheduling with zero inline heap allocations during active frame passes.
- Provide sub-pixel anti-aliased geometry presentation across arbitrary Device Pixel Ratios (DPR).

### Data Ownership
- **Exclusive Owner**: Frame Render State, Front/Back Swap Buffers, Local Render Pass Command Buffers, Draw Call Batches.
- **Read-Only Access**: Core Graph Topology, Spatial Layout Coordinates, Active Workspace Style Configuration.

### Input
- Frame Tick Signals from system high-resolution clock.
- Immutable Graph Model State Snapshots.
- Viewport Dimension and Resolution Metrics.
- Design System Color and Typography Tokens.

### Output
- Frame Presentation Command Stream dispatched to hardware presentation context.
- Render Execution Statistics (Frame time, Draw call count, Culled entity count).
- Viewport Damage Region Metrics.

### Rules
1. **Model Immutability**: The canvas rendering engine must never directly mutate core graph topology or mathematical state.
2. **Zero Allocation Hot Path**: Render loops and geometry compilation passes must generate zero garbage collection allocations during continuous panning, zooming, or node dragging.
3. **DPI Independence**: All visual geometry, path thickness, typography, and state markers must maintain exact physical scale and visual crispness across DPR transitions ($1.0\times$ to $3.0\times+$).
4. **Frame Budget Priority**: If frame rendering time threatens the frame budget, quality degradation strategies (such as disabling decorative shadows or text sub-pixel positioning) must be applied gracefully before dropping frames.

### Error Conditions
- **GPU Context Loss**: Re-initialize render pipelines and recreate vertex/index buffer caches immediately upon context restoration.
- **Buffer Allocation Failure**: Degrade to software fallback buffer rendering or limit maximum cached primitive instances.
- **Frame Drop Cascade**: Consecutive budget overruns ($> 3$ frames) trigger automatic LOD reduction.

### Edge Cases
- Rapid transfer of host application window across monitors with differing DPR settings during an active gesture drag.
- Viewport size collapsing to zero width or height during tab switching or window minimization.
- Multi-touch inputs generating contradictory pan/zoom gesture deltas within the same frame tick.

### Performance Requirements
- Initial Scene Presentation Latency: $< 16.0\text{ ms}$.
- Steady-State Frame Execution Time: $\le 8.33\text{ ms}$ ($120\text{ Hz}$ target) / $\le 16.66\text{ ms}$ ($60\text{ Hz}$ baseline).
- Memory Overhead: Fixed primitive buffer cache footprint $\le 64\text{ MB}$.

### Acceptance Criteria
- Render loop executes 10,000 consecutive frames during active node dragging with zero heap garbage collection pauses.
- Visual output maintains exact vector crispness on high-DPI displays without blurring or scaling artifacts.

---

## 2. Coordinate Systems

### Objective
Formally define spatial coordinate domains, numeric precision bounds, and bidirectional transformation rules to ensure absolute geometric accuracy during translation, scaling, hit testing, and layout projection.

### Subtopics & Domains
- **World Space**: Unbounded continuous Cartesian 2D coordinate space $(x_w, y_w) \in \mathbb{R}^2$ with origin $(0,0)$ located at the spatial center of the infinite workspace.
- **Screen Space**: Discrete 2D pixel coordinate space $(x_s, y_s) \in \mathbb{Z}^2$ relative to the top-left corner $(0,0)$ of the host canvas viewport element.
- **Camera Space**: Viewport-centered continuous coordinate space $(x_c, y_c)$ offset by camera position and scaled by camera zoom factor.
- **Coordinate Precision**: Continuous CPU spatial transformations utilize 64-bit IEEE 754 floating-point precision ($64$-bit float); GPU vertex streams utilize 32-bit single precision ($32$-bit float) relative to camera offset to prevent floating-point jitter.
- **Transform Rules**: Spatial transformations execute via homogenous $3\times3$ transformation matrices.

### Responsibilities
- Convert continuous World Space points to discrete Screen Space pixels accurately.
- Provide invertibility for Screen-to-World coordinate mapping during input hit testing and marquee selection.
- Enforce consistent sub-pixel snapping rules for crisp line rasterization.

### Data Ownership
- **Exclusive Owner**: Transformation Matrices ($\mathbf{T}_{\text{WorldToCamera}}$, $\mathbf{T}_{\text{CameraToScreen}}$, $\mathbf{T}_{\text{ScreenToWorld}}$), Coordinate Bound Definitions, Precision Tolerance Constants.

### Input
- Continuous World Coordinates $(x_w, y_w)$.
- Discrete Screen Coordinates $(x_s, y_s)$.
- Device Pixel Ratio ($\text{DPR}$).
- Viewport Bounds $(W_v, H_v)$.

### Output
- Transformed 2D Point and Vector Tuples.
- Inverted Matrix Transforms.
- Viewport Bounding Rectangles in World Coordinates.

### Rules
1. Direct matrix multiplication must be used for all space transformations: $\mathbf{P}_{\text{screen}} = \mathbf{M}_{\text{viewport}} \cdot \mathbf{M}_{\text{camera}} \cdot \mathbf{P}_{\text{world}}$.
2. Round-trip transformation ($\text{World} \rightarrow \text{Screen} \rightarrow \text{World}$) must preserve spatial fidelity without numeric drift.
3. GPU vertex transformations must subtract the camera focal center prior to scaling to prevent single-precision float accuracy degradation far from the origin.

### Error Conditions
- **Singular Transformation Matrix**: Matrix determinant equals zero ($\det(\mathbf{M}) = 0$); reset camera state to default identity matrix.
- **Numeric Overflow**: Spatial coordinates exceeding $\pm 10^7$ units trigger spatial coordinate clamping.

### Edge Cases
- Sub-pixel alignment shifts when panning at non-integer camera translation offsets on DPR 1.0 displays.
- Negative scaling attempts resulting from inverted input transform matrices.

### Performance Requirements
- Point Transformation Computation: $< 0.0005\text{ ms}$ per coordinate point.
- Full $3\times3$ Matrix Inversion: $< 0.001\text{ ms}$.

### Acceptance Criteria
- Executing round-trip transformation $\mathbf{P}' = \text{ScreenToWorld}(\text{WorldToScreen}(\mathbf{P}))$ yields absolute spatial error $\|\mathbf{P} - \mathbf{P}'\| < 0.0001\text{ world units}$.

---

## 3. Viewport & Camera

### Objective
Define the viewport camera abstraction governing spatial translation (pan), scale transformation (zoom), bounding limits, focal points, and spring-damped smooth transitions.

### Subtopics & Features
- **Pan**: Continuous 2D translation of camera center along X and Y axes.
- **Zoom**: Continuous exponential scaling anchored to the current user pointer position.
- **Focus**: Automated centering of camera view onto a target entity or selection set.
- **Fit View**: Automated framing of the complete graph topology within the visible viewport bounds.
- **Camera Constraints**: Spatial pan boundaries and min/max zoom level bounds.
- **Animation Rules**: Damped spring kinetics governing smooth focus and fit-view camera movements.

### Responsibilities
- Maintain view camera state vector $(X_c, Y_c, S_c)$ representing X/Y center position and zoom scale factor.
- Enforce scale boundaries ($S_{\min} = 0.1\times$, $S_{\max} = 5.0\times$).
- Execute focal point anchoring during zoom gestures so the world coordinate directly under the cursor remains visually stationary.
- Animate camera transitions using critically damped spring equations.

### Data Ownership
- **Exclusive Owner**: Current Camera State, Target Camera State, Damping Kinetics Parameters, Camera Constraint Bounds.

### Input
- Pointer Drag Vectors $(\Delta x, \Delta y)$.
- Mouse Wheel Delta / Pinch Gesture Scale Factor.
- Target Framing Requests (Node Focus, Selection Focus, Fit View).
- Viewport Resize Events.

### Output
- Updated Viewport Matrix $\mathbf{M}_{\text{camera}}$.
- Visible World Bounding Rect $R_{\text{world}}$.
- Camera Motion Active Signal.

### Rules
1. **Cursor-Anchored Zooming**: Zooming must scale relative to the world coordinate currently beneath the pointer cursor, preventing spatial sliding.
2. **Inertial Motion**: Pan gestures must support configurable damped momentum upon input release.
3. **Fit View Margin**: Fit View calculations must include mandatory minimum padding ($40\text{ px}$) around the graph enclosing bounding box.

### Error Conditions
- Target focal entity coordinates undefined or NaN: Abort camera transition and maintain current camera position.
- Rapid conflicting zoom/pan gestures: Override active spring animation immediately with direct user input deltas.

### Edge Cases
- Framing an empty workspace (zero graph nodes) during a Fit View request: Reset camera position to origin $(0,0)$ at $S=1.0\times$.
- Executing zoom gestures while a node is actively being dragged across the canvas.

### Performance Requirements
- Camera State Matrix Update: $< 0.01\text{ ms}$ per frame.
- Spring Transition Settling Time: $\le 250\text{ ms}$ to within $99.9\%$ of target destination.

### Acceptance Criteria
- Pointer position stays locked to exact world coordinate during rapid zoom in/out gestures.
- Fit View frames graph topology with exactly $40\text{ px} \pm 1\text{ px}$ visual margin on all sides.

---

## 4. Rendering Pipeline

### Objective
Formally specify the multi-stage, sequential execution pipeline converting graph model data into final presentation frames on the display surface.

### Pipeline Stages
```
Model
  ↓
Diff Engine
  ↓
Render Queue
  ↓
Layer Builder
  ↓
Geometry Builder
  ↓
GPU Upload
  ↓
Canvas Rendering
  ↓
Overlay Rendering
  ↓
Frame Presentation
```

### Responsibilities
- **Model**: Maintain snapshot of active graph state.
- **Diff Engine**: Evaluate structural and visual changes between frames to generate dirty flags.
- **Render Queue**: Sort and prioritize pending primitive draw requests.
- **Layer Builder**: Group primitives into designated z-index rendering layers.
- **Geometry Builder**: Tessellate graph entities into vertex and index primitive arrays.
- **GPU Upload**: Transfer updated vertex data to hardware GPU buffers.
- **Canvas Rendering**: Draw base layer geometry into main rendering context.
- **Overlay Rendering**: Render transient interactive elements (hover glows, marquee boxes, rubberband lines).
- **Frame Presentation**: Execute double-buffer flip to present completed frame on screen.

### Data Ownership
- **Exclusive Owner**: Pipeline Stage States, Render Queues, Primitive Staging Buffers, GPU Buffer Handles, Frame Pipeline Execution Metrics.

### Input
- Graph Mutation Events.
- Viewport Invalidation Signals.
- Interaction State Machine Snapshot.

### Output
- Fully Rendered Presentation Frame.
- Pipeline Performance Telemetry.

### Rules
1. Pipeline stages execute in strict linear sequence; skipping stages is permitted only when dirty region flags indicate zero changes for that stage.
2. Geometry builder must reuse persistent buffer arrays to prevent heap memory allocations.
3. GPU upload stage must utilize persistent mapped buffers or sub-data buffer updates for dirty primitives only.

### Error Conditions
- **Pipeline Stage Execution Exception**: Log stage failure, isolate dirty region, and force full pipeline rebuild on next frame.
- **Buffer Overflow**: Dynamically expand staging buffer sizes by $1.5\times$ factor up to maximum memory limit.

### Edge Cases
- Sudden canvas resize event occurring mid-way through pipeline execution.
- Pipeline invalidation triggered during an active buffer upload pass.

### Performance Requirements
- Total Pipeline Traversal Time: $\le 8.33\text{ ms}$ ($120\text{ Hz}$ target) / $\le 16.66\text{ ms}$ ($60\text{ Hz}$ baseline).
- GPU Upload Stage Duration: $\le 1.5\text{ ms}$.

### Acceptance Criteria
- Complete rendering pipeline processes 5,000 active primitives without exceeding the 16.66ms frame boundary.

---

## 5. Rendering Layers

### Objective
Establish an immutable z-index depth hierarchy and composition rules across canvas render passes to prevent visual clipping, ordering ambiguity, or z-fighting.

### Layer Ordering Stack (Bottom to Top)
1. **Grid**: Spatial background alignment grid.
2. **Background**: Base canvas background surface fill.
3. **Edges**: Graph transition line paths and Bezier curves.
4. **Edge Labels**: Typography and contrast background pills for transition symbols.
5. **States**: Graph node shapes (circles, double rings, initial markers).
6. **State Labels**: Node text labels (state identifiers, e.g., $q_0, q_1$).
7. **Selection**: Visual selection outlines, bounding rings, and multi-selection boxes.
8. **Hover**: Interactive hover halo highlights and focus rings.
9. **Temporary Preview**: Dynamic edge creation rubberband lines and drag ghosts.
10. **Debug Overlay**: FPS counter, spatial index tree boundaries, dirty rect visualizations.
11. **Accessibility Overlay**: Keyboard focus indicator rings and high-contrast outlines.

### Responsibilities
- Enforce strict layer rendering sequence from layer 1 (Grid) through layer 11 (Accessibility Overlay).
- Manage layer visibility flags and opacity compositing parameters.
- Prevent higher-priority layer items (labels, selection rings) from being occluded by lower-priority layer items (edges, grid).

### Data Ownership
- **Exclusive Owner**: Layer Registry Table, Layer Depth Configuration, Layer Blend Mode States.

### Input
- Primitive Draw Commands categorized by layer assignment.
- Viewport Compositing Directives.

### Output
- Composited Multi-Layer Frame Buffer.

### Rules
1. Layer depth order is strictly immutable during execution.
2. Hidden or disabled layers must be bypassed completely during the render pass (zero CPU/GPU overhead).
3. Translucent layers (such as hover halos and marquee fills) must specify explicit blend modes (e.g., source-over alpha blending).

### Error Conditions
- Attempt to register primitive to invalid layer index: Default primitive to States layer (Layer 5) and log warning.

### Edge Cases
- Overlapping translucent elements on Layer 7 causing extreme overdraw penalty.
- Toggling layer visibility while primitives on that layer are mid-animation.

### Performance Requirements
- Per-Layer Composite Overhead: $< 0.05\text{ ms}$.
- Complete 11-Layer Stack Sweep Execution: $< 0.8\text{ ms}$.

### Acceptance Criteria
- Visual inspection confirms state nodes and labels always render above transition lines, and overlays always render on top of graph entities.

---

## 6. Canvas Grid

### Objective
Define the spatial background grid rendering mechanism, supporting adaptive Level-Of-Detail (LOD) partitioning, infinite panning continuous tiling, and dynamic opacity fading.

### Responsibilities
- Render primary and secondary spatial alignment grid patterns across the infinite canvas.
- Dynamically recalculate grid step sizing based on camera zoom factor $S_c$.
- Apply smooth continuous alpha fading during grid subdivision transitions to eliminate visual popping.

### Data Ownership
- **Exclusive Owner**: Grid Spacing Metrics, Grid Line Color Tokens, LOD Threshold Constants, Grid Mesh Geometry Cache.

### Input
- Camera Zoom Scale Factor $S_c$.
- Viewport Bounds in World Coordinates.
- Grid Configuration Parameters (Major/Minor step sizes).

### Output
- Rendered Background Grid Geometry / Shader Uniform Parameters.

### Rules
1. **LOD Scale Bands**:
   - Band 1 ($S_c < 0.4\times$): Render Major Grid lines only ($100\text{ world units}$).
   - Band 2 ($0.4\times \le S_c \le 2.5\times$): Render Major ($100\text{ units}$) and Minor ($20\text{ units}$) Grid lines.
   - Band 3 ($S_c > 2.5\times$): Render Sub-minor Grid lines ($4\text{ units}$) with major reference lines.
2. Grid lines must remain aligned to absolute World Space coordinates regardless of camera translation.

### Error Conditions
- Extreme zoom levels causing division-by-zero when calculating grid line frequency: Clamp minimum grid step size to $1.0\text{ world unit}$.

### Edge Cases
- Panning to extreme world coordinate offsets ($> 10^6$ units) causing grid line alignment jitter.

### Performance Requirements
- Grid Generation and Render Pass Time: $< 0.3\text{ ms}$.

### Acceptance Criteria
- Grid scale transitions occur smoothly without abrupt visual pops; grid lines remain anchored to world coordinates during pan gestures.

---

## 7. Node Rendering

### Objective
Specify visual geometry compilation, styling tokens, state representations (Normal, Initial, Accepting), and LOD rendering for finite automata state nodes.

### Responsibilities
- Construct vector circle geometry for graph state nodes.
- Render double-concentric ring vector paths for Accepting States.
- Render left-pointing entry triangle markers for Initial States.
- Apply state-dependent stroke colors, fill gradients, and shadow metrics based on selection/hover state.

### Data Ownership
- **Exclusive Owner**: Node Visual Style Map, Node Path Tessellation Cache, Node Shape Definition Metrics.

### Input
- Node State Definitions (Position $(x,y)$, Radius $r=32\text{ px}$, `isInitial`, `isAccepting`).
- Entity State Flags (`isSelected`, `isHovered`, `isDisabled`).
- Design System Color Tokens.

### Output
- Node Polygon Arc Geometry Batches and Vertex Stream Arrays.

### Rules
1. Standard State Node Radius $r = 32\text{ px}$.
2. Accepting State Inner Ring Radius $r_{\text{inner}} = 26\text{ px}$ ($6\text{ px}$ concentric offset).
3. Initial State Entry Marker: Equilateral triangle ($16\text{ px}$ side length) pointing to the left perimeter edge of the node circle.
4. Active Hover State: $3\text{ px}$ semi-transparent accent halo (#3B82F6, $30\%$ opacity).

### Error Conditions
- Node position contains NaN or infinite values: Exclude node from rendering pass and log structural data error.

### Edge Cases
- Node scaled down below minimum raster threshold ($< 4\text{ px}$ rendered diameter): Render node as simplified solid circle point.

### Performance Requirements
- Single Node Geometry Assembly: $< 0.003\text{ ms}$.
- Rendering Pass for 1,000 Nodes: $\le 2.0\text{ ms}$.

### Acceptance Criteria
- State nodes render with anti-aliased sub-pixel precision; accepting inner concentric ring remains centered under all camera scales.

---

## 8. Transition Rendering

### Objective
Mathematically define edge connection paths, cubic Bezier curve generation, self-loop arcs, and parallel multi-edge displacement offsets.

### Responsibilities
- Calculate edge paths between source and target node boundaries.
- Compute self-loop circular arc geometries extending from a single node.
- Calculate lateral Bezier curve displacement offsets for multiple parallel transitions between the same node pair.

### Data Ownership
- **Exclusive Owner**: Transition Path Cache, Curve Parametric Constants, Edge Offset Registry.

### Input
- Source Node Center $(x_1, y_1)$ and Radius $r_1$.
- Target Node Center $(x_2, y_2)$ and Radius $r_2$.
- Transition Metadata (Self-loop flag, Parallel edge index $k$, Direction).

### Output
- Continuous Parametric Cubic Bezier Curves $\mathbf{B}(t)$, Path Tangent Vectors $\mathbf{T}_{\text{end}}$ at endpoints.

### Rules
1. **Perimeter Clipping**: Edge path endpoints must terminate exactly on the outer boundary perimeter of source and target node circles, never extending into node interiors.
2. **Self-Loop Geometry**: Self-loops project from the top-center of the node ($90^\circ$ angle) as a circular arc with radius $r_{\text{loop}} = 24\text{ px}$.
3. **Parallel Edge Displacement**: Multiple edges between the same node pair curve symmetrically with control point displacement factor $d = 24\text{ px} \cdot k$.

### Error Conditions
- Coincident Source and Target Nodes without self-loop flag (zero length edge): Abort curve rendering.

### Edge Cases
- Transition connecting two nodes that are currently overlapping each other.
- Exceptionally long transition lines spanning $> 10,000\text{ world units}$.

### Performance Requirements
- Curve Math Computation: $< 0.008\text{ ms}$ per edge.
- Render Pass for 2,000 Transition Paths: $\le 3.5\text{ ms}$.

### Acceptance Criteria
- Edge paths terminate flush on node circle perimeters without visual gaps or internal node line bleed.

---

## 9. Arrowheads

### Objective
Specify arrowhead geometry compilation, orientation alignment along path tangent vectors, and scaling behavior.

### Responsibilities
- Calculate path tangent angle $\theta = \arctan2(dy, dx)$ at edge endpoint termination locations.
- Construct isosceles triangle arrowhead polygon geometry.
- Align arrowhead tip precisely with target node perimeter intersection.

### Data Ownership
- **Exclusive Owner**: Arrowhead Geometry Mesh Templates, Orientation Math Functions.

### Input
- Path Endpoint Position $(x_{\text{end}}, y_{\text{end}})$.
- Tangent Direction Vector $(dx, dy)$ at $t=1.0$.
- Edge Selection/Hover State Flags.

### Output
- Transformed Arrowhead Mesh Vertex Streams.

### Rules
1. Base Arrowhead Dimensions: Length $l = 12\text{ px}$, Width $w = 8\text{ px}$.
2. Arrowhead Tip must sit flush on target node outer perimeter boundary ($r = 32\text{ px}$).
3. Arrowhead Fill Color must match parent edge stroke color exactly.

### Error Conditions
- Zero-length tangent vector (undefined direction angle): Fall back to linear vector pointing from source node center to target node center.

### Edge Cases
- Extremely sharp curve trajectory near endpoint causing arrowhead angle to visually misalign with curve approach vector.

### Performance Requirements
- Arrowhead Vertex Transformation: $< 0.002\text{ ms}$ per arrowhead.

### Acceptance Criteria
- Arrowhead tips meet target node boundaries cleanly at all curve angles without gaps, overlaps, or misorientations.

---

## 10. Labels & Typography

### Objective
Govern text rendering, font metrics calculation, label positioning along state centers and edge curves, and legibility background pill rendering.

### Responsibilities
- Calculate text bounding box dimensions for state and transition labels.
- Compute curve midpoint locations $(x_{\text{mid}}, y_{\text{mid}})$ and normal vectors for edge label positioning.
- Render rounded semi-opaque background contrast pills beneath edge labels to prevent line interference.

### Data Ownership
- **Exclusive Owner**: Font Metric Cache, Label Layout Bounding Boxes, Text Glyph Atlas.

### Input
- Label String Text (e.g., state name "$q_0$", transition symbol "0,1; R").
- Text Style Attributes (Font Family, Size, Weight, Color).
- Anchor Geometry (Node Center, Edge Bezier Curve).

### Output
- Text Geometry Primitive Commands, Label Background Pill Polygons.

### Rules
1. State Labels are centered inside the node circle.
2. Edge Labels are positioned at the curve midpoint $t=0.5$, offset by $14\text{ px}$ along the curve normal vector.
3. Edge Label Background Pill: Rounded rectangle with $4\text{ px}$ padding and $80\%$ opaque canvas background fill.

### Error Conditions
- Null or empty label strings: Bypass label render step.
- Unsupported unicode glyphs: Fall back to system default monospaced font.

### Edge Cases
- Extremely long transition label strings ($> 40$ characters) on short edge paths.

### Performance Requirements
- Text Layout Calculation: $< 0.005\text{ ms}$ per label.
- Complete Typography Render Pass: $\le 1.5\text{ ms}$.

### Acceptance Criteria
- Transition text remains completely readable over intersecting edge lines due to background contrast pills.

---

## 11. Selection Engine

### Objective
Specify visual feedback for selected graph items, multi-selection bounding boxes, marquee drag rectangles, and handle points.

### Responsibilities
- Render primary accent selection outlines around selected state nodes and transition edges.
- Compute and render enclosing multi-selection bounding boxes around groups of selected items.
- Render interactive rubberband marquee rectangle during mouse click-drag selection gestures.

### Data Ownership
- **Exclusive Owner**: Active Selection Registry (Selected Node IDs, Selected Edge IDs), Marquee Drag Box State.

### Input
- Current Graph Selection Set.
- Pointer Drag Marquee Rect $(X_1, Y_1, X_2, Y_2)$.
- Keyboard Selection Modifiers (Shift, Ctrl/Cmd).

### Output
- Selection Ring Polygons, Marquee Geometry Batches.

### Rules
1. Primary Selected Node Stroke: $3\text{ px}$ primary accent stroke (#3B82F6).
2. Marquee Rectangle: $1\text{ px}$ dashed accent border with $10\%$ translucent blue fill.
3. Selected Edges: Rendered with bold stroke width ($3\text{ px}$ vs $1.5\text{ px}$ default).

### Error Conditions
- Selection set containing references to deleted graph nodes or edges: Purge stale IDs from selection registry automatically.

### Edge Cases
- Marquee drag covering thousands of entities simultaneously.
- Selecting entities that reside outside the current camera frustum.

### Performance Requirements
- Selection State Evaluation: $< 0.02\text{ ms}$.
- Marquee Box Render Pass: $< 0.1\text{ ms}$.

### Acceptance Criteria
- Rubberband marquee box expands smoothly during mouse drag, updating entity selection highlights in real time.

---

## 12. Hit Testing

### Objective
Define precise 2D spatial point and rectangle query algorithms to evaluate user pointer interactions against nodes, edges, labels, and background.

### Responsibilities
- Perform point-in-circle containment tests for state nodes.
- Perform point-to-parametric-curve distance evaluations for transition edges.
- Perform point-in-rect tests for labels and selection handles.

### Data Ownership
- **Exclusive Owner**: Hit Testing Tolerance Thresholds, Spatial Query Engine.

### Input
- Pointer Viewport Coordinates $(x_v, y_v)$.
- World Coordinate Pointer Mapping $(x_w, y_w)$.
- Hit Tolerance Radius ($8\text{ px}$).

### Output
- Topmost Hit Entity Reference (Node ID, Edge ID, Label ID, or Canvas Background).

### Rules
1. **Hit Priority Order**: State Labels $>$ State Nodes $>$ Edge Labels $>$ Transition Edges $>$ Canvas Background.
2. Transition Edge Hit Threshold: Pointer must reside within $8\text{ px}$ orthogonal distance of the Bezier curve path.

### Error Conditions
- Pointer coordinates outside canvas bounds: Return null hit result.

### Edge Cases
- Pointer clicking precisely on overlapping node-edge intersection points.
- Extremely scaled-down viewports where hit tolerance radii overlap multiple small nodes.

### Performance Requirements
- Single Point Hit Query Execution: $< 0.05\text{ ms}$.
- Multi-element Box Hit Query Execution: $< 0.2\text{ ms}$.

### Acceptance Criteria
- Clicking within $8\text{ px}$ of a thin curve successfully selects the target edge; node clicks take priority over underlying edge paths.

---

## 13. Interaction State Machine

### Objective
Formally map user pointer and keyboard input event streams into discrete visual rendering interaction states.

### Interaction States
- **Idle**: Waiting for user input.
- **Hovering**: Pointer positioned over interactive entity.
- **Panning**: Camera translation gesture active.
- **Zooming**: Camera scale transformation active.
- **Dragging Node**: One or more selected nodes undergoing translation.
- **Marquee Selecting**: Rubberband selection drag active.
- **Creating Edge**: Dynamic edge creation line extending from source node to pointer.

### Responsibilities
- Track active interaction state transitions.
- Emit state-specific visual directives (e.g., hover halo rendering, drag ghosting, cursor style updates).

### Data Ownership
- **Exclusive Owner**: Active Interaction State, Drag Start Coordinates, Active Gesture History.

### Input
- Raw Mouse, Touch, and Keyboard Event Signals.
- Hit Test Results.

### Output
- Interaction State Transition Directives, Cursor Visual Directives (`default`, `grab`, `pointer`, `crosshair`).

### Rules
1. State transitions must follow strict valid state machine transition paths.
2. Creating Edge mode renders a dynamic dashed preview line from source node to pointer location.
3. Spacebar + Drag forces Panning mode regardless of underlying entity hit results.

### Error Conditions
- Unexpected Event Sequences (e.g., `MouseUp` event lost due to window focus loss): Force state machine reset to `Idle`.

### Edge Cases
- Pressing Escape key while actively dragging a new edge preview line: Cancel edge creation and clear temporary preview layer.

### Performance Requirements
- State Transition Processing: $< 0.001\text{ ms}$.

### Acceptance Criteria
- System pointer cursor updates instantly to reflect active interaction state; temporary preview lines clear immediately upon gesture release/cancellation.

---

## 14. Render Loop

### Objective
Define frame scheduling, animation frame synchronization, delta time calculations, frame budget enforcement, and idle sleep policies.

### Responsibilities
- Drive render pipeline execution via system animation frame timing ticks (`requestAnimationFrame`).
- Calculate frame delta time $\Delta t$ for smooth animation interpolation.
- Pause loop execution when the canvas is in an idle state (zero active animations, zero pending state updates).

### Data Ownership
- **Exclusive Owner**: Loop Running Flag, Target Refresh Rate Config, Delta Time History Buffer, Last Frame Timestamp.

### Input
- System Timer Ticks.
- Canvas Invalidation Flags.

### Output
- Pipeline Execution Trigger Signals, Frame Rate Statistics.

### Rules
1. **Idle Sleep Policy**: If no state updates, user inputs, or active animations occur for 3 consecutive frames, suspend render loop ticks until next input event.
2. **Delta Time Clamping**: Delta time $\Delta t$ must be clamped to $\max(\Delta t) = 33.3\text{ ms}$ to prevent animation jumps after tab reactivation.

### Error Conditions
- Host browser tab hidden or minimized: Render loop automatically throttles execution rate to save power.

### Edge Cases
- Display hardware switching refresh rates dynamically ($60\text{ Hz} \leftrightarrow 120\text{ Hz} \leftrightarrow 144\text{ Hz}$).

### Performance Requirements
- Loop Scheduling Overhead: $< 0.02\text{ ms}$ per frame tick.

### Acceptance Criteria
- Idle canvas drops CPU/GPU utilization to zero; active user interactions immediately wake loop with zero initial frame latency.

---

## 15. Dirty Rectangle Strategy

### Objective
Specify partial viewport invalidation algorithms to re-render only damaged visual canvas areas, minimizing overdraw.

### Responsibilities
- Track damaged screen regions resulting from modified or translated graph entities.
- Calculate minimum enclosing bounding boxes around damaged entities.
- Execute scissored render passes restricted to merged dirty rectangle regions.

### Data Ownership
- **Exclusive Owner**: Damaged Region Queue, Merged Invalidation Rectangles, Full Repaint Flag.

### Input
- Entity Mutation Notifications (Node move, State color change).

### Output
- Scissor Region Rectangles for Rendering Context.

### Rules
1. Dirty rectangles must be expanded by a $6\text{ px}$ margin to accommodate anti-aliasing bleeds and drop shadows.
2. If total merged dirty area exceeds $50\%$ of total viewport surface area, fall back to a full-screen repaint pass.

### Error Conditions
- Invalid or inverted dirty rect bounding dimensions: Trigger full viewport repaint.

### Edge Cases
- Moving 500 nodes simultaneously via multi-selection drag: Triggers automatic fallback to full viewport repaint.

### Performance Requirements
- Dirty Region Merging Algorithm: $< 0.05\text{ ms}$.

### Acceptance Criteria
- Moving a single node repaints only its local bounding box area, reducing total frame draw costs by $> 75\%$.

---

## 16. Spatial Index

### Objective
Formally specify spatial indexing via Bounding Volume Hierarchy (BVH) or R-Tree structures to support ultra-fast frustum culling and spatial range queries.

### Responsibilities
- Organize all graph node and edge spatial bounding boxes into a hierarchical spatial tree.
- Perform high-speed view frustum culling to exclude off-screen entities from render pipeline passes.
- Execute rapid spatial range queries for marquee selection and hit testing.

### Data Ownership
- **Exclusive Owner**: Spatial R-Tree Structure, Entity Bounding Box Cache, Index Depth Statistics.

### Input
- Entity World Bounding Boxes.
- Visible Viewport Frustum Rect $R_{\text{frustum}}$.

### Output
- List of Visible Node and Edge Entity IDs.

### Rules
1. Spatial tree must update incrementally when individual nodes are moved; full tree rebuilds are forbidden during interactive drag.
2. Frustum Query Margin: View frustum rect expanded by $50\text{ world units}$ padding buffer to prevent popping at screen edges.

### Error Conditions
- Spatial Tree Node Imbalance: Re-balance spatial tree automatically during idle frame periods.

### Edge Cases
- Graph containing 10,000 nodes clustered at identical spatial coordinates.

### Performance Requirements
- Frustum Culling Query Execution: $< 0.1\text{ ms}$ for 10,000 entities.
- Incremental Node Spatial Update: $< 0.02\text{ ms}$.

### Acceptance Criteria
- Rendering performance remains at 60+ FPS on a 10,000 node graph because off-screen nodes are culled prior to geometry generation.

---

## 17. Performance Targets

### Objective
Define quantitative performance, latency, memory, and scale budgets enforced across the Canvas Engine.

### Performance Budgets
- **Baseline Frame Rate**: $60\text{ FPS}$ ($16.66\text{ ms}$ max frame time).
- **Target Frame Rate**: $120\text{ FPS}$ ($\le 8.33\text{ ms}$ target frame time).
- **Interactive Scale Target**: 1,000 nodes + 2,000 edges maintained at steady $\ge 60\text{ FPS}$.
- **Garbage Collection Budget**: $0\text{ Bytes}$ heap allocation per frame during active user drag/pan/zoom.
- **Input Latency**: Input-to-pixel presentation latency $\le 12\text{ ms}$.

### Responsibilities
- Continuously profile frame execution stages.
- Emit telemetry warnings if execution exceeds budget thresholds.

### Data Ownership
- **Exclusive Owner**: Performance Metric Collectors, Frame Timing History Logs.

### Input
- High-resolution timestamp metrics per frame pass.

### Output
- Telemetry Performance Reports, Budget Violation Alerts.

### Rules
1. Execution budgets are non-negotiable; features violating frame budgets must be optimized or placed behind quality degradation toggles.

### Error Conditions
- Frame drop cascade ($< 30\text{ FPS}$ for $> 10$ frames): Trigger emergency low-complexity rendering mode.

### Edge Cases
- Execution on low-power integrated mobile/laptop GPUs.

### Performance Requirements
- Profiling Telemetry Overhead: $< 0.01\text{ ms}$ per frame.

### Acceptance Criteria
- Automated performance suite verifies 1,000 node benchmark graph runs for 60 seconds with 0 dropped frames.

---

## 18. Accessibility Layer

### Objective
Specify visual contrast compliance, screen reader spatial descriptions, keyboard focus navigation overlays, and high-contrast theme support.

### Responsibilities
- Render high-visibility keyboard focus rings around focused nodes.
- Maintain accessible structural graph representations for screen reader accessibility APIs.
- Guarantee WCAG 2.1 AA color contrast compliance ($4.5:1$ contrast ratio minimum for all text and node outlines).

### Data Ownership
- **Exclusive Owner**: Focused Entity Reference, Accessibility Ring Geometry Cache, High-Contrast Theme Map.

### Input
- Keyboard Navigation Events (Tab, Shift+Tab, Arrow Keys).
- High-Contrast Theme Settings.

### Output
- Accessibility Focus Ring Render Commands, Screen Reader ARIA Live Region Text Updates.

### Rules
1. Focused Node Visual Indicator: $4\text{ px}$ offset high-contrast double outline (alternating white/black dashed ring).
2. Screen Reader Graph Summary: Concise text descriptions ("State q0, Initial State, 2 outgoing transitions").

### Error Conditions
- Keyboard focus navigating to non-existent or deleted node: Auto-advance focus to nearest valid node.

### Edge Cases
- Navigating dense 500-node graphs using keyboard arrow keys exclusively.

### Performance Requirements
- Accessibility Focus Pass Execution: $< 0.05\text{ ms}$.

### Acceptance Criteria
- Canvas achieves 100% WCAG 2.1 AA compliance; all graph nodes and edges can be inspected and manipulated via keyboard navigation alone.

---

## 19. Renderer Interfaces

### Objective
Formally specify decoupled architectural boundaries, lifecycle controls, and contract protocols between the Canvas Engine, Graph Model Engine, and UI Shell without implementation code.

### Interface Contracts
- **Lifecycle Contract**: Initialize, Resize Viewport, Suspend, Resume, Destroy.
- **State Provider Contract**: Read-only snapshot access to Graph Topology and Workspace Settings.
- **Event Sink Contract**: Dispatch visual interaction events (node clicked, selection changed, viewport shifted) to external host shell.

### Responsibilities
- Enforce strict decoupled boundary isolation.
- Prevent host shell from making direct private rendering calls outside formal interface methods.

### Data Ownership
- **Exclusive Owner**: Interface Event Registry, Host Attachment Context.

### Input
- Host Shell Lifecycle Commands, Graph Model Snapshot Updates.

### Output
- Canvas Lifecycle State Notifications, User Interaction Event Stream.

### Rules
1. Canvas Engine must operate headlessly in testing environments without direct dependencies on specific browser DOM models.

### Error Conditions
- Attempting to issue draw commands prior to explicit initialization: Throw formal system state exception.

### Edge Cases
- Host application module hot-reloading during active canvas rendering session.

### Performance Requirements
- Interface Event Dispatch Latency: $< 0.001\text{ ms}$.

### Acceptance Criteria
- Renderer subsystem compiles and passes unit tests in a completely headless execution environment.

---

## 20. Testing Strategy

### Objective
Establish comprehensive testing protocols including automated visual regression tests, matrix transformation math unit tests, spatial index benchmarks, and performance budget verification.

### Test Categories
- **Math Unit Tests**: 100% test coverage on coordinate transforms, camera matrix inversions, and Bezier curve math.
- **Visual Regression Tests**: Pixel-diff comparison of rendered canvas frames against approved golden snapshots.
- **Performance Benchmark Tests**: Automated headless graph rendering measuring frame rates and heap allocations under load.

### Responsibilities
- Execute automated testing pipelines on code commits.
- Compare rendered frame buffers against baseline visual snapshots.

### Data Ownership
- **Exclusive Owner**: Test Suite Fixture Graphs, Baseline Golden Snapshots, Performance Metric Log History.

### Input
- Synthetic Graph Datasets, Automated User Interaction Event Scripts.

### Output
- Visual Variance Reports (Pixel diff percentage), Test Pass/Fail Results.

### Rules
1. Visual Regression Threshold: Maximum allowed pixel variance $< 0.01\%$.
2. Zero Heap Allocation Rule: Performance tests fail if heap allocations occur during simulated drag benchmarks.

### Error Conditions
- Cross-platform GPU font rendering variances causing false-positive visual diff failures: Apply normalized font rendering masks during diff step.

### Edge Cases
- Testing anti-aliased sub-pixel line rendering across different operating systems.

### Performance Requirements
- Complete Automated Test Suite Execution: $< 30\text{ seconds}$.

### Acceptance Criteria
- 100% passing status across all transformation math unit tests and visual regression snapshot suites.

---

## 21. Future Extension Points

### Objective
Define architectural extension points and plugin hooks for 3D state diagram visualization, WebGPU compute shader solvers, multi-user real-time cursor overlays, and custom node shape plugins.

### Extension Hooks
- **Custom Node Shape Plugins**: Registration interface for non-standard node geometries.
- **Multi-User Collaboration Layer**: Dedicated render overlay pass for displaying remote user cursors and spatial selections.
- **WebGPU Acceleration Hook**: Pipeline architecture prepared for direct WebGPU compute shader integrations.

### Responsibilities
- Reserve execution slots in pipeline layer stack for extension passes.
- Enforce extension sandboxing to prevent third-party plugin crashes from corrupting main render loop.

### Data Ownership
- **Exclusive Owner**: Plugin Extension Registry, Remote User Spatial Cursor State Map.

### Input
- Third-Party Plugin Draw Directives, Remote Collaboration Cursor Positions.

### Output
- Extended Render Pass Output Streams.

### Rules
1. Extension passes must execute within isolated render passes and adhere strictly to the zero-allocation hot-path rule.

### Error Conditions
- Extension plugin throwing runtime exception during render pass: Disable offending plugin automatically and log fault report.

### Edge Cases
- Rendering 50 concurrent real-time remote user collaboration cursors moving simultaneously across the canvas.

### Performance Requirements
- Extension Pass Processing Budget: $\le 0.2\text{ ms}$ total allocation.

### Acceptance Criteria
- Registering a custom node rendering plugin executes cleanly within the extension pipeline hook without modifying core engine contracts.
