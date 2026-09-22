import { PossibleIconNames } from '@shared/model/icon.model';

/** Represents a single navigation item in the sidebar. */
export interface SidebarItem {
  /** Unique identifier for the sidebar item. */
  id: string;
  /** Icon name displayed alongside the label. */
  icon: PossibleIconNames;
  /** Full display label. */
  label: string;
  /** Abbreviated label used when the sidebar is collapsed. */
  shortLabel?: string;
  /** Router path the item navigates to. Omit for an external link (use `externalUrl` instead). */
  route?: string;
  /** Absolute URL opened outside the Angular router (e.g. static Sphinx docs). */
  externalUrl?: string;
  /** Anchor `target` used when `externalUrl` is set. */
  target?: '_blank';
}
