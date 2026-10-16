export interface RrtsResults {
  // Residual rated tensile strength of the cable (daN)
  rrts: number;
  // Max working load of the cable with the cut strands applied (%)
  newWorkLoad: number | null;
}
