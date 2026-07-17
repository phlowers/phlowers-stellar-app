import { Section } from '@shared/domain';
import { LineTableProperties } from './manualSection.interfaces';

/** Debounce delay in ms for refreshing studio plot when dragging the slider. */
export const DEBOUNCED_REFRESH_STUDIO_DELAY = 300;

/** Mapping from line table property keys to their corresponding `Section` property keys. */
export const lineTablePropertiesToSectionProperties: Record<LineTableProperties, keyof Section> = {
  voltage_idr: 'voltage_idr',
  link_idr: 'link_name',
  lit_idr: 'lit_code',
  lit_adr: 'lit_name',
  branch_idr: 'branch_idr',
  branch_adr: 'branch_name'
};

/** Ordered maintenance hierarchy for cascading filter: center -> regional team -> maintenance team. */
export const orderedMaintenanceTableProperties: (
  'maintenance_center_id' | 'regional_team_id' | 'maintenance_team_id'
)[] = ['maintenance_center_id', 'regional_team_id', 'maintenance_team_id'];

/** Ordered line table properties for cascading filter logic. */
export const orderedLineTableProperties: LineTableProperties[] = [
  'voltage_idr',
  'link_idr',
  'lit_idr',
  'lit_adr',
  'branch_idr',
  'branch_adr'
];
