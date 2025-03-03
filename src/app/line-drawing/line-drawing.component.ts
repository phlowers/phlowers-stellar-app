import { Component, effect, ElementRef, input, viewChild, OnDestroy } from '@angular/core';
import { ThreeLineService } from './three-line.service';
import { VerticesCoordinate } from './line-drawing.model';

@Component({
  selector: 'app-line-drawing',
  imports: [],
  templateUrl: './line-drawing.component.html',
  styleUrl: './line-drawing.component.scss'
})
export class LineDrawingComponent implements OnDestroy {
  coordinates = input<VerticesCoordinate[]>();
  lineContainer = viewChild<ElementRef<HTMLCanvasElement>>('line');

  sceneSize = {
    width: 1200,
    height: 400
  }

  constructor(private threeLineService: ThreeLineService) {
    effect(() => {
      this.updateScene();
    });
  }

  ngAfterViewInit(): void {
    this.initScene();
  }

  ngOnDestroy(): void {
    this.threeLineService.dispose();
  }

  private initScene(): void {
    const canvas = this.lineContainer()?.nativeElement;
    if (!canvas) return;

    this.threeLineService.init(canvas, this.sceneSize.width, this.sceneSize.height);
    this.updateScene();
  }

  private updateScene(): void {
    const coords = this.coordinates();
    if (coords) {
      this.threeLineService.updateLine(coords);
    }
  }
}
