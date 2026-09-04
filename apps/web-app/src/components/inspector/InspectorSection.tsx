import React, { useState } from 'react';
import { ISectionSchema } from './types';
import { InspectorFieldRenderer } from './InspectorFields';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface InspectorSectionProps {
  section: ISectionSchema;
  onFieldChange?: (id: string, value: string | number | boolean) => void;
}

export const InspectorSection: React.FC<InspectorSectionProps> = ({ section, onFieldChange }) => {
  const [isOpen, setIsOpen] = useState<boolean>(section.isExpanded ?? true);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    }
  };

  return (
    <div className="border-b border-border-subtle last:border-b-0">
      <button
        type="button"
        role="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className="w-full flex items-center justify-between py-2 px-3 bg-bg-surface2/40 hover:bg-bg-surface2 text-xs font-medium text-txt-primary select-none outline-none focus-visible:ring-2 focus-visible:ring-border-focus transition-colors"
      >
        <span className="font-mono text-[11px] uppercase tracking-wider text-txt-secondary">{section.title}</span>
        {isOpen ? <ChevronDown size={14} className="text-txt-muted" /> : <ChevronRight size={14} className="text-txt-muted" />}
      </button>

      {isOpen && (
        <div className="p-3 space-y-3 bg-bg-surface1/60">
          {section.fields.map((field) => (
            <InspectorFieldRenderer key={field.id} field={field} onChange={onFieldChange} />
          ))}
        </div>
      )}
    </div>
  );
};
