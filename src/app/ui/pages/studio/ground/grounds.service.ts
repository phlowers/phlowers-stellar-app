import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GroundsService {
  currentPointIndex = signal<number>(0);

  setCurrentPointIndex(index: number): void {
    this.currentPointIndex.set(index);
  }

  resetCurrentPointIndex(): void {
    this.currentPointIndex.set(0);
  }
}
