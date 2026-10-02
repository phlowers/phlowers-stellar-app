import { Injectable, signal, TemplateRef, Type } from '@angular/core';
import { FieldMeasuringComponent } from '@features/studio/field-measuring/presentation/components/field-measuring/field-measuring.component';
import { InitComponent } from '@features/studio/field-measuring/presentation/components/init/init.component';
import { L0SumComponent } from '../components/l0-sum/l0-sum.component';
import { VhlAndGuyingComponent } from '../components/vtl-and-guying/vtl-and-guying.component';
import { LoadsTableComponent } from '../components/loads-table/loads-table.component';
import { HangingTableComponent } from '../components/hanging-table/hanging-table.component';
import { ObstaclesTableComponent } from '../components/obstacles-table/obstacles-table.component';
import { StrandRrtsComponent } from '../components/strand-rrts/strand-rrts.component';
import { CableAdjustmentComponent } from '@features/studio/cable-adjustment/presentation/components/cable-adjustment/cable-adjustment.component';

/** Identifier for a toolbar tool. */
export type Tool =
  | 'field-measuring'
  | 'l0-sum'
  | 'vtl-and-guying'
  | 'load-table'
  | 'hanging-table'
  | 'obstacles-table'
  | 'strand-rrts'
  | 'cable-adjustment'
  | 'other-tool';

/** Phase of the toolbar dialog lifecycle. */
export type DialogPhase = 'init' | 'main';

/** Configuration for a toolbar tool, including its component and dialog sizing. */
export interface ToolConfig {
  /** Main component rendered when the tool is active. */
  component: Type<unknown>;
  /** CSS styles applied to the dialog in main phase. */
  dialogStyle?: Record<string, string>;
  /** Optional initialization component shown before the main phase. */
  initComponent?: Type<unknown>;
  /** CSS styles applied to the dialog during the init phase. */
  initDialogStyle?: Record<string, string>;
}

/** Custom header/footer templates injected into the dialog by child components. */
export interface ToolTemplates {
  /** Header template reference. */
  header?: TemplateRef<unknown>;
  /** Footer template reference. */
  footer?: TemplateRef<unknown>;
}

/** Context passed when opening the load table tool. */
export interface LoadTableContext {
  /** Whether the table opens in view or edit mode. */
  mode: 'view' | 'edit';
  /** UUID of the charge case to display. */
  chargeUuid: string;
}

/** Context passed when opening the RRTS cut strands tool. */
export interface StrandRrtsContext {
  /** Whether the saved entry is only shown, or can be calculated, saved and deleted. */
  mode: 'view' | 'edit';
}

@Injectable({
  providedIn: 'root'
})
/** Service managing the toolbar dialog state, tool registration, phase transitions, and template injection. */
export class ToolbarDialogService {
  readonly currentTool = signal<Tool | null>(null);
  readonly isOpen = signal(false);
  readonly phase = signal<DialogPhase>('main');
  readonly templates = signal<ToolTemplates>({});
  readonly loadTableContext = signal<LoadTableContext | null>(null);
  readonly strandRrtsContext = signal<StrandRrtsContext | null>(null);

  private readonly toolMap: Record<Tool, ToolConfig> = {
    'field-measuring': {
      component: FieldMeasuringComponent,
      dialogStyle: { width: '72.5rem', 'max-width': '90%' },
      initComponent: InitComponent,
      initDialogStyle: { width: '29rem', 'max-width': '90%' }
    },
    'l0-sum': {
      component: L0SumComponent,
      dialogStyle: { width: '40rem', 'max-width': '90%' }
    },
    'vtl-and-guying': {
      component: VhlAndGuyingComponent,
      dialogStyle: { width: '86.5625rem', 'max-width': '90%' }
    },
    'load-table': {
      component: LoadsTableComponent,
      dialogStyle: { width: '83.125rem', 'max-width': '90%' }
    },
    'hanging-table': {
      component: HangingTableComponent,
      dialogStyle: { width: '64.375rem', 'max-width': '90%' }
    },
    'obstacles-table': {
      component: ObstaclesTableComponent,
      dialogStyle: { width: '85vw', 'max-width': '85vw' }
    },
    'strand-rrts': {
      component: StrandRrtsComponent,
      dialogStyle: { width: '43.5rem', 'max-width': '90%' }
    },
    'cable-adjustment': {
      component: CableAdjustmentComponent,
      dialogStyle: { width: '43.5rem', 'max-width': '90%' }
    },
    'other-tool': {
      component: null!
    }
  };

  openTool(tool: 'load-table', context?: LoadTableContext): void;
  openTool(tool: 'strand-rrts', context?: StrandRrtsContext): void;
  openTool(tool: Tool): void;
  openTool(tool: Tool, context?: LoadTableContext | StrandRrtsContext): void {
    this.currentTool.set(tool);
    const config = this.toolMap[tool];

    if (tool === 'load-table') {
      this.loadTableContext.set((context as LoadTableContext | undefined) ?? null);
    } else if (tool === 'strand-rrts') {
      this.strandRrtsContext.set((context as StrandRrtsContext | undefined) ?? null);
    }

    if (config.initComponent) {
      this.phase.set('init');
    } else {
      this.phase.set('main');
    }
    this.isOpen.set(true);
  }

  closeTool(): void {
    this.isOpen.set(false);

    setTimeout(() => {
      this.currentTool.set(null);
      this.loadTableContext.set(null);
      this.strandRrtsContext.set(null);
    }, 300);
  }

  private transitioning = false;

  proceedToMainComponent(): void {
    this.transitioning = true;
    this.isOpen.set(false);
  }

  completePendingTransition(): void {
    if (this.transitioning) {
      this.transitioning = false;
      this.phase.set('main');
      this.isOpen.set(true);
    }
  }

  isTransitioning(): boolean {
    return this.transitioning;
  }

  getComponent(): Type<unknown> | null {
    const tool = this.currentTool();
    if (!tool) return null;
    const config = this.toolMap[tool];
    return this.phase() === 'init' ? config.initComponent || null : config.component;
  }

  getDialogStyle(): Record<string, string> {
    const tool = this.currentTool();
    if (!tool) return {};
    const config = this.toolMap[tool];
    return this.phase() === 'init' ? config.initDialogStyle || {} : config.dialogStyle || {};
  }

  setTemplates(templates: ToolTemplates): void {
    this.templates.set(templates);
  }
}
