import { AIContextSnapshot } from './types.js';
import { MAX_SERIALIZED_CONTEXT_CHARS } from './constants.js';

/**
 * Deterministically serializes an AIContextSnapshot and Educational Evidence into a clean, compact markdown block
 * for the AI Tutor to ground its explanation.
 */
export function serializeContextForPrompt(ctx: AIContextSnapshot): string {
  const parts: string[] = [];

  parts.push(`### [Project Zero Workspace Context]`);
  parts.push(`- Active Machine Type: ${ctx.workspace.activeMachineType}`);
  if (ctx.workspace.activeBottomTab) {
    parts.push(`- Active Bottom View: ${ctx.workspace.activeBottomTab}`);
  }
  if (ctx.workspace.activeInspectorTab) {
    parts.push(`- Active Inspector Tab: ${ctx.workspace.activeInspectorTab}`);
  }
  if (ctx.tutorIntent) {
    parts.push(`- Educational Mode Intent: ${ctx.tutorIntent}`);
  }

  // Selection Focus
  const nodes = ctx.selection.selectedNodeLabels;
  const edges = ctx.selection.selectedEdgeDescriptions;
  if (nodes.length > 0 || edges.length > 0) {
    const selParts: string[] = [];
    if (nodes.length > 0) selParts.push(`Selected States (Focus): [${nodes.join(', ')}]`);
    if (edges.length > 0) selParts.push(`Selected Transitions (Focus): [${edges.join('; ')}]`);
    parts.push(`- Current Selection: ${selParts.join(' | ')}`);
  } else {
    parts.push(`- Current Selection: None (Entire Machine Scope)`);
  }

  // Machine Definition
  parts.push(`\n### [Current Machine Formal Specification]`);
  parts.push(`- Type: ${ctx.machine.type}`);
  parts.push(`- States (${ctx.machine.stateCount}): {${ctx.machine.states.join(', ')}}`);
  parts.push(`- Initial State: ${ctx.machine.initialState || 'None'}`);
  parts.push(`- Accepting States: {${ctx.machine.acceptingStates.join(', ')}}`);
  parts.push(`- Alphabet Σ: {${ctx.machine.alphabet.join(', ')}}`);

  if (ctx.machine.initialStackSymbol) {
    parts.push(`- Initial Stack Symbol: ${ctx.machine.initialStackSymbol}`);
  }
  if (ctx.machine.blankSymbol) {
    parts.push(`- Tape Blank Symbol: ${ctx.machine.blankSymbol}`);
  }
  if (ctx.machine.pdaAcceptanceMode) {
    parts.push(`- PDA Acceptance Mode: ${ctx.machine.pdaAcceptanceMode}`);
  }

  // Transitions list
  if (ctx.machine.transitions.length > 0) {
    parts.push(`- Transitions (${ctx.machine.transitionCount}):`);
    for (const t of ctx.machine.transitions) {
      let tStr = `  δ(${t.from}, '${t.symbol}') → ${t.to}`;
      if (t.stackPop !== undefined || t.stackPush !== undefined) {
        tStr += ` [pop: ${t.stackPop || 'ε'}, push: ${t.stackPush || 'ε'}]`;
      }
      if (t.tapeWrite !== undefined || t.tapeDirection !== undefined) {
        tStr += ` [write: ${t.tapeWrite || '□'}, dir: ${t.tapeDirection || 'R'}]`;
      }
      parts.push(tStr);
    }
  } else {
    parts.push(`- Transitions: None`);
  }

  // Deterministic Educational Evidence Layer
  if (ctx.evidence) {
    parts.push(`\n### [Deterministic Educational Evidence]`);
    if (ctx.evidence.validityStatus) {
      parts.push(`- Verified Validity Status: ${ctx.evidence.validityStatus}`);
    }
    if (ctx.evidence.diagnostics && ctx.evidence.diagnostics.length > 0) {
      parts.push(`- Official Diagnostics:`);
      for (const diag of ctx.evidence.diagnostics) {
        parts.push(`  ! ${diag}`);
      }
    }
    if (ctx.evidence.minimization) {
      parts.push(`- Minimization Facts: isAlreadyMinimal=${ctx.evidence.minimization.isAlreadyMinimal}`);
      if (ctx.evidence.minimization.equivalenceClasses) {
        parts.push(`  Equivalence Classes: ${ctx.evidence.minimization.equivalenceClasses.map((c) => `[${c.join(',')}]`).join(', ')}`);
      }
    }
    if (ctx.evidence.execution) {
      parts.push(`- Execution Run for "${ctx.evidence.execution.inputString}": ${ctx.evidence.execution.isAccepted ? 'ACCEPTED' : 'REJECTED'}`);
      if (ctx.evidence.execution.proofSummary) {
        parts.push(`  Proof: ${ctx.evidence.execution.proofSummary}`);
      }
    }
    if (ctx.evidence.grammar) {
      if (ctx.evidence.grammar.isLL1 !== undefined) {
        parts.push(`- Grammar LL(1) Status: ${ctx.evidence.grammar.isLL1 ? 'Valid LL(1)' : 'Contains Conflicts'}`);
      }
      if (ctx.evidence.grammar.ll1Conflicts && ctx.evidence.grammar.ll1Conflicts.length > 0) {
        parts.push(`  Conflicts: ${ctx.evidence.grammar.ll1Conflicts.join(', ')}`);
      }
    }
  } else if (ctx.analysis) {
    parts.push(`\n### [Analysis & Diagnostics]`);
    if (ctx.analysis.isStructurallyValid !== undefined) {
      parts.push(`- Formal Structural Validity: ${ctx.analysis.isStructurallyValid ? 'VALID' : 'INVALID'}`);
    }
    if (ctx.analysis.observations && ctx.analysis.observations.length > 0) {
      parts.push(`- Observations:`);
      for (const obs of ctx.analysis.observations) {
        parts.push(`  * ${obs}`);
      }
    }
    if (ctx.analysis.diagnostics && ctx.analysis.diagnostics.length > 0) {
      parts.push(`- Warnings / Errors:`);
      for (const diag of ctx.analysis.diagnostics) {
        parts.push(`  ! ${diag}`);
      }
    }
  }

  if (ctx.contextTruncated) {
    parts.push(`\n[Note: Context was bounded/truncated to fit token safety constraints: ${ctx.truncationReason || 'Size limit'}]`);
  }

  const raw = parts.join('\n');
  if (raw.length > MAX_SERIALIZED_CONTEXT_CHARS) {
    return raw.slice(0, MAX_SERIALIZED_CONTEXT_CHARS) + '\n...[Context truncated to 3500 chars]';
  }
  return raw;
}
