import { describe, it, expect } from 'vitest';
import { StateNode, TransitionEdge } from '@project-zero/canvas-renderer';
import { executeDFA, validateDFA } from '@project-zero/core-solver';

function createExecutionControllerStore() {
  const state = {
    nodes: [
      { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isAccepting: false },
      { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isAccepting: true },
    ] as StateNode[],
    edges: [
      { id: 'e1', sourceNodeId: 'q0', targetNodeId: 'q0', label: '0' },
      { id: 'e2', sourceNodeId: 'q0', targetNodeId: 'q1', label: '1' },
      { id: 'e3', sourceNodeId: 'q1', targetNodeId: 'q0', label: '0' },
      { id: 'e4', sourceNodeId: 'q1', targetNodeId: 'q1', label: '1' },
    ] as TransitionEdge[],
    inputString: '1011',
    currentStepIndex: 0,
    isPlaying: false,
  };

  const getExecutionResult = () => executeDFA({ nodes: state.nodes, edges: state.edges }, state.inputString);
  const getValidationResult = () => validateDFA({ nodes: state.nodes, edges: state.edges });

  const getCurrentStep = () => {
    const steps = getExecutionResult().steps;
    if (steps.length === 0) return null;
    const idx = Math.min(Math.max(0, state.currentStepIndex), steps.length - 1);
    return steps[idx] || null;
  };

  const canRun = () => getValidationResult().isValid && getExecutionResult().steps.length > 0;
  const canStep = () => canRun() && state.currentStepIndex < getExecutionResult().steps.length - 1;
  const canBack = () => canRun() && state.currentStepIndex > 0;
  const canReset = () => state.currentStepIndex > 0 || state.isPlaying;

  const step = () => {
    if (canStep()) {
      state.currentStepIndex += 1;
    }
  };

  const back = () => {
    if (canBack()) {
      state.currentStepIndex -= 1;
    }
  };

  const reset = () => {
    state.isPlaying = false;
    state.currentStepIndex = 0;
  };

  const run = () => {
    if (!canRun()) return;
    if (state.currentStepIndex >= getExecutionResult().steps.length - 1) {
      state.currentStepIndex = 0;
    }
    state.isPlaying = true;
    state.currentStepIndex = getExecutionResult().steps.length - 1; // Complete run
  };

  const setInputString = (val: string) => {
    state.inputString = val;
    state.currentStepIndex = 0;
    state.isPlaying = false;
  };

  return {
    state,
    getExecutionResult,
    getValidationResult,
    getCurrentStep,
    canRun,
    canStep,
    canBack,
    canReset,
    step,
    back,
    reset,
    run,
    setInputString,
  };
}

describe('Interactive DFA Execution Controller Test Suite', () => {
  it('1. Initial execution session state starts at step 0 (q0)', () => {
    const ctrl = createExecutionControllerStore();
    expect(ctrl.state.currentStepIndex).toBe(0);
    expect(ctrl.getCurrentStep()?.currentStateId).toBe('q0');
    expect(ctrl.canBack()).toBe(false);
    expect(ctrl.canStep()).toBe(true);
  });

  it('2 & 3. Step advances through canonical DFA trace (1011)', () => {
    const ctrl = createExecutionControllerStore();

    // Step 0: read 1 -> q1
    expect(ctrl.state.currentStepIndex).toBe(0);
    expect(ctrl.getCurrentStep()?.currentStateLabel).toBe('q0');
    expect(ctrl.getCurrentStep()?.readSymbol).toBe('1');
    expect(ctrl.getCurrentStep()?.nextStateLabel).toBe('q1');

    // Step 1: read 0 -> q0
    ctrl.step();
    expect(ctrl.state.currentStepIndex).toBe(1);
    expect(ctrl.getCurrentStep()?.currentStateLabel).toBe('q1');
    expect(ctrl.getCurrentStep()?.readSymbol).toBe('0');
    expect(ctrl.getCurrentStep()?.nextStateLabel).toBe('q0');

    // Step 2: read 1 -> q1
    ctrl.step();
    expect(ctrl.state.currentStepIndex).toBe(2);
    expect(ctrl.getCurrentStep()?.currentStateLabel).toBe('q0');
    expect(ctrl.getCurrentStep()?.readSymbol).toBe('1');
    expect(ctrl.getCurrentStep()?.nextStateLabel).toBe('q1');

    // Step 3: read 1 -> q1 (ACCEPT)
    ctrl.step();
    expect(ctrl.state.currentStepIndex).toBe(3);
    expect(ctrl.getCurrentStep()?.currentStateLabel).toBe('q1');
    expect(ctrl.getCurrentStep()?.readSymbol).toBe('1');
    expect(ctrl.getCurrentStep()?.isAccepting).toBe(true);
    expect(ctrl.canStep()).toBe(false);
  });

  it('4 & 5. Back decrements step index and safely halts at 0', () => {
    const ctrl = createExecutionControllerStore();

    // Step forward 2 times
    ctrl.step();
    ctrl.step();
    expect(ctrl.state.currentStepIndex).toBe(2);

    // Back 1 time
    ctrl.back();
    expect(ctrl.state.currentStepIndex).toBe(1);

    // Back 1 time (returns to 0)
    ctrl.back();
    expect(ctrl.state.currentStepIndex).toBe(0);
    expect(ctrl.canBack()).toBe(false);

    // Back again at beginning stays at 0
    ctrl.back();
    expect(ctrl.state.currentStepIndex).toBe(0);
  });

  it('6 & 7. Run executes full trace to final ACCEPT, Reset returns to 0', () => {
    const ctrl = createExecutionControllerStore();

    ctrl.run();
    expect(ctrl.state.currentStepIndex).toBe(3);
    expect(ctrl.getCurrentStep()?.isAccepting).toBe(true);

    ctrl.reset();
    expect(ctrl.state.currentStepIndex).toBe(0);
    expect(ctrl.state.isPlaying).toBe(false);
    expect(ctrl.getCurrentStep()?.currentStateLabel).toBe('q0');
  });

  it('8. Step after Back resumes forward trajectory', () => {
    const ctrl = createExecutionControllerStore();

    ctrl.step(); // step 1
    ctrl.step(); // step 2
    ctrl.back(); // step 1
    expect(ctrl.state.currentStepIndex).toBe(1);

    ctrl.step(); // step 2 again
    expect(ctrl.state.currentStepIndex).toBe(2);
  });

  it('9. Invalid DFA blocks Run and Step execution', () => {
    const ctrl = createExecutionControllerStore();
    // Remove initial state
    ctrl.state.nodes[0] = { ...ctrl.state.nodes[0], isInitial: false };

    expect(ctrl.canRun()).toBe(false);
    expect(ctrl.canStep()).toBe(false);

    ctrl.step();
    expect(ctrl.state.currentStepIndex).toBe(0);

    ctrl.run();
    expect(ctrl.state.currentStepIndex).toBe(0);
  });

  it('13. Input change resets execution session to step 0', () => {
    const ctrl = createExecutionControllerStore();

    ctrl.step();
    ctrl.step();
    expect(ctrl.state.currentStepIndex).toBe(2);

    ctrl.setInputString('111');
    expect(ctrl.state.inputString).toBe('111');
    expect(ctrl.state.currentStepIndex).toBe(0);
    expect(ctrl.getCurrentStep()?.currentStateLabel).toBe('q0');
  });
});
