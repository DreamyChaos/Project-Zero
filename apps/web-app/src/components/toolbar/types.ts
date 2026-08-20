import { LucideIcon } from 'lucide-react';

export type ToolCategory = 'selection' | 'creation' | 'simulation' | 'conversion' | 'ai' | 'view';

export interface IToolbarItem {
  id: string;
  label: string;
  category: ToolCategory;
  icon: LucideIcon;
  shortcut?: string;
  tooltip: string;
  isActive?: boolean;
  isDisabled?: boolean;
  onClick?: () => void;
}
