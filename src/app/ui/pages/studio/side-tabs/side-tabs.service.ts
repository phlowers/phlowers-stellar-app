import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
/** Service tracking which side tab is currently open in the studio. */
export class SideTabsService {
  /** Index of the currently open side tab, or null if all tabs are closed. */
  public sideTabs = signal<number | null>(null);
}
