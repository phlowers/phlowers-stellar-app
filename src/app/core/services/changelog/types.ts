/** Represents a single changelog / release entry from the repository. */
export interface ChangelogItem {
  /** URL of the release API resource. */
  url: string;
  /** URL for the release assets API endpoint. */
  assets_url: string;
  /** Template URL for uploading release assets. */
  upload_url: string;
  /** HTML page URL of the release. */
  html_url: string;
  /** Unique numeric identifier of the release. */
  id: number;
  /** Author who published the release. */
  author: ChangelogAuthor;
  /** GraphQL node identifier. */
  node_id: string;
  /** Git tag associated with the release. */
  tag_name: string;
  /** Branch or commit the tag targets. */
  target_commitish: string;
  /** Display name of the release. */
  name: string;
  /** Whether the release is a draft. */
  draft: boolean;
  /** Whether the release is immutable. */
  immutable: boolean;
  /** Whether the release is marked as a pre-release. */
  prerelease: boolean;
  /** ISO-8601 creation timestamp. */
  created_at: string;
  /** ISO-8601 last-update timestamp. */
  updated_at: string;
  /** ISO-8601 publication timestamp. */
  published_at: string;
  /** Downloadable assets attached to the release. */
  assets: any[];
  /** URL to download the source tarball. */
  tarball_url: string;
  /** URL to download the source zipball. */
  zipball_url: string;
  /** Markdown body / release notes. */
  body: string;
  /** Number of `@mentions` in the release body. */
  mentions_count: number;
}

/** Represents the author of a changelog / release entry. */
export interface ChangelogAuthor {
  /** Author login / username. */
  login: string;
  /** Unique numeric identifier. */
  id: number;
  /** GraphQL node identifier. */
  node_id: string;
  /** URL of the author's avatar image. */
  avatar_url: string;
  /** Gravatar identifier (may be empty). */
  gravatar_id: string;
  /** API URL for the author. */
  url: string;
  /** HTML profile page URL. */
  html_url: string;
  /** API URL for the author's followers. */
  followers_url: string;
  /** API URL template for users the author follows. */
  following_url: string;
  /** API URL template for the author's gists. */
  gists_url: string;
  /** API URL template for repositories the author starred. */
  starred_url: string;
  /** API URL for the author's subscriptions. */
  subscriptions_url: string;
  /** API URL for the author's organizations. */
  organizations_url: string;
  /** API URL for the author's repositories. */
  repos_url: string;
  /** API URL template for the author's events. */
  events_url: string;
  /** API URL for events received by the author. */
  received_events_url: string;
  /** User type (e.g. "User"). */
  type: string;
  /** View type of the user. */
  user_view_type: string;
  /** Whether the author is a site administrator. */
  site_admin: boolean;
}
