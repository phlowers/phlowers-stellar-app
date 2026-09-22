import { CableSpanManipulation, CableSupportManipItem } from '@shared/domain';
import { SymmetryType } from '@shared/domain/models/charge.model';

/** Row data representing climate parameters in the loads table. */
export interface ClimateRow {
  windPressure: number | null;
  cableTemperature: number | null;
  symmetryType: SymmetryType;
  iceThickness: number | null;
  frontierSupportNumber: number | null;
  iceThicknessBefore: number | null;
  iceThicknessAfter: number | null;
}

/** Row data representing a span load in the loads table. */
export interface SpanLoadRow {
  spanLabel: string;
  referenceSupport: string;
  type: string;
  loadWeight: number;
  loadPosition: number;
}

/** Row data representing a cable length modification in the loads table. */
export interface CableModifRow {
  spanLabel: string;
  referenceSupport: string;
  modificationType: 'lengthening' | 'shortening';
  modifiedLengthCable: number;
  distanceSupportRef: number;
}

/** Row data representing a support manipulation in the loads table. */
export interface SupportManipRow extends CableSupportManipItem {
  displayIndex: number | null;
  supportLabel: string;
}

/** Row data representing a span manipulation in the loads table. */
export interface SpanManipRow {
  spanLabel: string;
  referenceSupport: string;
  distanceToRefSupport: number;
  cableManipType: CableSpanManipulation['cableManipType'];
  cableManipMethod: CableSpanManipulation['cableManipMethod'];
  longitudinalDistance: number | null;
  lateralDistance: number;
  altitude: number;
  anchoring: CableSpanManipulation['anchoring'];
  slingLength: number | null;
  chainName: string | null;
  chainLength: number | null;
  chainWeight: number | null;
  chainSurface: number | null;
  counterWeight: number | null;
}
