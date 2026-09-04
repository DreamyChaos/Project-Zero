import { LucideIcon } from 'lucide-react';

export type CommandCategory =
  | 'Canvas'
  | 'Machines'
  | 'Grammar'
  | 'Computability'
  | 'Languages'
  | 'Analysis'
  | 'Workspace'
  | 'Navigation'
  | 'Tools'
  | 'Theme';

export interface ICommand {
  id: string;
  title: string;
  category: CommandCategory;
  icon: LucideIcon;
  description?: string;
  shortcut?: string;
  badge?: string;
  keywords?: string[];
  isDisabled?: boolean;
  action?: () => void;
}
