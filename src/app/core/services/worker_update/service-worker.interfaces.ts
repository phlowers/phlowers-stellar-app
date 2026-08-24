export interface AppVersion {
  git_hash: string;
  build_datetime_utc: string;
  version: string;
}

export interface CacheControlState {
  active: string;
  previous: string | null;
}

export interface AssetManifest {
  app_version: AppVersion;
  /**
   * Application code assets to precache (HTML/JS/CSS/i18n/WASM/wheels).
   * Never includes catalog data files (CSV/JSON under `/data/`) — those are
   * described by `data_hashes` and updated independently of the app version.
   */
  files: string[];
  data_hashes?: Record<string, string>;
}
