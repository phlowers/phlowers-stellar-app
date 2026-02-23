import { Injectable, signal, TemplateRef, Type } from '@angular/core';
import { FieldMeasuringComponent } from './field-measuring/field-measuring.component';
import { InitComponent } from './field-measuring/components/init/init.component';
import { L0SumComponent } from './l0-sum/l0-sum.component';
import { VhlAndGuyingComponent } from './vtl-and-guying/vtl-and-guying.component';
import { LoadsTableComponent } from './loads-table/loads-table.component';

/** Identifier for a toolbar dialog tool. */
export type Tool = 'field-measuring' | 'l0-sum' | 'vtl-and-guying' | 'load-table' | 'other-tool';

/** Phase of the toolbar dialog lifecycle (init or main content). */
export type DialogPhase = 'init' | 'main';

/** Configuration for a toolbar dialog tool, including its component and optional init phase. */
export interface ToolConfig {
  /** Main component to render for this tool. */
  component: Type<unknown>;
  /** Optional dialog CSS styles for the main phase. */
  dialogStyle?: Record<string, string>;
  /** Optional initialization component shown before the main phase. */
  initComponent?: Type<unknown>;
  /** Optional dialog CSS styles for the init phase. */
  initDialogStyle?: Record<string, string>;
}

/** Custom header and footer templates injected into the toolbar dialog. */
export interface ToolTemplates {
  /** Optional header template reference. */
  header?: TemplateRef<unknown>;
  /** Optional footer template reference. */
  footer?: TemplateRef<unknown>;
}

/** Context for opening the loads table tool with a specific charge. */
export interface LoadTableContext {
  /** Whether the table opens in view or edit mode. */
  mode: 'view' | 'edit';
  /** UUID of the charge to display. */
  chargeUuid: string;
}

@Injectable({
  providedIn: 'root'
})
/** Service managing the toolbar dialog lifecycle, including opening, closing, and transitioning between tools. */
export class ToolbarDialogService {
  readonly currentTool = signal<Tool | null>(null);
  readonly isOpen = signal(false);
  readonly phase = signal<DialogPhase>('main');
  readonly templates = signal<ToolTemplates>({});
  readonly loadTableContext = signal<LoadTableContext | null>(null);

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
    'other-tool': {
      component: null!
    }
  };

  openTool(tool: Tool, context?: LoadTableContext): void {
    this.currentTool.set(tool);
    const config = this.toolMap[tool];

    if (tool === 'load-table' && context) {
      this.loadTableContext.set(context);
    } else if (tool === 'load-table') {
      this.loadTableContext.set(null);
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
