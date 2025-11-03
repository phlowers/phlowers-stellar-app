import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SupportsTableComponent } from './supportsTable.component';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Support } from '@src/app/core/data/database/interfaces/support';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ChainsService } from '@src/app/core/services/chains/chains.service';
import { Chain } from '@src/app/core/data/database/interfaces/chain';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AttachmentService } from '@src/app/core/services/attachment/attachment.service';

// Mock child component
@Component({
  selector: 'app-attachment-set-modal',
  template: ''
})
class MockAttachmentSetModalComponent {
  @Input() isOpen = false;
  @Input() support: Support | undefined = undefined;
  @Output() isOpenChange = new EventEmitter<boolean>();
  @Output() validateForm = new EventEmitter<any>();
}

// Mock services
const mockChainsService = {
  getChains: jest.fn().mockResolvedValue([] as Chain[])
};

const mockAttachmentService = {
  getAttachments: jest.fn().mockResolvedValue([])
};

// Mock data
const mockChains: Chain[] = [
  {
    name: 'Chain 1',
    length: 10.5,
    weight: 2.3
  },
  {
    name: 'Chain 2',
    length: 15.0,
    weight: 3.1
  }
];

const mockSupports: Support[] = [
  {
    uuid: 'support1',
    number: 1,
    name: 'Support 1',
    spanLength: 50.0,
    spanAngle: 90.0,
    attachmentHeight: 12.0,
    cableType: null,
    attachmentSet: 'Set A',
    heightBelowConsole: 1.5,
    armLength: 2.0,
    chainName: 'Chain 1',
    chainLength: 10.5,
    chainWeight: 2.3,
    chainV: true,
    counterWeight: 100.0,
    supportFootAltitude: 100.0,
    chainSurface: 10.0,
    attachmentPosition: 'Position 1'
  },
  {
    uuid: 'support2',
    number: 2,
    name: 'Support 2',
    spanLength: 60.0,
    spanAngle: 85.0,
    attachmentHeight: 11.0,
    cableType: null,
    attachmentSet: 'Set B',
    heightBelowConsole: 1.2,
    armLength: 1.8,
    chainName: 'Chain 2',
    chainLength: 15.0,
    chainWeight: 3.1,
    chainV: false,
    counterWeight: 100.0,
    supportFootAltitude: 100.0,
    chainSurface: 10.0,
    attachmentPosition: 'Position 2'
  },
  {
    uuid: 'support3',
    number: 3,
    name: 'Support 3',
    spanLength: 55.0,
    spanAngle: 88.0,
    attachmentHeight: 13.0,
    cableType: null,
    attachmentSet: 'Set C',
    heightBelowConsole: 1.8,
    armLength: 2.2,
    chainName: null,
    chainLength: null,
    chainWeight: null,
    chainV: null,
    counterWeight: null,
    supportFootAltitude: null,
    chainSurface: null,
    attachmentPosition: null
  }
];

describe('SupportsTableComponent', () => {
  let component: SupportsTableComponent;
  let fixture: ComponentFixture<SupportsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        SupportsTableComponent,
        MockAttachmentSetModalComponent,
        NoopAnimationsModule,
        HttpClientTestingModule
      ],
      providers: [
        { provide: ChainsService, useValue: mockChainsService },
        { provide: AttachmentService, useValue: mockAttachmentService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SupportsTableComponent);
    component = fixture.componentInstance;

    // Setup component inputs
    (component.supports as unknown as () => Support[]) = () => mockSupports;
    (component.mode as unknown as () => 'create' | 'edit' | 'view') = () =>
      'create';
    (component.first as unknown as () => number) = () => 0;
    (component.rows as unknown as () => number) = () => 10;

    // Setup component outputs
    component.addSupport = {
      emit: jest.fn()
    } as unknown as typeof component.addSupport;
    component.deleteSupport = {
      emit: jest.fn()
    } as unknown as typeof component.deleteSupport;
    component.supportChange = {
      emit: jest.fn()
    } as unknown as typeof component.supportChange;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onSupportNumberDoubleClick', () => {
    it("should copy the first support's number to all supports", () => {
      component.onSupportNumberDoubleClick('number');

      expect(component.supportChange.emit).toHaveBeenCalledTimes(3);
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        field: 'number',
        value: 1
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support2',
        field: 'number',
        value: 1
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support3',
        field: 'number',
        value: 1
      });
    });

    it("should copy the first support's spanLength to all supports", () => {
      component.onSupportNumberDoubleClick('spanLength');

      expect(component.supportChange.emit).toHaveBeenCalledTimes(3);
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        field: 'spanLength',
        value: 50.0
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support2',
        field: 'spanLength',
        value: 50.0
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support3',
        field: 'spanLength',
        value: 50.0
      });
    });

    it("should copy the first support's spanAngle to all supports", () => {
      component.onSupportNumberDoubleClick('spanAngle');

      expect(component.supportChange.emit).toHaveBeenCalledTimes(3);
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        field: 'spanAngle',
        value: 90.0
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support2',
        field: 'spanAngle',
        value: 90.0
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support3',
        field: 'spanAngle',
        value: 90.0
      });
    });

    it("should copy the first support's attachmentHeight to all supports", () => {
      component.onSupportNumberDoubleClick('attachmentHeight');

      expect(component.supportChange.emit).toHaveBeenCalledTimes(3);
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        field: 'attachmentHeight',
        value: 12.0
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support2',
        field: 'attachmentHeight',
        value: 12.0
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support3',
        field: 'attachmentHeight',
        value: 12.0
      });
    });

    it("should copy the first support's attachmentSet to all supports", () => {
      component.onSupportNumberDoubleClick('attachmentSet');

      expect(component.supportChange.emit).toHaveBeenCalledTimes(3);
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        field: 'attachmentSet',
        value: 'Set A'
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support2',
        field: 'attachmentSet',
        value: 'Set A'
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support3',
        field: 'attachmentSet',
        value: 'Set A'
      });
    });

    it("should copy the first support's armLength to all supports", () => {
      component.onSupportNumberDoubleClick('armLength');

      expect(component.supportChange.emit).toHaveBeenCalledTimes(3);
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        field: 'armLength',
        value: 2.0
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support2',
        field: 'armLength',
        value: 2.0
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support3',
        field: 'armLength',
        value: 2.0
      });
    });

    it("should copy the first support's name to all supports", () => {
      component.onSupportNumberDoubleClick('name');

      expect(component.supportChange.emit).toHaveBeenCalledTimes(3);
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        field: 'name',
        value: 'Support 1'
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support2',
        field: 'name',
        value: 'Support 1'
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support3',
        field: 'name',
        value: 'Support 1'
      });
    });

    it("should copy the first support's chainV to all supports", () => {
      component.onSupportNumberDoubleClick('chainV');

      expect(component.supportChange.emit).toHaveBeenCalledTimes(3);
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        field: 'chainV',
        value: true
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support2',
        field: 'chainV',
        value: true
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support3',
        field: 'chainV',
        value: true
      });
    });
  });

  describe('copyColumn with chainName', () => {
    it('should copy chainName and propagate chainLength and chainWeight to all supports', () => {
      component.copyColumn('chainName');

      // Should emit 15 times: (chainName + chainLength + chainWeight + chainSurface + chainV) * 3 supports
      expect(component.supportChange.emit).toHaveBeenCalledTimes(15);

      // Check chainName emissions
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        field: 'chainName',
        value: 'Chain 1'
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support2',
        field: 'chainName',
        value: 'Chain 1'
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support3',
        field: 'chainName',
        value: 'Chain 1'
      });

      // Check chainLength emissions
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        field: 'chainLength',
        value: 10.5
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support2',
        field: 'chainLength',
        value: 10.5
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support3',
        field: 'chainLength',
        value: 10.5
      });

      // Check chainWeight emissions
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        field: 'chainWeight',
        value: 2.3
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support2',
        field: 'chainWeight',
        value: 2.3
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support3',
        field: 'chainWeight',
        value: 2.3
      });
    });
  });

  describe('copyColumn with empty supports array', () => {
    it('should not emit any events when supports array is empty', () => {
      (component.supports as unknown as () => Support[]) = () => [];

      component.copyColumn('number');

      expect(component.supportChange.emit).not.toHaveBeenCalled();
    });
  });

  describe('copyColumn with single support', () => {
    it('should emit only once when there is only one support', () => {
      const singleSupport = [mockSupports[0]];
      (component.supports as unknown as () => Support[]) = () => singleSupport;

      component.copyColumn('number');

      expect(component.supportChange.emit).toHaveBeenCalledTimes(1);
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        field: 'number',
        value: 1
      });
    });
  });

  describe('copyColumn with chainName and single support', () => {
    it('should emit chainName, chainLength, and chainWeight when copying chainName with single support', () => {
      const singleSupport = [mockSupports[0]];
      (component.supports as unknown as () => Support[]) = () => singleSupport;

      component.copyColumn('chainName');

      expect(component.supportChange.emit).toHaveBeenCalledTimes(5);
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        field: 'chainName',
        value: 'Chain 1'
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        field: 'chainLength',
        value: 10.5
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        field: 'chainWeight',
        value: 2.3
      });
    });
  });

  describe('ngOnInit', () => {
    it('should call getData on init', async () => {
      const getDataSpy = jest.spyOn(component, 'getData');
      component.ngOnInit();
      expect(getDataSpy).toHaveBeenCalled();
    });
  });

  describe('getData', () => {
    it('should load chains data', async () => {
      mockChainsService.getChains.mockResolvedValue(mockChains);
      await component.getData();
      expect(component.chains()).toEqual(mockChains);
    });
  });

  describe('onSupportFieldChange', () => {
    beforeEach(() => {
      component.chains.set(mockChains);
    });

    it('should emit supportChange for non-chainName fields', () => {
      component.onSupportFieldChange('support1', 'number', 5);

      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        field: 'number',
        value: 5
      });
    });

    it('should emit chainName, chainLength, and chainWeight when chainName is changed', () => {
      component.onSupportFieldChange('support1', 'chainName', 'Chain 2');

      expect(component.supportChange.emit).toHaveBeenCalledTimes(5);
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        field: 'chainName',
        value: 'Chain 2'
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        field: 'chainLength',
        value: 15.0
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        field: 'chainWeight',
        value: 3.1
      });
    });

    it('should only emit chainName when chain is not found', () => {
      component.onSupportFieldChange(
        'support1',
        'chainName',
        'Non-existent Chain'
      );

      expect(component.supportChange.emit).toHaveBeenCalledTimes(1);
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        field: 'chainName',
        value: 'Non-existent Chain'
      });
    });
  });

  describe('openAttachmentSetModal', () => {
    it('should set the correct support and open the modal', () => {
      component.openAttachmentSetModal('support1');

      expect(component.supportForAttachmentSetModal()).toEqual(mockSupports[0]);
      expect(component.attachmentSetModalOpen()).toBe(true);
    });
  });

  describe('onValidateFormAttachmentSetModal', () => {
    it('should update support properties when form is validated', () => {
      const event = {
        uuid: 'support1',
        supportName: 'Updated Support 1',
        attachmentSet: 'Updated Set A',
        armLength: 3.0,
        heightBelowConsole: 2.0
      };

      component.onValidateFormAttachmentSetModal(event);

      const support = component.supports().find((s) => s.uuid === 'support1');
      expect(support?.name).toBe('Updated Support 1');
      expect(support?.attachmentSet).toBe('Updated Set A');
      expect(support?.armLength).toBe(3.0);
      expect(support?.heightBelowConsole).toBe(2.0);
    });
  });
});
