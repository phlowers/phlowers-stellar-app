import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  viewChild,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { formatSupportNumber } from '@shared/helpers/formatSupportNumber';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SortEvent } from 'primeng/api';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { PossibleIconNames } from '@shared/model/icon.model';
import { ToolbarDialogService } from '../../services/toolbar-dialog.service';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { GetSectionOutput } from '@services/worker_python/tasks/types';
import { NotificationService } from '@core/services/notification/notification.service';
import { DEFAULT_TABLE_ROWS_PER_PAGE, TABLE_ROWS_PER_PAGE_OPTIONS } from '@shared/constants/tablePagination';
import { buildL0Csv, isL0TableExportable, L0_EXPORT_FILENAME, L0_EXPORT_MIME_TYPE } from './l0-sum.helpers';
import { L0Row } from './l0-sum.interfaces';

@Component({
  selector: 'app-l0-sum-table',
  imports: [
    CommonModule,
    DialogModule,
    TableModule,
    ProgressSpinnerModule,
    ButtonComponent,
    IconComponent,
    TranslocoModule
  ],
  templateUrl: './l0-sum.component.html',
  styleUrls: ['./l0-sum.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Dialog component displaying a sortable table of L0 (natural cable length) values per span. */
export class L0SumComponent {
  readonly headerTemplate = viewChild<TemplateRef<unknown>>('header');
  readonly footerTemplate = viewChild<TemplateRef<unknown>>('footer');

  private readonly toolbarDialogService = inject(ToolbarDialogService);
  private readonly plotService = inject(PlotService);
  private readonly spanService = inject(PlotSpanService);
  private readonly notificationService = inject(NotificationService);
  private readonly translocoService = inject(TranslocoService);

  readonly l0Rows = signal<L0Row[]>([]);

  readonly loading = computed(() => this.plotService.loading() || !this.plotService.litData());

  readonly rowsPerPage = DEFAULT_TABLE_ROWS_PER_PAGE;
  readonly rowsPerPageOptions = TABLE_ROWS_PER_PAGE_OPTIONS;

  readonly sortField = signal<string>('');
  readonly sortOrder = signal<number>(0);

  constructor() {
    effect(() => {
      const header = this.headerTemplate();
      const footer = this.footerTemplate();
      if (header && footer) {
        this.toolbarDialogService.setTemplates({ header, footer });
      }
    });

    effect(() => {
      const litData: GetSectionOutput | null = this.plotService.litData();
      if (!litData?.output_parameters.L0) {
        this.l0Rows.set([]);
        return;
      }

      const supports = this.spanService.section()?.supports ?? [];
      const spanLengths = litData.output_parameters.span_length ?? [];
      let cumulatedL0 = 0;
      const spans: L0Row[] = litData.output_parameters.L0.map((value, index) => {
        const leftNum = supports[index]?.number;
        const rightNum = supports[index + 1]?.number;
        const left = leftNum ? formatSupportNumber(leftNum) : String(index + 1);
        const right = rightNum ? formatSupportNumber(rightNum) : String(index + 2);
        // rounding drops the floating point noise of the running sum (e.g. 300.29999999999995)
        cumulatedL0 = Number((cumulatedL0 + value).toFixed(10));
        return {
          span: `${left}-${right}`,
          spanLength: spanLengths[index],
          l0: value,
          cumulatedL0,
          index
        };
      });
      this.l0Rows.set(spans);
    });
  }

  onVisibleChange(visible: boolean) {
    if (!visible) {
      this.toolbarDialogService.closeTool();
    }
  }

  // Downloads the table as a CSV file, the dialog stays open
  onExport() {
    const rows = this.l0Rows();
    if (!isL0TableExportable(rows)) {
      this.notificationService.error(this.translocoService.translate('studio.l0-sum.export-invalid-table'));
      return;
    }

    const translate = (key: string) => this.translocoService.translate(key);
    const csv = buildL0Csv(
      rows,
      {
        span: translate('common.span-label'),
        spanLength: translate('studio.l0-sum.csv-span-length-label'),
        l0: translate('studio.l0-sum.csv-l0-label'),
        cumulatedL0: translate('studio.l0-sum.csv-cumulated-l0-label')
      },
      this.translocoService.getActiveLang()
    );

    const url = URL.createObjectURL(new Blob([csv], { type: L0_EXPORT_MIME_TYPE }));
    const link = document.createElement('a');
    link.href = url;
    link.download = L0_EXPORT_FILENAME;
    link.click();
    URL.revokeObjectURL(url);
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
