import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ToolsDialogComponent } from './tools-dialog.component';
import { ToolsDialogService } from './tools-dialog.service';
import { MessageService } from 'primeng/api';
import { SectionService } from '@src/app/core/services/sections/section.service';
import { StudiesService } from '@src/app/core/services/studies/studies.service';
import { BehaviorSubject } from 'rxjs';
import { CablesService } from '@src/app/core/services/cables/cables.service';

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

describe('ToolsDialogComponent', () => {
  let component: ToolsDialogComponent;
  let fixture: ComponentFixture<ToolsDialogComponent>;
  let toolsDialogService: ToolsDialogService;

  beforeEach(async () => {
    const mockMessageService = {
      add: jest.fn()
    } as unknown as MessageService;

    const mockStudiesService = {
      ready: new BehaviorSubject<boolean>(true),
      currentStudy: jest.fn().mockReturnValue(null),
      getStudy: jest.fn(),
      getStudyAsObservable: jest.fn(),
      updateStudy: jest.fn().mockResolvedValue(undefined)
    } as unknown as StudiesService;

    const mockSectionService = {
      setCurrentSection: jest.fn(),
      currentSection: createSignalMock(null)
    } as unknown as SectionService;

    const mockCablesService = {
      getCables: jest.fn().mockResolvedValue([]),
      importFromFile: jest.fn().mockResolvedValue(undefined),
      ready: new BehaviorSubject<boolean>(true)
    } as unknown as CablesService;

    await TestBed.configureTestingModule({
      imports: [ToolsDialogComponent],
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

    fixture = TestBed.createComponent(ToolsDialogComponent);
    component = fixture.componentInstance;
    toolsDialogService = TestBed.inject(ToolsDialogService);
    fixture.detectChanges();
  });

  describe('Component Creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should inject ToolsDialogService', () => {
      expect(component.toolsDialogService).toBeDefined();
      expect(component.toolsDialogService).toBeInstanceOf(ToolsDialogService);
    });

    it('should inject Injector', () => {
      expect(component.injector).toBeDefined();
      expect(typeof component.injector.get).toBe('function');
    });
  });

  describe('Service Integration', () => {
    it('should have the same service instance as TestBed', () => {
      expect(component.toolsDialogService).toBe(toolsDialogService);
    });

    it('should be able to use injector to get services', () => {
      const service = component.injector.get(ToolsDialogService);
      expect(service).toBe(toolsDialogService);
    });
  });

  describe('Template Rendering', () => {
    it('should render p-dialog components', () => {
      const element = fixture.nativeElement;
      const dialogs = element.querySelectorAll('p-dialog');
      expect(dialogs.length).toBe(2); // Init and Main dialogs
    });

    it('should bind visible property to service isInitOpen signal for init dialog', () => {
      toolsDialogService.isInitOpen.set(true);
      fixture.detectChanges();

      const dialogs = fixture.nativeElement.querySelectorAll('p-dialog');
      expect(dialogs[0].getAttribute('ng-reflect-visible')).toBe('true');
    });

    it('should display init dialog when tool with initComponent is opened', () => {
      toolsDialogService.openTool('field-measuring');
      fixture.detectChanges();

      expect(toolsDialogService.isInitOpen()).toBe(true);
      expect(toolsDialogService.isMainOpen()).toBe(false);
    });
  });

  describe('Dialog State Management', () => {
    it('should reflect service state changes', () => {
      expect(toolsDialogService.isInitOpen()).toBe(false);
      expect(toolsDialogService.isMainOpen()).toBe(false);

      toolsDialogService.openTool('field-measuring');
      fixture.detectChanges();
      expect(toolsDialogService.isInitOpen()).toBe(true);
      expect(toolsDialogService.isMainOpen()).toBe(false);

      toolsDialogService.closeTool();
      fixture.detectChanges();
      expect(toolsDialogService.isInitOpen()).toBe(false);
      expect(toolsDialogService.isMainOpen()).toBe(false);
    });

    it('should render dynamic components based on current tool', () => {
      toolsDialogService.openTool('field-measuring');
      fixture.detectChanges();

      const initComponent = toolsDialogService.getInitComponent();
      const mainComponent = toolsDialogService.getMainComponent();
      expect(initComponent).toBeDefined();
      expect(mainComponent).toBeDefined();
    });
  });
});
