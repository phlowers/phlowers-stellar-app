// Mock plotly.js-dist-min
jest.mock('plotly.js-dist-min', () => {
  const mockPlotly = {
    newPlot: jest.fn(),
    update: jest.fn(),
    purge: jest.fn(),
    relayout: jest.fn(),
    restyle: jest.fn(),
    react: jest.fn(),
    redraw: jest.fn(),
    toImage: jest.fn(),
    downloadImage: jest.fn(),
    extendTraces: jest.fn(),
    prependTraces: jest.fn(),
    addTraces: jest.fn(),
    deleteTraces: jest.fn(),
    moveTraces: jest.fn(),
    animate: jest.fn(),
    setPlotConfig: jest.fn(),
    validate: jest.fn(),
    d3: {
      select: jest.fn(),
      selectAll: jest.fn()
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

import { AttachmentSetModalComponent } from './attachmentSetModal.component';
import { AttachmentService } from '@src/app/core/services/attachment/attachment.service';
import { CatAttachment } from '@src/app/core/data/database/interfaces/catAttachment';
import { Support } from '@src/app/core/data/database/interfaces/support';
import { Section } from '@src/app/core/data/database/interfaces/section';
import { WorkerPythonService } from '@src/app/core/services/worker_python/worker-python.service';

// Mock plotly.js-dist-min to prevent errors in SupportPlotComponent
jest.mock('plotly.js-dist-min', () => ({
  __esModule: true,
  default: {
    purge: jest.fn(),
    newPlot: jest.fn(),
    restyle: jest.fn(),
    relayout: jest.fn()
  }
}));

describe('AttachmentSetModalComponent', () => {
  let component: AttachmentSetModalComponent;
  let fixture: ComponentFixture<AttachmentSetModalComponent>;
  let attachmentServiceMock: jest.Mocked<AttachmentService>;
  let workerPythonServiceMock: jest.Mocked<WorkerPythonService>;

  const mockAttachments: CatAttachment[] = [
    {
      uuid: '1',
      support_name: 'Support A',
      attachment_set: 1,
      support_order: 1,
      attachment_altitude: 10.5,
      cross_arm_length: 2.5,
      created_at: '2023-01-01',
      updated_at: '2023-01-01',
      support_tower: 'D-Type'
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
      support_tower: 'D-Type'
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
      support_tower: 'D-Type'
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
    towerModel: 'D-Type'
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
    initial_conditions: [],
    selected_initial_condition_uuid: undefined,
    charges: [],
    selected_charge_uuid: null
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
    initial_conditions: [],
    selected_initial_condition_uuid: undefined,
    charges: [],
    selected_charge_uuid: null,
    field_measures: [],
    selected_field_measure_uuid: undefined,
    vtl_and_guying: undefined
  };

  beforeEach(async () => {
    attachmentServiceMock = {
      getAttachments: jest.fn().mockResolvedValue(mockAttachments)
    } as unknown as jest.Mocked<AttachmentService>;

    workerPythonServiceMock = {
      ready: true
    } as unknown as jest.Mocked<WorkerPythonService>;

    await TestBed.configureTestingModule({
      imports: [
        AttachmentSetModalComponent,
        BrowserAnimationsModule,
        FormsModule
      ],
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
    component.ngOnInit();
    await fixture.whenStable();

    expect(attachmentServiceMock.getAttachments).toHaveBeenCalled();
    expect(component.attachmentsFilterTable()).toEqual(
      mockAttachments.sort(
        (a, b) => (a.attachment_set ?? 0) - (b.attachment_set ?? 0)
      )
    );
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
    const spy = jest.spyOn(component.isOpenChange, 'emit');

    component.onVisibleChange();
    expect(spy).toHaveBeenCalledWith(false);
  });

  it('should filter attachments by support name', async () => {
    component.ngOnInit();
    await fixture.whenStable();

    const event = { value: 'Support A' };
    await component.onAttachmentSelect(event, 'support_name');

    const filteredAttachments = mockAttachments
      .filter((item) => item.support_name === 'Support A')
      .sort((a, b) => (a.attachment_set ?? 0) - (b.attachment_set ?? 0));

    expect(component.attachmentsFilterTable()).toEqual(filteredAttachments);
  });

  it('should set arm length and height when attachment set is selected', async () => {
    component.supportName.set('Support A');
    component.ngOnInit();
    await fixture.whenStable();

    const event = { value: 1 };
    await component.onAttachmentSelect(event, 'attachment_set');

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
    const spy = jest.spyOn(component.validateForm, 'emit');

    component.supportName.set('Support A');
    component.attachmentSet.set(1);
    component.armLength.set(2.5);
    component.heightBelowConsole.set(10.5);
    component.towerModel.set('D-Type');

    // Mock the support input signal
    jest.spyOn(component, 'support').mockReturnValue(mockSupport);

    component.validate();

    expect(spy).toHaveBeenCalledWith({
      supportName: 'Support A',
      attachmentSet: 1,
      armLength: 2.5,
      heightBelowConsole: 10.5,
      uuid: 'support-uuid',
      towerModel: 'D-Type'
    });
  });

  it('should handle empty values in validate method', () => {
    const spy = jest.spyOn(component.validateForm, 'emit');

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
    component.ngOnInit();
    await fixture.whenStable();

    const event = { value: 'Set 1' };
    await component.onAttachmentSelect(event, 'attachment_set');

    // Should not set arm length and height since no support name is selected
    expect(component.armLength()).toBeUndefined();
    expect(component.heightBelowConsole()).toBeUndefined();
  });

  it('should handle attachment service errors gracefully', async () => {
    attachmentServiceMock.getAttachments.mockRejectedValue(
      new Error('Service error')
    );

    // Should not throw error
    await expect(component.getData()).rejects.toThrow('Service error');
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
      expect(component.towerModel()).toBe('D-Type');
      expect(attachmentServiceMock.getAttachments).toHaveBeenCalled();
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
      expect(component.towerModel()).toBe('D-Type');
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
});
