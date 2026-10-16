import { TemplateRef, Type } from '@angular/core';

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
