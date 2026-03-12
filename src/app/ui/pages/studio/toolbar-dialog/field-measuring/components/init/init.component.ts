import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  ViewChild,
  TemplateRef,
  AfterViewInit,
  OnDestroy,
  OnInit,
  DestroyRef
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { ToolbarDialogService } from '@features/studio/toolbar/presentation/services/toolbar-dialog.service';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { PlotService } from '@ui/pages/studio/services/plot.service';
import { createInitialMeasureData } from '../../helpers';
import { MessageModule } from 'primeng/message';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-field-measuring-init',
  imports: [IconComponent, InputText, Select, ReactiveFormsModule, ButtonComponent, MessageModule],
  templateUrl: './init.component.html',
  styleUrl: './init.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Initialization component for field measuring: lets the user create or select a measure. */
export class InitComponent implements AfterViewInit, OnDestroy, OnInit {
  @ViewChild('header', { static: false }) headerTemplate!: TemplateRef<unknown>;

  private readonly toolbarDialogService = inject(ToolbarDialogService);
  private readonly plotService = inject(PlotService);
  private readonly destroyRef = inject(DestroyRef);

  ngAfterViewInit(): void {
    this.toolbarDialogService.setTemplates({
      header: this.headerTemplate
    });
    const section = this.plotService.section();
    const measures = section?.field_measures;
    const newMeasureName = $localize`TM ` + ((measures?.length || 0) + 1);
    this.newMeasureNameControl.setValue(newMeasureName);
    this.measures.set(
      measures?.map((measure) => ({
        label: measure.name || '',
        value: measure.uuid || ''
      })) || []
    );
  }

  ngOnInit(): void {
    this.newMeasureNameControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      this.isNameAlreadyTaken.set(this.measures().some((measure) => measure.label === value));
    });
  }
  ngOnDestroy(): void {
    this.toolbarDialogService.setTemplates({});
  }

  measures = signal<{ label: string; value: string }[]>([]);

  newMeasureNameControl = new FormControl('', Validators.required);
  isNameAlreadyTaken = signal(false);
  chooseMeasureControl = new FormControl<string | null>(null, Validators.required);

  async createMeasure(): Promise<void> {
    const section = this.plotService.section();
    const newMeasure = createInitialMeasureData(
      section,
      this.newMeasureNameControl.value || '',
      this.plotService.plotOptions().startSupport,
      this.plotService.plotOptions().endSupport
    );
    const allMeasures = [...(section?.field_measures || []), newMeasure];
    await this.plotService.modifySection({
      field_measures: allMeasures,
      selected_field_measure_uuid: newMeasure.uuid
    });
    if (this.newMeasureNameControl.valid) {
      this.toolbarDialogService.proceedToMainComponent();
    }
  }

  async chooseMeasure(): Promise<void> {
    const value = this.chooseMeasureControl.value;
    if (this.chooseMeasureControl.valid && value) {
      await this.plotService.modifySection({
        selected_field_measure_uuid: value
      });
      this.toolbarDialogService.proceedToMainComponent();
    }
  }
}
