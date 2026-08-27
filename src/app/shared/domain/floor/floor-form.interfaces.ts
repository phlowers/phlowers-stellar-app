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
