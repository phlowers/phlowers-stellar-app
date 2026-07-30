import { SidebarItem } from '../sidebar/sidebar.model';

/** Navigation structure grouping main and footer sidebar items. */
export interface SidebarNavigation {
  /** Primary navigation links. */
  main: SidebarItem[];
  /** Footer navigation links. */
  footer: SidebarItem[];
}
