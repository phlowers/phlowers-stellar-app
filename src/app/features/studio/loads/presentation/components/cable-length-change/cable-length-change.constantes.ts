/** Validation and default bounds for the cable length change form. */
export const CABLE_LENGTH_CHANGE_FORM_BOUNDS = {
  modifiedLengthCableMin: 0,
  modifiedLengthCableMax: 1000,
  distanceSupportRefMin: 0,
  distanceSupportRefMax: 5000,
  maxDecimals: 2
} as const;

export const CABLE_LENGTH_CHANGE_FORM_DEFAULTS = {
  modifiedLengthCable: 0,
  distanceSupportRef: 0
} as const;
