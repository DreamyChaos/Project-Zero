# Turing Machine Engine & Foundation ($M = (Q, \Sigma, \Gamma, \delta, q_0, B, F)$)

## Theoretical Model & Mathematics

A **Deterministic Turing Machine (TM)** is a 7-tuple:

$$M = (Q, \Sigma, \Gamma, \delta, q_0, B, F)$$

where:
1. $Q$ is a finite set of states.
2. $\Sigma$ is the input alphabet (excluding the blank symbol $B$).
3. $\Gamma$ is the tape alphabet where $\Sigma \subset \Gamma$.
4. $\delta: Q \times \Gamma \to Q \times \Gamma \times \{L, R, S\}$ is the deterministic transition function.
5. $q_0 \in Q$ is the initial start state.
6. $B \in \Gamma \setminus \Sigma$ is the blank symbol (default `□`).
7. $F \subseteq Q$ is the set of accepting states.

## Transition Semantics

Each transition edge in Project Zero is specified as:

$$\delta(q, X) = (p, Y, D)$$

- **Read Symbol ($X$)**: Symbol read under the tape head at current state $q$.
- **Write Symbol ($Y$)**: Symbol written to the current tape cell.
- **Move Direction ($D$)**: Head shift movement direction after write:
  - `L` (Left: head index decreases by 1)
  - `R` (Right: head index increases by 1)
  - `S` (Stay: head index remains unchanged)

## Infinite Sparse Tape Model

Project Zero implements a pure **sparse infinite tape** using `Map<number, string>`. Key properties:
- **Bi-directional**: Head can move infinitely into negative positions ($... -2, -1, 0, 1, 2 ...$) and positive positions without artificial bounds.
- **Unvisited Cells**: Any unvisited tape index automatically evaluates to the designated blank symbol $B$ (`□`).
- **Dynamic View Window**: The tape UI visualizes a dynamic window around the tape head pointer without arbitrary truncation.

## Execution & Halting

1. **Acceptance**: The TM accepts if it reaches any state $q \in F$.
2. **Rejection (Halt)**: If state $q \notin F$ has no outgoing transition for the current tape symbol $X$, execution halts in rejection (`NO_TRANSITION`).
3. **Inconclusive Limit**: If step count exceeds `maxSteps` (e.g. 1000) without halting, execution yields `INCONCLUSIVE_LIMIT`.

## File Serialization & Persistence

Turing Machines are fully serialized into `.projectzero` JSON format preserving:
- `machineType: "TM"`
- `blankSymbol: "□"` (or custom blank character)
- Transitions: `readSymbol`, `writeSymbol`, `moveDirection` (`L` | `R` | `S`)
