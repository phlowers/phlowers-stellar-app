import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { LoadsTableComponent } from './loads-table.component';
import { ToolbarDialogService } from '../toolbar-dialog.service';
import { ChargesService } from '@services/charges/charges.service';
import { PlotService } from '../../services/plot.service';
import { Charge, Section, Study, SymmetryType } from '@core/domain';
import { LoadType } from '@core/domain/models/charge.model';
import { Support } from '@core/domain/models/support.model';

describe('LoadsTableComponent', () => {
  let component: LoadsTableComponent;
  let fixture: ComponentFixture<LoadsTableComponent>;
  let mockToolbarDialogService: Partial<ToolbarDialogService>;
  let mockChargesService: Partial<ChargesService>;
  let mockPlotService: Partial<PlotService>;

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
      chainSurface: null
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
      chainSurface: null
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
      chainSurface: null
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
      ]
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
    supports: mockSupports,
    initial_conditions: [],
    selected_initial_condition_uuid: undefined,
    charges: [mockCharge],
    selected_charge_uuid: 'charge-uuid-1',
    field_measures: [],
    selected_field_measure_uuid: undefined,
    vtl_and_guying: undefined
  };

  beforeEach(async () => {
    mockToolbarDialogService = {
      isMainOpen: signal(false),
      currentTool: signal(null),
      loadTableContext: signal(null),
      setTemplates: jest.fn(),
      closeTool: jest.fn()
    };

    mockChargesService = {
      getCharge: jest.fn().mockResolvedValue(mockCharge),
      createOrUpdateCharge: jest.fn().mockResolvedValue(undefined)
    };

    mockPlotService = {
      study: signal<Study | null>(mockStudy),
      section: signal<Section | null>(mockSection)
    };

    await TestBed.configureTestingModule({
      imports: [LoadsTableComponent],
      providers: [
        { provide: ToolbarDialogService, useValue: mockToolbarDialogService },
        { provide: ChargesService, useValue: mockChargesService },
        { provide: PlotService, useValue: mockPlotService }
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

  describe('ngAfterViewInit', () => {
    it('should set templates on toolbar dialog service', () => {
      component.ngAfterViewInit();
      expect(mockToolbarDialogService.setTemplates).toHaveBeenCalled();
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
      (mockPlotService.study as any).set(null);
      component.chargeUuid.set('charge-uuid-1');

      await component.saveChanges();

      expect(mockChargesService.createOrUpdateCharge).not.toHaveBeenCalled();
    });

    it('should not save if section uuid is missing', async () => {
      (mockPlotService.section as any).set(null);
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
      (mockChargesService.getCharge as jest.Mock).mockResolvedValue(null);
      component.chargeUuid.set('charge-uuid-1');

      await component.saveChanges();

      expect(mockChargesService.createOrUpdateCharge).not.toHaveBeenCalled();
    });
  });

  describe('climate and span loads data loading', () => {
    it('should populate climate signal after loading charge data', async () => {
      (mockToolbarDialogService.isMainOpen as any).set(true);
      (mockToolbarDialogService.currentTool as any).set('load-table');
      (mockToolbarDialogService.loadTableContext as any).set({
        mode: 'view',
        chargeUuid: 'charge-uuid-1'
      });

      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.climate()).toEqual(mockCharge.data.climate);
    });

    it('should populate spanLoads signal after loading charge data', async () => {
      (mockToolbarDialogService.isMainOpen as any).set(true);
      (mockToolbarDialogService.currentTool as any).set('load-table');
      (mockToolbarDialogService.loadTableContext as any).set({
        mode: 'view',
        chargeUuid: 'charge-uuid-1'
      });

      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.spanLoads()).toEqual(mockCharge.data.spanLoads);
    });

    it('should handle null charge data gracefully', async () => {
      (mockChargesService.getCharge as jest.Mock).mockResolvedValue({
        ...mockCharge,
        data: undefined
      });

      (mockToolbarDialogService.isMainOpen as any).set(true);
      (mockToolbarDialogService.currentTool as any).set('load-table');
      (mockToolbarDialogService.loadTableContext as any).set({
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
      expect(rows[0].referenceSupport).toBe('LEFT');
      expect(rows[0].type).toBe(LoadType.PUNCTUAL);
      expect(rows[0].loadWeight).toBe(100);
      expect(rows[0].loadPosition).toBe(50);
      expect(rows[1].spanLabel).toBe('2 - 3');
      expect(rows[1].referenceSupport).toBe('RIGHT');
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
  });

  describe('getSymmetryLabel', () => {
    it('should return Symmetric for SYMMETRIC type', () => {
      expect(component.getSymmetryLabel(SymmetryType.SYMMETRIC)).toBe(
        'Symmetric'
      );
    });

    it('should return Dis Symmetric for DIS_SYMMETRIC type', () => {
      expect(component.getSymmetryLabel(SymmetryType.DIS_SYMMETRIC)).toBe(
        'Dis Symmetric'
      );
    });
  });

  describe('getLoadTypeLabel', () => {
    it('should return Punctual for PUNCTUAL type', () => {
      expect(component.getLoadTypeLabel(LoadType.PUNCTUAL)).toBe('Punctual');
    });

    it('should return Marking for MARKING type', () => {
      expect(component.getLoadTypeLabel(LoadType.MARKING)).toBe('Marking');
    });

    it('should return raw value for unknown type', () => {
      expect(component.getLoadTypeLabel('unknown')).toBe('unknown');
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
      (mockToolbarDialogService.isMainOpen as any).set(true);
      (mockToolbarDialogService.currentTool as any).set('load-table');
      (mockToolbarDialogService.loadTableContext as any).set({
        mode: 'edit',
        chargeUuid: 'charge-uuid-1'
      });

      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.mode()).toBe('edit');
      expect(component.chargeUuid()).toBe('charge-uuid-1');
    });

    it('should load selected charge when tool opens without context', async () => {
      (mockToolbarDialogService.isMainOpen as any).set(true);
      (mockToolbarDialogService.currentTool as any).set('load-table');
      (mockToolbarDialogService.loadTableContext as any).set(null);

      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.mode()).toBe('view');
      expect(component.chargeUuid()).toBe('charge-uuid-1');
    });
  });
});
