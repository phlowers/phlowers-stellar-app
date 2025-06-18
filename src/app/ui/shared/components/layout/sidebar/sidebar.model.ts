import { PossibleIconNames } from '../../../model/icons/icon.model';

export interface SidebarItem {
  id: string;
  icon: PossibleIconNames;
  label: string;
  shortLabel?: string;
  route: string;
}
