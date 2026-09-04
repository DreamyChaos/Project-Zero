import React from 'react';
import { ICommand } from './types';

interface CommandItemProps {
  command: ICommand;
  isSelected: boolean;
  onSelect: (command: ICommand) => void;
}

export const CommandItem: React.FC<CommandItemProps> = ({ command, isSelected, onSelect }) => {
  const Icon = command.icon;

  return (
    <div
      role="option"
      aria-selected={isSelected}
      aria-disabled={command.isDisabled}
      tabIndex={-1}
      onClick={() => {
        if (!command.isDisabled) {
          onSelect(command);
        }
      }}
      className={`flex items-center justify-between p-2.5 rounded-lg text-xs transition-all select-none outline-none ${
        command.isDisabled
          ? 'opacity-40 cursor-not-allowed text-txt-muted bg-transparent'
          : isSelected
            ? 'bg-accent-primary text-white shadow-sm'
            : 'text-txt-primary hover:bg-bg-surface2 cursor-pointer'
      }`}
    >
      <div className="flex items-center space-x-3 min-w-0 pr-2">
        <Icon size={16} className={`shrink-0 ${isSelected ? 'text-white' : 'text-txt-muted'}`} />
        <div className="flex flex-col min-w-0">
          <span className="truncate font-medium">{command.title}</span>
          {command.description && (
            <span className={`truncate text-[10px] ${isSelected ? 'text-white/80' : 'text-txt-muted'}`}>
              {command.description}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2 shrink-0">
        <span
          className={`text-[10px] px-1.5 py-0.2 rounded font-mono border ${
            isSelected
              ? 'bg-white/20 text-white border-white/30'
              : 'bg-bg-surface3 text-txt-muted border-border-subtle'
          }`}
        >
          {command.category}
        </span>

        {command.badge && (
          <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-semantic-warning/20 text-semantic-warning border border-semantic-warning/30">
            {command.badge}
          </span>
        )}

        {command.shortcut && (
          <kbd
            className={`px-1.5 py-0.5 text-[10px] rounded font-mono border ${
              isSelected
                ? 'bg-white/20 text-white border-white/30'
                : 'bg-bg-base text-txt-muted border-border-subtle'
            }`}
          >
            {command.shortcut}
          </kbd>
        )}
      </div>
    </div>
  );
};
