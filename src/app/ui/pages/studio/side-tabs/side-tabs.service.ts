import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SideTabsService {
  public sideTabs = signal<number | null>(null);
}
