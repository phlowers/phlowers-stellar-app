import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VerticesCoordinate } from './line-drawing.model';

@Injectable({
  providedIn: 'root'
})
export class ThreeLineService {
  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private controls?: OrbitControls;
  private animationFrameId?: number;
  private line?: THREE.Line;

  // Store camera state
  private cameraPosition = new THREE.Vector3();
  private cameraTarget = new THREE.Vector3();
  private isInitialized = false;

  init(canvas: HTMLCanvasElement, width: number, height: number): void {
    if (this.isInitialized) {
      // If already initialized, just resize and reattach
      this.renderer?.setSize(width, height);
      this.renderer!.domElement = canvas;
      return;
    }

    // Initialize renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true
    });

    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xe3e3e3);

    // Set up camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);

    // Set initial camera position
    this.camera.position.set(150, 0, 150);
    this.cameraPosition.copy(this.camera.position);
    this.cameraTarget.set(150, 0, 2.5);

    // Set up orbit controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(this.cameraTarget);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.update();

    // Add axes helper for better orientation
    const axesHelper = new THREE.AxesHelper(30);
    this.scene.add(axesHelper);

    // Set renderer size
    this.renderer.setSize(width, height);

    this.isInitialized = true;
    this.startAnimation();
  }

  startAnimation(): void {
    this.animate();
  }

  stopAnimation(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    if (this.controls) {
      this.controls.update();
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  updateLine(coordinates: VerticesCoordinate[]): void {
    if (!this.scene) return;

    // Remove previous line if it exists
    if (this.line) {
      this.scene.remove(this.line);
    }

    // Store current camera position and target before updating
    if (this.isInitialized && this.camera && this.controls) {
      this.cameraPosition.copy(this.camera.position);
      this.cameraTarget.copy(this.controls.target);
    }

    // Create line geometry
    const material = new THREE.LineBasicMaterial({ color: 0xad1515 });
    const points: THREE.Vector3[] = [];

    if (coordinates && coordinates.length > 0) {
      coordinates.forEach(coordinate => {
        points.push(new THREE.Vector3(coordinate.x, coordinate.y, coordinate.z));
      });
    } else {
      // Default points if no coordinates provided
      points.push(new THREE.Vector3(-15, 0, 0));
      points.push(new THREE.Vector3(0, 15, 0));
      points.push(new THREE.Vector3(15, 0, 0));
      points.push(new THREE.Vector3(0, -15, 0));
      points.push(new THREE.Vector3(0, -30, 0));
    }

    // Calculate center if you want to update the controls target
    const center = this.calculateCenter(points);
    this.controls?.target.copy(center);

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    this.line = new THREE.Line(geometry, material);
    this.scene.add(this.line);

    // Restore camera position and target
    if (this.camera && this.controls) {
      this.camera.position.copy(this.cameraPosition);
      this.controls.target.copy(this.cameraTarget);
      this.controls.update();
    }
  }

  private calculateCenter(points: THREE.Vector3[]): THREE.Vector3 {
    if (points.length === 0) return new THREE.Vector3();

    let sumX = 0, sumY = 0, sumZ = 0;



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

  dispose(): void {
    this.stopAnimation();
    this.renderer?.dispose();
    this.scene?.clear();
    this.isInitialized = false;
  }
}
