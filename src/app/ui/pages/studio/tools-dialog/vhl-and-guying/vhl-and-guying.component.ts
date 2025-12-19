import {
  AfterViewInit,
  Component,
  TemplateRef,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { TextareaModule } from 'primeng/textarea';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { ToolsDialogService } from '../tools-dialog.service';
import { PlotService } from '@ui/pages/studio/services/plot.service';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputTextModule } from 'primeng/inputtext';
import { CardComponent } from '@ui/shared/components/atoms/card/card.component';
import { Task } from '@core/services/worker_python/tasks/types';
import { WorkerPythonService } from '@core/services/worker_python/worker-python.service';

interface SupportOption {
  label: string;
  value: number;
}

@Component({
  selector: 'app-vtl-and-guying-tool',
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    SelectModule,
    InputNumberModule,
    CheckboxModule,
    TextareaModule,
    ProgressSpinnerModule,
    ButtonComponent,
    IconComponent,
    InputGroupModule,
    InputGroupAddonModule,
    InputTextModule,
    CardComponent
  ],
  templateUrl: './vtl-and-guying.component.html',
  styleUrls: ['./vtl-and-guying.component.scss']
})
export class VhlAndGuyingComponent implements AfterViewInit {
  @ViewChild('header', { static: false }) headerTemplate!: TemplateRef<unknown>;
  @ViewChild('footer', { static: false }) footerTemplate!: TemplateRef<unknown>;

  private readonly toolsDialogService = inject(ToolsDialogService);
  public readonly plotService = inject(PlotService);
  private readonly workerPythonService = inject(WorkerPythonService);

  // Support selection
  readonly selectedSpan = signal<number[] | null>(null);
  readonly selectedSupport = signal<number | null>(null);
  readonly supportType = computed(() => {
    const support = this.selectedSupport();
    if (support === null) {
      return null;
    }
    return this.plotService.section()?.supports[support].chainV === true
      ? 'Suspension'
      : 'Anchor';
  });

  // Support options
  readonly supportOptions = computed<SupportOption[]>(() => {
    return (
      this.selectedSpan()?.map((support) => ({
        label: (support + 1).toString(),
        value: support
      })) || []
    );
  });

  readonly vtlWithoutGuying = computed(() => {
    if (this.selectedSupport() === null) {
      return null;
    }
    const vtlUnderChain = this.plotService.litData()?.vtl_under_chain;
    const rUnderChain = this.plotService.litData()?.r_under_chain;
    return {
      chargeV: vtlUnderChain?.[0][this.selectedSupport()!],
      chargeH: vtlUnderChain?.[1][this.selectedSupport()!],
      chargeL: vtlUnderChain?.[2][this.selectedSupport()!],
      resultant: rUnderChain?.[this.selectedSupport()!]
    };
  });

  // Guying inputs
  readonly altitude = signal<number | null>(null); // a in meters
  readonly horizontalDistance = signal<number | null>(null); // d in meters
  readonly hasPulley = signal<boolean>(false);
  readonly comment = signal<string>('');

  results = signal<{
    tensionInGuy: number | null;
    guyAngle: number | null;
    chargeVUnderConsole: number | null;
    chargeHUnderConsole: number | null;
    chargeLIfPulley: number | null;
  } | null>(null);

  readonly loading = computed(
    () => this.plotService.loading() || !this.plotService.litData()
  );

  ngAfterViewInit(): void {
    this.toolsDialogService.setTemplates({
      header: this.headerTemplate,
      footer: this.footerTemplate
    });
  }

  onVisibleChange(visible: boolean) {
    if (!visible) {
      this.toolsDialogService.closeTool();
    }
  }

  onCalculate = async (): Promise<void> => {
    if (
      this.altitude() === null ||
      this.horizontalDistance() === null ||
      this.selectedSupport() === null
    ) {
      return;
    }
    const { result, error } = await this.workerPythonService.runTask(
      Task.calculateGuying,
      {
        altitude: this.altitude()!,
        horizontalDistance: this.horizontalDistance()!,
        hasPulley: this.hasPulley()
      }
    );
    if (error) {
      console.error(error);
      return;
    }
    this.results.set(result);
  };

  onExportVhl(): void {
    // TODO: Implement export functionality for VTL sans haubanage
  }

  onExport(): void {
    // TODO: Implement export functionality
  }
}
