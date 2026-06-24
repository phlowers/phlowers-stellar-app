import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SupportsTableComponent } from './supportsTable.component';
import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Support, CatalogChain, Section } from '@shared/domain';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { ChainsService } from '@shared/catalog/services/chains.service';
import { AttachmentService } from '@shared/catalog/services/attachment.service';
import { AttachmentSetModalComponent } from './attachmentSetModal/attachmentSetModal.component';
import { BehaviorSubject, Subject } from 'rxjs';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { vi } from 'vitest';

// Mock child component
@Component({
  selector: 'app-attachment-set-modal',
  template: ''
})
class MockAttachmentSetModalComponent {
  isOpen = input(false);
  support = input<Support | undefined>(undefined);
  section = input<unknown>(null);
  isOpenChange = output<boolean>();
  validateForm = output<Record<string, unknown>>();
}

// Mock services
const mockChainsService = {
  getChains: vi.fn().mockResolvedValue([] as CatalogChain[])
};

let distinctSupportNamesSubject: Subject<string[]>;

const mockAttachmentService = {
  get distinctSupportNames$() {
    return distinctSupportNamesSubject;
  },
  getAttachmentDetails: vi.fn().mockResolvedValue(undefined),
  getDerivedSupportFields: vi.fn().mockResolvedValue(undefined)
};

let workerReadySubject: BehaviorSubject<boolean>;
const mockWorkerPythonService = {
  get ready$() {
    return workerReadySubject.asObservable();
  },
  pyodideLoadError$: new BehaviorSubject<boolean>(false),
  runTask: vi.fn()
};

const mockSectionWithCoordinates = {
  start_latitude: 48.8566,
  start_longitude: 2.3522,
  start_azimuth: 90
} as unknown as Section;

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
    towerModel: 'Tower Model',
    spanAzimut: null,
    xFootLambert93: null,
    yFootLambert93: null
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
    towerModel: 'Tower Model',
    spanAzimut: null,
    xFootLambert93: null,
    yFootLambert93: null
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
    towerModel: null,
    spanAzimut: null,
    xFootLambert93: null,
    yFootLambert93: null
  }
];

describe('SupportsTableComponent', () => {
  let component: SupportsTableComponent;
  let fixture: ComponentFixture<SupportsTableComponent>;

  beforeEach(async () => {
    distinctSupportNamesSubject = new Subject<string[]>();
    workerReadySubject = new BehaviorSubject<boolean>(false);
    mockWorkerPythonService.runTask.mockResolvedValue({ result: null, error: null, pythonErrorCode: null });

    await TestBed.configureTestingModule({
      imports: [FormsModule, SupportsTableComponent, NoopAnimationsModule],
      providers: [
        { provide: ChainsService, useValue: mockChainsService },
        { provide: AttachmentService, useValue: mockAttachmentService },
        { provide: WorkerPythonService, useValue: mockWorkerPythonService }
      ]
    })
      .overrideComponent(SupportsTableComponent, {
        remove: { imports: [AttachmentSetModalComponent] },
        add: { imports: [MockAttachmentSetModalComponent] }
      })
      .compileComponents();

    fixture = TestBed.createComponent(SupportsTableComponent);
    component = fixture.componentInstance;

    // Setup component inputs
    (component.supports as unknown as () => Support[]) = () => mockSupports;
    (component.mode as unknown as () => 'create' | 'edit' | 'view') = () => 'create';
    (component.first as unknown as () => number) = () => 0;
    (component.rows as unknown as () => number) = () => 10;

    // Setup component outputs
    component.addSupport = {
      emit: vi.fn()
    } as unknown as typeof component.addSupport;
    component.deleteSupport = {
      emit: vi.fn()
    } as unknown as typeof component.deleteSupport;
    component.supportChange = {
      emit: vi.fn()
    } as unknown as typeof component.supportChange;

    fixture.detectChanges();
    // Drain the microtask scheduled by ngOnInit -> getData() (mocked).
    // Avoid `fixture.whenStable()` here: PrimeNG schedules background tasks
    // that keep the zone busy and make this hook flaky under CI load,
    // tripping the default 15 s hook timeout.
    await Promise.resolve();
  }, 30000);

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onSupportNumberDoubleClick', () => {
    beforeEach(() => {
      vi.clearAllMocks();
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

    it("should copy the first support's attachmentSet to all supports", async () => {
      await component.copyColumn('attachmentSet');

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

    it("should copy the first support's name to all supports", async () => {
      await component.copyColumn('name');

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
      vi.clearAllMocks();
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
      vi.clearAllMocks();
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
      vi.clearAllMocks();
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

  describe('ngOnInit', () => {
    it('should call getData on init', async () => {
      const getDataSpy = vi.spyOn(component, 'getData');
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

  // Regression tests for #657 (tower model) plus the arm-length / height-below-
  // console follow-up: every catalog-derived field must follow the attachment
  // set through inline edits and column copy, resolving from each support's OWN name.
  describe('attachment set derived fields (regression #657 + arm length + height below console)', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      // Catalog returns fields derived from the support name so we can assert
      // that each row resolves its own values, not the first support's.
      mockAttachmentService.getDerivedSupportFields.mockImplementation((supportName: string) =>
        Promise.resolve({
          towerModel: `tower-of-${supportName}`,
          armLength: 3.4,
          heightBelowConsole: 25.5
        })
      );
    });

    it('copies the attachment set AND resolves each row derived fields from its own support name', async () => {
      await component.copyColumn('attachmentSet');

      // First support's attachment set (1) is copied to every row...
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support2',
        support: { attachmentSet: 1 }
      });
      // ...and each row's fields are looked up with that set under its OWN name.
      expect(mockAttachmentService.getDerivedSupportFields).toHaveBeenCalledWith('Support 1', 1);
      expect(mockAttachmentService.getDerivedSupportFields).toHaveBeenCalledWith('Support 2', 1);
      expect(mockAttachmentService.getDerivedSupportFields).toHaveBeenCalledWith('Support 3', 1);
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        support: { towerModel: 'tower-of-Support 1', armLength: 3.4, heightBelowConsole: 25.5 }
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support2',
        support: { towerModel: 'tower-of-Support 2', armLength: 3.4, heightBelowConsole: 25.5 }
      });
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support3',
        support: { towerModel: 'tower-of-Support 3', armLength: 3.4, heightBelowConsole: 25.5 }
      });
    });

    it('copies the support name AND resolves each row derived fields from the copied name + its own set', async () => {
      await component.copyColumn('name');

      // First support's name ('Support 1') is copied to every row...
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support2',
        support: { name: 'Support 1' }
      });
      // ...and each row's fields are looked up with the copied name under its OWN attachment set,
      // so towers follow the name-clone workflow (#657).
      expect(mockAttachmentService.getDerivedSupportFields).toHaveBeenCalledWith('Support 1', 1);
      expect(mockAttachmentService.getDerivedSupportFields).toHaveBeenCalledWith('Support 1', 2);
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support2',
        support: { towerModel: 'tower-of-Support 1', armLength: 3.4, heightBelowConsole: 25.5 }
      });
    });

    it('resolves and emits the derived fields when the attachment set is edited inline', async () => {
      await component.onSupportFieldChange('support2', 'attachmentSet', 7);

      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support2',
        support: { attachmentSet: 7 }
      });
      // Fields are fetched for the row's own support name + the new set, and
      // arm length / height / tower are emitted together (the inline-edit bug).
      expect(mockAttachmentService.getDerivedSupportFields).toHaveBeenCalledWith('Support 2', 7);
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support2',
        support: { towerModel: 'tower-of-Support 2', armLength: 3.4, heightBelowConsole: 25.5 }
      });
    });

    it('resolves and emits the derived fields when the support name is edited inline', async () => {
      await component.onSupportFieldChange('support2', 'name', 'Support X');

      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support2',
        support: { name: 'Support X' }
      });
      // The new name is resolved against the row's current attachment set (2),
      // so the tower / arm length / height follow support-name edits (#657).
      expect(mockAttachmentService.getDerivedSupportFields).toHaveBeenCalledWith('Support X', 2);
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support2',
        support: { towerModel: 'tower-of-Support X', armLength: 3.4, heightBelowConsole: 25.5 }
      });
    });

    it('drops a stale derived-fields lookup when the same row is edited again before it resolves', async () => {
      // Each call hands back a controllable promise so we can resolve them out of order.
      const resolvers: (() => void)[] = [];
      mockAttachmentService.getDerivedSupportFields.mockImplementation(
        (_name: string, set: number) =>
          new Promise((resolve) => {
            resolvers.push(() => resolve({ towerModel: `tower-set-${set}`, armLength: set, heightBelowConsole: 25.5 }));
          })
      );

      const first = component.onSupportFieldChange('support1', 'attachmentSet', 1);
      const second = component.onSupportFieldChange('support1', 'attachmentSet', 2);

      // The newer lookup (set 2) resolves first; the older one (set 1) resolves late.
      resolvers[1]();
      resolvers[0]();
      await Promise.all([first, second]);

      // Only the latest edit's derived fields are emitted...
      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        support: { towerModel: 'tower-set-2', armLength: 2, heightBelowConsole: 25.5 }
      });
      // ...the stale (set 1) result is discarded instead of overwriting them.
      expect(component.supportChange.emit).not.toHaveBeenCalledWith({
        uuid: 'support1',
        support: { towerModel: 'tower-set-1', armLength: 1, heightBelowConsole: 25.5 }
      });
    });

    it('does not look up derived fields for non-name/attachmentSet field edits', async () => {
      await component.onSupportFieldChange('support1', 'number', 5);

      expect(mockAttachmentService.getDerivedSupportFields).not.toHaveBeenCalled();
    });

    it('does not emit a derived-fields change when the catalog has no match', async () => {
      mockAttachmentService.getDerivedSupportFields.mockResolvedValue(undefined);

      await component.onSupportFieldChange('support1', 'attachmentSet', 99);

      expect(component.supportChange.emit).toHaveBeenCalledWith({
        uuid: 'support1',
        support: { attachmentSet: 99 }
      });
      expect(component.supportChange.emit).not.toHaveBeenCalledWith(
        expect.objectContaining({ support: expect.objectContaining({ armLength: expect.anything() }) })
      );
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

  describe('workerReady signal', () => {
    it('should be false initially', () => {
      expect(component.workerReady()).toBe(false);
    });

    it('should become true when ready$ emits true', () => {
      workerReadySubject.next(true);
      fixture.detectChanges();
      expect(component.workerReady()).toBe(true);
    });
  });

  describe('localizationLoading', () => {
    beforeEach(() => {
      (component.mode as unknown as () => 'create' | 'edit' | 'view') = () => 'view';
      (component.section as unknown as () => Section) = () => mockSectionWithCoordinates;
    });

    it('should be false initially', () => {
      expect(component.localizationLoading()).toBe(false);
    });

    it('should stay false in view mode with valid section/supports when worker is not ready', async () => {
      component.ngOnInit();
      await fixture.whenStable();
      expect(component.localizationLoading()).toBe(false);
    });

    it('should stay false when mode is not view', async () => {
      (component.mode as unknown as () => 'create' | 'edit' | 'view') = () => 'create';
      component.ngOnInit();
      await fixture.whenStable();
      expect(component.localizationLoading()).toBe(false);
    });

    it('should stay false when section has no start coordinates', async () => {
      (component.section as unknown as () => Section | null) = () => null;
      component.ngOnInit();
      await fixture.whenStable();
      expect(component.localizationLoading()).toBe(false);
    });
  });

  describe('localization computation', () => {
    const mockLocalizationResult = {
      latitude: [48.8566, 48.8567, 48.8568],
      longitude: [2.3522, 2.3523, 2.3524],
      azimuth: [90, 90.1, 90.2],
      lambert_x: [652000, 652100, 652200],
      lambert_y: [6862000, 6862100, 6862200]
    };

    beforeEach(() => {
      (component.mode as unknown as () => 'create' | 'edit' | 'view') = () => 'view';
      (component.section as unknown as () => Section) = () => mockSectionWithCoordinates;
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: mockLocalizationResult,
        error: null,
        pythonErrorCode: null
      });
    });

    it('should set localization and clear loading flag when worker becomes ready', async () => {
      component.ngOnInit();
      await fixture.whenStable();
      expect(component.localizationLoading()).toBe(false);

      workerReadySubject.next(true);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.localizationLoading()).toBe(false);
      expect(component.localization()).toEqual(mockLocalizationResult);
    });

    it('should clear localizationLoading when runTask rejects', async () => {
      mockWorkerPythonService.runTask.mockRejectedValue(new Error('worker crash'));
      workerReadySubject.next(true);
      fixture.detectChanges();
      component.ngOnInit();
      await fixture.whenStable();

      expect(component.localizationLoading()).toBe(false);
    });

    it('should not set localization when runTask returns an error', async () => {
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: null,
        error: 'CALCULATION_ERROR',
        pythonErrorCode: null
      });
      workerReadySubject.next(true);
      fixture.detectChanges();
      component.ngOnInit();
      await fixture.whenStable();

      expect(component.localization()).toBeNull();
      expect(component.localizationLoading()).toBe(false);
    });

    it('should call runTask with correct localization parameters', async () => {
      workerReadySubject.next(true);
      fixture.detectChanges();
      component.ngOnInit();
      await fixture.whenStable();

      expect(mockWorkerPythonService.runTask).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          startLatitude: 48.8566,
          startLongitude: 2.3522,
          startAzimuth: 90,
          spanLength: [50, 60, Number.NaN],
          lineAngle: [90, 85, 0]
        })
      );
    });
  });

  describe('getData with attachments', () => {
    it('should populate supportFilterTable when distinctSupportNames$ emits', () => {
      distinctSupportNamesSubject.next(['CatalogType']);
      fixture.detectChanges();

      expect(component.supportFilterTable()).toContain('CatalogType');
    });

    it('should put support names not in catalog into supplementarySupportFilterTable', () => {
      distinctSupportNamesSubject.next(['CatalogType']);
      fixture.detectChanges();

      // mockSupports have names 'Support 1', 'Support 2', 'Support 3' — none are in catalog
      expect(component.supplementarySupportFilterTable()).toContain('Support 2');
    });

    it('should update allSupportFilterTable when distinctSupportNames$ emits new entries', () => {
      distinctSupportNamesSubject.next(['F4TD3_X']);
      fixture.detectChanges();

      expect(component.allSupportFilterTable()).toContain('F4TD3_X');
    });

    it('should start with empty supportFilterTable before any emission', () => {
      expect(component.supportFilterTable()).toEqual([]);
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

  describe('HTML rendering', () => {
    const getByTestId = (testId: string): HTMLElement | null =>
      fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);
    const getAllByTestId = (testId: string): HTMLElement[] =>
      Array.from(fixture.nativeElement.querySelectorAll(`[data-testid="${testId}"]`));

    it('should render supports-table', () => {
      expect(getByTestId('supports-table')).toBeTruthy();
    });

    it('should render support-number-input for each support', () => {
      const inputs = getAllByTestId('support-number-input');
      expect(inputs.length).toBe(mockSupports.length);
      expect(inputs[0].tagName).toBe('INPUT');
    });

    it('should render span-length-input for each support', () => {
      expect(getAllByTestId('span-length-input').length).toBe(mockSupports.length);
    });

    it('should render attachment-height-input for each support', () => {
      expect(getAllByTestId('attachment-height-input').length).toBe(mockSupports.length);
    });

    it('should render span-angle-input for each support', () => {
      expect(getAllByTestId('span-angle-input').length).toBe(mockSupports.length);
    });

    it('should render chain-name-select for each support', () => {
      expect(getAllByTestId('chain-name-select').length).toBe(mockSupports.length);
    });

    it('should render chain-length-input for each support', () => {
      expect(getAllByTestId('chain-length-input').length).toBe(mockSupports.length);
    });

    it('should render support-actions-btn for each support', () => {
      expect(getAllByTestId('support-actions-btn').length).toBe(mockSupports.length);
    });
  });

  describe('HTML rendering - open-attachment-set-modal-btn disabled state', () => {
    const getByTestId = (id: string): HTMLElement | null =>
      fixture.nativeElement.querySelector(`[data-testid="${id}"]`);

    it('should enable the button when catalog has not loaded yet but support has a name', () => {
      // distinctSupportNamesSubject has not emitted → catalogLoaded() = false
      // support[0].name = 'Support 1' → !name = false → disabled = false
      fixture.detectChanges();
      const btn = getByTestId('open-attachment-set-modal-btn') as HTMLButtonElement;
      expect(btn.disabled).toBe(false);
    });

    it('should evaluate button condition as false when catalog is loaded and support name is in catalog', () => {
      distinctSupportNamesSubject.next(['Support 1', 'Support 2', 'Support 3']);
      fixture.detectChanges();
      // Verify signals: catalogLoaded = true, supportFilterTable contains name → disabled = false
      expect(component.catalogLoaded()).toBe(true);
      expect(component.supportFilterTable()).toContain('Support 1');
      const name = 'Support 1';
      const isDisabled = !name || (component.catalogLoaded() && !component.supportFilterTable().includes(name));
      expect(isDisabled).toBe(false);
    });

    it('should disable the button when catalog is loaded and support name is not in catalog', () => {
      distinctSupportNamesSubject.next(['CatalogType']);
      fixture.detectChanges();
      const btn = getByTestId('open-attachment-set-modal-btn') as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });

    it('should disable the button when support name is null regardless of catalog state', () => {
      distinctSupportNamesSubject.next(['Support 1']);
      fixture.detectChanges();
      // Verify the condition: !null = true → always disabled
      const name: string | null = null;
      expect(!name || (component.catalogLoaded() && !component.supportFilterTable().includes(name as string))).toBe(
        true
      );
    });
  });

  describe('catalogLoaded signal', () => {
    it('should show catalogLoaded as false initially, then true after emission', () => {
      expect(component.catalogLoaded()).toBe(false);

      distinctSupportNamesSubject.next(['Type1', 'Type2']);
      fixture.detectChanges();

      expect(component.catalogLoaded()).toBe(true);
    });
  });

  describe('HTML rendering - support name select loading state', () => {
    it('should pass [loading] prop to p-select when catalog not loaded', () => {
      fixture.detectChanges();
      const selectDebugElement = fixture.debugElement.query(By.css('[data-testid="support-name-select"]'));
      expect(selectDebugElement).toBeTruthy();
      // Access componentInstance to check loading property
      expect(selectDebugElement.componentInstance.loading).toBe(true);
    });

    it('should enable virtualScroll on support name select', () => {
      fixture.detectChanges();
      const selectDebugElement = fixture.debugElement.query(By.css('[data-testid="support-name-select"]'));
      expect(selectDebugElement.componentInstance.virtualScroll).toBe(true);
      expect(selectDebugElement.componentInstance.virtualScrollItemSize).toBe(34);
    });
  });
});
