# Design System Specification

## Project Zero: AI-Powered Interactive Learning Platform for Models of Computation

**Document**: `07_Design_System.md`  
**Version**: 1.0.0  
**Status**: APPROVED FOR IMPLEMENTATION  

---

## SECTION 1: Design Philosophy & Visual Identity

### 1.1 Brand Personality
Project Zero is a **next-generation educational IDE** designed to transform abstract theoretical computer science (automata, formal languages, grammars, computation models) into interactive, visually engaging, tactile experiences.

The design language fuses six iconic software paradigms:
- **Linear**: Fluid motion, dark-mode default, pixel-perfect contrast, spatial precision.
- **VS Code**: Dense developer utility, functional sidebars, status bars, quad-pane composition.
- **Figma**: Infinity canvas pan/zoom, vector node manipulation, spatial snapping.
- **Raycast**: Command palettes (`Ctrl + K`), keyboard-first navigation, instant feedback.
- **Excalidraw**: Tactile visual clarity, intuitive canvas node manipulation.
- **Notion**: Clean academic typography, structured markdown math rendering, minimal noise.

### 1.2 Core Design Principles
1. **Mathematical Clarity First**: Visual elements must clarify, not clutter, formal state transitions and mathematical definitions.
2. **Tactile Responsiveness**: Every user action (mouse drag, keyboard shortcut, step navigation) provides sub-16ms visual or tactile feedback.
3. **Accessibility as Baseline**: Native WCAG 2.1 AA and AAA compliance, high-contrast themes, visible keyboard focus indicators, screen reader accessibility.
4. **Command-First Efficiency**: Keyboard shortcuts for 100% of visual canvas and simulation control workflows.
5. **Academic Polish**: Mathematical notation rendered via LaTeX ($Q, \Sigma, \delta, q_0, F$) with typography equal to academic publications.

---

## SECTION 2: Color System & Theme Architecture

Project Zero uses a CSS Variable Token Architecture supporting **Dark Mode (Default)**, **Light Mode**, and **High Contrast Mode**.

### 2.1 Color Palette Tokens

| Token Name | Dark Mode Value | Light Mode Value | Usage |
| :--- | :--- | :--- | :--- |
| `--bg-base` | `#0A0D14` | `#F8FAFC` | Platform background |
| `--bg-surface-1` | `#121620` | `#FFFFFF` | Quad-pane container background |
| `--bg-surface-2` | `#1A202C` | `#F1F5F9` | Panel headers, cards, modals |
| `--bg-surface-3` | `#242C3D` | `#E2E8F0` | Input fields, active state fills |
| `--border-subtle` | `#1E2638` | `#E2E8F0` | Structural dividers, panel borders |
| `--border-strong` | `#334155` | `#CBD5E1` | Interactive borders, input outlines |
| `--border-focus` | `#6366F1` | `#4F46E5` | Active focus rings, selected nodes |
| `--text-primary` | `#F8FAFC` | `#0F172A` | Primary headings, graph node labels |
| `--text-secondary` | `#94A3B8` | `#475569` | Subtitles, metadata, transition labels |
| `--text-muted` | `#64748B` | `#94A3B8` | Disabled text, placeholding text |
| `--accent-primary` | `#6366F1` (Indigo) | `#4F46E5` | Primary action buttons, initial state indicators |
| `--accent-hover` | `#818CF8` | `#4338CA` | Hover highlights |
| `--semantic-accept` | `#10B981` (Emerald) | `#059669` | Accept states, green simulation success badges |
| `--semantic-reject` | `#EF4444` (Rose) | `#DC2626` | Reject states, non-accepting simulation steps |
| `--semantic-warning` | `#F59E0B` (Amber) | `#D97706` | Non-determinism warning badges, missing transitions |
| `--semantic-info` | `#3B82F6` (Sky Blue) | `#2563EB` | Active simulation state highlights, tooltips |

### 2.2 High Contrast Mode Colors (WCAG AAA)
- `--bg-base`: `#000000`
- `--bg-surface-1`: `#050505`
- `--text-primary`: `#FFFFFF`
- `--border-strong`: `#FFFFFF`
- `--border-focus`: `#FFFF00` (Yellow Focus Ring)
- `--semantic-accept`: `#00FF00`
- `--semantic-reject`: `#FF0000`

---

## SECTION 3: Typography System

Project Zero pairs **Inter** (interface UI), **JetBrains Mono** (formal expressions, code, state tokens), and **KaTeX** (LaTeX rendering).

```
Font Families:
- Sans-Serif (UI): "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
- Monospace (Code/States): "JetBrains Mono", "Fira Code", monospace
- Math (LaTeX): "KaTeX_Math", "Times New Roman", serif
```

### 3.1 Type Scale Tokens

| Size Token | Font Size | Line Height | Weight | Letter Spacing | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `--text-xs` | 11px (0.6875rem) | 16px | 400 / 500 | +0.02em | Badge text, table metadata |
| `--text-sm` | 13px (0.8125rem) | 18px | 400 / 500 | 0.00em | Property inspector inputs, sidebars |
| `--text-md` | 14px (0.875rem) | 20px | 400 / 500 / 600 | -0.01em | Standard body, modal text, button labels |
| `--text-lg` | 16px (1.000rem) | 24px | 500 / 600 | -0.01em | Panel section headers, toast titles |
| `--text-xl` | 20px (1.250rem) | 28px | 600 | -0.02em | Modal dialog titles |
| `--text-2xl` | 24px (1.500rem) | 32px | 700 | -0.02em | Main project title, full-screen view headers |

---

## SECTION 4: Spacing & Grid System

Based on a strict **4px / 8px baseline grid**.

```
--space-1:   4px  (0.25rem)
--space-2:   8px  (0.50rem)
--space-3:  12px  (0.75rem)
--space-4:  16px  (1.00rem)
--space-6:  24px  (1.50rem)
--space-8:  32px  (2.00rem)
--space-12: 48px  (3.00rem)
--space-16: 64px  (4.00rem)
```

### Layout Grid & Pane Constraints
- **Quad-Pane Layout Dividers**: 1px solid `--border-subtle` with 4px interactive resize handle targets.
- **Panel Internal Padding**: `--space-4` (16px).
- **Control Strip Padding**: `--space-2` `--space-3` (8px 12px).
- **Canvas Node Geometry**: Default radius $r=24\text{px}$, state loop clearance $36\text{px}$, arrow offset $6\text{px}$.

---

## SECTION 5: Elevation, Layers & Glassmorphism

### 5.1 Layer Hierarchy & Z-Index Tokens

```
--z-base:       0    (Canvas grid & nodes)
--z-overlay:    10   (Canvas floating controls & zoom controls)
--z-panel:      20   (Quad-pane sidebars & property inspector)
--z-header:     30   (Global header navigation bar)
--z-dropdown:   40   (Context menus & dropdown lists)
--z-modal:      50   (Dialog overlays & AI chat drawer)
--z-toast:      60   (Notification toasts)
--z-tooltip:    70   (Hover tooltips & keyboard shortcut hints)
```

### 5.2 Shadows & Glass Effects
- **Floating Controls Surface**: `background: rgba(18, 22, 32, 0.85); backdrop-filter: blur(12px); border: 1px solid var(--border-subtle);`
- **Modal Dialog Elevation**: `box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);`
- **Focus Ring Elevation**: `box-shadow: 0 0 0 2px var(--bg-base), 0 0 0 4px var(--border-focus);`

---

## SECTION 6: Border Radius & Corner System

```
--radius-sm:   4px   (Input fields, badges, table cells)
--radius-md:   8px   (Buttons, dropdown menus, property cards)
--radius-lg:  12px   (Modal dialogs, floating toolbar pods)
--radius-full: 9999px (Circular state nodes, status indicator dots)
```

---

## SECTION 7: Motion & Animation System

All micro-interactions use GPU-accelerated CSS transforms (`transform: translate3d`, `opacity`, `scale`).

### 7.1 Easing Tokens & Durations

```
--duration-fast:   100ms
--duration-normal: 150ms
--duration-slow:   250ms
--duration-pulse:  1000ms

--ease-out:   cubic-bezier(0.16, 1, 0.3, 1)        (Entrance & hover transitions)
--ease-in:    cubic-bezier(0.7, 0, 0.84, 0)        (Exit transitions)
--ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1)    (State pulse & active step snaps)
```

### 7.2 Simulation Animation Rules
- **Active State Node Pulse**: Expand node ring by $+4\text{px}$ scale with `--semantic-info` halo (200ms `--ease-bounce`).
- **Transition Arrow Glow**: Travel particle pulse along SVG path curve during string simulation step execution (300ms ease-in-out).
- **Reduced Motion Mode**: Respects `@media (prefers-reduced-motion: reduce)`. Converts all spring curves and translation transitions into instant 0ms opacity cross-fades.

---

## SECTION 8: Iconography System

- **Icon Set**: Lucide Icons (SVG vector icons).
- **Stroke Width**: `1.75px` consistent vector stroke weight.
- **Standard Sizing Scale**:
  - Small (Inline badges, input icons): `14px`
  - Medium (Standard buttons, navigation items): `18px`
  - Large (Modal headers, empty state placeholders): `24px`

---

## SECTION 9: Component Design Tokens

### 9.1 Action Buttons
- **Primary Button**: `background: var(--accent-primary); color: #FFFFFF; font-weight: 500; height: 36px; padding: 0 16px; border-radius: var(--radius-md);`
- **Secondary Button**: `background: var(--bg-surface-2); color: var(--text-primary); border: 1px solid var(--border-strong);`
- **Icon Tool Button**: `width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;`

### 9.2 Inputs & Dropdowns
- **Height**: 32px (Compact) / 36px (Standard).
- **State Borders**: Normal (`--border-strong`), Hover (`--accent-hover`), Active Focus (`--border-focus` with 2px offset ring).

### 9.3 Quad-Pane Container Headers
- **Header Height**: 40px.
- **Tab Titles**: Uppercase 11px JetBrains Mono (`letter-spacing: +0.05em; color: var(--text-secondary)`).

---

## SECTION 10: Accessibility & Inclusion

- **Color Contrast**: All text tokens enforce minimum 4.5:1 contrast ratio against `--bg-base` in normal mode, and 7:1 in High Contrast mode.
- **Visible Keyboard Focus Ring**: All interactive controls display explicit 2px outer indigo/yellow focus outlines when navigated via `Tab` / `Arrow` keys.
- **Screen Reader Announcements**: Integrated `aria-live="polite"` regions emit updates during simulation step transitions and static validation linter runs.

---

## SECTION 11: Responsive Density Architecture

- **Desktop (1920x1080 / 1440x900)**: Full Quad-Pane Layout enabled.
- **Laptop (1280x800)**: Collapsible sidebar and property inspector drawers.
- **Tablet / Touch (1024x768)**: Tabbed single-pane view mode with touch gesture support (drag to pan, pinch to zoom).

---

## SECTION 12: Theme Overrides & CSS Variable Schema

Theme switching is achieved by updating the root data attribute `<html data-theme="dark">` or `<html data-theme="light">` or `<html data-theme="high-contrast">`. All component tokens react dynamically without JS re-rendering.

---

## SECTION 13: Layout Hygiene & Error Prevention Rules

1. **No Ad-Hoc Pixel Values**: All margins, paddings, and sizes MUST reference spacing tokens (`--space-*`).
2. **Prevent Layout Shift**: Dynamic badges and validation icons reserve fixed width containers to eliminate cumulative layout shift (CLS).
3. **Destructive Action Safety**: Destructive actions (Deleting initial state, clearing canvas) require explicit confirmation dialogs or 5-second toast undo actions.

---
