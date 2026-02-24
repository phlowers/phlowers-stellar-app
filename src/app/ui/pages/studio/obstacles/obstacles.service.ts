import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
/** Service tracking the currently selected obstacle point index. */
export class ObstaclesService {
  /** Index of the currently selected obstacle point. */
  currentPointIndex = signal<number>(0);

  /** Sets the current obstacle point index. */
  setCurrentPointIndex(index: number): void {
    this.currentPointIndex.set(index);
  }

  /** Resets the current obstacle point index to zero. */
  resetCurrentPointIndex(): void {
    this.currentPointIndex.set(0);
  }
}
