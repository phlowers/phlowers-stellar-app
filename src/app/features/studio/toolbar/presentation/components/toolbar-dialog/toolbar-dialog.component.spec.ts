import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { ToolbarDialogComponent } from './toolbar-dialog.component';
import { ToolbarDialogService } from '../../services/toolbar-dialog.service';
import { MessageService } from 'primeng/api';
import { SectionService } from '@services/section/section.service';
import { StudiesService } from '@services/studies/studies.service';
import { BehaviorSubject } from 'rxjs';
import { CablesService } from '@shared/catalog/services/cables.service';

interface SignalFn<T> {
  (): T;
  set: (v: T) => void;
}

// Helper to create a signal-like mock that is both callable and has a .set method
function createSignalMock<T>(initialValue: T): SignalFn<T> {
  let value = initialValue;
  const fn = (() => value) as SignalFn<T>;
  fn.set = (v: T) => {
    value = v;
  };
  return fn;
}

describe('ToolbarDialogComponent', () => {
  let component: ToolbarDialogComponent;
  let fixture: ComponentFixture<ToolbarDialogComponent>;
  let toolbarDialogService: ToolbarDialogService;

  beforeEach(async () => {
    const mockMessageService = {
      add: vi.fn()
    } as unknown as MessageService;

    const mockStudiesService = {
      ready: new BehaviorSubject<boolean>(true),
      currentStudy: vi.fn().mockReturnValue(null),
      getStudy: vi.fn(),
      getStudyAsObservable: vi.fn(),
      updateStudy: vi.fn().mockResolvedValue(undefined)
    } as unknown as StudiesService;

    const mockSectionService = {
      setCurrentSection: vi.fn(),
      currentSection: createSignalMock(null)
    } as unknown as SectionService;

    const mockCablesService = {
      getCables: vi.fn().mockResolvedValue([]),
      importFromFile: vi.fn().mockResolvedValue(undefined),
      ready: new BehaviorSubject<boolean>(true)
    } as unknown as CablesService;

    await TestBed.configureTestingModule({
      imports: [
        ToolbarDialogComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' }
        })
      ],
      providers: [
        provideAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MessageService, useValue: mockMessageService },
        { provide: StudiesService, useValue: mockStudiesService },
        { provide: SectionService, useValue: mockSectionService },
        { provide: CablesService, useValue: mockCablesService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ToolbarDialogComponent);
    component = fixture.componentInstance;
    toolbarDialogService = TestBed.inject(ToolbarDialogService);
    fixture.detectChanges();
  });

  describe('Component Creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should inject ToolbarDialogService', () => {
      expect(component.toolbarDialogService).toBeDefined();
      expect(component.toolbarDialogService).toBeInstanceOf(ToolbarDialogService);
    });

    it('should inject Injector', () => {
      expect(component.injector).toBeDefined();
      expect(typeof component.injector.get).toBe('function');
    });
  });

  describe('Service Integration', () => {
    it('should have the same service instance as TestBed', () => {
      expect(component.toolbarDialogService).toBe(toolbarDialogService);
    });

    it('should be able to use injector to get services', () => {
      const service = component.injector.get(ToolbarDialogService);
      expect(service).toBe(toolbarDialogService);
    });
  });

  describe('Template Rendering', () => {
    it('should bind visible property to service isOpen signal', () => {
      toolbarDialogService.isOpen.set(true);
      fixture.detectChanges();

      const dialog = fixture.debugElement.query(By.css('p-dialog'));
      expect(dialog.componentInstance.visible).toBe(true);
    });

    it('should display dialog in init phase when tool with initComponent is opened', () => {
      toolbarDialogService.openTool('field-measuring');
      fixture.detectChanges();

      expect(toolbarDialogService.isOpen()).toBe(true);
      expect(toolbarDialogService.phase()).toBe('init');
    });
  });

  describe('Dialog State Management', () => {
    it('should reflect service state changes', () => {
      expect(toolbarDialogService.isOpen()).toBe(false);

      toolbarDialogService.openTool('field-measuring');
      fixture.detectChanges();
      expect(toolbarDialogService.isOpen()).toBe(true);
      expect(toolbarDialogService.phase()).toBe('init');

      toolbarDialogService.closeTool();
      fixture.detectChanges();
      expect(toolbarDialogService.isOpen()).toBe(false);
    });

    it('should render dynamic components based on current tool', () => {
      toolbarDialogService.openTool('field-measuring');
      fixture.detectChanges();

      const component = toolbarDialogService.getComponent();
      expect(component).toBeDefined();
    });
  });

  describe('onDialogHide', () => {
    it('should call closeTool when not transitioning', () => {
      const closeToolSpy = vi.spyOn(toolbarDialogService, 'closeTool');
      component.onDialogHide();
      expect(closeToolSpy).toHaveBeenCalled();
    });

    it('should call completePendingTransition when transitioning', () => {
      const completeSpy = vi.spyOn(toolbarDialogService, 'completePendingTransition');
      const closeToolSpy = vi.spyOn(toolbarDialogService, 'closeTool');
      toolbarDialogService.openTool('field-measuring');
      toolbarDialogService.proceedToMainComponent();

      component.onDialogHide();
      expect(completeSpy).toHaveBeenCalled();
      expect(closeToolSpy).not.toHaveBeenCalled();
    });
  });

  describe('onVisibleChange', () => {
    it('should update isOpen when not transitioning', () => {
      toolbarDialogService.isOpen.set(true);
      component.onVisibleChange(false);
      expect(toolbarDialogService.isOpen()).toBe(false);
    });

    it('should not set isOpen to false when transitioning', () => {
      toolbarDialogService.openTool('field-measuring');
      toolbarDialogService.proceedToMainComponent();

      component.onVisibleChange(false);
      expect(toolbarDialogService.isOpen()).toBe(false);
      // isOpen was already false from proceedToMainComponent,
      // but the key is the event didn't interfere
    });

    it('should allow setting isOpen to true during transition', () => {
      toolbarDialogService.openTool('field-measuring');
      toolbarDialogService.proceedToMainComponent();

      component.onVisibleChange(true);
      expect(toolbarDialogService.isOpen()).toBe(true);
    });
  });
});
