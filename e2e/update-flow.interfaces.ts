export interface Snapshot {
  appVersion: string | null;
  hasAssetV1: boolean;
  hasAssetV2: boolean;
  cableHash: string | null;
  cableName: string | null;
}
