// tools-dialog.service.ts
import { Injectable, signal, TemplateRef, Type } from '@angular/core';
import { FieldMeasuringComponent } from './field-measuring/field-measuring.component';
import { InitComponent } from './field-measuring/components/init/init.component';

export type Tool = 'field-measuring' | 'other-tool';

export interface ToolConfig {
  component: Type<unknown>;
  dialogStyle?: Record<string, string>; // default { 'min-width': '60vw', 'max-width': '75rem' }
  initComponent?: Type<unknown>; // Optional init component (shown before main component)
  initDialogStyle?: Record<string, string>; // Dialog style for init component
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
  readonly showingInit = signal(false);
  readonly isOpen = signal(false);
  readonly templates = signal<ToolTemplates>({});

  private readonly toolMap: Record<Tool, ToolConfig> = {
    'field-measuring': {
      component: FieldMeasuringComponent,
      dialogStyle: { 'min-width': '90%', 'max-width': '72.5rem' },
      initComponent: InitComponent,
      initDialogStyle: { 'min-width': '29rem', 'max-width': '90%' }
    },
    'other-tool': {
      component: null! // set other tools later
    }
  };

  openTool(tool: Tool): void {
    this.currentTool.set(tool);
    const config = this.toolMap[tool];
    this.showingInit.set(!!config.initComponent);
    this.isOpen.set(true);
  }

  closeTool(): void {
    this.isOpen.set(false);
    // Small delay to allow dialog close animation
    setTimeout(() => {
      this.currentTool.set(null);
      this.showingInit.set(false);
    }, 300);
  }

  proceedToMainComponent(): void {
    this.showingInit.set(false);
  }

  getCurrentToolComponent(): Type<unknown> | null {
    const tool = this.currentTool();
    if (!tool) return null;

    const config = this.toolMap[tool];
    return this.showingInit() && config.initComponent
      ? config.initComponent
      : config.component;
  }

  getCurrentDialogStyle(): Record<string, string> {
    const tool = this.currentTool();
    if (!tool) return {};

    const config = this.toolMap[tool];
    return this.showingInit() && config.initDialogStyle
      ? config.initDialogStyle
      : config.dialogStyle || {};
  }

  setTemplates(templates: ToolTemplates): void {
    this.templates.set(templates);
  }
}
