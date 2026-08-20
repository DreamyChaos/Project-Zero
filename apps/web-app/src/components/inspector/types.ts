export type SelectionType = 'none' | 'state' | 'transition' | 'workspace';

export type FieldType = 'text' | 'number' | 'checkbox' | 'select' | 'badge' | 'info';

export interface IFieldOption {
  label: string;
  value: string;
}

export interface IFieldSchema {
  id: string;
  label: string;
  type: FieldType;
  value: string | number | boolean;
  options?: IFieldOption[];
  disabled?: boolean;
  helpText?: string;
  placeholder?: string;
  badgeVariant?: 'default' | 'accent' | 'success' | 'warning' | 'error';
}

export interface ISectionSchema {
  id: string;
  title: string;
  isExpanded?: boolean;
  fields: IFieldSchema[];
}

export interface IInspectorSchema {
  selectionType: SelectionType;
  title: string;
  subtitle?: string;
  sections: ISectionSchema[];
}
