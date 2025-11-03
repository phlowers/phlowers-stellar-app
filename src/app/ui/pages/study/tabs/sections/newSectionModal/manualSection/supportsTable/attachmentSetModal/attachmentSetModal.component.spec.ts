import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';

import { AttachmentSetModalComponent } from './attachmentSetModal.component';
import { AttachmentService } from '@src/app/core/services/attachment/attachment.service';
import { Attachment } from '@src/app/core/data/database/interfaces/attachment';
import { Support } from '@src/app/core/data/database/interfaces/support';

describe('AttachmentSetModalComponent', () => {
  let component: AttachmentSetModalComponent;
  let fixture: ComponentFixture<AttachmentSetModalComponent>;
  let attachmentServiceMock: jest.Mocked<AttachmentService>;

  const mockAttachments: Attachment[] = [
    {
      uuid: '1',
      support_name: 'Support A',
      attachment_set: 'Set 1',
      support_order: 1,
      attachment_altitude: 10.5,
      cross_arm_length: 2.5,
      created_at: '2023-01-01',
      updated_at: '2023-01-01'
    },
    {
      uuid: '2',
      support_name: 'Support A',
      attachment_set: 'Set 2',
      support_order: 2,
      attachment_altitude: 12.0,
      cross_arm_length: 3.0,
      created_at: '2023-01-01',
      updated_at: '2023-01-01'
    },
    {
      uuid: '3',
      support_name: 'Support B',
      attachment_set: 'Set 1',
      support_order: 1,
      attachment_altitude: 8.5,
      cross_arm_length: 2.0,
      created_at: '2023-01-01',
      updated_at: '2023-01-01'
    }
  ];

  const mockSupport: Support = {
    uuid: 'support-uuid',
    number: 1,
    name: 'Test Support',
    spanLength: 100.0,
    spanAngle: 0.0,
    attachmentSet: 'Set 1',
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
    attachmentPosition: 'Position 1'
  };

  beforeEach(async () => {
    attachmentServiceMock = {
      getAttachments: jest.fn().mockResolvedValue(mockAttachments)
    } as unknown as jest.Mocked<AttachmentService>;

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
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AttachmentSetModalComponent);
    component = fixture.componentInstance;
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
        (a, b) => a.attachment_set?.localeCompare(b.attachment_set ?? '') || 0
      )
    );
  });

  it('should reset values when modal opens', async () => {
    // Set some initial values
    component.armLength.set(5);
    component.heightBelowConsole.set(10);
    component.attachmentSet.set('test');
    component.supportName.set('test');

    // Simulate modal opening by calling resetValues directly
    component.resetValues();
    await fixture.whenStable();

    expect(component.armLength()).toBeUndefined();
    expect(component.heightBelowConsole()).toBeUndefined();
    expect(component.attachmentSet()).toBeUndefined();
    expect(component.supportName()).toBeUndefined();
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
    await component.onAttachnementSelect(event, 'support_name');

    const filteredAttachments = mockAttachments
      .filter((item) => item.support_name === 'Support A')
      .sort(
        (a, b) => a.attachment_set?.localeCompare(b.attachment_set ?? '') || 0
      );

    expect(component.attachmentsFilterTable()).toEqual(filteredAttachments);
  });

  it('should set arm length and height when attachment set is selected', async () => {
    component.supportName.set('Support A');
    component.ngOnInit();
    await fixture.whenStable();

    const event = { value: 'Set 1' };
    await component.onAttachnementSelect(event, 'attachment_set');

    expect(component.armLength()).toBe(2.5);
    expect(component.heightBelowConsole()).toBe(10.5);
  });

  it('should reset values when attachment selection is cleared', async () => {
    component.supportName.set('Support A');
    component.attachmentSet.set('Set 1');
    component.armLength.set(2.5);
    component.heightBelowConsole.set(10.5);

    const event = { value: null };
    await component.onAttachnementSelect(event, 'attachment_set');

    expect(component.armLength()).toBeUndefined();
    expect(component.heightBelowConsole()).toBeUndefined();
    expect(component.attachmentSet()).toBeUndefined();
    expect(component.supportName()).toBeUndefined();
  });

  it('should emit validateForm with support uuid when support is provided', () => {
    const spy = jest.spyOn(component.validateForm, 'emit');

    component.supportName.set('Support A');
    component.attachmentSet.set('Set 1');
    component.armLength.set(2.5);
    component.heightBelowConsole.set(10.5);

    // Mock the support input signal
    jest.spyOn(component, 'support').mockReturnValue(mockSupport);

    component.validate();

    expect(spy).toHaveBeenCalledWith({
      supportName: 'Support A',
      attachmentSet: 'Set 1',
      armLength: 2.5,
      heightBelowConsole: 10.5,
      uuid: 'support-uuid'
    });
  });

  it('should handle empty values in validate method', () => {
    const spy = jest.spyOn(component.validateForm, 'emit');

    component.validate();

    expect(spy).toHaveBeenCalledWith({
      supportName: '',
      attachmentSet: '',
      armLength: 0,
      heightBelowConsole: 0,
      uuid: ''
    });
  });

  it('should not filter by attachment set if support name is not selected', async () => {
    component.ngOnInit();
    await fixture.whenStable();

    const event = { value: 'Set 1' };
    await component.onAttachnementSelect(event, 'attachment_set');

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
});
