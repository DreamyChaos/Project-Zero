export interface ITelemetryMetrics {
  workspaceStatus: 'active' | 'syncing' | 'offline';
  activeMode: string;
  isSaved: boolean;
  stateCount: number;
  transitionCount: number;
  alphabetSize: number;
  isValidDFA: boolean;
  zoomPercent: number;
  cursorX: number;
  cursorY: number;
  themeLabel: string;
  buildVersion: string;
}
