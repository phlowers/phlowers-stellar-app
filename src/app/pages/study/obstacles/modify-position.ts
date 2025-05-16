import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { SingleSpanComponent } from '../../../core/components/3d/single-span.component';
import { DialogModule } from 'primeng/dialog';
import { Task } from '../../../core/engine/worker/tasks';
import { WorkerService } from '../../../core/engine/worker/worker.service';

@Component({
  selector: 'app-modify-position',
  standalone: true,
  imports: [SingleSpanComponent],
  template: ` <app-single-span [litData]="litData()"></app-single-span> `
})
export class ModifyPosition {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  litData = signal<any>(null);

  constructor(private readonly workerService: WorkerService) {}

  position = '';

  onHide() {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  ngOnInit() {
    this.workerService.ready$.subscribe(() => {
      this.runPython();
    });
  }

  runPython() {
    console.log('runPython in modify position modal');
    this.workerService.runTask(Task.runPython2, {});
  }
}
