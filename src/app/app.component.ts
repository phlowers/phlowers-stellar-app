import { Component } from '@angular/core';
import { CanvasContainerComponent } from './canvas-container/canvas-container.component';
import { LineDrawingComponent } from "./line-drawing/line-drawing.component";
import { VerticesCoordinate } from './line-drawing/line-drawing.model';
// import { ButtonComponent } from './button/button.component';
// import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [
    // CanvasContainerComponent,
    LineDrawingComponent,
    // ButtonComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'ng-three-d';

  testLine: VerticesCoordinate[] = [
    { x:0, y:16.8, z:5 },
    { x:50, y:3.00890769, z:5 },
    { x:100, y:-5.65382853, z:5 },
    { x:150, y:-9.27490824, z:5 },
    { x:200, y:-7.8905724, z:5 },
    { x:250, y:-1.48696614, z:5 },
    { x:300, y:10, z:5 },
  ];
}
