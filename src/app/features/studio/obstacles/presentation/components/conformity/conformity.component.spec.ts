import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { ConformityComponent } from './conformity.component';
import { ObstacleFormService } from '@services/obstacles-form/obstaclesForm.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { StorageService } from '@services/storage/storage.service';
import { NotificationService } from '@services/notification/notification.service';
import { Obstacle, ReferenceSupport, LateralDistanceType } from '@shared/domain/models/obstacle.model';
import { createConformityPlot, purgeConformityPlot } from './helpers/createConformityPlot';
import { CONFORMITY_PLOT_MOCK } from './conformity-plot.mock';

vi.mock('./helpers/createConformityPlot');

const mockCreateConformityPlot = vi.mocked(createConformityPlot);
const mockPurgeConformityPlot = vi.mocked(purgeConformityPlot);

/** Shape of the in-memory data backing the mock Dexie database. */
interface DbData {
  configurations: { obstacle_type: string; red_zone: boolean; conformity: string | null }[];
  windZones: { label: string; normal: number; red_zone: number }[];
  conformityConfig: {
    wind_zone_default: string | null;
    repartition_temperature_default: number | null;
    lateral_temperature_rule_type: string | null;
    lateral_temperature_message: string | null;
  } | null;
  ruleDefinitions: {
    rule_type: string;
    rule_name: string;
    lateral_point: { temperature: number | null };
    overhang_point: { temperature: number | null };
  }[];
  distances: { obstacle_type: string; rule_type: string; active: boolean; lateral: unknown; overhang: unknown }[];
}

const defaultDbData = (): DbData => ({
  configurations: [{ obstacle_type: 'House', red_zone: true, conformity: 'cable_track' }],
  windZones: [
    { label: 'Z1', normal: 200, red_zone: 500 },
    { label: 'Z2', normal: 300, red_zone: 600 }
  ],
  conformityConfig: {
    wind_zone_default: 'Z1',
    repartition_temperature_default: 15,
    lateral_temperature_rule_type: 'rule_lat',
    lateral_temperature_message: 'Temperature from lateral rule'
  },
  ruleDefinitions: [
    {
      rule_type: 'rule_a',
      rule_name: 'Rule A',
      lateral_point: { temperature: -5 },
      overhang_point: { temperature: 40 }
    },
    {
      rule_type: 'rule_b',
      rule_name: 'Rule B',
      lateral_point: { temperature: -10 },
      overhang_point: { temperature: 35 }
    },
    { rule_type: 'rule_lat', rule_name: 'Lat', lateral_point: { temperature: 5 }, overhang_point: { temperature: 20 } }
  ],
  distances: [
    { obstacle_type: 'House', rule_type: 'rule_a', active: true, lateral: {}, overhang: {} },
    { obstacle_type: 'House', rule_type: 'rule_b', active: false, lateral: {}, overhang: {} }
  ]
});

/** Builds a chainable Dexie-like mock from plain in-memory arrays. */
function buildDb(data: DbData) {
  return {
    catObstacleConfigurations: {
      where: (field: string) => ({
        equals: (val: unknown) => ({
          first: () =>
            Promise.resolve(data.configurations.find((c) => (c as Record<string, unknown>)[field] === val) ?? null)
        })
      })
    },
    catObstacleWindZones: {
      toArray: () => Promise.resolve(data.windZones)
    },
    catObstacleConformityConfig: {
      get: () => Promise.resolve(data.conformityConfig)
    },
    catObstacleRuleDefinitions: {
      get: (ruleType: string) => Promise.resolve(data.ruleDefinitions.find((r) => r.rule_type === ruleType) ?? null),
      where: (field: string) => ({
        anyOf: (vals: string[]) => ({
          toArray: () =>
            Promise.resolve(
              data.ruleDefinitions.filter((r) => vals.includes((r as Record<string, unknown>)[field] as string))
            )
        })
      })
    },
    catObstacleDistances: {
      where: (field: string) => ({
        equals: (val: unknown) => {
          const base = data.distances.filter((d) => (d as Record<string, unknown>)[field] === val);
          return {
            toArray: () => Promise.resolve(base),
            filter: (fn: (d: unknown) => boolean) => ({ toArray: () => Promise.resolve(base.filter(fn)) }),
            count: () => Promise.resolve(base.length)
          };
        }
      })
    }
  };
}

const defaultObstacle = (): Obstacle => ({
  uuid: 'o1',
  supportUuid: 'support-1',
  supportIndex: 0,
  name: 'My obstacle',
  type: 'House',
  altitudeType: 'absolute',
  lateralDistanceType: LateralDistanceType.SPAN_AXIS,
  referenceSupport: ReferenceSupport.LEFT,
  positions: [{ x: 1, y: 2, z: 3 }]
});

describe('ConformityComponent', () => {
  let component: ConformityComponent;
  let fixture: ComponentFixture<ConformityComponent>;

  let dbData: DbData;
  let obstacle: Obstacle;
  let sectionSignal: ReturnType<typeof signal<Record<string, unknown> | null>>;
  let formValueSignal: ReturnType<typeof signal<{ uuid: string | null }>>;
  let mockFormService: {
    formValue: typeof formValueSignal;
    form: { value: { uuid: string | null } };
    supportsOptions: ReturnType<typeof signal<{ label: string; value: 'LEFT' | 'RIGHT' }[]>>;
    saveConformityData: ReturnType<typeof vi.fn>;
  };
  let mockSpanService: { section: typeof sectionSignal; getSpanOptions: ReturnType<typeof vi.fn> };
  let mockNotification: { error: ReturnType<typeof vi.fn> };

  /**
   * Configures the TestBed and creates the component, then flushes the async Dexie-backed
   * signals (wind zones, conformity config, options) so derived state is fully resolved.
   * Mutate `dbData` / `obstacle` before calling to vary the scenario.
   */
  async function createComponent(): Promise<void> {
    sectionSignal = signal<Record<string, unknown> | null>({
      obstacles: [obstacle],
      voltage_idr: '400 kV',
      supports: []
    });
    formValueSignal = signal<{ uuid: string | null }>({ uuid: obstacle.uuid });

    mockFormService = {
      formValue: formValueSignal,
      form: { value: { uuid: obstacle.uuid } },
      supportsOptions: signal<{ label: string; value: 'LEFT' | 'RIGHT' }[]>([
        { label: 'Support 1', value: ReferenceSupport.LEFT }
      ]),
      saveConformityData: vi.fn().mockResolvedValue(undefined)
    };
    mockSpanService = {
      section: sectionSignal,
      getSpanOptions: vi.fn().mockReturnValue([{ label: 'Span 1', value: 'support-1' }])
    };
    mockNotification = { error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ConformityComponent],
      providers: [
        provideNoopAnimations(),
        { provide: ObstacleFormService, useValue: mockFormService },
        { provide: PlotSpanService, useValue: mockSpanService },
        { provide: StorageService, useValue: { db: buildDb(dbData) } },
        { provide: NotificationService, useValue: mockNotification }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ConformityComponent);
    component = fixture.componentInstance;

    // Pump change detection + microtasks a few times so toObservable -> Dexie -> toSignal chains resolve.
    for (let i = 0; i < 3; i++) {
      fixture.detectChanges();
      await fixture.whenStable();
    }
    fixture.detectChanges();
  }

  beforeEach(() => {
    dbData = defaultDbData();
    obstacle = defaultObstacle();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', async () => {
    await createComponent();
    expect(component).toBeTruthy();
  });

  describe('obstacle-derived signals', () => {
    it('should resolve the obstacle from the section by form uuid', async () => {
      await createComponent();
      expect(component.obstacleData()?.uuid).toBe('o1');
    });

    it('should return null obstacle data when no obstacle matches the uuid', async () => {
      formValueSignal = signal<{ uuid: string | null }>({ uuid: 'missing' });
      obstacle = { ...defaultObstacle(), uuid: 'missing-not-in-section' };
      await createComponent();
      formValueSignal.set({ uuid: 'unknown' });
      fixture.detectChanges();
      expect(component.obstacleData()).toBeNull();
    });

    it('should expose positions and point options', async () => {
      obstacle = {
        ...defaultObstacle(),
        positions: [
          { x: 1, y: 1, z: 1 },
          { x: 2, y: 2, z: 2 }
        ]
      };
      await createComponent();
      expect(component.positions().length).toBe(2);
      expect(component.hasMultiplePoints()).toBe(true);
      expect(component.pointOptions()).toEqual([
        { label: 'Point 1', value: 0 },
        { label: 'Point 2', value: 1 }
      ]);
    });

    it('should auto-select the single point when only one position exists', async () => {
      await createComponent();
      expect(component.hasMultiplePoints()).toBe(false);
      expect(component.activePoint()).toEqual({ x: 1, y: 2, z: 3 });
    });

    it('should return null active point until a point is selected when multiple points exist', async () => {
      obstacle = {
        ...defaultObstacle(),
        positions: [
          { x: 1, y: 1, z: 1 },
          { x: 2, y: 2, z: 2 }
        ]
      };
      await createComponent();
      expect(component.activePoint()).toBeNull();

      component.form.controls.selectedPoint.setValue(1);
      fixture.detectChanges();
      expect(component.activePoint()).toEqual({ x: 2, y: 2, z: 2 });
    });
  });

  describe('display labels', () => {
    it('should resolve span label from span options', async () => {
      obstacle = { ...defaultObstacle(), supportUuid: 'support-1' };
      await createComponent();
      expect(component.spanLabel()).toBe('Span 1');
    });

    it('should fall back to "-" when there is no support uuid', async () => {
      obstacle = { ...defaultObstacle(), supportUuid: '' };
      await createComponent();
      expect(component.spanLabel()).toBe('-');
    });

    it('should expose the electric tension from the section', async () => {
      await createComponent();
      expect(component.electricTensionLabel()).toBe('400 kV');
    });

    it('should fall back to "-" for electric tension when section has no voltage', async () => {
      await createComponent();
      sectionSignal.set({ obstacles: [obstacle], supports: [] });
      fixture.detectChanges();
      expect(component.electricTensionLabel()).toBe('-');
    });

    it('should map known altitude and lateral distance types to their labels', async () => {
      await createComponent();
      expect(component.altitudeTypeLabel()).toBe('Absolute (NGF)');
      expect(component.lateralDistanceTypeLabel()).toBe('Span axis');
    });

    it('should resolve the reference support label from the form service options', async () => {
      obstacle = { ...defaultObstacle(), referenceSupport: ReferenceSupport.LEFT };
      await createComponent();
      expect(component.referenceSupportLabel()).toBe('Support 1');
    });
  });

  describe('lateral temperature config', () => {
    it('should expose the rule name for the configured lateral temperature rule type', async () => {
      await createComponent();
      expect(component.lateralTemperatureRuleName()).toBe('Lat');
    });

    it('should expose null rule name when no lateral_temperature_rule_type is configured', async () => {
      dbData.conformityConfig = { ...dbData.conformityConfig!, lateral_temperature_rule_type: null };
      await createComponent();
      expect(component.lateralTemperatureRuleName()).toBeNull();
    });

    it('should expose null rule name when no db is available', async () => {
      dbData.conformityConfig = null;
      await createComponent();
      expect(component.lateralTemperatureRuleName()).toBeNull();
    });

    it('should expose the hint message from the conformity config', async () => {
      await createComponent();
      expect(component.lateralTemperatureHint()).toBe('Temperature from lateral rule');
    });

    it('should expose null hint when the config has no message', async () => {
      dbData.conformityConfig = { ...dbData.conformityConfig!, lateral_temperature_message: null };
      await createComponent();
      expect(component.lateralTemperatureHint()).toBeNull();
    });

    it('should render the hint element with the config message', async () => {
      await createComponent();
      const hint = fixture.nativeElement.querySelector('#lateral-distance-hint') as HTMLElement | null;
      expect(hint).toBeTruthy();
      expect(hint!.textContent?.trim()).toBe('Temperature from lateral rule');
    });

    it('should not render the hint element when there is no message', async () => {
      dbData.conformityConfig = { ...dbData.conformityConfig!, lateral_temperature_message: null };
      await createComponent();
      expect(fixture.nativeElement.querySelector('#lateral-distance-hint')).toBeNull();
    });

    it('should prefix the lateral temperature label with the rule name', async () => {
      await createComponent();
      const label = fixture.nativeElement.querySelector('label[for="lateralDistanceTemperature"]') as HTMLElement;
      expect(label.textContent?.trim()).toContain('Lat');
    });

    it('should not add a prefix when no rule name is available', async () => {
      dbData.conformityConfig = { ...dbData.conformityConfig!, lateral_temperature_rule_type: null };
      await createComponent();
      const label = fixture.nativeElement.querySelector('label[for="lateralDistanceTemperature"]') as HTMLElement;
      expect(label.textContent?.trim()).not.toContain(' —');
    });
  });

  describe('column layout', () => {
    it('should show the lateral column for non-overhang conformity types', async () => {
      // default conformity is 'cable_track'
      await createComponent();
      expect(component.showLateralColumn()).toBe(true);
    });

    it('should hide the lateral column for the overhang conformity type', async () => {
      dbData.configurations = [{ obstacle_type: 'House', red_zone: false, conformity: 'overhang' }];
      await createComponent();
      expect(component.showLateralColumn()).toBe(false);
    });

    it('should compute total colspan from selected columns and lateral visibility', async () => {
      await createComponent();
      component.form.controls.conformity.setValue(['rule_a', 'rule_b']);
      fixture.detectChanges();
      // 1 label column + 2 rules * 2 (overhang + lateral)
      expect(component.totalColSpan()).toBe(5);
    });
  });

  describe('wind pressure', () => {
    it('should build wind zone options from the catalog', async () => {
      await createComponent();
      expect(component.windZoneOptions()).toEqual([
        { label: 'Z1', value: 'Z1' },
        { label: 'Z2', value: 'Z2' }
      ]);
    });

    it('should use the normal pressure when red zone is not present', async () => {
      await createComponent();
      component.form.controls.windZone.setValue('Z2');
      component.form.controls.redZonePresence.setValue(false);
      fixture.detectChanges();
      expect(component.effectiveWindPressure()).toBe(300);
    });

    it('should use the red zone pressure when red zone is present', async () => {
      await createComponent();
      component.form.controls.windZone.setValue('Z2');
      component.form.controls.redZonePresence.setValue(true);
      fixture.detectChanges();
      expect(component.effectiveWindPressure()).toBe(600);
    });

    it('should return null pressure for an unknown wind zone', async () => {
      await createComponent();
      component.form.controls.windZone.setValue('UNKNOWN');
      fixture.detectChanges();
      expect(component.effectiveWindPressure()).toBeNull();
    });
  });

  describe('conformity options', () => {
    it('should build options from distances joined with rule names', async () => {
      await createComponent();
      expect(component.conformityOptions()).toEqual([
        { label: 'Rule A', value: 'rule_a', active: true },
        { label: 'Rule B', value: 'rule_b', active: false }
      ]);
    });

    it('should select only active rules as the initial conformity', async () => {
      await createComponent();
      expect(component.form.controls.conformity.value).toEqual(['rule_a']);
    });

    it('should map selected values to their full option objects', async () => {
      await createComponent();
      component.form.controls.conformity.setValue(['rule_b']);
      fixture.detectChanges();
      expect(component.selectedConformityColumns()).toEqual([{ label: 'Rule B', value: 'rule_b', active: false }]);
    });
  });

  describe('form population from defaults', () => {
    it('should populate editable fields from the async catalog defaults', async () => {
      await createComponent();
      expect(component.form.controls.windZone.value).toBe('Z1');
      expect(component.form.controls.repartitionTemperature.value).toBe(15);
      expect(component.form.controls.lateralDistanceTemperature.value).toBe(5);
    });

    it('should populate fields from saved conformity data over defaults', async () => {
      obstacle = {
        ...defaultObstacle(),
        conformityData: {
          selectedPoint: null,
          windZone: 'Z2',
          windMinus: true,
          redZonePresence: true,
          repartitionTemperature: 99,
          lateralDistanceTemperature: 88,
          conformity: ['rule_b']
        }
      };
      await createComponent();
      expect(component.form.controls.windZone.value).toBe('Z2');
      expect(component.form.controls.repartitionTemperature.value).toBe(99);
      expect(component.form.controls.lateralDistanceTemperature.value).toBe(88);
      expect(component.form.controls.windMinus.value).toBe(true);
      expect(component.form.controls.redZonePresence.value).toBe(true);
      expect(component.form.controls.conformity.value).toEqual(['rule_b']);
    });
  });

  describe('validation', () => {
    it('should expose a min error id for repartition temperature below the minimum', async () => {
      await createComponent();
      component.form.controls.repartitionTemperature.setValue(-1);
      fixture.detectChanges();
      expect(component.repartitionTemperatureErrorId()).toBe('repartition-temperature-min-error');
    });

    it('should expose a max error id for repartition temperature above the maximum', async () => {
      await createComponent();
      component.form.controls.repartitionTemperature.setValue(9999);
      fixture.detectChanges();
      expect(component.repartitionTemperatureErrorId()).toBe('repartition-temperature-max-error');
    });

    it('should expose a min error id for lateral distance temperature below the minimum', async () => {
      await createComponent();
      component.form.controls.lateralDistanceTemperature.setValue(-1);
      fixture.detectChanges();
      expect(component.lateralDistanceTemperatureErrorId()).toBe('lateral-distance-temperature-min-error');
    });

    it('should return null error id when the value is valid', async () => {
      await createComponent();
      component.form.controls.repartitionTemperature.setValue(20);
      fixture.detectChanges();
      expect(component.repartitionTemperatureErrorId()).toBeNull();
    });
  });

  describe('canCalculate', () => {
    it('should be true when the form is valid and the obstacle has a single point', async () => {
      await createComponent();
      expect(component.canCalculate()).toBe(true);
    });

    it('should be false when a required field is invalid', async () => {
      await createComponent();
      component.form.controls.conformity.setValue(null);
      fixture.detectChanges();
      expect(component.canCalculate()).toBe(false);
    });

    it('should be false when multiple points exist but none is selected', async () => {
      obstacle = {
        ...defaultObstacle(),
        positions: [
          { x: 1, y: 1, z: 1 },
          { x: 2, y: 2, z: 2 }
        ]
      };
      await createComponent();
      component.form.controls.selectedPoint.setValue(null);
      fixture.detectChanges();
      expect(component.canCalculate()).toBe(false);
    });
  });

  describe('calculate', () => {
    it('should populate a result entry for each selected rule', async () => {
      await createComponent();
      component.form.controls.conformity.setValue(['rule_a', 'rule_b']);
      fixture.detectChanges();

      await component.calculate();

      // Assert on the shape (one entry per selected rule), not the placeholder values,
      // so these tests survive the switch to the real conformity calculation.
      const results = component.conformityResults();
      expect(results).not.toBeNull();
      expect(Object.keys(results ?? {})).toEqual(['rule_a', 'rule_b']);
    });

    it('should not run when canCalculate is false', async () => {
      await createComponent();
      component.form.controls.conformity.setValue(null);
      fixture.detectChanges();

      await component.calculate();
      expect(component.conformityResults()).toBeNull();
    });

    it('should surface a notification and error message when calculation throws', async () => {
      await createComponent();
      const failingDb = TestBed.inject(StorageService) as unknown as { db: { catObstacleDistances: unknown } };
      failingDb.db.catObstacleDistances = {
        where: () => {
          throw new Error('boom');
        }
      };

      await component.calculate();

      expect(component.calculationError()).toBe('boom');
      expect(mockNotification.error).toHaveBeenCalled();
      expect(component.isCalculating()).toBe(false);
    });
  });

  describe('conformity plot rendering', () => {
    it('should render the mock plot data with the selected rules and their colors once the plot div exists', async () => {
      await createComponent();
      vi.spyOn(document, 'getElementById').mockReturnValue(document.createElement('div'));
      component.form.controls.conformity.setValue(['rule_a']);
      fixture.detectChanges();

      await component.calculate();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(mockCreateConformityPlot).toHaveBeenCalledWith(
        document,
        CONFORMITY_PLOT_MOCK,
        expect.objectContaining({ selectedRuleTypes: ['rule_a'], conformityType: 'cable_track' })
      );
    });

    it('should not render the plot when the #conformity-plot div is not present in the DOM', async () => {
      await createComponent();
      vi.spyOn(document, 'getElementById').mockReturnValue(null);

      await component.calculate();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(mockCreateConformityPlot).not.toHaveBeenCalled();
    });

    it('should purge the plot when results are cleared because the modal closes', async () => {
      await createComponent();
      vi.spyOn(document, 'getElementById').mockReturnValue(document.createElement('div'));
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();
      await component.calculate();
      fixture.detectChanges();
      await fixture.whenStable();
      mockPurgeConformityPlot.mockClear();

      fixture.componentRef.setInput('isOpen', false);
      fixture.detectChanges();

      expect(mockPurgeConformityPlot).toHaveBeenCalledWith(document);
    });

    it('should purge the plot when the component is destroyed', async () => {
      await createComponent();
      mockPurgeConformityPlot.mockClear();

      fixture.destroy();

      expect(mockPurgeConformityPlot).toHaveBeenCalledWith(document);
    });
  });

  describe('getConformityCompliance', () => {
    it('should return null when there are no results for the rule', async () => {
      await createComponent();
      expect(component.getConformityCompliance('rule_a')).toBeNull();
    });
  });

  describe('getValue', () => {
    it('should return null for a null key', async () => {
      await createComponent();
      await component.calculate();
      expect(component.getValue('rule_a', null)).toBeNull();
    });

    it('should return null when the rule has no result', async () => {
      await createComponent();
      expect(component.getValue('unknown', 'overhangCableAltitude')).toBeNull();
    });
  });

  describe('saveConformityData', () => {
    it('should forward the current form values to the form service', async () => {
      await createComponent();
      component.form.controls.windZone.setValue('Z2');
      component.form.controls.conformity.setValue(['rule_b']);
      fixture.detectChanges();

      await component.saveConformityData();

      expect(mockFormService.saveConformityData).toHaveBeenCalledWith(
        'o1',
        expect.objectContaining({ windZone: 'Z2', conformity: ['rule_b'], windMinus: false, redZonePresence: false })
      );
    });

    it('should not save when canCalculate is false', async () => {
      await createComponent();
      component.form.controls.conformity.setValue(null);
      fixture.detectChanges();

      await component.saveConformityData();
      expect(mockFormService.saveConformityData).not.toHaveBeenCalled();
    });

    it('should not save when there is no obstacle uuid', async () => {
      await createComponent();
      mockFormService.form.value.uuid = null;

      await component.saveConformityData();
      expect(mockFormService.saveConformityData).not.toHaveBeenCalled();
    });
  });

  describe('results rendering', () => {
    it('should not render the results section before calculation', async () => {
      await createComponent();
      expect(fixture.nativeElement.querySelector('.results')).toBeNull();
    });

    it('should render the results table with a compliance cell after calculation', async () => {
      await createComponent();
      await component.calculate();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.results')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.results__table')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.compliance')).toBeTruthy();
    });
  });

  describe('isOpen auto-calculate and reset', () => {
    it('should auto-calculate saved conformity when the modal opens', async () => {
      obstacle = {
        ...defaultObstacle(),
        conformityData: {
          selectedPoint: null,
          windZone: 'Z1',
          windMinus: false,
          redZonePresence: false,
          repartitionTemperature: 15,
          lateralDistanceTemperature: 5,
          conformity: ['rule_a']
        }
      };
      await createComponent();
      expect(component.conformityResults()).toBeNull();

      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.conformityResults()).not.toBeNull();
    });

    it('should clear results when the modal closes', async () => {
      await createComponent();
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();
      await component.calculate();
      expect(component.conformityResults()).not.toBeNull();

      fixture.componentRef.setInput('isOpen', false);
      fixture.detectChanges();
      expect(component.conformityResults()).toBeNull();
    });
  });
});
