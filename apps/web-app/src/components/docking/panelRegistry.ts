import { PanelRegionId, IPanelConstraint, IPanelDefinition, DockTargetRegion } from './types';

export const PANEL_CONSTRAINTS: Record<PanelRegionId, IPanelConstraint> = {
  sidebar: {
    minSize: 180,
    maxSize: 400,
    defaultSize: 240,
    snapThreshold: 50,
  },
  inspector: {
    minSize: 200,
    maxSize: 450,
    defaultSize: 280,
    snapThreshold: 50,
  },
  bottomPanel: {
    minSize: 140,
    maxSize: 450,
    defaultSize: 220,
    snapThreshold: 40,
  },
  center: {
    minSize: 300,
    maxSize: 2000,
    defaultSize: 800,
    snapThreshold: 0,
  },
};

export class PanelRegistryManager {
  private panels: Map<string, IPanelDefinition> = new Map();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults() {
    this.register({
      id: 'sidebar',
      title: 'Left Navigation Sidebar',
      region: 'left',
      constraints: PANEL_CONSTRAINTS.sidebar,
      defaultVisibility: true,
      mode: 'docked',
      order: 0,
    });

    this.register({
      id: 'inspector',
      title: 'Right Property Inspector',
      region: 'right',
      constraints: PANEL_CONSTRAINTS.inspector,
      defaultVisibility: true,
      mode: 'docked',
      order: 0,
    });

    this.register({
      id: 'bottomPanel',
      title: 'Bottom Telemetry Panel',
      region: 'bottom',
      constraints: PANEL_CONSTRAINTS.bottomPanel,
      defaultVisibility: true,
      mode: 'docked',
      order: 0,
    });

    this.register({
      id: 'center',
      title: 'Center Workspace Canvas',
      region: 'center',
      constraints: PANEL_CONSTRAINTS.center,
      defaultVisibility: true,
      mode: 'docked',
      order: 0,
    });
  }

  public register(panel: IPanelDefinition): void {
    this.panels.set(panel.id, panel);
  }

  public unregister(id: string): boolean {
    return this.panels.delete(id);
  }

  public get(id: string): IPanelDefinition | undefined {
    return this.panels.get(id);
  }

  public getAll(): IPanelDefinition[] {
    return Array.from(this.panels.values());
  }

  public getRegionPanels(region: DockTargetRegion): IPanelDefinition[] {
    return this.getAll().filter((p) => p.region === region);
  }

  public reset(): void {
    this.panels.clear();
    this.registerDefaults();
  }
}

export const PanelRegistry = new PanelRegistryManager();
