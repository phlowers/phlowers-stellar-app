import { FormControl, FormGroup } from '@angular/forms';
import { Support } from '@shared/domain/models/support.model';

/** Option representing a support side selection (LEFT or RIGHT). */
export interface SupportOption {
  label: string;
  value: 'LEFT' | 'RIGHT';
}

/** The two supports bounding the selected span, resolved from the reference support side. */
export interface SpanSupports {
  reference: Support | null;
  closing: Support | null;
  /** Length of the span between the two supports (meters). */
  spanLength: number | null;
}

/** Typed reactive form group for a single floor point. */
export type FloorPointFormGroup = FormGroup<{
  altitude: FormControl<number | null>;
  distanceToRefSupport: FormControl<number | null>;
}>;

/** Display/behavior metadata for a floor point, indexed like `points` (0: reference, last: closing, others: free points). */
export interface FloorPointMeta {
  titleKey: string;
  altitudeReadonly: boolean;
  distanceToRefSupportReadonly: boolean;
  /** Whether this point can be deleted (true for free points, false for the fixed reference/closing points). */
  removable: boolean;
}

/** Vertical-distance results for a floor, evaluated at the point where the cable comes closest to the ground. */
export interface FloorResults {
  /** Vertical distance from the floor to the cable at its narrowest point (meters). Negative when the cable dips below the floor. */
  minVerticalDistance: number | null;
  /** Altitude of the floor point where the minimum vertical distance occurs (meters). */
  floorAltitude: number | null;
  /** Altitude of the cable where the minimum vertical distance occurs (meters). */
  cableAltitude: number | null;
}
