import { FormControl } from '@angular/forms';

/** Cable length modification type. */
export type CableWidthType = 'lengthening' | 'shortening';

export type CableModificationControlName =
  'supportRef' | 'modificationType' | 'modifiedLengthCable' | 'distanceSupportRef';

/** Typed form controls for the cable length change form. */
export interface CableLengthChangeFormControls {
  /** Selected span UUID (scope). */
  scope: FormControl<string | null>;
  /** Reference support side. */
  supportRef: FormControl<'LEFT' | 'RIGHT' | null>;
  /** Type of cable length modification. */
  modificationType: FormControl<CableWidthType | null>;
  /** Cable length modification value in meters. */
  modifiedLengthCable: FormControl<number | null>;
  /** Distance to reference support in meters. */
  distanceSupportRef: FormControl<number | null>;
}
