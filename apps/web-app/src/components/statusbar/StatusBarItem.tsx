import React, { useState } from 'react';
import { LucideIcon } from 'lucide-react';

interface StatusBarItemProps {
  label: string;
  icon?: LucideIcon;
  tooltip?: string;
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'error';
  onClick?: () => void;
  ariaLabel?: string;
}

export const StatusBarItem: React.FC<StatusBarItemProps> = ({
  label,
  icon: Icon,
  tooltip,
  variant = 'default',
  onClick,
  ariaLabel,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const getVariantStyles = () => {
    switch (variant) {
      case 'accent':
        return 'text-accent-primary hover:text-accent-hover';
      case 'success':
        return 'text-semantic-accept';
      case 'warning':
        return 'text-semantic-warning';
      case 'error':
        return 'text-semantic-reject';
      default:
        return 'text-txt-muted hover:text-txt-secondary';
    }
  };

  return (
    <div className="relative flex items-center shrink-0">
      <button
        type="button"
        tabIndex={onClick ? 0 : -1}
        aria-label={ariaLabel || label}
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        className={`flex items-center space-x-1.5 px-1.5 py-0.5 rounded text-[11px] font-mono transition-colors outline-none ${
          onClick ? 'cursor-pointer hover:bg-bg-surface2' : 'cursor-default'
        } ${getVariantStyles()}`}
      >
        {Icon && <Icon size={12} className="shrink-0" />}
        <span className="truncate">{label}</span>
      </button>

      {showTooltip && tooltip && (
        <div
          role="tooltip"
          className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 px-2 py-1 bg-bg-surface3 text-txt-primary text-[10px] font-mono rounded shadow-md border border-border-subtle whitespace-nowrap z-50 animate-in fade-in zoom-in-95 duration-75 pointer-events-none"
        >
          {tooltip}
        </div>
      )}
    </div>
  );
};
