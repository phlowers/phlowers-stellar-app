export interface VtlAndGuying {
  inputs: {
    selectedSpan: number[] | null;
    selectedSupport: number | null;
    altitude: number | null;
    horizontalDistance: number | null;
    hasPulley: boolean;
  };
  outputs: {
    tensionInGuy: number | null;
    guyAngle: number | null;
    chargeVUnderConsole: number | null;
    chargeHUnderConsole: number | null;
    chargeLIfPulley: number | null;
  } | null;
  comment: string;
}
