import {
  AfterViewInit,
  Component,
  TemplateRef,
  ViewChild,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SortEvent } from 'primeng/api';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { PossibleIconNames } from '@ui/shared/model/icon.model';
import { ToolsDialogService } from '../tools-dialog.service';
import { PlotService } from '@src/app/ui/pages/studio/services/plot.service';
import { GetSectionOutput } from '@src/app/core/services/worker_python/tasks/types';

interface L0Row {
  span: string;
  l0: number;
  index: number;
}

@Component({
  selector: 'app-l0-sum-tool',
  imports: [
    CommonModule,
    DialogModule,
    TableModule,
    ProgressSpinnerModule,
    ButtonComponent,
    IconComponent
  ],
  templateUrl: './l0-sum.component.html',
  styleUrls: ['./l0-sum.component.scss']
})
export class L0SumComponent implements AfterViewInit {
  @ViewChild('header', { static: false }) headerTemplate!: TemplateRef<unknown>;
  @ViewChild('footer', { static: false }) footerTemplate!: TemplateRef<unknown>;

  private readonly toolsDialogService = inject(ToolsDialogService);
  private readonly plotService = inject(PlotService);

  readonly l0Rows = signal<L0Row[]>([]);

  readonly totalL0 = computed(() =>
    this.l0Rows().reduce((sum, row) => sum + row.l0, 0)
  );

  readonly loading = computed(
    () => this.plotService.loading() || !this.plotService.litData()
  );

  readonly rowsPerPage = 10;

  readonly sortField = signal<string>('');
  readonly sortOrder = signal<number>(0);

  constructor() {
    effect(() => {
      const litData: GetSectionOutput | null = this.plotService.litData();
      if (!litData || !litData.L0) {
        this.l0Rows.set([]);
        return;
      }

      const spans: L0Row[] = litData.L0.map((value, index) => {
        const start = index + 1;
        const end = index + 2;
        const label = `${start}-${end}`;
        return {
          span: label,
          l0: value,
          index
        };
      });
      this.l0Rows.set(spans);
    });
  }

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

  onExport() {
    // TODO: Implement export functionality
    console.log('Export L0 sum', {
      rows: this.l0Rows(),
      total: this.totalL0()
    });
  }

  getSortIcon(field: string): PossibleIconNames {
    if (this.sortField() !== field) {
      return 'swap_vert';
    }

    const order = this.sortOrder();
    if (order === 1) {
      return 'arrow_upward';
    } else if (order === -1) {
      return 'arrow_downward';
    }

    return 'swap_vert';
  }

  customSort(event: SortEvent) {
    this.sortField.set(event.field as string);
    this.sortOrder.set(event.order ?? 0);

    event.data?.sort((data1, data2) => {
      let result = 0;

      if (event.field === 'span') {
        const index1 = data1.index;
        const index2 = data2.index;

        if (index1 < index2) {
          result = -1;
        } else if (index1 > index2) {
          result = 1;
        }
      } else if (event.field === 'l0') {
        const num1 = data1.l0;
        const num2 = data2.l0;

        if (num1 < num2) {
          result = -1;
        } else if (num1 > num2) {
          result = 1;
        }
      }

      return event.order ? event.order * result : result;
    });
  }
}
