import React, { useMemo } from 'react';
import { IInspectorSchema } from '../types';
import { InspectorSchemaRenderer } from '../InspectorSchemaRenderer';
import { useGraph } from '../../../context/GraphContext';
import { Trash2, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

/**
 * StateInspectorView — shows real data for the currently selected StateNode.
 * Reads selection and node list from GraphContext; writes label/flag changes back.
 * Features state deletion action, incoming/outgoing transitions breakdown.
 */
export const StateInspectorView: React.FC = () => {
  const { nodes, edges, selectedNodeIds, updateNode, removeNode } = useGraph();

  // Find the first selected node (single-selection inspector)
  const selectedNode = useMemo(
    () => (selectedNodeIds.length > 0 ? nodes.find((n) => n.id === selectedNodeIds[0]) : undefined),
    [nodes, selectedNodeIds]
  );

  const incomingTransitions = useMemo(
    () => (selectedNode ? edges.filter((e) => e.targetNodeId === selectedNode.id) : []),
    [selectedNode, edges]
  );

  const outgoingTransitions = useMemo(
    () => (selectedNode ? edges.filter((e) => e.sourceNodeId === selectedNode.id) : []),
    [selectedNode, edges]
  );

  const schema: IInspectorSchema = useMemo(() => {
    if (!selectedNode) {
      return {
        selectionType: 'none',
        title: 'State Node Inspector',
        subtitle: `${nodes.length} state(s) in Q`,
        sections: [
          {
            id: 'sec-empty',
            title: 'Select a State Node',
            isExpanded: true,
            fields: [
              {
                id: 'empty-hint',
                label: 'States Q',
                type: 'badge',
                value: nodes.length > 0 ? `{ ${nodes.map((n) => n.label).join(', ')} }` : 'Q = ∅',
              },
              {
                id: 'empty-info',
                label: 'Canvas Instruction',
                type: 'info',
                value: 'Click any state node on the canvas, or click a state label above to inspect its initial/final status, transitions, and position.',
              },
            ],
          },
        ],
      };
    }

    return {
      selectionType: 'state',
      title: 'State Node Inspector',
      subtitle: `Node ${selectedNode.label}`,
      sections: [
        {
          id: 'sec-general',
          title: 'General Properties',
          isExpanded: true,
          fields: [
            {
              id: 'state-id',
              label: 'Internal ID',
              type: 'badge',
              value: selectedNode.id,
            },
            {
              id: 'state-label',
              label: 'State Symbol',
              type: 'text',
              value: selectedNode.label,
              helpText: 'State symbol in 5-tuple Q',
            },
          ],
        },
        {
          id: 'sec-formal',
          title: 'Formal Definition',
          isExpanded: true,
          fields: [
            {
              id: 'is-initial',
              label: 'Initial Start State (q₀)',
              type: 'checkbox',
              value: selectedNode.isInitial ?? false,
              helpText: 'First state entered upon execution',
            },
            {
              id: 'is-accepting',
              label: 'Final Accepting State (F)',
              type: 'checkbox',
              value: selectedNode.isAccepting ?? false,
              helpText: 'String is accepted if execution ends here',
            },
          ],
        },
        {
          id: 'sec-spatial',
          title: 'Position Coordinates',
          isExpanded: true,
          fields: [
            {
              id: 'pos-x',
              label: 'X Coordinate (px)',
              type: 'number',
              value: Math.round(selectedNode.x),
            },
            {
              id: 'pos-y',
              label: 'Y Coordinate (px)',
              type: 'number',
              value: Math.round(selectedNode.y),
            },
          ],
        },
      ],
    };
  }, [selectedNode, nodes]);

  const handleFieldChange = (id: string, value: string | number | boolean) => {
    if (!selectedNode) return;

    switch (id) {
      case 'state-label':
        updateNode(selectedNode.id, { label: String(value) });
        break;
      case 'is-initial':
        updateNode(selectedNode.id, { isInitial: Boolean(value) });
        break;
      case 'is-accepting':
        updateNode(selectedNode.id, { isAccepting: Boolean(value) });
        break;
      case 'pos-x':
        updateNode(selectedNode.id, { x: Number(value) });
        break;
      case 'pos-y':
        updateNode(selectedNode.id, { y: Number(value) });
        break;
      default:
        break;
    }
  };

  const handleDeleteState = () => {
    if (selectedNode) {
      removeNode(selectedNode.id);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <InspectorSchemaRenderer schema={schema} onFieldChange={handleFieldChange} />

      {selectedNode && (
        <div className="p-3 border-t border-border-subtle bg-bg-surface2/40 text-xs font-mono space-y-3 shrink-0">
          {/* Transitions Summary */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold text-txt-secondary flex items-center justify-between">
              <span className="flex items-center space-x-1">
                <ArrowDownLeft size={12} className="text-accent-primary" />
                <span>Incoming ({incomingTransitions.length})</span>
              </span>
              <span className="flex items-center space-x-1">
                <ArrowUpRight size={12} className="text-accent-cyan" />
                <span>Outgoing ({outgoingTransitions.length})</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <div className="bg-bg-surface3 p-1.5 rounded border border-border-subtle max-h-20 overflow-y-auto space-y-0.5">
                {incomingTransitions.length === 0 ? (
                  <span className="text-txt-muted">None</span>
                ) : (
                  incomingTransitions.map((e) => {
                    const src = nodes.find((n) => n.id === e.sourceNodeId);
                    return (
                      <div key={e.id} className="truncate text-txt-secondary">
                        {src?.label || e.sourceNodeId} --[{e.label}]--&gt;
                      </div>
                    );
                  })
                )}
              </div>

              <div className="bg-bg-surface3 p-1.5 rounded border border-border-subtle max-h-20 overflow-y-auto space-y-0.5">
                {outgoingTransitions.length === 0 ? (
                  <span className="text-txt-muted">None</span>
                ) : (
                  outgoingTransitions.map((e) => {
                    const tgt = nodes.find((n) => n.id === e.targetNodeId);
                    return (
                      <div key={e.id} className="truncate text-txt-secondary">
                        --[{e.label}]--&gt; {tgt?.label || e.targetNodeId}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Contextual Actions */}
          <div className="pt-1">
            <button
              onClick={handleDeleteState}
              className="w-full py-1.5 px-3 bg-semantic-error/15 hover:bg-semantic-error/25 border border-semantic-error/30 text-semantic-error rounded-md font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
            >
              <Trash2 size={14} />
              <span>Delete State {selectedNode.label}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
