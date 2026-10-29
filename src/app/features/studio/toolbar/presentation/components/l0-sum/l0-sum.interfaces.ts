/** Row data for the L0 summary table. */
export interface L0Row {
  /** Span label (e.g. "1-2"). */
  span: string;
  /** Span length in meters. */
  spanLength: number;
  /** Natural cable length L0 value. */
  l0: number;
  /** Sum of the L0 values from the first span up to this one. */
  cumulatedL0: number;
  /** Zero-based span index. */
  index: number;
}
