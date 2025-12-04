// tools-dialog.service.ts
import { Injectable, signal, TemplateRef, Type } from '@angular/core';
import { FieldMeasuringComponent } from './field-measuring/field-measuring.component';

export type Tool = 'field-measuring' | 'other-tool';

export interface ToolConfig {
  component: Type<any>;
  dialogStyle?: Record<string, string>; // default { 'min-width': '60vw', 'max-width': '75rem' }
}

export interface ToolTemplates {
  header?: TemplateRef<any>;
  footer?: TemplateRef<any>;
}

@Injectable({
  providedIn: 'root'
})
export class ToolsDialogService {
  readonly currentTool = signal<Tool | null>(null);
  readonly isOpen = signal(false);
  readonly templates = signal<ToolTemplates>({});

  private readonly toolMap: Record<Tool, ToolConfig> = {
    'field-measuring': {
      component: FieldMeasuringComponent,
      dialogStyle: { 'min-width': '90%', 'max-width': '72.5rem' }
    },
    'other-tool': {
      component: null as any // set other tools later
    }
  };

  openTool(tool: Tool): void {
    this.currentTool.set(tool);
    this.isOpen.set(true);
  }

  closeTool(): void {
    this.isOpen.set(false);
    // Small delay to allow dialog close animation
    setTimeout(() => this.currentTool.set(null), 300);
  }

  getCurrentToolComponent(): Type<any> | null {
    const tool = this.currentTool();
    return tool ? this.toolMap[tool].component : null;
  }

  getCurrentDialogStyle(): Record<string, string> {
    const tool = this.currentTool();
    return tool ? this.toolMap[tool].dialogStyle || {} : {};
  }

  setTemplates(templates: ToolTemplates): void {
    this.templates.set(templates);
  }
}
