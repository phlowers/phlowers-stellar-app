import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
/** Service tracking which side tab is currently open. */
export class SideTabsService {
  /** Index of the currently open tab, or `null` when all tabs are collapsed. */
  public sideTabs = signal<number | null>(null);
}
