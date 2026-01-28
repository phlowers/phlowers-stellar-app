import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { LoadsTableComponent } from './loads-table.component';
import { ToolbarDialogService } from '../toolbar-dialog.service';
import { ChargesService } from '@services/charges/charges.service';
import { PlotService } from '../../services/plot.service';
import { Charge, Section, Study } from '@core/domain';

describe('LoadsTableComponent', () => {
  let component: LoadsTableComponent;
  let fixture: ComponentFixture<LoadsTableComponent>;
  let mockToolbarDialogService: Partial<ToolbarDialogService>;
  let mockChargesService: Partial<ChargesService>;
  let mockPlotService: Partial<PlotService>;

  const mockCharge: Charge = {
    uuid: 'charge-uuid-1',
    name: 'Test Charge',
    personnelPresence: true,
    description: 'Test description',
    data: {
      climate: {
        windPressure: 0,
        cableTemperature: 15,
        symmetryType: 'symmetric',
        iceThickness: 0,
        frontierSupportNumber: null,
        iceThicknessBefore: null,
        iceThicknessAfter: null
      },
      spanLoads: []
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
    supports: [],
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
