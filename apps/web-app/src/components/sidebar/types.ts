export type TreeItemType = 'folder' | 'project' | 'model' | 'exercise';

export interface ITreeItem {
  id: string;
  label: string;
  type: TreeItemType;
  children?: ITreeItem[];
  isExpanded?: boolean;
  isSelected?: boolean;
  badge?: string;
  description?: string;
}
