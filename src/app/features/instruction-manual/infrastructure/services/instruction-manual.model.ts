/** What the server tells us about the PDF; `null` when a value is unknown. */
export interface ManualPdfInfo {
  /** Size in bytes, from `Content-Length`. */
  sizeBytes: number | null;
  /** Last modification date, from `Last-Modified`. */
  lastModified: Date | null;
}
