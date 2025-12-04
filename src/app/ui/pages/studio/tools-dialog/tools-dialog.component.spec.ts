import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ToolsDialogComponent } from './tools-dialog.component';
import { ToolsDialogService } from './tools-dialog.service';

describe('ToolsDialogComponent', () => {
  let component: ToolsDialogComponent;
  let fixture: ComponentFixture<ToolsDialogComponent>;
  let toolsDialogService: ToolsDialogService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToolsDialogComponent],
      providers: [provideAnimations()]
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
    it('should render p-dialog component', () => {
      const element = fixture.nativeElement;
      const dialog = element.querySelector('p-dialog');
      expect(dialog).toBeTruthy();
    });

    it('should bind visible property to service isOpen signal', () => {
      toolsDialogService.isOpen.set(true);
      fixture.detectChanges();

      const dialog = fixture.nativeElement.querySelector('p-dialog');
      expect(dialog.getAttribute('ng-reflect-visible')).toBe('true');
    });

    it('should display dialog with correct style when tool is open', () => {
      toolsDialogService.openTool('field-measuring');
      fixture.detectChanges();

      expect(toolsDialogService.isOpen()).toBe(true);
    });
  });

  describe('Dialog State Management', () => {
    it('should reflect service state changes', () => {
      expect(toolsDialogService.isOpen()).toBe(false);

      toolsDialogService.openTool('field-measuring');
      fixture.detectChanges();
      expect(toolsDialogService.isOpen()).toBe(true);

      toolsDialogService.closeTool();
      fixture.detectChanges();
      expect(toolsDialogService.isOpen()).toBe(false);
    });

    it('should render dynamic component based on current tool', () => {
      toolsDialogService.openTool('field-measuring');
      fixture.detectChanges();

      const component = toolsDialogService.getCurrentToolComponent();
      expect(component).toBeDefined();
    });
  });
});
