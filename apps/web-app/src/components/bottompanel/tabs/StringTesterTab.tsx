import React, { useState, useMemo } from 'react';
import { useGraph } from '../../../context/GraphContext';
import { executeDFA, executeNFA, executePDA, executeTM } from '@project-zero/core-solver';
import { CheckCircle2, XCircle, Plus, Trash2 } from 'lucide-react';

interface TestCase {
  id: string;
  string: string;
  expected: 'ACCEPT' | 'REJECT';
}

const DEFAULT_TEST_CASES: TestCase[] = [
  { id: 'tc1', string: '1011', expected: 'ACCEPT' },
  { id: 'tc2', string: '111', expected: 'ACCEPT' },
  { id: 'tc3', string: '1', expected: 'ACCEPT' },
  { id: 'tc4', string: '10', expected: 'REJECT' },
  { id: 'tc5', string: '1010', expected: 'REJECT' },
  { id: 'tc6', string: '0', expected: 'REJECT' },
];

export const StringTesterTab: React.FC = () => {
  const { nodes, edges, machineType, initialStackSymbol, blankSymbol } = useGraph();
  const [testCases, setTestCases] = useState<TestCase[]>(DEFAULT_TEST_CASES);
  const [newString, setNewString] = useState('');
  const [newExpected, setNewExpected] = useState<'ACCEPT' | 'REJECT'>('ACCEPT');

  // Compute live test results against core-solver
  const results = useMemo(() => {
    return testCases.map((tc) => {
      const res =
        machineType === 'TM'
          ? executeTM({ nodes, edges }, tc.string, { blankSymbol })
          : machineType === 'PDA'
          ? executePDA({ nodes, edges }, tc.string, { initialStackSymbol })
          : machineType === 'NFA'
          ? executeNFA({ nodes, edges }, tc.string)
          : executeDFA({ nodes, edges }, tc.string);

      const actual = res.isAccepted ? 'ACCEPT' : 'REJECT';
      const isPass = actual === tc.expected;
      return {
        ...tc,
        actual,
        isPass,
        rejectionReason: res.rejectionReason,
      };
    });
  }, [nodes, edges, machineType, initialStackSymbol, blankSymbol, testCases]);

  const passCount = results.filter((r) => r.isPass).length;
  const totalCount = results.length;
  const passRate = totalCount > 0 ? Math.round((passCount / totalCount) * 100) : 100;

  const handleAddTestCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (newString.trim().length === 0 && newString !== '') return;
    const newId = `tc_${Date.now()}`;
    setTestCases((prev) => [...prev, { id: newId, string: newString.trim(), expected: newExpected }]);
    setNewString('');
  };

  const handleRemoveTestCase = (id: string) => {
    setTestCases((prev) => prev.filter((tc) => tc.id !== id));
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden text-xs font-mono select-none">
      {/* Batch Test Action Bar */}
      <div className="p-2 border-b border-border-subtle bg-bg-surface2/50 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <span className="text-txt-secondary font-medium">Batch String Test Suite</span>
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
              passRate === 100
                ? 'bg-semantic-accept/15 text-semantic-accept border-semantic-accept/30'
                : 'bg-semantic-warning/15 text-semantic-warning border-semantic-warning/30'
            }`}
          >
            {passCount}/{totalCount} Passed ({passRate}%)
          </span>
        </div>

        {/* Add Test Case Form */}
        <form onSubmit={handleAddTestCase} className="flex items-center space-x-1.5">
          <input
            type="text"
            value={newString}
            onChange={(e) => setNewString(e.target.value)}
            placeholder="New string (e.g. 100)"
            className="bg-bg-surface3 border border-border-subtle hover:border-border-strong focus:border-border-focus px-2 py-1 rounded text-txt-primary font-mono text-xs w-36 outline-none transition-colors"
          />
          <select
            value={newExpected}
            onChange={(e) => setNewExpected(e.target.value as 'ACCEPT' | 'REJECT')}
            className="bg-bg-surface3 border border-border-subtle px-2 py-1 rounded text-txt-primary text-xs outline-none"
          >
            <option value="ACCEPT">ACCEPT</option>
            <option value="REJECT">REJECT</option>
          </select>
          <button
            type="submit"
            className="flex items-center space-x-1 px-2.5 py-1 bg-accent-primary hover:bg-accent-hover text-white rounded text-xs font-medium transition-colors shadow-sm"
          >
            <Plus size={13} />
            <span>Add Test</span>
          </button>
        </form>
      </div>

      {/* Test Cases Table List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {results.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between p-2 rounded bg-bg-surface2/60 border border-border-subtle hover:bg-bg-surface2 transition-colors"
          >
            <div className="flex items-center space-x-3">
              {r.isPass ? (
                <CheckCircle2 size={16} className="text-semantic-accept shrink-0" />
              ) : (
                <XCircle size={16} className="text-semantic-error shrink-0" />
              )}
              <span className="font-bold text-txt-primary font-mono text-sm">
                {r.string.length > 0 ? r.string : 'ε'}
              </span>
              <span className="text-txt-muted text-[11px]">Expected: <strong>{r.expected}</strong></span>
              <span className="text-txt-muted text-[11px]">Actual: <strong className={r.actual === 'ACCEPT' ? 'text-semantic-accept' : 'text-semantic-error'}>{r.actual}</strong></span>
            </div>

            <div className="flex items-center space-x-2">
              <span
                className={`text-[10px] px-2 py-0.5 font-bold rounded border ${
                  r.isPass
                    ? 'bg-semantic-accept/15 text-semantic-accept border-semantic-accept/30'
                    : 'bg-semantic-error/15 text-semantic-error border-semantic-error/30'
                }`}
              >
                {r.isPass ? 'PASS' : 'FAIL'}
              </span>
              <button
                onClick={() => handleRemoveTestCase(r.id)}
                className="p-1 text-txt-muted hover:text-semantic-error transition-colors"
                title="Remove Test Case"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

