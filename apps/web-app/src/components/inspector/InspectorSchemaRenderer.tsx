import React from 'react';
import { IInspectorSchema } from './types';
import { InspectorSection } from './InspectorSection';
import { Sliders } from 'lucide-react';

interface InspectorSchemaRendererProps {
  schema: IInspectorSchema;
  onFieldChange?: (id: string, value: string | number | boolean) => void;
}

export const InspectorSchemaRenderer: React.FC<InspectorSchemaRendererProps> = ({
  schema,
  onFieldChange,
}) => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Schema Header Title Banner */}
      <div className="h-9 border-b border-border-subtle bg-bg-surface2/50 px-3 flex items-center justify-between text-xs font-medium text-txt-primary shrink-0 select-none">
        <span className="flex items-center space-x-1.5">
          <Sliders size={14} className="text-accent-primary" />
          <span>{schema.title}</span>
        </span>
        {schema.subtitle && (
          <span className="font-mono text-[10px] text-accent-primary bg-accent-primary/10 px-1.5 py-0.5 rounded border border-accent-primary/20">
            {schema.subtitle}
          </span>
        )}
      </div>

      {/* Accordion Sections Container */}
      <div className="flex-1 overflow-y-auto">
        {schema.sections.map((section) => (
          <InspectorSection key={section.id} section={section} onFieldChange={onFieldChange} />
        ))}
      </div>
    </div>
  );
};
