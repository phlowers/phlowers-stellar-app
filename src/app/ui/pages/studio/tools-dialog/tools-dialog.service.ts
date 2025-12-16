import { Injectable, signal, TemplateRef, Type } from '@angular/core';
import { FieldMeasuringComponent } from './field-measuring/field-measuring.component';
import { InitComponent } from './field-measuring/components/init/init.component';

export type Tool = 'field-measuring' | 'other-tool';

export interface ToolConfig {
  component: Type<unknown>;
  dialogStyle?: Record<string, string>;
  initComponent?: Type<unknown>;
  initDialogStyle?: Record<string, string>;
}

export interface ToolTemplates {
  header?: TemplateRef<unknown>;
  footer?: TemplateRef<unknown>;
}

@Injectable({
  providedIn: 'root'
})
export class ToolsDialogService {
  readonly currentTool = signal<Tool | null>(null);
  readonly isInitOpen = signal(false);
  readonly isMainOpen = signal(false);
  readonly templates = signal<ToolTemplates>({});

  private readonly toolMap: Record<Tool, ToolConfig> = {
    'field-measuring': {
      component: FieldMeasuringComponent,
      dialogStyle: { 'min-width': '90%', 'max-width': '72.5rem' },
      initComponent: InitComponent,
      initDialogStyle: { 'min-width': '29rem', 'max-width': '90%' }
    },
    'other-tool': {
      component: null!
    }
  };

  openTool(tool: Tool): void {
    this.currentTool.set(tool);
    const config = this.toolMap[tool];

    if (config.initComponent) {
      this.isInitOpen.set(true);
      this.isMainOpen.set(false);
    } else {
      this.isInitOpen.set(false);
      this.isMainOpen.set(true);
    }
  }

  closeTool(): void {
    this.isInitOpen.set(false);
    this.isMainOpen.set(false);

    setTimeout(() => {
      this.currentTool.set(null);
    }, 300);
  }

  proceedToMainComponent(): void {
    this.isInitOpen.set(false);
    // Attendre la fermeture complète du dialog init avant d'ouvrir le main
    setTimeout(() => {
      this.isMainOpen.set(true);
    }, 150);
  }

  getInitComponent(): Type<unknown> | null {
    const tool = this.currentTool();
    if (!tool) return null;
    return this.toolMap[tool].initComponent || null;
  }

  getMainComponent(): Type<unknown> | null {
    const tool = this.currentTool();
    if (!tool) return null;
    return this.toolMap[tool].component;
  }

  getInitDialogStyle(): Record<string, string> {
    const tool = this.currentTool();
    if (!tool) return {};
    return this.toolMap[tool].initDialogStyle || {};
  }

  getMainDialogStyle(): Record<string, string> {
    const tool = this.currentTool();
    if (!tool) return {};
    return this.toolMap[tool].dialogStyle || {};
  }

  setTemplates(templates: ToolTemplates): void {
    this.templates.set(templates);
  }
}
