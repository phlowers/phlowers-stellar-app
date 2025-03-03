import { Component, signal } from '@angular/core';
import { VerticesCoordinate } from '../../line-drawing/line-drawing.model';
import { LineDrawingComponent } from '../../line-drawing/line-drawing.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-three-page',
  imports: [
    LineDrawingComponent,
    FormsModule,
  ],
  templateUrl: './three-page.component.html',
  styleUrl: './three-page.component.scss'
})
export class ThreePageComponent {
  testLine = signal<VerticesCoordinate[]>([
    { x:0, y:16.8, z:5 },
    { x:50, y:3.00890769, z:5 },
    { x:100, y:-5.65382853, z:5 },
    { x:150, y:-9.27490824, z:5 },
    { x:200, y:-7.8905724, z:5 },
    { x:250, y:-1.48696614, z:5 },
    { x:300, y:10, z:5 },
  ]);

  updateTestLine(item: VerticesCoordinate, prop: 'x' | 'y' | 'z', event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    const currentCoords = this.testLine();
    const updatedCoords = currentCoords.map(coord => {
      if (coord === item) {
        return { ...coord, [prop]: value };
      }
      return coord;
    });
    this.testLine.set(updatedCoords);
  }
}
