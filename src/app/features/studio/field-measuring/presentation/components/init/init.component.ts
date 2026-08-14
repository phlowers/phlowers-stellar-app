import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  viewChild,
  TemplateRef,
  OnDestroy,
  OnInit,
  DestroyRef,
  effect
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { InputText } from 'primeng/inputtext';
import { SelectWithButtonsComponent } from '@shared/components/atoms/select-with-buttons/select-with-buttons.component';
import { ToolbarDialogService } from '@features/studio/toolbar/presentation/services/toolbar-dialog.service';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { createInitialMeasureData } from '@features/studio/field-measuring/presentation/helpers';
import { MessageModule } from 'primeng/message';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'app-field-measuring-init',
  imports: [
    IconComponent,
    InputText,
    SelectWithButtonsComponent,
    ReactiveFormsModule,
    ButtonComponent,
    MessageModule,
    TranslocoModule
  ],
  templateUrl: './init.component.html',
  styleUrl: './init.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Initialization component for field measuring: lets the user create or select a measure. */
export class InitComponent implements OnDestroy, OnInit {
  readonly headerTemplate = viewChild<TemplateRef<unknown>>('header');

  private readonly toolbarDialogService = inject(ToolbarDialogService);
  private readonly plotService = inject(PlotService);
  private readonly spanService = inject(PlotSpanService);
  private readonly plotOptionsService = inject(PlotOptionsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translocoService = inject(TranslocoService);

  constructor() {
    effect(() => {
      const header = this.headerTemplate();
      if (header) {
        this.toolbarDialogService.setTemplates({ header });
        const section = this.spanService.section();
        const measures = section?.field_measures;
        const newMeasureName =
          this.translocoService.translate('field-measuring.init.tm-prefix') + ((measures?.length || 0) + 1);
        this.measures.set(
          measures?.map((measure) => ({
            label: measure.name || '',
            value: measure.uuid || ''
          })) || []
        );
        this.newMeasureNameControl.setValue(newMeasureName);
      }
    });
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
  readonly chooseMeasureValue = toSignal(this.chooseMeasureControl.valueChanges, {
    initialValue: this.chooseMeasureControl.value
  });

  onMeasureSelected(measure: { label: string; value: string } | null | undefined): void {
    this.chooseMeasureControl.setValue(measure?.value ?? null);
  }

  async deleteMeasure(measure: { label: string; value: string }): Promise<void> {
    const section = this.spanService.section();
    if (!section) return;

    const updatedMeasures = (section.field_measures ?? []).filter((m) => m.uuid !== measure.value);
    const isDeletedMeasureSelected = section.selected_field_measure_uuid === measure.value;

    if (this.chooseMeasureControl.value === measure.value) {
      this.chooseMeasureControl.setValue(null);
    }

    await this.plotService.modifySection({
      field_measures: updatedMeasures,
      selected_field_measure_uuid: isDeletedMeasureSelected ? undefined : section.selected_field_measure_uuid
    });
  }

  async createMeasure(): Promise<void> {
    const section = this.spanService.section();
    const newMeasure = createInitialMeasureData(
      section,
      this.newMeasureNameControl.value || '',
      this.plotOptionsService.plotOptions().startSupport,
      this.plotOptionsService.plotOptions().endSupport
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
