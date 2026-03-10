export interface AppVersion {
  git_hash: string;
  build_datetime_utc: string;
  version: string;
}

export interface AssetManifest {
  app_version: AppVersion;
  files: string[];
  data_hashes?: Record<string, string>;
}