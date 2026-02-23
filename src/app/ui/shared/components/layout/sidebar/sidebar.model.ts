import { PossibleIconNames } from '../../../model/icon.model';

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
  /** Router path the item navigates to. */
  route: string;
}
