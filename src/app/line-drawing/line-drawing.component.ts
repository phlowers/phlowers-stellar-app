import { Component, effect, ElementRef, input, viewChild, OnDestroy } from '@angular/core';

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
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

  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private controls?: OrbitControls;
  private animationFrameId?: number;
  private sceneSize = {
    width: 1200,
    height: 400
  }

  ngOnInit(): void {
    this.createLine();
  }

  ngOnDestroy(): void {
    this.stopAnimation();
    this.renderer?.dispose();
    this.scene?.clear();
  }

  private stopAnimation(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    this.controls?.update();
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  private createLine(): void {
    this.stopAnimation();

    const lineWrapper = this.lineContainer()?.nativeElement;
    if (!lineWrapper) return;

    this.renderer = new THREE.WebGLRenderer({
      canvas: lineWrapper,
      antialias: true
    });

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xe3e3e3);

    const material = new THREE.LineBasicMaterial({ color: 0xad1515 });
    const points = [];

    if (this.coordinates()!.length > 0) {
      this.coordinates()!.forEach(coordinate => {
        points.push(new THREE.Vector3(coordinate.x, coordinate.y, coordinate.z));
      });
    } else {
      points.push(new THREE.Vector3(-15, 0, 0));
      points.push(new THREE.Vector3(0, 15, 0));
      points.push(new THREE.Vector3(15, 0, 0));
      points.push(new THREE.Vector3(0, -15, 0));
      points.push(new THREE.Vector3(0, -30, 0));
    }

    const center = this.calculateCenter(points);

    this.camera = new THREE.PerspectiveCamera(45, this.sceneSize.width / this.sceneSize.height, 1, 2000);
    this.camera.position.set(center.x, 0, center.x);

    // OrbitControls is what permit camera control with mouse, keypad or (hopefully) touch screen
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    // Set the target to the center of the figure
    this.controls.target.set(center.x, center.y, center.z);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.2;
    this.controls.update();

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    this.scene.add(line);

    // Just to have an idea of orientation
    const axesHelper = new THREE.AxesHelper(50);
    axesHelper.position.copy(new THREE.Vector3(center.x, 0, 0));
    this.scene.add(axesHelper);

    this.renderer.setSize(this.sceneSize.width, this.sceneSize.height);

    this.animate();

    console.log(this.camera?.rotation);
  }

  // Helper to calculate the center of a 3D figure
  private calculateCenter(points: THREE.Vector3[]): THREE.Vector3 {
    if (points.length === 0) return new THREE.Vector3();

    let sumX = 0;
    let sumY = 0;
    let sumZ = 0;

    points.forEach(point => {
      sumX += point.x;
      sumY += point.y;
      sumZ += point.z;
    });

    return new THREE.Vector3(
      sumX / points.length,
      sumY / points.length,
      sumZ / points.length
    );
  }

  constructor() {
    effect(() => {
      const coordinates = this.coordinates();
      if (coordinates) {
        this.createLine();
      }
    });
  }
}
