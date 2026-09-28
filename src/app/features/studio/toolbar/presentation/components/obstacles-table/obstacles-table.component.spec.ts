import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, input, signal, WritableSignal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { PaginatorModule } from 'primeng/paginator';
import { TranslocoModule, TranslocoTestingModule } from '@jsverse/transloco';
import { ObstaclesTableComponent } from './obstacles-table.component';
import { ALL_SPANS_OPTION_VALUE } from './obstacles-table.constantes';
import { ToolbarDialogService } from '../../services/toolbar-dialog.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { ObstacleStateService } from '@services/obstacle-state/obstacle-state.service';
import { ObstaclesService } from '@services/obstacles/obstacles.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { Section } from '@shared/domain';
import { Obstacle, ReferenceSupport, LateralDistanceType } from '@shared/domain/models/obstacle.model';
import { Distance } from '@services/worker_python/tasks/types';
import { DEFAULT_TABLE_ROWS_PER_PAGE } from '@shared/constants/tablePagination';

@Component({
  selector: 'app-button',
  standalone: true,
  template: '<button><ng-content></ng-content></button>'
})
class MockButtonComponent {}

@Component({
  selector: 'app-icon',
  standalone: true,
  template: ''
})
class MockIconComponent {
  icon = input<string>();
}

function makeObstacle(overrides: Partial<Obstacle> = {}): Obstacle {
  return {
    uuid: 'obs-1',
    supportUuid: 'support-1',
    supportIndex: 0,
    name: 'Test obstacle',
    type: 'vegetation',
    altitudeType: 'absolute',
    referenceSupport: ReferenceSupport.LEFT,
    lateralDistanceType: LateralDistanceType.SPAN_AXIS,
    positions: [{ x: 12, y: 5.2, z: 1.2 }],
    ...overrides
  };
}

function makeSection(overrides: Partial<Section> = {}): Section {
  return {
    uuid: 'section-uuid',
    internal_id: 'SEC-001',
    name: 'Test section',
    short_name: 'TS',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    type: 'phase',
    supports: [
      { uuid: 'support-1', number: 'AB12C' },
      { uuid: 'support-2', number: 'AB13C' }
    ],
    obstacles: [],
    charges: [],
    field_measures: [],
    initial_conditions: [],
    selected_initial_condition_uuid: undefined,
    selected_charge_uuid: null,
    selected_field_measure_uuid: undefined,
    ...overrides
  } as Section;
}

describe('ObstaclesTableComponent', () => {
  let component: ObstaclesTableComponent;
  let fixture: ComponentFixture<ObstaclesTableComponent>;
  let toolbarDialogService: ToolbarDialogService;
  let sectionSignal: WritableSignal<Section | null>;
  let distancesSignal: WritableSignal<Distance[]>;
  let obstaclesReady$: BehaviorSubject<boolean>;
  let mockObstaclesService: {
    ready: BehaviorSubject<boolean>;
    getObstacleTypes: ReturnType<typeof vi.fn>;
  };
  let mockSpanService: {
    section: WritableSignal<Section | null>;
    getSpanOptions: ReturnType<typeof vi.fn>;
    getSupportOptions: ReturnType<typeof vi.fn>;
  };
  let mockLogger: {
    error: ReturnType<typeof vi.fn>;
    log: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
  };

  const getByTestId = (id: string): HTMLElement | null => fixture.nativeElement.querySelector(`[data-testid="${id}"]`);

  beforeEach(async () => {
    sectionSignal = signal<Section | null>(makeSection());
    distancesSignal = signal<Distance[]>([]);
    obstaclesReady$ = new BehaviorSubject<boolean>(false);

    mockObstaclesService = {
      ready: obstaclesReady$,
      getObstacleTypes: vi
        .fn()
        .mockResolvedValue([{ obstacle_type: 'vegetation', obstacle_type_name: 'Vegetation', details: '' }])
    };

    mockSpanService = {
      section: sectionSignal,
      getSpanOptions: vi.fn(() => {
        const supports = sectionSignal()?.supports ?? [];
        return supports.slice(0, -1).map((support, index) => ({
          label: `${support.number} - ${supports[index + 1].number}`,
          value: support.uuid
        }));
      }),
      getSupportOptions: vi.fn((supportUuid: string | null) => {
        const supports = sectionSignal()?.supports ?? [];
        const index = supports.findIndex((support) => support.uuid === supportUuid);
        if (index < 0 || index >= supports.length - 1) return [];
        return [
          { label: supports[index].number, value: ReferenceSupport.LEFT },
          { label: supports[index + 1].number, value: ReferenceSupport.RIGHT }
        ];
      })
    };

    mockLogger = { error: vi.fn(), log: vi.fn(), warn: vi.fn(), info: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [
        ObstaclesTableComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' }
        })
      ],
      providers: [
        ToolbarDialogService,
        { provide: PlotSpanService, useValue: mockSpanService },
        { provide: ObstacleStateService, useValue: { distances: distancesSignal } },
        { provide: ObstaclesService, useValue: mockObstaclesService },
        { provide: LoggerService, useValue: mockLogger }
      ]
    })
      .overrideComponent(ObstaclesTableComponent, {
        set: {
          imports: [
            FormsModule,
            DecimalPipe,
            TableModule,
            SelectModule,
            PaginatorModule,
            TranslocoModule,
            MockButtonComponent,
            MockIconComponent
          ]
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(ObstaclesTableComponent);
    component = fixture.componentInstance;
    toolbarDialogService = TestBed.inject(ToolbarDialogService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('registers header and footer templates with toolbar dialog service on init', () => {
    expect(toolbarDialogService.templates()).toEqual(
      expect.objectContaining({ header: expect.anything(), footer: expect.anything() })
    );
  });

  describe('span selection', () => {
    it('defaults to the first available span option', () => {
      expect(component.selectedSpanUuid()).toBe('support-1');
    });

    it('resets to null when there are no span options', () => {
      sectionSignal.set(makeSection({ supports: [] }));
      fixture.detectChanges();
      expect(component.selectedSpanUuid()).toBeNull();
    });

    it('keeps the current selection when it is still a valid span option', () => {
      component.selectedSpanUuid.set('support-1');
      sectionSignal.set(makeSection());
      fixture.detectChanges();
      expect(component.selectedSpanUuid()).toBe('support-1');
    });

    it('keeps the "all spans" selection valid when spans are still available', () => {
      component.selectedSpanUuid.set(ALL_SPANS_OPTION_VALUE);
      sectionSignal.set(makeSection());
      fixture.detectChanges();
      expect(component.selectedSpanUuid()).toBe(ALL_SPANS_OPTION_VALUE);
    });
  });

  describe('spanOptions', () => {
    it('prepends an "all spans" option before the individual spans', () => {
      expect(component.spanOptions()).toEqual([
        { label: 'studio.obstacles-table.all-spans-option', value: ALL_SPANS_OPTION_VALUE },
        { label: 'AB12C - AB13C', value: 'support-1' }
      ]);
    });

    it('stays empty (no "all spans" option) when there is no span at all', () => {
      sectionSignal.set(makeSection({ supports: [] }));
      fixture.detectChanges();
      expect(component.spanOptions()).toEqual([]);
    });
  });

  describe('rows', () => {
    it('builds one row per obstacle point for the selected span', () => {
      sectionSignal.set(
        makeSection({
          obstacles: [
            makeObstacle({ uuid: 'obs-1', positions: [{ x: 12, y: 5.2, z: 1.2 }] }),
            makeObstacle({
              uuid: 'obs-2',
              positions: [
                { x: 1, y: 2, z: 3 },
                { x: 4, y: 5, z: 6 }
              ]
            })
          ]
        })
      );
      fixture.detectChanges();

      expect(component.rows().length).toBe(3);
    });

    it('excludes obstacles that do not belong to the selected span', () => {
      sectionSignal.set(
        makeSection({
          obstacles: [makeObstacle({ uuid: 'obs-other-span', supportUuid: 'support-2' })]
        })
      );
      fixture.detectChanges();

      expect(component.rows().length).toBe(0);
    });

    it('includes obstacles from every span and resolves each row\'s own span/reference support labels when "all spans" is selected', () => {
      sectionSignal.set(
        makeSection({
          supports: [
            { uuid: 'support-1', number: 'AB12C' },
            { uuid: 'support-2', number: 'AB13C' },
            { uuid: 'support-3', number: 'AB14C' }
          ],
          obstacles: [
            makeObstacle({ uuid: 'obs-span-1', supportUuid: 'support-1', referenceSupport: ReferenceSupport.LEFT }),
            makeObstacle({ uuid: 'obs-span-2', supportUuid: 'support-2', referenceSupport: ReferenceSupport.RIGHT })
          ]
        })
      );
      component.selectedSpanUuid.set(ALL_SPANS_OPTION_VALUE);
      fixture.detectChanges();

      const rows = component.rows();
      expect(rows.length).toBe(2);
      expect(rows[0].spanLabel).toBe('AB12C - AB13C');
      expect(rows[0].referenceSupportLabel).toBe('AB12C');
      expect(rows[1].spanLabel).toBe('AB13C - AB14C');
      expect(rows[1].referenceSupportLabel).toBe('AB14C');
    });

    it('resolves the reference support label from the span support options', () => {
      sectionSignal.set(makeSection({ obstacles: [makeObstacle({ referenceSupport: ReferenceSupport.RIGHT })] }));
      fixture.detectChanges();

      expect(component.rows()[0].referenceSupportLabel).toBe('AB13C');
    });

    it('maps position x/y/z to distance/altitude fields', () => {
      sectionSignal.set(makeSection({ obstacles: [makeObstacle({ positions: [{ x: 10, y: 20, z: 30 }] })] }));
      fixture.detectChanges();

      const row = component.rows()[0];
      expect(row.distanceToRefSupport).toBe(10);
      expect(row.distanceToLineAxis).toBe(20);
      expect(row.altitude).toBe(30);
      expect(row.pointNumber).toBe(1);
    });

    it('joins pre-computed distances by obstacle uuid and point index', () => {
      distancesSignal.set([
        {
          obstacleUuid: 'obs-1',
          points: [
            {
              pointIndex: 0,
              linePoint: [0, 0, 0],
              virtualPointHorizontal: [0, 0, 0],
              virtualPointVertical: [0, 0, 0],
              distanceDiagonal: 42,
              distanceHorizontal: 8,
              distanceVertical: 5,
              signedDistanceVertical: 5
            }
          ]
        }
      ]);
      sectionSignal.set(makeSection({ obstacles: [makeObstacle({ uuid: 'obs-1' })] }));
      fixture.detectChanges();

      const row = component.rows()[0];
      expect(row.oblique).toBe(42);
      expect(row.horizontal).toBe(8);
      expect(row.vertical).toBe(5);
    });

    it('flattens points from every distance entry sharing the same obstacle uuid', () => {
      distancesSignal.set([
        {
          obstacleUuid: 'obs-1',
          points: [
            {
              pointIndex: 0,
              linePoint: [0, 0, 0],
              virtualPointHorizontal: [0, 0, 0],
              virtualPointVertical: [0, 0, 0],
              distanceDiagonal: 1,
              distanceHorizontal: 1,
              distanceVertical: 1,
              signedDistanceVertical: 1
            }
          ]
        },
        {
          obstacleUuid: 'obs-1',
          points: [
            {
              pointIndex: 1,
              linePoint: [0, 0, 0],
              virtualPointHorizontal: [0, 0, 0],
              virtualPointVertical: [0, 0, 0],
              distanceDiagonal: 42,
              distanceHorizontal: 8,
              distanceVertical: 5,
              signedDistanceVertical: 5
            }
          ]
        }
      ]);
      sectionSignal.set(
        makeSection({
          obstacles: [
            makeObstacle({
              uuid: 'obs-1',
              positions: [
                { x: 1, y: 1, z: 1 },
                { x: 2, y: 2, z: 2 }
              ]
            })
          ]
        })
      );
      fixture.detectChanges();

      const rows = component.rows();
      expect(rows[1].oblique).toBe(42);
      expect(rows[1].horizontal).toBe(8);
      expect(rows[1].vertical).toBe(5);
    });

    it('resolves the obstacle type label once the catalog is ready', async () => {
      sectionSignal.set(makeSection({ obstacles: [makeObstacle({ type: 'vegetation' })] }));
      obstaclesReady$.next(true);
      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.rows()[0].obstacleType).toBe('Vegetation');
    });

    it('falls back to the raw obstacle type when the catalog does not resolve it', () => {
      sectionSignal.set(makeSection({ obstacles: [makeObstacle({ type: 'unknown_type' })] }));
      fixture.detectChanges();

      expect(component.rows()[0].obstacleType).toBe('unknown_type');
    });

    it('logs and keeps the raw obstacle type when the catalog fails to load', async () => {
      mockObstaclesService.getObstacleTypes.mockRejectedValueOnce(new Error('db error'));
      sectionSignal.set(makeSection({ obstacles: [makeObstacle({ type: 'vegetation' })] }));
      obstaclesReady$.next(true);
      await fixture.whenStable();
      fixture.detectChanges();

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to load obstacle types catalog', expect.any(Error));
      expect(component.rows()[0].obstacleType).toBe('vegetation');
    });

    it('returns an empty array when there is no section', () => {
      sectionSignal.set(null);
      fixture.detectChanges();

      expect(component.rows()).toEqual([]);
    });
  });

  describe('initial condition and charge case display', () => {
    it('returns null when the section has none selected', () => {
      expect(component.selectedInitialConditionName()).toBeNull();
      expect(component.selectedChargeName()).toBeNull();
    });

    it('resolves the selected initial condition and charge names', () => {
      sectionSignal.set(
        makeSection({
          initial_conditions: [
            {
              uuid: 'ic-1',
              name: 'CI 1',
              base_parameters: null,
              base_temperature: 15,
              cable_pretension: 12,
              min_temperature: -20,
              max_wind_pressure: 480,
              max_frost_width: 20
            }
          ],
          selected_initial_condition_uuid: 'ic-1',
          charges: [{ uuid: 'cc-1', name: 'CC 3' } as Section['charges'][number]],
          selected_charge_uuid: 'cc-1'
        })
      );
      fixture.detectChanges();

      expect(component.selectedInitialConditionName()).toBe('CI 1');
      expect(component.selectedChargeName()).toBe('CC 3');
    });
  });

  describe('getSortIcon', () => {
    it('returns swap_vert when the field is not the current sort field', () => {
      component.sortField.set('');
      component.sortOrder.set(0);
      expect(component.getSortIcon('obstacleName')).toBe('swap_vert');
    });

    it('returns arrow_upward when sorted ascending on the field', () => {
      component.sortField.set('obstacleName');
      component.sortOrder.set(1);
      expect(component.getSortIcon('obstacleName')).toBe('arrow_upward');
    });

    it('returns arrow_downward when sorted descending on the field', () => {
      component.sortField.set('obstacleName');
      component.sortOrder.set(-1);
      expect(component.getSortIcon('obstacleName')).toBe('arrow_downward');
    });
  });

  describe('customSort', () => {
    it('sorts rows ascending by the given field', () => {
      const data = [{ obstacleName: 'B' }, { obstacleName: 'A' }] as never[];
      component.customSort({ field: 'obstacleName', order: 1, data });
      expect((data as { obstacleName: string }[]).map((row) => row.obstacleName)).toEqual(['A', 'B']);
      expect(component.sortField()).toBe('obstacleName');
      expect(component.sortOrder()).toBe(1);
    });

    it('sorts rows descending when order is -1', () => {
      const data = [{ obstacleName: 'A' }, { obstacleName: 'B' }] as never[];
      component.customSort({ field: 'obstacleName', order: -1, data });
      expect((data as { obstacleName: string }[]).map((row) => row.obstacleName)).toEqual(['B', 'A']);
    });

    it('resets the first-record index to 0 so the paginator stays in sync', () => {
      component.first.set(50);
      component.customSort({ field: 'obstacleName', order: 1, data: [] as never[] });
      expect(component.first()).toBe(0);
    });
  });

  describe('onPageChange', () => {
    it('updates the page size and first-record index from the paginator event', () => {
      component.onPageChange({ rows: 25, page: 2 });
      expect(component.rowsPerPage()).toBe(25);
      expect(component.first()).toBe(50);
    });

    it('falls back to the default page size and first page when the event omits them', () => {
      component.onPageChange({});
      expect(component.rowsPerPage()).toBe(DEFAULT_TABLE_ROWS_PER_PAGE);
      expect(component.first()).toBe(0);
    });
  });

  describe('pagination reset', () => {
    it('resets the first-record index to 0 when the span filter changes', () => {
      sectionSignal.set(
        makeSection({
          supports: [
            { uuid: 'support-1', number: 'AB12C' },
            { uuid: 'support-2', number: 'AB13C' },
            { uuid: 'support-3', number: 'AB14C' }
          ]
        })
      );
      fixture.detectChanges();
      component.first.set(50);

      component.selectedSpanUuid.set('support-2');
      fixture.detectChanges();

      expect(component.first()).toBe(0);
    });
  });

  describe('HTML rendering', () => {
    it('renders the span select and info fields', () => {
      expect(getByTestId('span-select')).toBeTruthy();
      expect(getByTestId('initial-condition-value')).toBeTruthy();
      expect(getByTestId('charge-case-value')).toBeTruthy();
    });

    it('renders the obstacles table', () => {
      expect(getByTestId('obstacles-table')).toBeTruthy();
    });

    it('keeps the number column sticky on horizontal scroll', () => {
      sectionSignal.set(makeSection({ obstacles: [makeObstacle()] }));
      fixture.detectChanges();

      const table = getByTestId('obstacles-table')!;
      expect(table.querySelector('#index-col')?.classList.contains('obstacles-table__sticky-col')).toBe(true);
      expect(table.querySelector('tbody td')?.classList.contains('obstacles-table__sticky-col')).toBe(true);
    });

    it('renders the paginator above the table', () => {
      const paginator = getByTestId('obstacles-table-paginator');
      const table = getByTestId('obstacles-table');
      expect(paginator).toBeTruthy();
      expect(table).toBeTruthy();
      expect(paginator!.compareDocumentPosition(table!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('registers a footer template holding the disabled report button', () => {
      expect(component.footerTemplate()).toBeTruthy();
    });
  });
});
