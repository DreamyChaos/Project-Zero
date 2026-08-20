import React, { useMemo } from 'react';
import { useGraph } from '../../../context/GraphContext';
import { IInspectorSchema } from '../types';
import { InspectorSchemaRenderer } from '../InspectorSchemaRenderer';
import { Trash2 } from 'lucide-react';

export const TransitionInspectorView: React.FC = () => {
  const { edges, nodes, selectedEdgeIds, updateEdge, removeEdge, machineType } = useGraph();

  const selectedEdge = useMemo(
    () => (selectedEdgeIds.length > 0 ? edges.find((e) => e.id === selectedEdgeIds[0]) : undefined),
    [edges, selectedEdgeIds]
  );

  const sourceNode = useMemo(
    () => (selectedEdge ? nodes.find((n) => n.id === selectedEdge.sourceNodeId) : undefined),
    [nodes, selectedEdge]
  );

  const targetNode = useMemo(
    () => (selectedEdge ? nodes.find((n) => n.id === selectedEdge.targetNodeId) : undefined),
    [nodes, selectedEdge]
  );

  const schema: IInspectorSchema = useMemo(() => {
    if (!selectedEdge) {
      return {
        selectionType: 'none',
        title: 'Transition Edge Inspector',
        subtitle: `${edges.length} transition(s) in δ`,
        sections: [
          {
            id: 'sec-empty',
            title: 'Select a Transition Edge',
            isExpanded: true,
            fields: [
              {
                id: 'empty-count',
                label: 'Delta Mappings δ',
                type: 'badge',
                value: edges.length > 0 ? `${edges.length} transition rule(s)` : 'δ = ∅',
              },
              {
                id: 'empty-info',
                label: 'Canvas Instruction',
                type: 'info',
                value: 'Click any edge on the canvas to inspect its source/target state and read/write symbols.',
              },
            ],
          },
        ],
      };
    }

    const sourceLabel = sourceNode ? sourceNode.label : selectedEdge.sourceNodeId;
    const targetLabel = targetNode ? targetNode.label : selectedEdge.targetNodeId;

    const nodeOptions = nodes.map((n) => ({ label: n.label, value: n.id }));

    const symbolFields =
      machineType === 'TM'
        ? [
            {
              id: 'tm-read-symbol',
              label: 'Read Symbol (X)',
              type: 'text' as const,
              value: selectedEdge.readSymbol || selectedEdge.label.split(/→|->|,/)[0]?.trim() || '0',
              helpText: 'Symbol read from current tape position',
            },
            {
              id: 'tm-write-symbol',
              label: 'Write Symbol (Y)',
              type: 'text' as const,
              value: selectedEdge.writeSymbol || selectedEdge.label.split(/→|->|,/)[1]?.trim() || '1',
              helpText: 'Symbol written to current tape position',
            },
            {
              id: 'tm-move-direction',
              label: 'Move Direction (D)',
              type: 'select' as const,
              value: selectedEdge.moveDirection || 'R',
              options: [
                { label: 'Right (R)', value: 'R' },
                { label: 'Left (L)', value: 'L' },
                { label: 'Stay (S)', value: 'S' },
              ],
              helpText: 'Head movement direction after write',
            },
          ]
        : machineType === 'PDA'
        ? [
            {
              id: 'input-symbol',
              label: 'Input Symbol (a)',
              type: 'text' as const,
              value: selectedEdge.inputSymbol || selectedEdge.label.split(',')[0] || 'ε',
              helpText: 'Input symbol consumed (or ε)',
            },
            {
              id: 'stack-top',
              label: 'Stack Top (X)',
              type: 'text' as const,
              value: selectedEdge.stackTop || 'Z0',
              helpText: 'Stack symbol matched and popped (or ε)',
            },
            {
              id: 'stack-replacement',
              label: 'Stack Replacement (γ)',
              type: 'text' as const,
              value: selectedEdge.stackReplacement || 'AZ0',
              helpText: 'Symbols pushed onto stack (or ε)',
            },
          ]
        : [
            {
              id: 'read-symbol',
              label: 'Read Symbol (Σ)',
              type: 'text' as const,
              value: selectedEdge.label,
              helpText: 'Input symbol/string consumed by transition (e.g. a, b, 0, 1, ε)',
            },
          ];

    return {
      selectionType: 'transition',
      title: 'Transition Edge Inspector',
      subtitle: `δ(${sourceLabel}, ${selectedEdge.label || 'ε'}) = ${targetLabel}`,
      sections: [
        {
          id: 'sec-general',
          title: 'Transition Identity',
          isExpanded: true,
          fields: [
            { id: 'edge-id', label: 'Internal UUID', type: 'badge', value: selectedEdge.id },
            {
              id: 'source-state',
              label: 'Source State',
              type: 'select',
              value: selectedEdge.sourceNodeId,
              options: nodeOptions,
            },
            {
              id: 'target-state',
              label: 'Target State',
              type: 'select',
              value: selectedEdge.targetNodeId,
              options: nodeOptions,
            },
          ],
        },
        {
          id: 'sec-symbols',
          title:
            machineType === 'TM'
              ? 'Turing Machine Read / Write / Move Mapping'
              : machineType === 'PDA'
              ? 'PDA Stack Transition Mapping'
              : 'Alphabet Symbol Mapping',
          isExpanded: true,
          fields: symbolFields,
        },
      ],
    };
  }, [selectedEdge, sourceNode, targetNode, nodes, machineType]);

  const handleFieldChange = (id: string, value: string | number | boolean) => {
    if (!selectedEdge) return;
    if (id === 'read-symbol') {
      updateEdge(selectedEdge.id, { label: String(value) });
    } else if (id === 'tm-read-symbol') {
      const readSym = String(value);
      const writeSym = selectedEdge.writeSymbol || '1';
      const moveDir = selectedEdge.moveDirection || 'R';
      const label = `${readSym} → ${writeSym}, ${moveDir}`;
      updateEdge(selectedEdge.id, { readSymbol: readSym, writeSymbol: writeSym, moveDirection: moveDir, label });
    } else if (id === 'tm-write-symbol') {
      const writeSym = String(value);
      const readSym = selectedEdge.readSymbol || '0';
      const moveDir = selectedEdge.moveDirection || 'R';
      const label = `${readSym} → ${writeSym}, ${moveDir}`;
      updateEdge(selectedEdge.id, { readSymbol: readSym, writeSymbol: writeSym, moveDirection: moveDir, label });
    } else if (id === 'tm-move-direction') {
      const moveDir = String(value) as 'L' | 'R' | 'S';
      const readSym = selectedEdge.readSymbol || '0';
      const writeSym = selectedEdge.writeSymbol || '1';
      const label = `${readSym} → ${writeSym}, ${moveDir}`;
      updateEdge(selectedEdge.id, { readSymbol: readSym, writeSymbol: writeSym, moveDirection: moveDir, label });
    } else if (id === 'input-symbol') {
      const inputSym = String(value);
      const top = selectedEdge.stackTop || 'Z0';
      const repl = selectedEdge.stackReplacement || 'AZ0';
      const label = `${inputSym}, ${top} / ${repl}`;
      updateEdge(selectedEdge.id, { inputSymbol: inputSym, label });
    } else if (id === 'stack-top') {
      const top = String(value);
      const inputSym = selectedEdge.inputSymbol || selectedEdge.label.split(',')[0] || 'ε';
      const repl = selectedEdge.stackReplacement || 'AZ0';
      const label = `${inputSym}, ${top} / ${repl}`;
      updateEdge(selectedEdge.id, { stackTop: top, label });
    } else if (id === 'stack-replacement') {
      const repl = String(value);
      const inputSym = selectedEdge.inputSymbol || selectedEdge.label.split(',')[0] || 'ε';
      const top = selectedEdge.stackTop || 'Z0';
      const label = `${inputSym}, ${top} / ${repl}`;
      updateEdge(selectedEdge.id, { stackReplacement: repl, label });
    } else if (id === 'source-state') {
      updateEdge(selectedEdge.id, { sourceNodeId: String(value) });
    } else if (id === 'target-state') {
      updateEdge(selectedEdge.id, { targetNodeId: String(value) });
    }
  };

  const handleDelete = () => {
    if (selectedEdge) {
      removeEdge(selectedEdge.id);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <InspectorSchemaRenderer schema={schema} onFieldChange={handleFieldChange} />
      </div>
      {selectedEdge && (
        <div className="p-3 border-t border-border-subtle bg-bg-surface2/40 shrink-0">
          <button
            onClick={handleDelete}
            className="w-full py-1.5 px-3 text-xs font-medium text-semantic-error bg-semantic-error/10 hover:bg-semantic-error/20 border border-semantic-error/30 rounded-lg flex items-center justify-center space-x-1.5 transition-all outline-none focus-visible:ring-2 focus-visible:ring-semantic-error"
          >
            <Trash2 size={13} />
            <span>Delete Transition</span>
          </button>
        </div>
      )}
    </div>
  );
};

