import { FormControl } from '@angular/forms';

/** Cable length modification type. */
export type CableWidthType = 'lengthening' | 'shortening';

/** Typed form controls for the cable span form. */
export interface CableSpanFormControls {
  /** Selected span UUID (scope). */
  scope: FormControl<string | null>;
  /** Reference support side. */
  supportRef: FormControl<'LEFT' | 'RIGHT' | null>;
  /** Type of cable length modification. */
  widthCable: FormControl<CableWidthType | null>;
  /** Cable length modification value in meters. */
  sizeCable: FormControl<number>;
  /** Distance to reference support in meters. */
  distanceSupportRef: FormControl<number>;
}
