/**
 * Represents a single changelog entry from GitHub releases.
 *
 * @remarks
 * This interface maps to the GitHub Releases API response format.
 * It contains metadata about a release including version information,
 * author details, and the release notes body.
 *
 * @category Types
 */
export interface ChangelogItem {
  /** API URL for the release */
  url: string;
  /** API URL for the release assets */
  assets_url: string;
  /** Upload URL template for assets */
  upload_url: string;
  /** Web URL for the release page */
  html_url: string;
  /** Unique identifier for the release */
  id: number;
  /** Author who created the release */
  author: ChangelogAuthor;
  /** GraphQL node ID */
  node_id: string;
  /** Git tag name for the release */
  tag_name: string;
  /** Branch or commit the release was created from */
  target_commitish: string;
  /** Release title */
  name: string;
  /** Whether this is a draft release */
  draft: boolean;
  /** Whether this release is immutable */
  immutable: boolean;
  /** Whether this is a pre-release */
  prerelease: boolean;
  /** ISO timestamp when the release was created */
  created_at: string;
  /** ISO timestamp when the release was last updated */
  updated_at: string;
  /** ISO timestamp when the release was published */
  published_at: string;
  /** Array of release assets (downloads) */
  assets: any[];
  /** URL to download source as tarball */
  tarball_url: string;
  /** URL to download source as zip */
  zipball_url: string;
  /** Release notes in markdown format */
  body: string;
  /** Number of mentions in the release notes */
  mentions_count: number;
}

/**
 * Represents the author of a GitHub release.
 *
 * @remarks
 * This interface maps to the GitHub User API response format,
 * containing profile information and API URLs for the user.
 *
 * @category Types
 */
export interface ChangelogAuthor {
  /** GitHub username */
  login: string;
  /** Unique user identifier */
  id: number;
  /** GraphQL node ID */
  node_id: string;
  /** URL to user's avatar image */
  avatar_url: string;
  /** Gravatar ID if linked */
  gravatar_id: string;
  /** API URL for user */
  url: string;
  /** Web URL for user profile */
  html_url: string;
  /** API URL for user's followers */
  followers_url: string;
  /** API URL template for users they follow */
  following_url: string;
  /** API URL template for user's gists */
  gists_url: string;
  /** API URL template for starred repos */
  starred_url: string;
  /** API URL for subscriptions */
  subscriptions_url: string;
  /** API URL for organizations */
  organizations_url: string;
  /** API URL for user's repositories */
  repos_url: string;
  /** API URL template for user events */
  events_url: string;
  /** API URL for received events */
  received_events_url: string;
  /** Account type (User, Organization, etc.) */
  type: string;
  /** How the user views the account */
  user_view_type: string;
  /** Whether user is a GitHub admin */
  site_admin: boolean;
}
