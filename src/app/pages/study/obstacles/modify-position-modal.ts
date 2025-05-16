import {
  Component,
  EventEmitter,
  Input,
  Output,
  effect,
  input,
  output,
  signal
} from '@angular/core';
import { SingleSpanComponent } from '../../../core/components/3d/single-span.component';
import { DialogModule } from 'primeng/dialog';
import { Task } from '../../../core/engine/worker/tasks';
import { WorkerService } from '../../../core/engine/worker/worker.service';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-modify-position-modal',
  standalone: true,
  imports: [DialogModule, SingleSpanComponent, ButtonModule],
  template: `
    <p-dialog
      [style]="{ width: '80vw', height: '90vh' }"
      dismissableMask="true"
      header="Modify Position"
      [visible]="visible()"
      (visibleChange)="visibleChange.emit($event)"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [keepInViewport]="false"
      (onHide)="onHide()"
      (onShow)="onShow()"
    >
      <app-single-span
        [litData]="litData()"
        [obstacleMode]="true"
        [obstacle]="position()"
        (obstacleChange)="onPositionChange($event)"
      ></app-single-span>
      <div>
        <div class="flex gap-2 text-lg">x: {{ position()?.x }}</div>
        <div class="flex gap-2 text-lg">y: {{ position()?.y }}</div>
        <div class="flex gap-2 text-lg">z: {{ position()?.z }}</div>
      </div>
      <div class="flex gap-2">
        <p-button label="Validate" (onClick)="onValidate()"></p-button>
        <p-button
          label="Reset"
          severity="secondary"
          (onClick)="onReset()"
        ></p-button>
      </div>
    </p-dialog>
  `
})
export class ModifyPositionModal {
  // @Input() visible2 = signal(false);
  // @Output() visible2Change = new EventEmitter<boolean>();
  uuid = input.required<string>();
  @Output() modifyObstacle = new EventEmitter<{
    uuid: string;
    x: number;
    y: number;
    z: number;
  }>();
  visible = input.required<boolean>();
  visibleChange = output<boolean>();
  litData = signal<any>(null);
  position = signal<{ x: number | null; y: number | null; z: number | null }>({
    x: null,
    y: null,
    z: null
  });
  positionChange = output<{
    x: number | null;
    y: number | null;
    z: number | null;
  }>();

  constructor(private readonly workerService: WorkerService) {}

  onShow() {
    this.position.set({
      x: null,
      y: null,
      z: null
    });
  }

  onValidate() {
    let x = this.position()?.x;
    let y = this.position()?.y;
    let z = this.position()?.z;
    if (!x || !y || !z) {
      return;
    }
    this.modifyObstacle.emit({
      uuid: this.uuid(),
      x,
      y,
      z
    });
    this.onHide();
  }

  onPositionChange($event: any) {
    console.log('onPositionChange', $event);
    this.position.set($event);
    // this.position.set($event);
  }

  onReset() {
    console.log('onReset');
    this.position.set({
      x: null,
      y: null,
      z: null
    });
  }

  onHide() {
    console.log('onHide');
    // this.visible.set(false);
    this.visibleChange.emit(false);
  }

  // ngOnInit() {
  //   this.workerService.ready$.subscribe(() => {
  //     this.runPython();
  //   });
  // }

  readonly effect = effect(() => {
    const this2 = this;
    // console.log('effect in modify position modal', this.visible());
    this.workerService.ready$.subscribe(() => {
      console.log('this2.visible is', this2.visible);
      if (this2.visible()) {
        console.log('i run python');
        this.runPython();
      }
    });
  });

  readonly effect2 = effect(async () => {
    console.log('effect to get lit data from worker');
    const lit = this.workerService.result()?.lit;
    if (!lit) return;
    this.litData.set(lit);
  });

  runPython() {
    console.log('runPython');
    this.workerService.runTask(Task.runPython2, {});
  }
}
