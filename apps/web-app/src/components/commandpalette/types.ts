import { LucideIcon } from 'lucide-react';

export type CommandCategory =
  | 'Navigation'
  | 'View'
  | 'Theme'
  | 'Workspace'
  | 'Transformations'
  | 'Analysis'
  | 'AI Assistant'
  | 'Future Solver'
  | 'Future AI';

export interface ICommand {
  id: string;
  title: string;
  category: CommandCategory;
  icon: LucideIcon;
  shortcut?: string;
  badge?: string;
  keywords?: string[];
  isDisabled?: boolean;
  action?: () => void;
}
