import React from 'react';
import { IFieldSchema } from './types';
import { Info, CheckSquare, Square } from 'lucide-react';

interface FieldProps {
  field: IFieldSchema;
  onChange?: (id: string, value: string | number | boolean) => void;
}

export const InspectorFieldRenderer: React.FC<FieldProps> = ({ field, onChange }) => {
  switch (field.type) {
    case 'text':
      return (
        <div className="space-y-1">
          <label htmlFor={field.id} className="text-[11px] text-txt-secondary block font-medium">
            {field.label}
          </label>
          <input
            id={field.id}
            type="text"
            disabled={field.disabled}
            value={String(field.value)}
            placeholder={field.placeholder}
            onChange={(e) => onChange?.(field.id, e.target.value)}
            className="w-full bg-bg-surface3 border border-border-subtle hover:border-border-strong focus:border-border-focus rounded px-2.5 py-1 text-xs text-txt-primary font-mono outline-none disabled:opacity-50 transition-colors"
          />
          {field.helpText && <p className="text-[10px] text-txt-muted">{field.helpText}</p>}
        </div>
      );

    case 'number':
      return (
        <div className="space-y-1">
          <label htmlFor={field.id} className="text-[11px] text-txt-secondary block font-medium">
            {field.label}
          </label>
          <input
            id={field.id}
            type="number"
            disabled={field.disabled}
            value={Number(field.value)}
            onChange={(e) => onChange?.(field.id, parseFloat(e.target.value) || 0)}
            className="w-full bg-bg-surface3 border border-border-subtle hover:border-border-strong focus:border-border-focus rounded px-2.5 py-1 text-xs text-txt-primary font-mono outline-none disabled:opacity-50 transition-colors"
          />
          {field.helpText && <p className="text-[10px] text-txt-muted">{field.helpText}</p>}
        </div>
      );

    case 'checkbox':
      return (
        <div className="pt-1">
          <button
            type="button"
            role="checkbox"
            aria-checked={Boolean(field.value)}
            disabled={field.disabled}
            onClick={() => onChange?.(field.id, !field.value)}
            className="flex items-center space-x-2 text-xs text-txt-primary select-none outline-none focus-visible:ring-2 focus-visible:ring-border-focus rounded p-0.5"
          >
            {field.value ? (
              <CheckSquare size={15} className="text-accent-primary shrink-0" />
            ) : (
              <Square size={15} className="text-txt-muted shrink-0" />
            )}
            <span className="font-medium">{field.label}</span>
          </button>
          {field.helpText && <p className="text-[10px] text-txt-muted pl-6">{field.helpText}</p>}
        </div>
      );

    case 'select':
      return (
        <div className="space-y-1">
          <label htmlFor={field.id} className="text-[11px] text-txt-secondary block font-medium">
            {field.label}
          </label>
          <select
            id={field.id}
            disabled={field.disabled}
            value={String(field.value)}
            onChange={(e) => onChange?.(field.id, e.target.value)}
            className="w-full bg-bg-surface3 border border-border-subtle hover:border-border-strong focus:border-border-focus rounded px-2 py-1 text-xs text-txt-primary font-mono outline-none disabled:opacity-50 transition-colors cursor-pointer"
          >
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-bg-surface1 text-txt-primary">
                {opt.label}
              </option>
            ))}
          </select>
          {field.helpText && <p className="text-[10px] text-txt-muted">{field.helpText}</p>}
        </div>
      );

    case 'badge':
      return (
        <div className="flex items-center justify-between py-1 text-xs">
          <span className="text-txt-secondary font-medium">{field.label}</span>
          <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-accent-primary/15 text-accent-primary border border-accent-primary/30 font-medium">
            {String(field.value)}
          </span>
        </div>
      );

    case 'info':
      return (
        <div className="bg-semantic-info/10 border border-semantic-info/20 p-2.5 rounded-lg flex items-start space-x-2 text-txt-secondary text-[11px]">
          <Info size={14} className="text-semantic-info shrink-0 mt-0.5" />
          <span className="leading-tight">{String(field.value)}</span>
        </div>
      );

    default:
      return null;
  }
};
