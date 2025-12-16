import {
  Component,
  inject,
  signal,
  ViewChild,
  TemplateRef,
  AfterViewInit,
  OnDestroy
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { IconComponent } from '@src/app/ui/shared/components/atoms/icon/icon.component';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { ToolsDialogService } from '../../../tools-dialog.service';
import { ButtonComponent } from '@src/app/ui/shared/components/atoms/button/button.component';

@Component({
  selector: 'app-init',
  imports: [
    IconComponent,
    InputText,
    Select,
    ReactiveFormsModule,
    ButtonComponent
  ],
  templateUrl: './init.component.html',
  styleUrl: './init.component.scss'
})
export class InitComponent implements AfterViewInit, OnDestroy {
  @ViewChild('header', { static: false }) headerTemplate!: TemplateRef<unknown>;

  private readonly toolsDialogService = inject(ToolsDialogService);

  ngAfterViewInit(): void {
    this.toolsDialogService.setTemplates({
      header: this.headerTemplate
    });
  }

  ngOnDestroy(): void {
    this.toolsDialogService.setTemplates({});
  }

  // mock pre-existing Measure's name
  measures = signal<{ label: string; value: string }[]>([
    { label: 'PAPOTO measure 1', value: 'papoto-measure-1' },
    { label: 'PAPOTO measure 2', value: 'papoto-measure-2' },
    { label: 'PAPOTO measure 3', value: 'papoto-measure-3' }
  ]);

  newMeasureControl = new FormControl('', Validators.required);
  chooseMeasureControl = new FormControl<string | null>(
    null,
    Validators.required
  );

  createMeasure(): void {
    if (this.newMeasureControl.valid) {
      console.log('Create measure:', this.newMeasureControl.value);
      // Create new field measurement
      this.toolsDialogService.proceedToMainComponent();
    }
  }

  chooseMeasure(): void {
    if (this.chooseMeasureControl.valid) {
      console.log('Choose measure:', this.chooseMeasureControl.value);
      // Open corresponding field measurement
      this.toolsDialogService.proceedToMainComponent();
    }
  }
}
