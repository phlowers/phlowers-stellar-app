import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, TemplateRef } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { FieldMeasuringComponent } from './field-measuring.component';
import { ToolsDialogService } from '../tools-dialog.service';
import { createTestMeasureData } from './helpers';
import { MessageService } from 'primeng/api';
import { SectionService } from '@services/sections/section.service';
import { StudiesService } from '@services/studies/studies.service';
import { PlotService } from '@ui/pages/studio/services/plot.service';
import { BehaviorSubject } from 'rxjs';
import { Section } from '@core/domain';
import { LinesService } from '@services/lines/lines.service';

@Component({
  selector: 'app-button',
  standalone: true,
  template: '<button><ng-content></ng-content></button>'
})
class MockButtonComponent {}

@Component({
  selector: 'app-icon',
  standalone: true,
  template: ''
})
class MockIconComponent {}

@Component({
  selector: 'app-header',
  standalone: true,
  template: ''
})
class MockHeaderComponent {}

@Component({
  selector: 'app-field-datas',
  standalone: true,
  template: ''
})
class MockFieldDatasComponent {}

@Component({
  selector: 'app-calculus-setting',
  standalone: true,
  template: ''
})
class MockCalculusSettingComponent {}

describe('FieldMeasuringComponent', () => {
  let component: FieldMeasuringComponent;
  let fixture: ComponentFixture<FieldMeasuringComponent>;
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
      setCurrentSection: jest.fn()
    } as unknown as SectionService;

    // Create a test measure with a proper UUID
    const testMeasure = createTestMeasureData({
      uuid: 'test-measure-uuid'
    });

    const mockSection: Section = {
      uuid: 'test-section-uuid',
      field_measures: [testMeasure],
      selected_field_measure_uuid: testMeasure.uuid
    } as Section;

    const mockPlotService = {
      section: signal<Section | null>(mockSection),
      modifySection: jest.fn().mockResolvedValue(undefined)
    } as unknown as PlotService;

    const mockLinesService = {
      getLines: jest.fn().mockResolvedValue([])
    } as unknown as LinesService;

    await TestBed.configureTestingModule({
      providers: [
        ToolsDialogService,
        provideAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MessageService, useValue: mockMessageService },
        { provide: StudiesService, useValue: mockStudiesService },
        { provide: SectionService, useValue: mockSectionService },
        { provide: PlotService, useValue: mockPlotService },
        { provide: LinesService, useValue: mockLinesService }
      ]
    })
      .overrideComponent(FieldMeasuringComponent, {
        set: {
          imports: [
            MockButtonComponent,
            MockIconComponent,
            MockHeaderComponent,
            MockFieldDatasComponent,
            MockCalculusSettingComponent
          ]
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(FieldMeasuringComponent);
    component = fixture.componentInstance;
    toolsDialogService = TestBed.inject(ToolsDialogService);
  });

  describe('Component Creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should inject ToolsDialogService', () => {
      expect(component['toolsDialogService']).toBeDefined();
      expect(component['toolsDialogService']).toBeInstanceOf(
        ToolsDialogService
      );
    });

    it('should initialize measureData with createInitialMeasureData result', () => {
      // Component initializes with createInitialMeasureData(null, '') which creates mostly null values
      const measureData = component.measureData();
      expect(measureData).toBeDefined();
      expect(measureData.calculationMethod).toBe('papoto');
      expect(measureData.calculationType).toBe('parametre');
      expect(measureData.diffuseSolarFlux).toBe(123);
      expect(measureData.diffuseDirectSolarFlux).toBe(246);
    });

    it('should initialize activeTab with terrainData', () => {
      expect(component.activeTab()).toBe('terrainData');
    });
  });

  describe('Lifecycle Hooks', () => {
    it('should set templates on ngAfterViewInit', () => {
      const setTemplatesSpy = jest.spyOn(toolsDialogService, 'setTemplates');

      // Create mock templates
      component.headerTemplate = {} as TemplateRef<unknown>;
      component.footerTemplate = {} as TemplateRef<unknown>;

      component.ngAfterViewInit();

      expect(setTemplatesSpy).toHaveBeenCalledWith({
        header: component.headerTemplate,
        footer: component.footerTemplate
      });
    });

    it('should clear templates on ngOnDestroy', () => {
      const setTemplatesSpy = jest.spyOn(toolsDialogService, 'setTemplates');

      component.ngOnDestroy();

      expect(setTemplatesSpy).toHaveBeenCalledWith({});
    });

    it('should react to dialog open state in effect', async () => {
      toolsDialogService.openTool('field-measuring');
      fixture.detectChanges();

      // field-measuring opens init dialog first
      expect(toolsDialogService.isInitOpen()).toBe(true);
      expect(toolsDialogService.isMainOpen()).toBe(false);
    });
  });

  describe('Signal Properties', () => {
    it('should have windDirectionOptions signal initialized', () => {
      expect(component.windDirectionOptions()).toBeDefined();
      expect(Array.isArray(component.windDirectionOptions())).toBe(true);
    });

    it('should have skyCoverOptions signal initialized', () => {
      expect(component.skyCoverOptions()).toBeDefined();
      expect(Array.isArray(component.skyCoverOptions())).toBe(true);
    });

    it('should have leftSupportOptions signal initialized', () => {
      expect(component.leftSupportOptions()).toBeDefined();
      expect(Array.isArray(component.leftSupportOptions())).toBe(true);
    });
  });

  describe('onVisibleChange', () => {
    it('should close tool when visible is false', () => {
      const closeToolSpy = jest.spyOn(toolsDialogService, 'closeTool');

      component.onVisibleChange(false);

      expect(closeToolSpy).toHaveBeenCalled();
    });

    it('should not close tool when visible is true', () => {
      const closeToolSpy = jest.spyOn(toolsDialogService, 'closeTool');

      component.onVisibleChange(true);

      expect(closeToolSpy).not.toHaveBeenCalled();
    });
  });

  describe('onFieldChange', () => {
    it('should update measureData signal with new field value', () => {
      const initialData = component.measureData();

      component.onFieldChange('longitude', 45.123456);

      const updatedData = component.measureData();
      expect(updatedData.longitude).toBe(45.123456);
      expect(updatedData).not.toBe(initialData);
    });

    it('should preserve other fields when updating one field', () => {
      const initialLine = component.measureData().link;

      component.onFieldChange('longitude', 99.999999);

      expect(component.measureData().link).toBe(initialLine);
      expect(component.measureData().longitude).toBe(99.999999);
    });

    it('should handle multiple field changes', () => {
      component.onFieldChange('longitude', 10);
      component.onFieldChange('latitude', 20);
      component.onFieldChange('altitude', 30);

      const data = component.measureData();
      expect(data.longitude).toBe(10);
      expect(data.latitude).toBe(20);
      expect(data.altitude).toBe(30);
    });

    it('should handle string field changes', () => {
      component.onFieldChange('link', 'New Line Name');
      expect(component.measureData().link).toBe('New Line Name');
    });

    it('should handle null field changes', () => {
      component.onFieldChange('ambientTemperature', null);
      expect(component.measureData().ambientTemperature).toBeNull();
    });
  });

  describe('onExport', () => {
    it('should log export data', () => {
      const consoleSpy = jest.spyOn(console, 'log');

      component.onExport();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Export',
        component.measureData()
      );
    });
  });

  describe('onReport', () => {
    it('should log report data', () => {
      const consoleSpy = jest.spyOn(console, 'log');

      component.onReport();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Report',
        component.measureData()
      );
    });
  });

  describe('onSave', () => {
    it('should call modifySection with updated field_measures and close tool dialog', async () => {
      const plotService = TestBed.inject(PlotService);
      const modifySectionSpy = jest.spyOn(plotService, 'modifySection');
      const closeToolSpy = jest.spyOn(toolsDialogService, 'closeTool');

      // Open main dialog to initialize measureData from PlotService
      toolsDialogService.openTool('field-measuring');
      toolsDialogService.proceedToMainComponent();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const measureData = component.measureData();
      const section = plotService.section();

      await component.onSave();

      expect(modifySectionSpy).toHaveBeenCalledWith({
        field_measures: [...(section?.field_measures || []), measureData]
      });
      expect(closeToolSpy).toHaveBeenCalled();
    });

    it('should return early if section is not available', async () => {
      const plotService = TestBed.inject(PlotService);
      const modifySectionSpy = jest.spyOn(plotService, 'modifySection');
      const closeToolSpy = jest.spyOn(toolsDialogService, 'closeTool');

      // Set section to null using the signal setter
      const sectionSignal = plotService.section as ReturnType<
        typeof signal<Section | null>
      >;
      sectionSignal.set(null);

      await component.onSave();

      expect(modifySectionSpy).not.toHaveBeenCalled();
      expect(closeToolSpy).not.toHaveBeenCalled();
    });

    it('should close tool dialog after saving', async () => {
      const closeToolSpy = jest.spyOn(toolsDialogService, 'closeTool');

      // Open main dialog to initialize measureData from PlotService
      toolsDialogService.openTool('field-measuring');
      toolsDialogService.proceedToMainComponent();
      await new Promise((resolve) => setTimeout(resolve, 100));

      await component.onSave();

      expect(closeToolSpy).toHaveBeenCalled();
    });
  });

  describe('onImportStationData', () => {
    it('should log import station data message', () => {
      const consoleSpy = jest.spyOn(console, 'log');

      component.onImportStationData();

      expect(consoleSpy).toHaveBeenCalledWith('Import station data');
    });
  });

  describe('Active Tab Management', () => {
    it('should allow changing active tab', () => {
      component.activeTab.set('parameterCalculation');
      expect(component.activeTab()).toBe('parameterCalculation');

      component.activeTab.set('temperatureCalculation');
      expect(component.activeTab()).toBe('temperatureCalculation');

      component.activeTab.set('parameterAt15CWithoutWind');
      expect(component.activeTab()).toBe('parameterAt15CWithoutWind');
    });
  });

  describe('Integration with ToolsDialogService', () => {
    it('should work with service open state', async () => {
      expect(toolsDialogService.isMainOpen()).toBe(false);

      toolsDialogService.openTool('field-measuring');
      expect(toolsDialogService.isInitOpen()).toBe(true);

      // Proceed to main component
      toolsDialogService.proceedToMainComponent();

      // Wait for the timeout that opens main dialog
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(toolsDialogService.isMainOpen()).toBe(true);

      await component.onSave();
      expect(toolsDialogService.isMainOpen()).toBe(false);
    });

    it('should work with onVisibleChange integration', async () => {
      toolsDialogService.openTool('field-measuring');
      toolsDialogService.proceedToMainComponent();

      // Wait for the timeout that opens main dialog
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(toolsDialogService.isMainOpen()).toBe(true);

      component.onVisibleChange(false);
      expect(toolsDialogService.isMainOpen()).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle field changes', () => {
      component.onFieldChange('ambientTemperature', 25);

      expect(component.measureData().ambientTemperature).toBe(25);
    });

    it('should handle multiple save calls', async () => {
      const closeToolSpy = jest.spyOn(toolsDialogService, 'closeTool');
      // Open main dialog to initialize measureData from PlotService
      toolsDialogService.openTool('field-measuring');
      toolsDialogService.proceedToMainComponent();
      await new Promise((resolve) => setTimeout(resolve, 100));

      await component.onSave();
      // Re-open for subsequent calls
      toolsDialogService.openTool('field-measuring');
      toolsDialogService.proceedToMainComponent();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await component.onSave();
      // Re-open for third call
      toolsDialogService.openTool('field-measuring');
      toolsDialogService.proceedToMainComponent();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await component.onSave();

      expect(closeToolSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('Constructor Effect', () => {
    it('should create component with effect registered', () => {
      // The effect is registered in constructor
      expect(component).toBeTruthy();

      // Opening the dialog should trigger the effect
      toolsDialogService.openTool('field-measuring');
      fixture.detectChanges();

      // field-measuring opens init dialog first
      expect(toolsDialogService.isInitOpen()).toBe(true);
      expect(toolsDialogService.isMainOpen()).toBe(false);
    });
  });

  describe('initializeMeasureData', () => {
    it('should call initializeMeasureData when dialog opens to main view', async () => {
      const linesService = TestBed.inject(LinesService);

      const getLinesSpy = jest.spyOn(linesService, 'getLines');

      toolsDialogService.openTool('field-measuring');
      toolsDialogService.proceedToMainComponent();

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 200));
      fixture.detectChanges();

      // Verify that getLines was called as part of initialization
      expect(getLinesSpy).toHaveBeenCalled();

      const measureData = component.measureData();
      // Verify that data from section was populated
      expect(measureData.voltage).toBeDefined();
      expect(measureData.link).toBeDefined();
    });
  });

  describe('onFieldChange edge cases', () => {
    it('should return early when measureData is falsy', () => {
      component.measureData.set(null as any);

      component.onFieldChange('name', 'New Name');

      expect(component.measureData()).toBeNull();
    });
  });

  describe('onSave - adding new measure', () => {
    let plotService: PlotService;

    beforeEach(() => {
      plotService = TestBed.inject(PlotService);
    });

    it('should add new field measure when uuid does not exist', async () => {
      const existingMeasure = createTestMeasureData({ uuid: 'existing-uuid' });
      const newMeasure = createTestMeasureData({ uuid: 'new-uuid' });

      const mockSection = {
        uuid: 'section-789',
        field_measures: [existingMeasure],
        selected_field_measure_uuid: 'new-uuid'
      };

      plotService.section = signal(mockSection as any);
      component.measureData.set(newMeasure);

      const modifySpy = jest.spyOn(plotService, 'modifySection');
      const closeToolSpy = jest.spyOn(toolsDialogService, 'closeTool');

      await component.onSave();

      expect(modifySpy).toHaveBeenCalledWith({
        field_measures: [existingMeasure, newMeasure]
      });
      expect(closeToolSpy).toHaveBeenCalled();
    });

    it('should return early when measureData is null', async () => {
      const mockSection = {
        uuid: 'section-999',
        field_measures: []
      };

      plotService.section = signal(mockSection as any);
      component.measureData.set(null as any);

      const modifySpy = jest.spyOn(plotService, 'modifySection');

      await component.onSave();

      expect(modifySpy).not.toHaveBeenCalled();
    });
  });
});
