import { PossibleIconNames } from '../../../model/icon.model';

/**
 * Describes a navigation item rendered in the application sidebar.
 * @category Models
 */
export interface SidebarItem {
  /** Unique identifier for the sidebar item. */
  id: string;
  /** Icon name to display alongside the item. */
  icon: PossibleIconNames;
  /** Full label displayed when the sidebar is expanded. */
  label: string;
  /** Optional abbreviated label displayed when the sidebar is collapsed. */
  shortLabel?: string;
  /** Route path to navigate to when the item is selected. */
  route: string;
}
