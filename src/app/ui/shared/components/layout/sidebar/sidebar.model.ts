import { PossibleIconNames } from '../../../model/icon.model';

export interface SidebarItem {
  id: string;
  icon: PossibleIconNames;
  label: string;
  shortLabel?: string;
  route: string;
}
