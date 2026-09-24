import { PossibleIconNames } from '@shared/model/icon.model';

export interface RrtsResults {
  // Residual rated tensile strength of the cable (daN)
  rrts: number;
  // Max working load of the cable with the cut strands applied (%)
  newWorkLoad: number | null;
}

export type WorkLoadStatus = 'null' | 'ok' | 'warning' | 'error' | 'unknown';

export interface WorkLoadIcon {
  name: PossibleIconNames;
  // Translation key of the icon's aria label
  label: string;
}

export interface RrtsFormValue {
  span: { index: number; uuid: string } | null;
  supportRef: 'LEFT' | 'RIGHT' | null;
  distanceSupportRef: number | null;
  // One value per cable layer with strands, in layer order
  cutStrands: number[];
  addMarking: boolean;
}

export type NotificationKey =
  'failed-to-calculate' | 'saved' | 'failed-to-save' | 'deleted' | 'failed-to-delete' | 'failed-to-sync';
