import { FormControl } from '@angular/forms';

export type SupportManipType = 'crane' | 'rope' | 'shifting';
export type SupportAnchoringType = 'with_chain' | 'without_chain';

export const CABLE_SUPPORT_MANIP_DEFAULTS = {
  manip1Type: null as SupportManipType | null,
  vertDisplacement: 0,
  anchoring: 'without_chain' as SupportAnchoringType,
  lateralDistance: 0,
  ropeLength: 0,
  shiftingClampLength: 0,
  manip2Type: null as SupportManipType | null,
  manip2ShiftingClampLength: 0
};

export interface CableSupportManipFormControls {
  /** Selected support UUID. */
  support: FormControl<string | null>;
  /** Manipulation 1 type: crane, rope, or shifting. */
  manip1Type: FormControl<SupportManipType | null>;
  /** Vertical cable displacement in meters (crane only). */
  vertDisplacement: FormControl<number | null>;
  /** Anchoring type (crane only). */
  anchoring: FormControl<SupportAnchoringType | null>;
  /** Lateral distance in meters (crane only). */
  lateralDistance: FormControl<number | null>;
  /** Rope length in meters (rope only). */
  ropeLength: FormControl<number | null>;
  /** Shifting clamp length in meters (manip1 shifting only). */
  shiftingClampLength: FormControl<number | null>;
  /** Manipulation 2 type: only shifting is available. */
  manip2Type: FormControl<SupportManipType | null>;
  /** Shifting clamp length in meters (manip2 shifting only). */
  manip2ShiftingClampLength: FormControl<number | null>;
}
