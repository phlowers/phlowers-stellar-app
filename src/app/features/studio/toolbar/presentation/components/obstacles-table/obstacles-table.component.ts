import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
  TemplateRef,
  untracked,
  viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { SortEvent } from 'primeng/api';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { PossibleIconNames } from '@shared/model/icon.model';
import { LoggerService } from '@core/services/logger/logger.service';
import { ToolbarDialogService } from '../../services/toolbar-dialog.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { ObstacleStateService } from '@services/obstacle-state/obstacle-state.service';
import { ObstaclesService } from '@services/obstacles/obstacles.service';
import { DEFAULT_TABLE_ROWS_PER_PAGE, TABLE_ROWS_PER_PAGE_OPTIONS } from '@shared/constants/tablePagination';
import { LateralDistanceType, ReferenceSupport } from '@shared/domain/models/obstacle.model';
import { SpanOption } from '@shared/types/plot.types';
import { ObstacleTableLabelOption, ObstacleTableRow } from './obstacles-table.interfaces';
import { buildObstacleTableRows } from './obstacles-table.helpers';
import { ALL_SPANS_OPTION_VALUE } from './obstacles-table.constantes';

@Component({
  selector: 'app-obstacles-table',
  imports: [
    FormsModule,
    DecimalPipe,
    TableModule,
    SelectModule,
    PaginatorModule,
    ButtonComponent,
    IconComponent,
    TranslocoModule
  ],
  templateUrl: './obstacles-table.component.html',
  styleUrl: './obstacles-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Dialog component displaying a read-only, paginated table of obstacle points for a selected span. */
export class ObstaclesTableComponent {
  readonly headerTemplate = viewChild<TemplateRef<unknown>>('header');
  readonly footerTemplate = viewChild<TemplateRef<unknown>>('footer');

  private readonly toolbarDialogService = inject(ToolbarDialogService);
  private readonly spanService = inject(PlotSpanService);
  private readonly obstacleStateService = inject(ObstacleStateService);
  private readonly obstaclesService = inject(ObstaclesService);
  private readonly translocoService = inject(TranslocoService);
  private readonly logger = inject(LoggerService);
  private readonly destroyRef = inject(DestroyRef);

  readonly rowsPerPage = signal<number>(DEFAULT_TABLE_ROWS_PER_PAGE);
  readonly first = signal<number>(0);
  readonly rowsPerPageOptions = TABLE_ROWS_PER_PAGE_OPTIONS;

  readonly sortField = signal<string>('');
  readonly sortOrder = signal<number>(0);

  private readonly realSpanOptions = computed(() => this.spanService.getSpanOptions());

  readonly spanOptions = computed<SpanOption[]>(() => {
    const options = this.realSpanOptions();
    if (options.length === 0) return [];
    return [
      {
        label: this.translocoService.translate('studio.obstacles-table.all-spans-option'),
        value: ALL_SPANS_OPTION_VALUE
      },
      ...options
    ];
  });

  readonly selectedSpanUuid = signal<string | null>(null);

  readonly obstacleTypeOptions = signal<ObstacleTableLabelOption[]>([]);

  readonly altitudeTypeOptions: ObstacleTableLabelOption[] = [
    { label: this.translocoService.translate('studio.shared.altitude-type-absolute'), value: 'absolute' },
    { label: this.translocoService.translate('studio.shared.altitude-type-relative'), value: 'relative' },
    { label: this.translocoService.translate('studio.shared.altitude-type-relative-cable'), value: 'relative_cable' }
  ];

  readonly lateralDistanceTypeOptions: ObstacleTableLabelOption[] = [
    { label: this.translocoService.translate('studio.shared.span-axis-option'), value: LateralDistanceType.SPAN_AXIS },
    { label: this.translocoService.translate('studio.shared.line-axis-option'), value: LateralDistanceType.LINE_AXIS }
  ];

  readonly selectedInitialConditionName = computed(() => {
    const section = this.spanService.section();
    if (!section) return null;
    return section.initial_conditions.find((ic) => ic.uuid === section.selected_initial_condition_uuid)?.name ?? null;
  });

  readonly selectedChargeName = computed(() => {
    const section = this.spanService.section();
    if (!section) return null;
    return section.charges.find((charge) => charge.uuid === section.selected_charge_uuid)?.name ?? null;
  });

  private readonly spanLabelByUuid = computed<Map<string, string>>(
    () => new Map(this.realSpanOptions().flatMap((option) => (option.value ? [[option.value, option.label]] : [])))
  );

  private readonly referenceSupportOptionsByUuid = computed<Map<string, { label: string; value: ReferenceSupport }[]>>(
    () =>
      new Map(
        this.realSpanOptions().flatMap((option) =>
          option.value
            ? [
                [
                  option.value,
                  this.spanService.getSupportOptions(option.value) as { label: string; value: ReferenceSupport }[]
                ]
              ]
            : []
        )
      )
  );

  readonly rows = computed<ObstacleTableRow[]>(() => {
    const spanUuid = this.selectedSpanUuid();
    const isAllSpans = spanUuid === ALL_SPANS_OPTION_VALUE;
    const obstacles = (this.spanService.section()?.obstacles ?? []).filter(
      (obstacle) => isAllSpans || obstacle.supportUuid === spanUuid
    );

    return buildObstacleTableRows(
      obstacles,
      this.obstacleStateService.distances(),
      this.spanLabelByUuid(),
      this.referenceSupportOptionsByUuid(),
      this.obstacleTypeOptions(),
      this.altitudeTypeOptions,
      this.lateralDistanceTypeOptions
    );
  });

  constructor() {
    effect(() => {
      const header = this.headerTemplate();
      const footer = this.footerTemplate();
      if (header && footer) {
        this.toolbarDialogService.setTemplates({ header, footer });
      }
    });

    // Default the span filter to the first available span (never to "all spans"), keeping the
    // current selection when it is still valid for the section (e.g. after supports change).
    effect(() => {
      const options = this.realSpanOptions();
      const current = untracked(() => this.selectedSpanUuid());
      if (options.length === 0) {
        if (current !== null) this.selectedSpanUuid.set(null);
        return;
      }
      const isCurrentValid = current === ALL_SPANS_OPTION_VALUE || options.some((option) => option.value === current);
      if (!current || !isCurrentValid) {
        this.selectedSpanUuid.set(options[0].value);
      }
    });

    // Go back to the first page whenever the span filter changes (the previous page may no
    // longer exist for the new obstacle set).
    effect(() => {
      this.selectedSpanUuid();
      untracked(() => this.first.set(0));
    });

    this.obstaclesService.ready
      .pipe(
        filter((ready) => ready),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(async () => {
        try {
          const obstacleTypes = await this.obstaclesService.getObstacleTypes();
          if (obstacleTypes) {
            this.obstacleTypeOptions.set(
              obstacleTypes.map((type) => ({ label: type.obstacle_type_name, value: type.obstacle_type }))
            );
          }
        } catch (error) {
          this.logger.error('Failed to load obstacle types catalog', error);
        }
      });
  }

  onPageChange(event: PaginatorState): void {
    const rows = event.rows ?? DEFAULT_TABLE_ROWS_PER_PAGE;
    this.rowsPerPage.set(rows);
    this.first.set((event.page ?? 0) * rows);
  }

  getSortIcon(field: string): PossibleIconNames {
    if (this.sortField() !== field) {
      return 'swap_vert';
    }
    const order = this.sortOrder();
    if (order === 1) return 'arrow_upward';
    if (order === -1) return 'arrow_downward';
    return 'swap_vert';
  }

  customSort(event: SortEvent): void {
    this.sortField.set((event.field as string) ?? '');
    this.sortOrder.set(event.order ?? 0);

    const field = event.field as keyof ObstacleTableRow;
    const order = event.order ?? 1;

    event.data?.sort((data1: ObstacleTableRow, data2: ObstacleTableRow) => {
      const value1 = data1[field];
      const value2 = data2[field];
      let result = 0;
      if (value1 != null && value2 != null) {
        if (value1 < value2) result = -1;
        else if (value1 > value2) result = 1;
      }
      return order * result;
    });
  }
}
