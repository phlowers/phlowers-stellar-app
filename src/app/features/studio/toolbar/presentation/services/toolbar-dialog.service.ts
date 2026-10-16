import { Injectable, signal, Type } from '@angular/core';
import { FieldMeasuringComponent } from '@features/studio/field-measuring/presentation/components/field-measuring/field-measuring.component';
import { InitComponent } from '@features/studio/field-measuring/presentation/components/init/init.component';
import { L0SumComponent } from '../components/l0-sum/l0-sum.component';
import { VhlAndGuyingComponent } from '../components/vtl-and-guying/vtl-and-guying.component';
import { LoadsTableComponent } from '../components/loads-table/loads-table.component';
import { HangingTableComponent } from '../components/hanging-table/hanging-table.component';
import { ObstaclesTableComponent } from '../components/obstacles-table/obstacles-table.component';
import { StrandRrtsComponent } from '../components/strand-rrts/strand-rrts.component';
import { CableAdjustmentComponent } from '@features/studio/cable-adjustment/presentation/components/cable-adjustment/cable-adjustment.component';
import {
  DialogPhase,
  LoadTableContext,
  StrandRrtsContext,
  Tool,
  ToolConfig,
  ToolTemplates
} from './toolbar-dialog.interfaces';

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
    // A close still animating must not clear the tool being opened
    this.cancelPendingCleanup();
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

    this.cancelPendingCleanup();
    this.cleanupTimeout = setTimeout(() => {
      this.cleanupTimeout = null;
      this.currentTool.set(null);
      this.loadTableContext.set(null);
      this.strandRrtsContext.set(null);
    }, 300);
  }

  private cleanupTimeout: ReturnType<typeof setTimeout> | null = null;

  private cancelPendingCleanup(): void {
    if (this.cleanupTimeout !== null) {
      clearTimeout(this.cleanupTimeout);
      this.cleanupTimeout = null;
    }
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
