import {
  Component,
  inject,
  signal,
  ViewChild,
  TemplateRef,
  AfterViewInit,
  OnDestroy,
  OnInit
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { IconComponent } from '@src/app/ui/shared/components/atoms/icon/icon.component';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { ToolsDialogService } from '../../../tools-dialog.service';
import { ButtonComponent } from '@src/app/ui/shared/components/atoms/button/button.component';
import { PlotService } from '../../../../services/plot.service';
import { createInitialMeasureData } from '../../helpers';
import { MessageModule } from 'primeng/message';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-init',
  imports: [
    IconComponent,
    InputText,
    Select,
    ReactiveFormsModule,
    ButtonComponent,
    MessageModule
  ],
  templateUrl: './init.component.html',
  styleUrl: './init.component.scss'
})
export class InitComponent implements AfterViewInit, OnDestroy, OnInit {
  @ViewChild('header', { static: false }) headerTemplate!: TemplateRef<unknown>;

  private readonly toolsDialogService = inject(ToolsDialogService);
  private readonly plotService = inject(PlotService);

  private readonly subscriptions = new Subscription();
  ngAfterViewInit(): void {
    console.log('ngAfterViewInit');
    this.toolsDialogService.setTemplates({
      header: this.headerTemplate
    });
    const section = this.plotService.section();
    const measures = section?.field_measures;
    const newMeasureName =
      $localize`TM` + ' - ' + ((measures?.length || 0) + 1);
    this.newMeasureNameControl.setValue(newMeasureName);
    this.measures.set(
      measures?.map((measure) => ({
        label: measure.name || '',
        value: measure.uuid || ''
      })) || []
    );
  }

  ngOnInit(): void {
    this.subscriptions.add(
      this.newMeasureNameControl.valueChanges.subscribe((value) => {
        this.isNameAlreadyTaken.set(
          this.measures().some((measure) => measure.label === value)
        );
      })
    );
  }
  ngOnDestroy(): void {
    this.toolsDialogService.setTemplates({});
    this.subscriptions.unsubscribe();
  }

  measures = signal<{ label: string; value: string }[]>([]);

  newMeasureNameControl = new FormControl('', Validators.required);
  isNameAlreadyTaken = signal(false);
  chooseMeasureControl = new FormControl<string | null>(
    null,
    Validators.required
  );

  async createMeasure(): Promise<void> {
    const section = this.plotService.section();
    const newMeasure = createInitialMeasureData(
      section,
      this.newMeasureNameControl.value || ''
    );
    const allMeasures = [...(section?.field_measures || []), newMeasure];
    await this.plotService.modifySection({
      field_measures: allMeasures,
      selected_field_measure_uuid: newMeasure.uuid
    });
    if (this.newMeasureNameControl.valid) {
      this.toolsDialogService.proceedToMainComponent();
    }
  }

  async chooseMeasure(): Promise<void> {
    const value = this.chooseMeasureControl.value;
    if (this.chooseMeasureControl.valid && value) {
      await this.plotService.modifySection({
        selected_field_measure_uuid: value
      });
      this.toolsDialogService.proceedToMainComponent();
    }
  }
}
