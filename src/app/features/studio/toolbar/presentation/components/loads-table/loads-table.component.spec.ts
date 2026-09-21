import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { LoadsTableComponent } from './loads-table.component';
import { ToolbarDialogService } from '../../services/toolbar-dialog.service';
import { ChargesService } from '@services/charges/charges.service';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { Charge, Section, Study } from '@shared/domain';
import { LoadType, SymmetryType } from '@shared/domain/models/charge.model';
import { Support } from '@shared/domain/models/support.model';
import { LoadsReportService } from '../../services/loads-data-report/loads-data-report.service';

describe('LoadsTableComponent', () => {
  let component: LoadsTableComponent;
  let fixture: ComponentFixture<LoadsTableComponent>;
  let mockToolbarDialogService: Partial<ToolbarDialogService>;
  let mockChargesService: Partial<ChargesService>;
  let mockPlotService: Partial<PlotService>;
  let mockSpanService: { section: ReturnType<typeof signal<Section | null>> };
  let mockLoadsReportService: Partial<LoadsReportService>;

  const mockSupports: Support[] = [
    {
      uuid: 'support-uuid-1',
      number: '1',
      name: 'S1',
      spanLength: 100,
      spanAngle: 0,
      attachmentSet: 1,
      attachmentHeight: 10,
      heightBelowConsole: 5,
      towerModel: null,
      cableType: null,
      armLength: null,
      chainName: null,
      chainLength: null,
      chainWeight: null,
      chainV: null,
      counterWeight: null,
      supportFootAltitude: null,
      attachmentPosition: null,
      chainSurface: null,
      spanAzimut: null,
      footLongitude: null,
      footLatitude: null
    },
    {
      uuid: 'support-uuid-2',
      number: '2',
      name: 'S2',
      spanLength: 150,
      spanAngle: 0,
      attachmentSet: 1,
      attachmentHeight: 12,
      heightBelowConsole: 6,
      towerModel: null,
      cableType: null,
      armLength: null,
      chainName: null,
      chainLength: null,
      chainWeight: null,
      chainV: null,
      counterWeight: null,
      supportFootAltitude: null,
      attachmentPosition: null,
      chainSurface: null,
      spanAzimut: null,
      footLongitude: null,
      footLatitude: null
    },
    {
      uuid: 'support-uuid-3',
      number: '3',
      name: 'S3',
      spanLength: 120,
      spanAngle: 0,
      attachmentSet: 1,
      attachmentHeight: 11,
      heightBelowConsole: 5,
      towerModel: null,
      cableType: null,
      armLength: null,
      chainName: null,
      chainLength: null,
      chainWeight: null,
      chainV: null,
      counterWeight: null,
      supportFootAltitude: null,
      attachmentPosition: null,
      chainSurface: null,
      spanAzimut: null,
      footLongitude: null,
      footLatitude: null
    }
  ];

  const mockCharge: Charge = {
    uuid: 'charge-uuid-1',
    name: 'Test Charge',
    personnelPresence: true,
    description: 'Test description',
    data: {
      climate: {
        windPressure: 240,
        cableTemperature: 15,
        symmetryType: SymmetryType.SYMMETRIC,
        iceThickness: 2,
        frontierSupportNumber: null,
        iceThicknessBefore: null,
        iceThicknessAfter: null
      },
      spanLoads: [
        {
          loadPosition: 50,
          loadWeight: 100,
          type: LoadType.PUNCTUAL,
          supportUuid: 'support-uuid-1',
          referenceSupport: 'LEFT'
        },
        {
          loadPosition: 75,
          loadWeight: 200,
          type: LoadType.MARKING,
          supportUuid: 'support-uuid-2',
          referenceSupport: 'RIGHT'
        }
      ],
      cableModifParams: []
    }
  };

  const mockStudy: Study = {
    uuid: 'study-uuid',
    author_email: 'test@example.com',
    title: 'Test Study',
    description: 'Test description',
    shareable: false,
    created_at_offline: '2023-01-01',
    updated_at_offline: '2023-01-01',
    saved: true,
    sections: []
  };

  const mockSection: Section = {
    uuid: 'section-uuid',
    internal_id: 'int1',
    name: 'Test section',
    short_name: 'TS',
    created_at: 'created date',
    updated_at: 'updated date',
    internal_catalog_id: 'dont know',
    type: 'electric',
    electric_phase_number: 3,
    cable_name: 'cable1',
    cable_short_name: 'cb',
    cables_amount: 2,
    optical_fibers_amount: 0,
    spans_amount: 0,
    begin_span_name: '',
    last_span_name: '',
    first_support_number: 0,
    last_support_number: 0,
    first_attachment_set: '',
    last_attachment_set: '',
    regional_team_id: undefined,
    maintenance_team_id: undefined,
    maintenance_center_id: undefined,
    link_idr: undefined,
    link_adr: undefined,
    lit_idr: undefined,
    lit_adr: undefined,
    branch_adr: undefined,
    branch_idr: undefined,
    voltage_idr: undefined,
    voltage_adr: undefined,
    cm_designation: undefined,
    gmr_designation: undefined,
    eel_designation: undefined,
    comment: undefined,
    supports_comment: undefined,
    supports: mockSupports,
    obstacles: [],
    initial_conditions: [],
    selected_initial_condition_uuid: undefined,
    charges: [mockCharge],
    selected_charge_uuid: 'charge-uuid-1',
    field_measures: [],
    selected_field_measure_uuid: undefined,
    vtl_and_guying: undefined,
    cable_modifications: [],
    selected_cable_modification_uuid: null,
    cable_span_manipulations: [],
    selected_cable_span_manipulation_uuid: null,
    start_latitude: null,
    start_longitude: null,
    start_azimuth: null,
    mean_reprojection_diff_meters: null
  };

  beforeEach(async () => {
    mockToolbarDialogService = {
      isOpen: signal(false),
      phase: signal('main' as const),
      currentTool: signal(null),
      loadTableContext: signal(null),
      setTemplates: vi.fn(),
      closeTool: vi.fn()
    };

    mockChargesService = {
      getCharge: vi.fn().mockResolvedValue(mockCharge),
      createOrUpdateCharge: vi.fn().mockResolvedValue(undefined),
      deleteCharge: vi.fn().mockResolvedValue(undefined),
      duplicateChargeWithoutSelecting: vi.fn().mockResolvedValue({ ...mockCharge, uuid: 'new-charge-uuid' })
    };

    mockPlotService = {
      study: signal<Study | null>(mockStudy)
    };

    mockSpanService = {
      section: signal<Section | null>(mockSection)
    };

    mockLoadsReportService = {
      generateReport: vi.fn().mockResolvedValue(undefined)
    };

    await TestBed.configureTestingModule({
      imports: [
        LoadsTableComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              'studio.loads-table.symmetric-label': 'Symmetric',
              'studio.loads-table.dis-symmetric-label': 'Dis Symmetric',
              'studio.loads-table.punctual-load-label': 'Punctual load',
              'studio.loads-table.marking-label': 'Marking',
              'shared.studio.cable-mod-lengthening': 'Lengthening',
              'shared.studio.cable-mod-shortening': 'Shortening',
              'loads.cable-support-manip.crane-handling-option': 'Crane handling',
              'loads.cable-support-manip.rope-handling-option': 'Rope handling',
              'loads.cable-support-manip.shifting-option': 'Shifting',
              'loads.cable-support-manip.without-chain-option': 'Without chain',
              'loads.shared.with-chain-option': 'With chain',
              'loads.cable-span-manip.with-a-crane-option': 'With a crane',
              'loads.cable-span-manip.temporary-support-option': 'Temporary support',
              'loads.cable-span-manip.clamp-option': 'Clamp',
              'loads.cable-span-manip.pulley-option': 'Pulley',
              'loads.cable-span-manip.with-sling-option': 'With sling'
            }
          },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' }
        })
      ],
      providers: [
        { provide: ToolbarDialogService, useValue: mockToolbarDialogService },
        { provide: ChargesService, useValue: mockChargesService },
        { provide: PlotService, useValue: mockPlotService },
        { provide: PlotSpanService, useValue: mockSpanService },
        { provide: LoadsReportService, useValue: mockLoadsReportService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoadsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      expect(component.mode()).toBe('view');
      expect(component.name()).toBe('');
      expect(component.personnelPresence()).toBe(false);
      expect(component.description()).toBe('');
      expect(component.chargeUuid()).toBeNull();
    });

    it('should initialize climate as null', () => {
      expect(component.climate()).toBeNull();
    });

    it('should initialize spanLoads as empty array', () => {
      expect(component.spanLoads()).toEqual([]);
    });

    it('should initialize climateRows as empty array', () => {
      expect(component.climateRows()).toEqual([]);
    });

    it('should initialize spanLoadRows as empty array', () => {
      expect(component.spanLoadRows()).toEqual([]);
    });

    it('should compute nameLength correctly', () => {
      component.updateName('Test');
      expect(component.nameLength()).toBe(4);
    });

    it('should compute descriptionLength correctly', () => {
      component.updateDescription('Test description');
      expect(component.descriptionLength()).toBe(16);
    });
  });

  describe('update methods', () => {
    it('should update name', () => {
      component.updateName('New Name');
      expect(component.name()).toBe('New Name');
    });

    it('should update description', () => {
      component.updateDescription('New Description');
      expect(component.description()).toBe('New Description');
    });

    it('should update personnel presence', () => {
      component.updatePersonnelPresence(true);
      expect(component.personnelPresence()).toBe(true);
    });
  });

  describe('mode switching', () => {
    it('should switch to edit mode', () => {
      component.switchToEditMode();
      expect(component.mode()).toBe('edit');
    });

    it('should cancel edit and return to view mode', () => {
      component.chargeUuid.set('charge-uuid-1');
      component.switchToEditMode();
      expect(component.mode()).toBe('edit');

      component.cancelEdit();
      expect(component.mode()).toBe('view');
      expect(mockChargesService.getCharge).toHaveBeenCalled();
    });
  });

  describe('saveChanges', () => {
    it('should save changes and return to view mode', async () => {
      component.chargeUuid.set('charge-uuid-1');
      component.updateName('Updated Name');
      component.updatePersonnelPresence(false);
      component.updateDescription('Updated Description');
      component.switchToEditMode();

      await component.saveChanges();

      expect(mockChargesService.createOrUpdateCharge).toHaveBeenCalledWith(
        'study-uuid',
        'section-uuid',
        expect.objectContaining({
          name: 'Updated Name',
          personnelPresence: false,
          description: 'Updated Description'
        })
      );
      expect(component.mode()).toBe('view');
    });

    it('should not save if study uuid is missing', async () => {
      mockPlotService.study!.set(null);
      component.chargeUuid.set('charge-uuid-1');

      await component.saveChanges();

      expect(mockChargesService.createOrUpdateCharge).not.toHaveBeenCalled();
    });

    it('should not save if section uuid is missing', async () => {
      mockSpanService.section.set(null);
      component.chargeUuid.set('charge-uuid-1');

      await component.saveChanges();

      expect(mockChargesService.createOrUpdateCharge).not.toHaveBeenCalled();
    });

    it('should not save if charge uuid is missing', async () => {
      component.chargeUuid.set(null);

      await component.saveChanges();

      expect(mockChargesService.createOrUpdateCharge).not.toHaveBeenCalled();
    });

    it('should not save if existing charge is not found', async () => {
      (mockChargesService.getCharge as vi.Mock).mockResolvedValue(null);
      component.chargeUuid.set('charge-uuid-1');

      await component.saveChanges();

      expect(mockChargesService.createOrUpdateCharge).not.toHaveBeenCalled();
    });
  });

  describe('climate and span loads data loading', () => {
    it('should populate climate signal after loading charge data', async () => {
      mockToolbarDialogService.isOpen!.set(true);
      mockToolbarDialogService.currentTool!.set('load-table');
      mockToolbarDialogService.loadTableContext!.set({
        mode: 'view',
        chargeUuid: 'charge-uuid-1'
      });

      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.climate()).toEqual(mockCharge.data.climate);
    });

    it('should populate spanLoads signal after loading charge data', async () => {
      mockToolbarDialogService.isOpen!.set(true);
      mockToolbarDialogService.currentTool!.set('load-table');
      mockToolbarDialogService.loadTableContext!.set({
        mode: 'view',
        chargeUuid: 'charge-uuid-1'
      });

      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.spanLoads()).toEqual(mockCharge.data.spanLoads);
    });

    it('should populate cableModifParams signal after loading charge data', async () => {
      mockToolbarDialogService.isOpen!.set(true);
      mockToolbarDialogService.currentTool!.set('load-table');
      mockToolbarDialogService.loadTableContext!.set({
        mode: 'view',
        chargeUuid: 'charge-uuid-1'
      });

      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.cableModifParams()).toEqual(mockCharge.data.cableModifParams);
    });

    it('should populate supportManips signal filtered by the viewed charge uuid', async () => {
      mockSpanService.section.set({
        ...mockSection,
        cable_support_manipulations: [
          {
            uuid: 'manip-uuid-1',
            supportUuid: 'support-uuid-1',
            chargeUuid: 'charge-uuid-1',
            manip1: {
              type: 'shifting',
              vertDisplacement: null,
              anchoring: null,
              lateralDistance: null,
              ropeLength: null,
              shiftingClampLength: 2,
              chainName: null,
              chainLength: null,
              chainWeight: null,
              chainSurface: null,
              counterWeight: null
            },
            manip2: null
          },
          {
            uuid: 'manip-uuid-2',
            supportUuid: 'support-uuid-2',
            chargeUuid: 'other-charge-uuid',
            manip1: {
              type: 'rope',
              vertDisplacement: null,
              anchoring: null,
              lateralDistance: null,
              ropeLength: 4,
              shiftingClampLength: null,
              chainName: null,
              chainLength: null,
              chainWeight: null,
              chainSurface: null,
              counterWeight: null
            },
            manip2: null
          }
        ]
      });

      mockToolbarDialogService.isOpen!.set(true);
      mockToolbarDialogService.currentTool!.set('load-table');
      mockToolbarDialogService.loadTableContext!.set({
        mode: 'view',
        chargeUuid: 'charge-uuid-1'
      });

      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.supportManips()).toHaveLength(1);
      expect(component.supportManips()[0].uuid).toBe('manip-uuid-1');
    });

    it('should populate spanManips signal filtered by the viewed charge uuid', async () => {
      mockSpanService.section.set({
        ...mockSection,
        cable_span_manipulations: [
          {
            uuid: 'span-manip-uuid-1',
            spanUuid: 'support-uuid-1',
            chargeUuid: 'charge-uuid-1',
            referenceSupport: 'LEFT',
            distanceToRefSupport: 10,
            cableManipType: 'with_a_crane',
            cableManipMethod: 'clamp',
            longitudinalDistance: null,
            lateralDistance: 1,
            altitude: 2,
            anchoring: 'with_sling',
            chainName: null,
            chainLength: null,
            chainWeight: null,
            chainSurface: null,
            counterWeight: null,
            slingLength: 5
          },
          {
            uuid: 'span-manip-uuid-2',
            spanUuid: 'support-uuid-2',
            chargeUuid: 'other-charge-uuid',
            referenceSupport: 'LEFT',
            distanceToRefSupport: 10,
            cableManipType: 'with_a_crane',
            cableManipMethod: 'clamp',
            longitudinalDistance: null,
            lateralDistance: 1,
            altitude: 2,
            anchoring: 'with_sling',
            chainName: null,
            chainLength: null,
            chainWeight: null,
            chainSurface: null,
            counterWeight: null,
            slingLength: 5
          }
        ]
      });

      mockToolbarDialogService.isOpen!.set(true);
      mockToolbarDialogService.currentTool!.set('load-table');
      mockToolbarDialogService.loadTableContext!.set({
        mode: 'view',
        chargeUuid: 'charge-uuid-1'
      });

      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.spanManips()).toHaveLength(1);
      expect(component.spanManips()[0].uuid).toBe('span-manip-uuid-1');
    });

    it('should handle null charge data gracefully', async () => {
      (mockChargesService.getCharge as vi.Mock).mockResolvedValue({
        ...mockCharge,
        data: undefined
      });

      mockToolbarDialogService.isOpen!.set(true);
      mockToolbarDialogService.currentTool!.set('load-table');
      mockToolbarDialogService.loadTableContext!.set({
        mode: 'view',
        chargeUuid: 'charge-uuid-1'
      });

      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.climate()).toBeNull();
      expect(component.spanLoads()).toEqual([]);
    });
  });

  describe('climateRows', () => {
    it('should return empty array when climate is null', () => {
      component.climate.set(null);
      expect(component.climateRows()).toEqual([]);
    });

    it('should return single-element array when climate data is present', () => {
      component.climate.set(mockCharge.data.climate);

      const rows = component.climateRows();
      expect(rows).toHaveLength(1);
      expect(rows[0].windPressure).toBe(240);
      expect(rows[0].cableTemperature).toBe(15);
      expect(rows[0].symmetryType).toBe(SymmetryType.SYMMETRIC);
      expect(rows[0].iceThickness).toBe(2);
    });
  });

  describe('spanLoadRows', () => {
    it('should return empty array when spanLoads is empty', () => {
      component.spanLoads.set([]);
      expect(component.spanLoadRows()).toEqual([]);
    });

    it('should compute spanLoadRows with resolved span labels', () => {
      component.spanLoads.set(mockCharge.data.spanLoads);

      const rows = component.spanLoadRows();
      expect(rows).toHaveLength(2);
      expect(rows[0].spanLabel).toBe('1 - 2');
      expect(rows[0].referenceSupport).toBe('1');
      expect(rows[0].type).toBe(LoadType.PUNCTUAL);
      expect(rows[0].loadWeight).toBe(100);
      expect(rows[0].loadPosition).toBe(50);
      expect(rows[1].spanLabel).toBe('2 - 3');
      expect(rows[1].referenceSupport).toBe('3');
      expect(rows[1].type).toBe(LoadType.MARKING);
    });

    it('should show dash for unknown supportUuid in span label', () => {
      component.spanLoads.set([
        {
          loadPosition: 10,
          loadWeight: 50,
          type: LoadType.PUNCTUAL,
          supportUuid: 'unknown-uuid',
          referenceSupport: 'LEFT'
        }
      ]);

      const rows = component.spanLoadRows();
      expect(rows[0].spanLabel).toBe('-');
    });

    it('should show dash when supportUuid references the last support', () => {
      component.spanLoads.set([
        {
          loadPosition: 10,
          loadWeight: 50,
          type: LoadType.PUNCTUAL,
          supportUuid: 'support-uuid-3',
          referenceSupport: 'LEFT'
        }
      ]);

      const rows = component.spanLoadRows();
      expect(rows[0].spanLabel).toBe('-');
    });

    it('should filter out punctual loads with zero weight and zero position', () => {
      component.spanLoads.set([
        {
          loadPosition: 0,
          loadWeight: 0,
          type: LoadType.PUNCTUAL,
          supportUuid: 'support-uuid-1',
          referenceSupport: 'LEFT'
        }
      ]);

      expect(component.spanLoadRows()).toEqual([]);
    });

    it('should keep punctual load when loadWeight is non-zero even if position is zero', () => {
      component.spanLoads.set([
        {
          loadPosition: 0,
          loadWeight: 100,
          type: LoadType.PUNCTUAL,
          supportUuid: 'support-uuid-1',
          referenceSupport: 'LEFT'
        }
      ]);

      const rows = component.spanLoadRows();
      expect(rows).toHaveLength(1);
      expect(rows[0].loadWeight).toBe(100);
    });

    it('should keep punctual load when loadPosition is non-zero even if weight is zero', () => {
      component.spanLoads.set([
        {
          loadPosition: 50,
          loadWeight: 0,
          type: LoadType.PUNCTUAL,
          supportUuid: 'support-uuid-1',
          referenceSupport: 'LEFT'
        }
      ]);

      const rows = component.spanLoadRows();
      expect(rows).toHaveLength(1);
      expect(rows[0].loadPosition).toBe(50);
    });

    it('should filter out marking loads with zero position', () => {
      component.spanLoads.set([
        {
          loadPosition: 0,
          loadWeight: 0,
          type: LoadType.MARKING,
          supportUuid: 'support-uuid-1',
          referenceSupport: 'LEFT'
        }
      ]);

      expect(component.spanLoadRows()).toEqual([]);
    });

    it('should keep marking loads when loadPosition is non-zero', () => {
      component.spanLoads.set([
        {
          loadPosition: 30,
          loadWeight: 0,
          type: LoadType.MARKING,
          supportUuid: 'support-uuid-1',
          referenceSupport: 'LEFT'
        }
      ]);

      const rows = component.spanLoadRows();
      expect(rows).toHaveLength(1);
      expect(rows[0].loadPosition).toBe(30);
    });
  });

  describe('cableModifRows', () => {
    it('should return empty array when cableModifParams is empty', () => {
      component.cableModifParams.set([]);
      expect(component.cableModifRows()).toEqual([]);
    });

    it('should compute cableModifRows with resolved span/support labels', () => {
      component.cableModifParams.set([
        {
          uuid: 'modif-uuid-1',
          spanUuid: 'support-uuid-1',
          supportRef: 'LEFT',
          modificationType: 'lengthening',
          modifiedLengthCable: 3.5,
          distanceSupportRef: 12.2
        }
      ]);

      const rows = component.cableModifRows();
      expect(rows).toHaveLength(1);
      expect(rows[0].spanLabel).toBe('1 - 2');
      expect(rows[0].referenceSupport).toBe('1');
      expect(rows[0].modificationType).toBe('lengthening');
      expect(rows[0].modifiedLengthCable).toBe(3.5);
      expect(rows[0].distanceSupportRef).toBe(12.2);
    });
  });

  describe('supportManipRows', () => {
    it('should return empty array when supportManips is empty', () => {
      component.supportManips.set([]);
      expect(component.supportManipRows()).toEqual([]);
    });

    it('should produce a single row when manip2 is null', () => {
      component.supportManips.set([
        {
          uuid: 'manip-uuid-1',
          supportUuid: 'support-uuid-1',
          chargeUuid: 'charge-uuid-1',
          manip1: {
            type: 'shifting',
            vertDisplacement: null,
            anchoring: null,
            lateralDistance: null,
            ropeLength: null,
            shiftingClampLength: 2.5,
            chainName: null,
            chainLength: null,
            chainWeight: null,
            chainSurface: null,
            counterWeight: null
          },
          manip2: null
        }
      ]);

      const rows = component.supportManipRows();
      expect(rows).toHaveLength(1);
      expect(rows[0].displayIndex).toBe(1);
      expect(rows[0].supportLabel).toBe('1');
      expect(rows[0].type).toBe('shifting');
      expect(rows[0].shiftingClampLength).toBe(2.5);
    });

    it('should produce two rows when manip2 is present, with displayIndex null on the second', () => {
      component.supportManips.set([
        {
          uuid: 'manip-uuid-1',
          supportUuid: 'support-uuid-1',
          chargeUuid: 'charge-uuid-1',
          manip1: {
            type: 'crane',
            vertDisplacement: 1.2,
            anchoring: 'with_chain',
            lateralDistance: 0.5,
            ropeLength: null,
            shiftingClampLength: null,
            chainName: 'Chain A',
            chainLength: 3,
            chainWeight: 10,
            chainSurface: 0.2,
            counterWeight: 15
          },
          manip2: {
            type: 'shifting',
            vertDisplacement: null,
            anchoring: null,
            lateralDistance: null,
            ropeLength: null,
            shiftingClampLength: 1.5,
            chainName: null,
            chainLength: null,
            chainWeight: null,
            chainSurface: null,
            counterWeight: null
          }
        }
      ]);

      const rows = component.supportManipRows();
      expect(rows).toHaveLength(2);
      expect(rows[0].displayIndex).toBe(1);
      expect(rows[0].type).toBe('crane');
      expect(rows[0].anchoring).toBe('with_chain');
      expect(rows[1].displayIndex).toBeNull();
      expect(rows[1].supportLabel).toBe(rows[0].supportLabel);
      expect(rows[1].type).toBe('shifting');
    });
  });

  describe('spanManipRows', () => {
    it('should return empty array when spanManips is empty', () => {
      component.spanManips.set([]);
      expect(component.spanManipRows()).toEqual([]);
    });

    it('should compute spanManipRows with resolved span/support labels', () => {
      component.spanManips.set([
        {
          uuid: 'span-manip-uuid-1',
          spanUuid: 'support-uuid-1',
          chargeUuid: 'charge-uuid-1',
          referenceSupport: 'LEFT',
          distanceToRefSupport: 20,
          cableManipType: 'with_a_crane',
          cableManipMethod: 'clamp',
          longitudinalDistance: 1,
          lateralDistance: 2,
          altitude: 3,
          anchoring: 'with_sling',
          chainName: null,
          chainLength: null,
          chainWeight: null,
          chainSurface: null,
          counterWeight: null,
          slingLength: 5
        }
      ]);

      const rows = component.spanManipRows();
      expect(rows).toHaveLength(1);
      expect(rows[0].spanLabel).toBe('1 - 2');
      expect(rows[0].referenceSupport).toBe('1');
      expect(rows[0].distanceToRefSupport).toBe(20);
      expect(rows[0].cableManipType).toBe('with_a_crane');
      expect(rows[0].cableManipMethod).toBe('clamp');
      expect(rows[0].anchoring).toBe('with_sling');
      expect(rows[0].slingLength).toBe(5);
      expect(rows[0].chainName).toBeNull();
    });
  });

  describe('getSymmetryLabel', () => {
    it('should return Symmetric for SYMMETRIC type', () => {
      expect(component.getSymmetryLabel(SymmetryType.SYMMETRIC)).toBe('Symmetric');
    });

    it('should return Dis Symmetric for DIS_SYMMETRIC type', () => {
      expect(component.getSymmetryLabel(SymmetryType.DIS_SYMMETRIC)).toBe('Dis Symmetric');
    });
  });

  describe('getLoadTypeLabel', () => {
    it('should return Punctual for PUNCTUAL type', () => {
      expect(component.getLoadTypeLabel(LoadType.PUNCTUAL)).toBe('Punctual load');
    });

    it('should return Marking for MARKING type', () => {
      expect(component.getLoadTypeLabel(LoadType.MARKING)).toBe('Marking');
    });

    it('should return raw value for unknown type', () => {
      expect(component.getLoadTypeLabel('unknown')).toBe('unknown');
    });
  });

  describe('getModificationTypeLabel', () => {
    it('should return Lengthening for lengthening type', () => {
      expect(component.getModificationTypeLabel('lengthening')).toBe('Lengthening');
    });

    it('should return Shortening for shortening type', () => {
      expect(component.getModificationTypeLabel('shortening')).toBe('Shortening');
    });
  });

  describe('getSupportManipTypeLabel', () => {
    it('should return Crane handling for crane type', () => {
      expect(component.getSupportManipTypeLabel('crane')).toBe('Crane handling');
    });

    it('should return Rope handling for rope type', () => {
      expect(component.getSupportManipTypeLabel('rope')).toBe('Rope handling');
    });

    it('should return Shifting for shifting type', () => {
      expect(component.getSupportManipTypeLabel('shifting')).toBe('Shifting');
    });
  });

  describe('getSupportAnchoringLabel', () => {
    it('should return Without chain for without_chain', () => {
      expect(component.getSupportAnchoringLabel('without_chain')).toBe('Without chain');
    });

    it('should return With chain for with_chain', () => {
      expect(component.getSupportAnchoringLabel('with_chain')).toBe('With chain');
    });

    it('should return dash for null anchoring', () => {
      expect(component.getSupportAnchoringLabel(null)).toBe('-');
    });
  });

  describe('getCableManipTypeLabel', () => {
    it('should return With a crane for with_a_crane', () => {
      expect(component.getCableManipTypeLabel('with_a_crane')).toBe('With a crane');
    });

    it('should return Temporary support for temporary_support', () => {
      expect(component.getCableManipTypeLabel('temporary_support')).toBe('Temporary support');
    });
  });

  describe('getCableManipMethodLabel', () => {
    it('should return Clamp for clamp', () => {
      expect(component.getCableManipMethodLabel('clamp')).toBe('Clamp');
    });

    it('should return Pulley for pulley', () => {
      expect(component.getCableManipMethodLabel('pulley')).toBe('Pulley');
    });
  });

  describe('getSpanAnchoringLabel', () => {
    it('should return With sling for with_sling', () => {
      expect(component.getSpanAnchoringLabel('with_sling')).toBe('With sling');
    });

    it('should return With chain for with_chain', () => {
      expect(component.getSpanAnchoringLabel('with_chain')).toBe('With chain');
    });
  });

  describe('deleteChargeCase', () => {
    it('should call ChargesService.deleteCharge with the correct uuids and close the tool', async () => {
      component.chargeUuid.set('charge-uuid-1');

      await component.deleteChargeCase();

      expect(mockChargesService.deleteCharge).toHaveBeenCalledWith('study-uuid', 'section-uuid', 'charge-uuid-1');
      expect(mockToolbarDialogService.closeTool).toHaveBeenCalled();
    });

    it('should not call deleteCharge when chargeUuid is null', async () => {
      component.chargeUuid.set(null);

      await component.deleteChargeCase();

      expect(mockChargesService.deleteCharge).not.toHaveBeenCalled();
    });
  });

  describe('onGenerateReport', () => {
    beforeEach(() => {
      component.chargeUuid.set('charge-uuid-1');
      component.name.set('Test Charge');
      component.description.set('Test description');
      component.personnelPresence.set(true);
      component.climate.set(mockCharge.data.climate);
      component.spanLoads.set(mockCharge.data.spanLoads);
    });

    it('should call LoadsReportService.generateReport with the assembled report data', async () => {
      await component.onGenerateReport();

      expect(mockLoadsReportService.generateReport).toHaveBeenCalledWith(
        expect.objectContaining({
          author: 'test@example.com',
          studyTitle: 'Test Study',
          cantonName: 'Test section',
          chargeName: 'Test Charge',
          chargeDescription: 'Test description',
          personnelPresence: true
        })
      );
    });

    it('should translate the span load type in the assembled rows', async () => {
      await component.onGenerateReport();

      const data = (mockLoadsReportService.generateReport as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(data.spanLoads[0].type).toBe('Punctual load');
    });
  });

  describe('duplicateChargeCase', () => {
    it('should call ChargesService.duplicateChargeWithoutSelecting and switch to the new charge in edit mode', async () => {
      component.chargeUuid.set('charge-uuid-1');

      await component.duplicateChargeCase();

      expect(mockChargesService.duplicateChargeWithoutSelecting).toHaveBeenCalledWith(
        'study-uuid',
        'section-uuid',
        'charge-uuid-1'
      );
      expect(component.chargeUuid()).toBe('new-charge-uuid');
      expect(component.mode()).toBe('edit');
    });

    it('should not call duplicateChargeWithoutSelecting when chargeUuid is null', async () => {
      component.chargeUuid.set(null);

      await component.duplicateChargeCase();

      expect(mockChargesService.duplicateChargeWithoutSelecting).not.toHaveBeenCalled();
    });
  });

  describe('isFormValid', () => {
    it('should return false if name is empty', () => {
      component.updateName('');
      expect(component.isFormValid()).toBe(false);
    });

    it('should return true if name is valid and unique', () => {
      component.updateName('Unique Name');
      expect(component.isFormValid()).toBe(true);
    });

    it('should return false if name already exists for different charge', () => {
      component.chargeUuid.set('different-uuid');
      component.updateName('Test Charge'); // Same as mockCharge.name
      expect(component.isFormValid()).toBe(false);
    });

    it('should return true if name matches current charge being edited', () => {
      component.chargeUuid.set('charge-uuid-1');
      component.updateName('Test Charge');
      expect(component.isFormValid()).toBe(true);
    });
  });

  describe('onVisibleChange', () => {
    it('should close tool when visibility becomes false', () => {
      component.onVisibleChange(false);
      expect(mockToolbarDialogService.closeTool).toHaveBeenCalled();
    });

    it('should not close tool when visibility becomes true', () => {
      component.onVisibleChange(true);
      expect(mockToolbarDialogService.closeTool).not.toHaveBeenCalled();
    });
  });

  describe('effect - load charge data', () => {
    it('should load charge data when tool opens with context', async () => {
      mockToolbarDialogService.isOpen!.set(true);
      mockToolbarDialogService.currentTool!.set('load-table');
      mockToolbarDialogService.loadTableContext!.set({
        mode: 'edit',
        chargeUuid: 'charge-uuid-1'
      });

      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.mode()).toBe('edit');
      expect(component.chargeUuid()).toBe('charge-uuid-1');
    });

    it('should load selected charge when tool opens without context', async () => {
      mockToolbarDialogService.isOpen!.set(true);
      mockToolbarDialogService.currentTool!.set('load-table');
      mockToolbarDialogService.loadTableContext!.set(null);

      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.mode()).toBe('view');
      expect(component.chargeUuid()).toBe('charge-uuid-1');
    });
  });

  describe('HTML rendering', () => {
    const getByTestId = (testId: string): HTMLElement | null =>
      fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

    it('should render personnel-presence-toggle', () => {
      const el = getByTestId('personnel-presence-toggle');
      expect(el).toBeTruthy();
    });

    it('should render load-name-input in edit mode', () => {
      component.switchToEditMode();
      fixture.detectChanges();
      const el = getByTestId('load-name-input');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('INPUT');
    });

    it('should render load-description-input in edit mode', () => {
      component.switchToEditMode();
      fixture.detectChanges();
      const el = getByTestId('load-description-input');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('TEXTAREA');
    });

    it('should render punctual load weights to one decimal and marking weights as a dash', () => {
      component.spanLoads.set([{ ...mockCharge.data.spanLoads[0], loadWeight: 100.16 }, mockCharge.data.spanLoads[1]]);
      fixture.detectChanges();

      const table = getByTestId('load-marking-table');
      const rows = table?.querySelectorAll('tbody tr');
      const punctualWeight = rows?.[0]?.lastElementChild?.textContent?.replace(/\s/g, ' ');
      const markingWeight = rows?.[1]?.lastElementChild?.textContent?.trim();

      expect(punctualWeight).toBe('100.2 daN');
      expect(markingWeight).toBe('-');
    });
  });
});
