import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SupportsTableComponent } from './supportsTable.component';
import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Support, CatalogChain } from '@shared/domain';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ChainsService } from '@shared/catalog/services/chains.service';
import { AttachmentService } from '@shared/catalog/services/attachment.service';

// Mock child component
@Component({
  selector: 'app-attachment-set-modal',
  template: ''
})
class MockAttachmentSetModalComponent {
  isOpen = input(false);
  support = input<Support | undefined>(undefined);
  isOpenChange = output<boolean>();
  validateForm = output<any>();
}

// Mock services
const mockChainsService = {
  getChains: jest.fn().mockResolvedValue([] as CatalogChain[])
};

const mockAttachmentService = {
  getAttachments: jest.fn().mockResolvedValue([])
};

// Mock data
const mockChains: CatalogChain[] = [
  {
    chain_name: 'Chain 1',
    mean_length: 10.5,
    mean_mass: 2.3,
    chain_surface: 100,
    v_chain: false,
    chain_type: 'type1',
    uuid: 'uuid1'
  },
  {
    chain_name: 'Chain 2',
    mean_length: 15.0,
    mean_mass: 3.1,
    chain_surface: 150,
    v_chain: true,
    chain_type: 'type2',
    uuid: 'uuid2'
  }
];

const mockSupports: Support[] = [
  {
    uuid: 'support1',
    number: '1',
    name: 'Support 1',
    spanLength: 50.0,
    spanAngle: 90.0,
    attachmentHeight: 12.0,
    cableType: null,
    attachmentSet: 1,
    heightBelowConsole: 1.5,
    armLength: 2.0,
    chainName: 'Chain 1',
    chainLength: 10.5,
    chainWeight: 2.3,
    chainV: true,
    counterWeight: 100.0,
    supportFootAltitude: 100.0,
    chainSurface: 10.0,
    attachmentPosition: 'Position 1',
    towerModel: 'Tower Model'
  },
  {
    uuid: 'support2',
    number: '2',
    name: 'Support 2',
    spanLength: 60.0,
    spanAngle: 85.0,
    attachmentHeight: 11.0,
    cableType: null,
    attachmentSet: 2,
    heightBelowConsole: 1.2,
    armLength: 1.8,
    chainName: 'Chain 2',
    chainLength: 15.0,
    chainWeight: 3.1,
    chainV: false,
    counterWeight: 100.0,
    supportFootAltitude: 100.0,
    chainSurface: 10.0,
    attachmentPosition: 'Position 2',
    towerModel: 'Tower Model'
  },
  {
    uuid: 'support3',
    number: '3',
    name: 'Support 3',
    spanLength: 55.0,
    spanAngle: 88.0,
    attachmentHeight: 13.0,
    cableType: null,
    attachmentSet: 3,
    heightBelowConsole: 1.8,
    armLength: 2.2,
    chainName: null,
    chainLength: null,
    chainWeight: null,
    chainV: null,
    counterWeight: null,
    supportFootAltitude: null,
    chainSurface: null,
    attachmentPosition: null,
    towerModel: null
  }
];

describe('SupportsTableComponent', () => {
  let component: SupportsTableComponent;
  let fixture: ComponentFixture<SupportsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, SupportsTableComponent, MockAttachmentSetModalComponent, NoopAnimationsModule],
      providers: [
        { provide: ChainsService, useValue: mockChainsService },
        { provide: AttachmentService, useValue: mockAttachmentService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SupportsTableComponent);
    component = fixture.componentInstance;

    // Setup component inputs
    (component.supports as unknown as () => Support[]) = () => mockSupports;
    (component.mode as unknown as () => 'create' | 'edit' | 'view') = () => 'create';
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
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should copy the first support's number to all supports", () => {
      component.onSupportNumberDoubleClick('number');

      expect(component.supportChange.emit).toHaveBeenCalledTimes(3);
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        support: { number: '1' }
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support2',
        support: { number: '2' }
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support3',
        support: { number: '3' }
      });
    });

    it("should copy the first support's spanLength to all supports", () => {
      component.onSupportNumberDoubleClick('spanLength');

      expect(component.supportChange.emit).toHaveBeenCalledTimes(2);
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        support: { spanLength: 50.0 }
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support2',
        support: { spanLength: 50.0 }
      });
    });

    it("should copy the first support's spanAngle to all supports", () => {
      component.onSupportNumberDoubleClick('spanAngle');

      expect(component.supportChange.emit).toHaveBeenCalledTimes(3);
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        support: { spanAngle: 90.0 }
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support2',
        support: { spanAngle: 90.0 }
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support3',
        support: { spanAngle: 90.0 }
      });
    });

    it("should copy the first support's attachmentHeight to all supports", () => {
      component.onSupportNumberDoubleClick('attachmentHeight');

      // attachmentHeight emits for each support + supportFootAltitude for each support
      expect(component.supportChange.emit).toHaveBeenCalledTimes(6);
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        support: { attachmentHeight: 12.0 }
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        support: { supportFootAltitude: -18 }
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support2',
        support: { attachmentHeight: 12.0 }
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support2',
        support: { supportFootAltitude: -18 }
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support3',
        support: { attachmentHeight: 12.0 }
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support3',
        support: { supportFootAltitude: -18 }
      });
    });

    it("should copy the first support's attachmentSet to all supports", () => {
      component.onSupportNumberDoubleClick('attachmentSet');

      expect(component.supportChange.emit).toHaveBeenCalledTimes(3);
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        support: { attachmentSet: 1 }
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support2',
        support: { attachmentSet: 1 }
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support3',
        support: { attachmentSet: 1 }
      });
    });

    it("should copy the first support's armLength to all supports", () => {
      component.onSupportNumberDoubleClick('armLength');

      expect(component.supportChange.emit).toHaveBeenCalledTimes(3);
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        support: { armLength: 2.0 }
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support2',
        support: { armLength: 2.0 }
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support3',
        support: { armLength: 2.0 }
      });
    });

    it("should copy the first support's name to all supports", () => {
      component.onSupportNumberDoubleClick('name');

      expect(component.supportChange.emit).toHaveBeenCalledTimes(3);
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        support: { name: 'Support 1' }
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support2',
        support: { name: 'Support 1' }
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support3',
        support: { name: 'Support 1' }
      });
    });

    it("should copy the first support's chainV to all supports", () => {
      component.onSupportNumberDoubleClick('chainV');

      expect(component.supportChange.emit).toHaveBeenCalledTimes(3);
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        support: { chainV: true }
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support2',
        support: { chainV: true }
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support3',
        support: { chainV: true }
      });
    });
  });

  describe('copyColumn with chainName', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should copy chainName and propagate chainLength and chainWeight to all supports', () => {
      component.copyColumn('chainName');

      // Should emit 15 times: chainName (3) + chainLength (3) + chainWeight (3) + chainSurface (3) + chainV (3)
      expect(component.supportChange.emit).toHaveBeenCalledTimes(15);

      // Check chainName emissions
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        support: { chainName: 'Chain 1' }
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support2',
        support: { chainName: 'Chain 1' }
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support3',
        support: { chainName: 'Chain 1' }
      });
      // Check chainLength emissions
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        support: { chainLength: 10.5 }
      });
      // Check chainWeight emissions
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        support: { chainWeight: 2.3 }
      });
      // Check chainSurface emissions
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        support: { chainSurface: 0 }
      });
      // Check chainV emissions
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        support: { chainV: false }
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
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should emit only once when there is only one support', () => {
      const singleSupport = [mockSupports[0]];
      (component.supports as unknown as () => Support[]) = () => singleSupport;

      component.copyColumn('number');

      expect(component.supportChange.emit).toHaveBeenCalledTimes(1);
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        support: { number: '1' }
      });
    });
  });

  describe('copyColumn with chainName and single support', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should emit chainName, chainLength, and chainWeight when copying chainName with single support', () => {
      const singleSupport = [mockSupports[0]];
      (component.supports as unknown as () => Support[]) = () => singleSupport;

      component.copyColumn('chainName');

      // Should emit 5 times: chainName + chainLength + chainWeight + chainSurface + chainV
      expect(component.supportChange.emit).toHaveBeenCalledTimes(5);
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        support: { chainName: 'Chain 1' }
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        support: { chainLength: 10.5 }
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        support: { chainWeight: 2.3 }
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        support: { chainSurface: 0 }
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        support: { chainV: false }
      });
    });
  });

  describe('truncateDecimals', () => {
    const makeEvent = (value: string) => ({ target: { value } as HTMLInputElement }) as unknown as Event;

    it('should do nothing when value has no decimal separator', () => {
      const event = makeEvent('123');
      component.truncateDecimals(event);
      expect((event.target as HTMLInputElement).value).toBe('123');
    });

    it('should do nothing when value has exactly 2 decimal places', () => {
      const event = makeEvent('1.23');
      component.truncateDecimals(event);
      expect((event.target as HTMLInputElement).value).toBe('1.23');
    });

    it('should do nothing when value has fewer than 2 decimal places', () => {
      const event = makeEvent('1.2');
      component.truncateDecimals(event);
      expect((event.target as HTMLInputElement).value).toBe('1.2');
    });

    it('should truncate to 2 decimal places when value has more', () => {
      const event = makeEvent('1.234');
      component.truncateDecimals(event);
      expect((event.target as HTMLInputElement).value).toBe('1.23');
    });

    it('should truncate negative numbers with more than 2 decimal places', () => {
      const event = makeEvent('-1.234');
      component.truncateDecimals(event);
      expect((event.target as HTMLInputElement).value).toBe('-1.23');
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
      expect(component.chainsOptions()).toEqual(mockChains);
    });
  });

  describe('onSupportFieldChange', () => {
    beforeEach(() => {
      component.chainsOptions.set(mockChains);
    });

    it('should emit supportChange for non-chainName fields', () => {
      component.onSupportFieldChange('support1', 'number', 5);

      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        support: { number: 5 }
      });
    });

    it('should emit chainName, chainLength, and chainWeight when chainName is changed', () => {
      component.onSupportFieldChange('support1', 'chainName', 'Chain 2');

      expect(component.supportChange.emit).toHaveBeenCalledTimes(5);
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        support: { chainName: 'Chain 2' }
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        support: { chainLength: 15.0 }
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        support: { chainWeight: 3.1 }
      });
    });

    it('should only emit chainName when chain is not found', () => {
      component.onSupportFieldChange('support1', 'chainName', 'Non-existent Chain');

      expect(component.supportChange.emit).toHaveBeenCalledTimes(1);
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        support: { chainName: 'Non-existent Chain' }
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
        attachmentSet: 1,
        armLength: 3.0,
        heightBelowConsole: 2.0,
        towerModel: 'D-Type'
      };

      component.onValidateFormAttachmentSetModal(event);

      const support = component.supports().find((s) => s.uuid === 'support1');
      expect(support?.name).toBe('Updated Support 1');
      expect(support?.attachmentSet).toBe(1);
      expect(support?.armLength).toBe(3.0);
      expect(support?.heightBelowConsole).toBe(2.0);
    });
  });

  describe('onSupportNumberDoubleClick in view mode', () => {
    it('should not copy when mode is view', () => {
      (component.mode as unknown as () => 'create' | 'edit' | 'view') = () => 'view';

      component.onSupportNumberDoubleClick('spanLength');

      expect(component.supportChange.emit).not.toHaveBeenCalled();
    });
  });

  describe('onChainNameFilter', () => {
    beforeEach(() => {
      component.chainsOptions.set(mockChains);
      component.supplementaryChainsOptions.set([]);
    });

    it('should add a supplementary chain option when the filter value is not in the catalog', () => {
      component.onChainNameFilter({ filter: 'My Custom Chain' });

      expect(component.supplementaryChainsOptions().some((c) => c.chain_name === 'My Custom Chain')).toBe(true);
    });

    it('should not update supplementary options when the filter value is already in the catalog', () => {
      component.onChainNameFilter({ filter: 'Chain 1' });

      expect(component.supplementaryChainsOptions()).toEqual([]);
    });
  });

  describe('onSupportNameFilter', () => {
    beforeEach(() => {
      // Use isolated support names to avoid mutations from onValidateFormAttachmentSetModal
      const freshSupports: Support[] = [
        { ...mockSupports[0], name: 'TypeA' },
        { ...mockSupports[1], name: 'TypeB' }
      ];
      (component.supports as unknown as () => Support[]) = () => freshSupports;
      component.supportFilterTable.set(['TypeA', 'TypeB']);
      component.supplementarySupportFilterTable.set([]);
    });

    it('should add a supplementary support name when the filter value is not in the catalog', () => {
      component.onSupportNameFilter({ filter: 'Custom Support' });

      expect(component.supplementarySupportFilterTable()).toContain('Custom Support');
    });

    it('should not update supplementary names when the filter value is already in the catalog', () => {
      component.onSupportNameFilter({ filter: 'TypeA' });

      expect(component.supplementarySupportFilterTable()).toEqual([]);
    });
  });

  describe('isNumber', () => {
    it('should return true for numeric values', () => {
      expect(component.isNumber(0)).toBe(true);
      expect(component.isNumber(42)).toBe(true);
      expect(component.isNumber(-1)).toBe(true);
      expect(component.isNumber(3.14)).toBe(true);
    });

    it('should return false for non-numeric values', () => {
      expect(component.isNumber(null)).toBe(false);
      expect(component.isNumber(undefined)).toBe(false);
      expect(component.isNumber('')).toBe(false);
      expect(component.isNumber('42')).toBe(false);
    });
  });

  describe('getData with attachments', () => {
    it('should populate supportFilterTable and supplementarySupportFilterTable', async () => {
      mockAttachmentService.getAttachments.mockResolvedValue([
        { uuid: 'a1', updated_at: '', created_at: '', support_tower: '', support_name: 'CatalogType' }
      ]);
      (component.supports as unknown as () => Support[]) = () => [{ ...mockSupports[0], name: 'CustomType' }];

      await component.getData();

      expect(component.supportFilterTable()).toContain('CatalogType');
      expect(component.supplementarySupportFilterTable()).toContain('CustomType');
    });
  });

  describe('onSupportFieldChange with attachmentHeight', () => {
    it('should emit attachmentHeight and the computed supportFootAltitude', () => {
      component.onSupportFieldChange('support1', 'attachmentHeight', 50);

      expect(component.supportChange.emit).toHaveBeenCalledTimes(2);
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        support: { supportFootAltitude: 20 } // 50 - 30
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        support: { attachmentHeight: 50 }
      });
    });
  });
});
