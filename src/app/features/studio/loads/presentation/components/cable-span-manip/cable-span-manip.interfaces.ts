import { FormControl } from '@angular/forms';
import { AnchoringType, CableManipMethod, CableManipType } from '@shared/domain';
import { SLING_LENGTH_DEFAULT } from './cable-span-manip.constantes';

export const CABLE_SPAN_MANIP_DEFAULTS = {
  referenceSupport: 'LEFT' as 'LEFT' | 'RIGHT',
  distanceToRefSupport: 0,
  cableManipType: 'with_a_crane' as CableManipType,
  cableManipMethod: 'clamp' as CableManipMethod,
  longitudinalDistance: 0,
  lateralDistance: 0,
  altitude: 0,
  anchoring: 'with_sling' as AnchoringType,
  chainName: null as string | null,
  chainLength: null as number | null,
  chainWeight: null as number | null,
  chainSurface: null as number | null,
  counterWeight: null as number | null,
  slingLength: SLING_LENGTH_DEFAULT
};

/** Typed form controls for the cable span manipulation form. */
export interface CableSpanManipFormControls {
  /** Selected span UUID. */
  scope: FormControl<string | null>;
  /** Reference support side. */
  referenceSupport: FormControl<'LEFT' | 'RIGHT' | null>;
  /** Distance from the reference support to the manipulated point (meters). */
  distanceToRefSupport: FormControl<number | null>;
  /** Type of cable manipulation. Always 'with_a_crane' until re-enabled. */
  cableManipType: FormControl<CableManipType | null>;
  /** Method of cable manipulation. Always 'clamp' until re-enabled. */
  cableManipMethod: FormControl<CableManipMethod | null>;
  /** Longitudinal distance of the fixed point (meters). Relevant for 'with_a_crane' only. */
  longitudinalDistance: FormControl<number | null>;
  /** Lateral distance of the fixed point (meters). */
  lateralDistance: FormControl<number | null>;
  /** Altitude of the fixed point (meters). */
  altitude: FormControl<number | null>;
  /** Anchoring type. Always 'with_sling' until re-enabled. */
  anchoring: FormControl<AnchoringType | null>;
  /** Chain name (for 'with_chain' anchoring). */
  chainName: FormControl<string | null>;
  /** Chain length in meters (for 'with_chain' anchoring). */
  chainLength: FormControl<number | null>;
  /** Chain weight in kg (for 'with_chain' anchoring). */
  chainWeight: FormControl<number | null>;
  /** Chain surface in m² (for 'with_chain' anchoring). */
  chainSurface: FormControl<number | null>;
  /** Counter weight in kg (for 'with_chain' anchoring). */
  counterWeight: FormControl<number | null>;
  /** Sling length in meters (for 'with_sling' anchoring). Default 5. */
  slingLength: FormControl<number | null>;
}
