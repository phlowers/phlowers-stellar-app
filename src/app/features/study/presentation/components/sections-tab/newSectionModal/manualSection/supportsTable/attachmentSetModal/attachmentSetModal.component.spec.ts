// Mock plotly.js-dist-min
vi.mock('plotly.js-dist-min', () => {
  const mockPlotly = {
    newPlot: vi.fn(),
    update: vi.fn(),
    purge: vi.fn(),
    relayout: vi.fn(),
    restyle: vi.fn(),
    react: vi.fn(),
    redraw: vi.fn(),
    toImage: vi.fn(),
    downloadImage: vi.fn(),
    extendTraces: vi.fn(),
    prependTraces: vi.fn(),
    addTraces: vi.fn(),
    deleteTraces: vi.fn(),
    moveTraces: vi.fn(),
    animate: vi.fn(),
    setPlotConfig: vi.fn(),
    validate: vi.fn(),
    d3: {
      select: vi.fn(),
      selectAll: vi.fn()
    }
  };
  return {
    __esModule: true,
    default: mockPlotly
  };
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';

import { AttachmentSetModalComponent } from './attachmentSetModal.component';
import { AttachmentService } from '@shared/catalog/services/attachment.service';
import type { DerivedSupportAttachmentFields } from '@shared/catalog/services/attachment.interfaces';
import { CatalogAttachment, Support, Section } from '@shared/domain';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';

// Mock plotly.js-dist-min to prevent errors in SupportPlotComponent
vi.mock('plotly.js-dist-min', () => ({
  __esModule: true,
  default: {
    purge: vi.fn(),
    newPlot: vi.fn(),
    restyle: vi.fn(),
    relayout: vi.fn()
  }
}));

describe('AttachmentSetModalComponent', () => {
  let component: AttachmentSetModalComponent;
  let fixture: ComponentFixture<AttachmentSetModalComponent>;
  let attachmentServiceMock: vi.Mocked<AttachmentService>;
  let workerPythonServiceMock: vi.Mocked<WorkerPythonService>;

  const mockAttachments: CatalogAttachment[] = [
    {
      uuid: '1',
      support_name: 'Support A',
      attachment_set: 1,
      support_order: 1,
      attachment_altitude: 10.5,
      cross_arm_length: 2.5,
      created_at: '2023-01-01',
      updated_at: '2023-01-01',
      support_tower: 'Tower Model'
    },
    {
      uuid: '2',
      support_name: 'Support A',
      attachment_set: 2,
      support_order: 2,
      attachment_altitude: 12.0,
      cross_arm_length: 3.0,
      created_at: '2023-01-01',
      updated_at: '2023-01-01',
      support_tower: 'Tower Model'
    },
    {
      uuid: '3',
      support_name: 'Support B',
      attachment_set: 1,
      support_order: 1,
      attachment_altitude: 8.5,
      cross_arm_length: 2.0,
      created_at: '2023-01-01',
      updated_at: '2023-01-01',
      support_tower: 'Tower Model'
    }
  ];

  const mockSupport: Support = {
    uuid: 'support-uuid',
    number: '1',
    name: 'Test Support',
    spanLength: 100.0,
    spanAngle: 0.0,
    attachmentSet: 1,
    attachmentHeight: 15.0,
    heightBelowConsole: 10.0,
    cableType: 'ACSR',
    armLength: 2.5,
    chainName: 'Chain A',
    chainLength: 5.0,
    chainWeight: 10.0,
    chainV: false,
    counterWeight: 100.0,
    supportFootAltitude: 100.0,
    chainSurface: 10.0,
    attachmentPosition: 'Position 1',
    towerModel: 'Tower Model',
    spanAzimut: null,
    xFootLambert93: null,
    yFootLambert93: null
  };

  const mockSection: Section = {
    uuid: 'section-uuid',
    internal_id: 'section-1',
    name: 'Test Section',
    short_name: 'TS',
    created_at: '2023-01-01',
    updated_at: '2023-01-01',
    internal_catalog_id: 'catalog-1',
    type: 'type-1',
    electric_phase_number: 3,
    cable_name: 'Cable A',
    cable_short_name: 'CA',
    cables_amount: 1,
    optical_fibers_amount: 0,
    spans_amount: 1,
    begin_span_name: 'span-1',
    last_span_name: 'span-1',
    first_support_number: 1,
    last_support_number: 1,
    first_attachment_set: '1',
    last_attachment_set: '1',
    regional_maintenance_center_names: [],
    maintenance_center_names: [],
    regional_team_id: undefined,
    maintenance_team_id: undefined,
    maintenance_center_id: undefined,
    link_name: undefined,
    lit_code: undefined,
    lit_name: undefined,
    branch_name: undefined,
    branch_idr: undefined,
    voltage_idr: undefined,
    comment: undefined,
    supports_comment: undefined,
    supports: [],
    obstacles: [],
    initial_conditions: [],
    selected_initial_condition_uuid: undefined,
    charges: [],
    selected_charge_uuid: null,
    field_measures: [],
    selected_field_measure_uuid: undefined,
    vtl_and_guying: undefined,
    cable_modifications: [],
    selected_cable_modification_uuid: null,
    cable_span_manipulations: [],
    selected_cable_span_manipulation_uuid: null,
    start_latitude: null,
    start_longitude: null,
    start_azimuth: null
  };

  beforeEach(async () => {
    attachmentServiceMock = {
      distinctSupportNames$: of(['Support A', 'Support B']),
      getAttachmentsBySupportName: vi
        .fn()
        .mockImplementation((name: string) => Promise.resolve(mockAttachments.filter((a) => a.support_name === name))),
      getAttachmentDetails: vi
        .fn()
        .mockImplementation((name: string, set: number) =>
          Promise.resolve(mockAttachments.find((a) => a.support_name === name && a.attachment_set === set))
        ),
      getDerivedSupportFields: vi.fn().mockImplementation((name: string, set: number) => {
        const detail = mockAttachments.find((a) => a.support_name === name && a.attachment_set === set);
        return Promise.resolve(
          detail
            ? {
                towerModel: detail.support_tower,
                armLength: detail.cross_arm_length,
                heightBelowConsole: detail.attachment_altitude
              }
            : undefined
        );
      }),
      // Mirrors the real wrapper: applies the (name, set) guard and delegates to getDerivedSupportFields
      // (returning its promise directly to preserve tick timing), so tests can keep asserting on it.
      resolveDerivedSupportFields: vi
        .fn()
        .mockImplementation((name: string | null | undefined, set: number | null | undefined) =>
          !name || set == null || set === 0
            ? Promise.resolve(undefined)
            : attachmentServiceMock.getDerivedSupportFields(name, set)
        )
    } as unknown as vi.Mocked<AttachmentService>;

    workerPythonServiceMock = {
      ready: true
    } as unknown as vi.Mocked<WorkerPythonService>;

    await TestBed.configureTestingModule({
      imports: [AttachmentSetModalComponent, BrowserAnimationsModule, FormsModule],
      providers: [
        {
          provide: AttachmentService,
          useValue: attachmentServiceMock
        },
        {
          provide: WorkerPythonService,
          useValue: workerPythonServiceMock
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AttachmentSetModalComponent);
    component = fixture.componentInstance;
    // Set required section input
    fixture.componentRef.setInput('section', mockSection);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.attachmentSet()).toBeUndefined();
    expect(component.supportName()).toBeUndefined();
    expect(component.armLength()).toBeUndefined();
    expect(component.heightBelowConsole()).toBeUndefined();
  });

  it('should load attachments on initialization', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.supportsFilterTable()).toEqual(['Support A', 'Support B']);
    // attachmentSetNumbers is populated by findCoordinates (effect), not getData()
    expect(component.attachmentSetNumbers()).toEqual([]);
  });

  it('should reset values when modal opens', async () => {
    // Set some initial values
    component.armLength.set(5);
    component.heightBelowConsole.set(10);
    component.attachmentSet.set(1);
    component.supportName.set('test');

    // Simulate modal opening by calling resetValues directly
    // resetValues() defaults to resetSupportName = false, so supportName is not reset
    component.resetValues(false);
    await fixture.whenStable();

    expect(component.armLength()).toBeUndefined();
    expect(component.heightBelowConsole()).toBeUndefined();
    expect(component.attachmentSet()).toBeUndefined();
    // supportName is not reset when resetSupportName is false (default)
    expect(component.supportName()).toBe('test');
  });

  it('should emit isOpenChange when visibility changes', () => {
    const spy = vi.spyOn(component.isOpenChange, 'emit');

    component.onVisibleChange();
    expect(spy).toHaveBeenCalledWith(false);
  });

  it('should reset attachment set numbers and coordinates when support name selection is cleared', async () => {
    // Pre-populate coordinates and attachmentSetNumbers as if findCoordinates ran
    component.coordinates.set([[1, 2, 3]]);
    component.attachmentSetNumbers.set([1, 2]);
    component.supportName.set('Support A');

    const event = { value: 'Support A' };
    await component.onAttachmentSelect(event, 'support_name');

    // getAttachmentsBySupportName is no longer called in onAttachmentSelect;
    // findCoordinates (triggered by the effect on supportName change) handles it
    expect(attachmentServiceMock.getAttachmentsBySupportName).not.toHaveBeenCalled();
    // attachmentSetValues are reset
    expect(component.attachmentSet()).toBeUndefined();
  });

  it('should set arm length and height when attachment set is selected', async () => {
    component.supportName.set('Support A');

    const event = { value: 1 };
    await component.onAttachmentSelect(event, 'attachment_set');

    expect(attachmentServiceMock.getDerivedSupportFields).toHaveBeenCalledWith('Support A', 1);
    expect(component.armLength()).toBe(2.5);
    expect(component.heightBelowConsole()).toBe(10.5);
  });

  it('should reset values when attachment selection is cleared', async () => {
    component.supportName.set('Support A');
    component.attachmentSet.set(1);
    component.armLength.set(2.5);
    component.heightBelowConsole.set(10.5);

    const event = { value: null };
    await component.onAttachmentSelect(event, 'attachment_set');

    expect(component.armLength()).toBeUndefined();
    expect(component.heightBelowConsole()).toBeUndefined();
    expect(component.attachmentSet()).toBeUndefined();
    // When clearing attachment_set, resetValues(false) is called, so supportName is not reset
    expect(component.supportName()).toBe('Support A');
  });

  it('should emit validateForm with support uuid when support is provided', () => {
    const spy = vi.spyOn(component.validateForm, 'emit');

    component.supportName.set('Support A');
    component.attachmentSet.set(1);
    component.armLength.set(2.5);
    component.heightBelowConsole.set(10.5);
    component.towerModel.set('Tower Model');

    // Mock the support input signal
    vi.spyOn(component, 'support').mockReturnValue(mockSupport);

    component.validate();

    expect(spy).toHaveBeenCalledWith({
      supportName: 'Support A',
      attachmentSet: 1,
      armLength: 2.5,
      heightBelowConsole: 10.5,
      uuid: 'support-uuid',
      towerModel: 'Tower Model'
    });
  });

  it('should handle empty values in validate method', () => {
    const spy = vi.spyOn(component.validateForm, 'emit');

    component.validate();

    expect(spy).toHaveBeenCalledWith({
      supportName: '',
      attachmentSet: 0,
      armLength: 0,
      heightBelowConsole: 0,
      uuid: '',
      towerModel: ''
    });
  });

  it('should not filter by attachment set if support name is not selected', async () => {
    const event = { value: 'Set 1' };
    await component.onAttachmentSelect(event, 'attachment_set');

    // Should not set arm length and height since no support name is selected
    expect(component.armLength()).toBeUndefined();
    expect(component.heightBelowConsole()).toBeUndefined();
  });

  it('should set supportName signal when support name is selected', async () => {
    const event = { value: 'Support A' };
    await component.onAttachmentSelect(event, 'support_name');

    expect(component.supportName()).toBe('Support A');
    expect(component.attachmentSet()).toBeUndefined();
  });

  it('should set attachmentSet signal when attachment set is selected', async () => {
    component.supportName.set('Support A');

    const event = { value: 2 };
    await component.onAttachmentSelect(event, 'attachment_set');

    expect(component.attachmentSet()).toBe(2);
  });

  describe('Effect: isOpen changes', () => {
    it('should reset values and set support properties when modal opens with full support', async () => {
      // Set initial values
      component.armLength.set(5);
      component.heightBelowConsole.set(10);
      component.attachmentSet.set(2);
      component.supportName.set('Old Name');
      component.towerModel.set('Old Model');

      // Set support input and open modal
      fixture.componentRef.setInput('support', mockSupport);
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();
      await fixture.whenStable();

      // Verify resetValues was called (values should be reset first)
      expect(component.supportName()).toBe('Test Support');
      expect(component.attachmentSet()).toBe(1);
      expect(component.armLength()).toBe(2.5);
      expect(component.heightBelowConsole()).toBe(10.0);
      expect(component.towerModel()).toBe('Tower Model');
    });

    it('should reset values and set support name when modal opens with support without attachmentSet', async () => {
      const supportWithoutAttachmentSet: Support = {
        ...mockSupport,
        attachmentSet: null
      };

      // Set initial values
      component.armLength.set(5);
      component.attachmentSet.set(2);

      // Set support input and open modal
      fixture.componentRef.setInput('support', supportWithoutAttachmentSet);
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();
      await fixture.whenStable();

      // Verify supportName is set but attachmentSet related values are not
      expect(component.supportName()).toBe('Test Support');
      expect(component.attachmentSet()).toBeUndefined();
      expect(component.armLength()).toBeUndefined();
      expect(component.heightBelowConsole()).toBeUndefined();
      expect(component.towerModel()).toBeUndefined();
    });

    it('should reset values when modal opens with support without name', async () => {
      const supportWithoutName: Support = {
        ...mockSupport,
        name: null
      };

      // Set initial values
      component.supportName.set('Old Name');
      component.attachmentSet.set(2);

      // Set support input and open modal
      fixture.componentRef.setInput('support', supportWithoutName);
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();
      await fixture.whenStable();

      // Verify supportName is not set (resetValues(true) clears it)
      expect(component.supportName()).toBeUndefined();
      expect(component.attachmentSet()).toBe(1);
      expect(component.armLength()).toBe(2.5);
      expect(component.heightBelowConsole()).toBe(10.0);
      expect(component.towerModel()).toBe('Tower Model');
    });

    it('should reset values when modal opens without support', async () => {
      // Set initial values
      component.armLength.set(5);
      component.supportName.set('Old Name');

      // Open modal without support
      fixture.componentRef.setInput('support', undefined);
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();
      await fixture.whenStable();

      // Verify values are reset but nothing is set from support
      expect(component.supportName()).toBeUndefined();
      expect(component.attachmentSet()).toBeUndefined();
      expect(component.armLength()).toBeUndefined();
      expect(component.heightBelowConsole()).toBeUndefined();
      expect(component.towerModel()).toBeUndefined();
    });

    it('backfills all catalog-derived fields when the support has an attachment set but is missing them (regression #657)', async () => {
      // A support whose name + set exist in the catalog, but whose derived fields were
      // never resolved (e.g. set via inline edit / column copy before this fix).
      const supportMissingDerived: Support = {
        ...mockSupport,
        name: 'Support A',
        attachmentSet: 1,
        armLength: null,
        heightBelowConsole: null,
        towerModel: null
      };

      fixture.componentRef.setInput('support', supportMissingDerived);
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();
      await fixture.whenStable();

      // All three derived fields are resolved together (not just the tower), so validate()
      // cannot emit 0 for arm length / height below console.
      expect(attachmentServiceMock.getDerivedSupportFields).toHaveBeenCalledWith('Support A', 1);
      expect(component.armLength()).toBe(2.5);
      expect(component.heightBelowConsole()).toBe(10.5);
      expect(component.towerModel()).toBe('Tower Model');
    });

    it('keeps the existing derived values without a catalog lookup when the support already has them', async () => {
      // mockSupport already carries armLength, heightBelowConsole and towerModel.
      fixture.componentRef.setInput('support', mockSupport);
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(attachmentServiceMock.getDerivedSupportFields).not.toHaveBeenCalled();
      expect(component.armLength()).toBe(2.5);
      expect(component.heightBelowConsole()).toBe(10.0);
      expect(component.towerModel()).toBe('Tower Model');
    });

    it('discards an in-flight backfill when reopened for another support that starts no new backfill', async () => {
      // Support A is missing its derived fields, so opening starts a backfill we keep pending.
      let resolveA!: (value: DerivedSupportAttachmentFields) => void;
      attachmentServiceMock.getDerivedSupportFields.mockReturnValueOnce(
        new Promise<DerivedSupportAttachmentFields>((resolve) => {
          resolveA = resolve;
        })
      );

      const supportAMissing: Support = {
        ...mockSupport,
        name: 'Support A',
        attachmentSet: 1,
        armLength: null,
        heightBelowConsole: null,
        towerModel: null
      };
      fixture.componentRef.setInput('support', supportAMissing);
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();
      await fixture.whenStable();

      // Reopen for a support WITHOUT an attachment set: no new backfill is started, so the open
      // itself must invalidate A's lookup (the inner emptiness guards alone would not).
      const supportBNoSet: Support = { ...mockSupport, name: 'Support B', attachmentSet: null };
      fixture.componentRef.setInput('isOpen', false);
      fixture.detectChanges();
      fixture.componentRef.setInput('support', supportBNoSet);
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();
      await fixture.whenStable();

      // A's lookup resolves late with A's data.
      resolveA({ towerModel: 'Tower-A', armLength: 1.1, heightBelowConsole: 2.2 });
      await fixture.whenStable();

      // B has no attachment set, so its derived fields must stay empty — not be filled with A's.
      expect(component.armLength()).toBeUndefined();
      expect(component.heightBelowConsole()).toBeUndefined();
      expect(component.towerModel()).toBeUndefined();
    });

    it('discards an in-flight open backfill when the user selects a different attachment set first', async () => {
      // The open-effect backfill stays pending; the later user selection resolves with set-2 data
      // that has no tower, leaving towerModel empty.
      let resolveBackfill!: (value: DerivedSupportAttachmentFields) => void;
      attachmentServiceMock.getDerivedSupportFields
        .mockReturnValueOnce(
          new Promise((resolve) => {
            resolveBackfill = resolve;
          })
        )
        .mockResolvedValue({ towerModel: null, armLength: 7.7, heightBelowConsole: 8.8 });

      const supportMissing: Support = {
        ...mockSupport,
        name: 'Support A',
        attachmentSet: 1,
        armLength: null,
        heightBelowConsole: null,
        towerModel: null
      };
      fixture.componentRef.setInput('support', supportMissing);
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();
      await fixture.whenStable();

      // User picks a different attachment set before the open backfill resolves.
      await component.onAttachmentSelect({ value: 2 }, 'attachment_set');
      expect(component.armLength()).toBe(7.7);
      expect(component.towerModel()).toBeUndefined();

      // The original (set 1) backfill resolves late.
      resolveBackfill({ towerModel: 'Tower-1', armLength: 1.1, heightBelowConsole: 2.2 });
      await fixture.whenStable();

      // The set-2 selection wins; the stale set-1 backfill must not fill the empty tower.
      expect(component.armLength()).toBe(7.7);
      expect(component.heightBelowConsole()).toBe(8.8);
      expect(component.towerModel()).toBeUndefined();
    });

    it('should not run effect when modal is closed', async () => {
      // Set initial values
      component.armLength.set(5);
      component.supportName.set('Old Name');

      // Set support but keep modal closed
      fixture.componentRef.setInput('support', mockSupport);
      fixture.componentRef.setInput('isOpen', false);
      fixture.detectChanges();
      await fixture.whenStable();

      // Verify values are not changed (effect only runs when isOpen is true)
      expect(component.supportName()).toBe('Old Name');
      expect(component.armLength()).toBe(5);
    });
  });

  describe('HTML rendering', () => {
    const getByTestId = (testId: string): HTMLElement | null =>
      fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);
    const getByTestIdInBody = (testId: string): HTMLElement | null =>
      document.querySelector(`[data-testid="${testId}"]`);

    it('should render attachment-set-dialog', () => {
      expect(getByTestId('attachment-set-dialog')).toBeTruthy();
    });

    describe('when dialog is open', () => {
      beforeEach(() => {
        fixture.componentRef.setInput('isOpen', true);
        fixture.detectChanges();
      });

      it('should render support-name-select', () => {
        expect(getByTestIdInBody('support-name-select')).toBeTruthy();
      });

      it('should render attachment-set-select', () => {
        expect(getByTestIdInBody('attachment-set-select')).toBeTruthy();
      });

      it('should render close-btn', () => {
        const el = getByTestIdInBody('close-btn');
        expect(el).toBeTruthy();
        expect(el?.tagName).toBe('BUTTON');
      });

      it('should render validate-btn', () => {
        const el = getByTestIdInBody('validate-btn');
        expect(el).toBeTruthy();
        expect(el?.tagName).toBe('BUTTON');
      });
    });
  });
});
