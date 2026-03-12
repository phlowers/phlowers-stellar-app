import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, TemplateRef } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { FieldMeasuringComponent } from '@features/studio/field-measuring/presentation/components/field-measuring/field-measuring.component';
import { ToolbarDialogService } from '@features/studio/toolbar/presentation/services/toolbar-dialog.service';
import { createTestMeasureData } from './helpers';
import { MessageService } from 'primeng/api';
import { SectionService } from '@services/sections/section.service';
import { StudiesService } from '@services/studies/studies.service';
import { PlotService } from '@features/studio/core/services/plot.service';
import { BehaviorSubject } from 'rxjs';
import { Section } from '@core/domain';
import { LinesService } from '@services/lines/lines.service';
import { CablesService } from '@services/cables/cables.service';
import { TRANSIT_BOUNDS } from './constants';

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
  let toolbarDialogService: ToolbarDialogService;

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

    const mockCablesService = {
      getCables: jest.fn().mockResolvedValue([]),
      ready: new BehaviorSubject<boolean>(true)
    } as unknown as CablesService;

    await TestBed.configureTestingModule({
      providers: [
        ToolbarDialogService,
        provideAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MessageService, useValue: mockMessageService },
        { provide: StudiesService, useValue: mockStudiesService },
        { provide: SectionService, useValue: mockSectionService },
        { provide: PlotService, useValue: mockPlotService },
        { provide: LinesService, useValue: mockLinesService },
        { provide: CablesService, useValue: mockCablesService }
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
    toolbarDialogService = TestBed.inject(ToolbarDialogService);
  });

  describe('Component Creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should inject ToolbarDialogService', () => {
      expect(component['toolbarDialogService']).toBeDefined();
      expect(component['toolbarDialogService']).toBeInstanceOf(ToolbarDialogService);
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
      const setTemplatesSpy = jest.spyOn(toolbarDialogService, 'setTemplates');

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
      const setTemplatesSpy = jest.spyOn(toolbarDialogService, 'setTemplates');

      component.ngOnDestroy();

      expect(setTemplatesSpy).toHaveBeenCalledWith({});
    });

    it('should react to dialog open state in effect', async () => {
      toolbarDialogService.openTool('field-measuring');
      fixture.detectChanges();

      // field-measuring opens init phase first
      expect(toolbarDialogService.isOpen()).toBe(true);
      expect(toolbarDialogService.phase()).toBe('init');
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
      const closeToolSpy = jest.spyOn(toolbarDialogService, 'closeTool');

      component.onVisibleChange(false);

      expect(closeToolSpy).toHaveBeenCalled();
    });

    it('should not close tool when visible is true', () => {
      const closeToolSpy = jest.spyOn(toolbarDialogService, 'closeTool');

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

      expect(consoleSpy).toHaveBeenCalledWith('Export', component.measureData());
    });
  });

  describe('onReport', () => {
    it('should log report data', () => {
      const consoleSpy = jest.spyOn(console, 'log');

      component.onReport();

      expect(consoleSpy).toHaveBeenCalledWith('Report', component.measureData());
    });
  });

  describe('onSave', () => {
    it('should call modifySection with updated field_measures', async () => {
      const plotService = TestBed.inject(PlotService);
      const modifySectionSpy = jest.spyOn(plotService, 'modifySection');

      // Open main dialog to initialize measureData from PlotService
      toolbarDialogService.openTool('field-measuring');
      toolbarDialogService.proceedToMainComponent();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const measureData = component.measureData();
      const section = plotService.section();

      await component.onSave();

      expect(modifySectionSpy).toHaveBeenCalledWith({
        field_measures: [...(section?.field_measures || []), measureData]
      });
    });

    it('should return early if section is not available', async () => {
      const plotService = TestBed.inject(PlotService);
      const modifySectionSpy = jest.spyOn(plotService, 'modifySection');
      const closeToolSpy = jest.spyOn(toolbarDialogService, 'closeTool');

      // Set section to null using the signal setter
      const sectionSignal = plotService.section as ReturnType<typeof signal<Section | null>>;
      sectionSignal.set(null);

      await component.onSave();

      expect(modifySectionSpy).not.toHaveBeenCalled();
      expect(closeToolSpy).not.toHaveBeenCalled();
    });

    it('should close tool dialog after saving', async () => {
      const closeToolSpy = jest.spyOn(toolbarDialogService, 'closeTool');

      // Open main dialog to initialize measureData from PlotService
      toolbarDialogService.openTool('field-measuring');
      toolbarDialogService.proceedToMainComponent();
      await new Promise((resolve) => setTimeout(resolve, 100));

      await component.onSave();

      // onSave no longer closes the tool - it shows a success message instead
      expect(closeToolSpy).not.toHaveBeenCalled();
    });
  });

  describe('isFormValid - transit bounds', () => {
    const validBase = {
      name: 'Test',
      span: [1, 2],
      longitude: 2,
      latitude: 48,
      altitude: 100,
      azimuth: 90,
      windSpeed: 10,
      ambientTemperature: 20,
      windDirection: 'North',
      skyCover: 'N5'
    };

    it('should return true when transit is null (progressive save allowed)', () => {
      component.measureData.set(createTestMeasureData({ ...validBase, transit: null }));
      expect(component.isFormValid()).toBeTruthy();
    });

    it('should return true when transit is within bounds', () => {
      component.measureData.set(createTestMeasureData({ ...validBase, transit: 2000 }));
      expect(component.isFormValid()).toBeTruthy();
    });

    it('should return true when transit is at minimum boundary', () => {
      component.measureData.set(createTestMeasureData({ ...validBase, transit: TRANSIT_BOUNDS.min }));
      expect(component.isFormValid()).toBeTruthy();
    });

    it('should return true when transit is at maximum boundary', () => {
      component.measureData.set(createTestMeasureData({ ...validBase, transit: TRANSIT_BOUNDS.max }));
      expect(component.isFormValid()).toBeTruthy();
    });

    it('should return false when transit is below minimum', () => {
      component.measureData.set(createTestMeasureData({ ...validBase, transit: TRANSIT_BOUNDS.min - 1 }));
      expect(component.isFormValid()).toBeFalsy();
    });

    it('should return false when transit is above maximum', () => {
      component.measureData.set(createTestMeasureData({ ...validBase, transit: TRANSIT_BOUNDS.max + 1 }));
      expect(component.isFormValid()).toBeFalsy();
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

  describe('Integration with ToolbarDialogService', () => {
    it('should work with service open state', async () => {
      expect(toolbarDialogService.isOpen()).toBe(false);

      toolbarDialogService.openTool('field-measuring');
      expect(toolbarDialogService.isOpen()).toBe(true);
      expect(toolbarDialogService.phase()).toBe('init');

      // Proceed to main component (event-driven transition)
      toolbarDialogService.proceedToMainComponent();
      toolbarDialogService.completePendingTransition();
      expect(toolbarDialogService.isOpen()).toBe(true);
      expect(toolbarDialogService.phase()).toBe('main');

      await component.onSave();
      // onSave no longer closes the dialog - it shows a success message instead
      expect(toolbarDialogService.isOpen()).toBe(true);
      expect(toolbarDialogService.phase()).toBe('main');
    });

    it('should work with onVisibleChange integration', () => {
      toolbarDialogService.openTool('field-measuring');
      toolbarDialogService.proceedToMainComponent();
      toolbarDialogService.completePendingTransition();
      expect(toolbarDialogService.isOpen()).toBe(true);
      expect(toolbarDialogService.phase()).toBe('main');

      component.onVisibleChange(false);
      expect(toolbarDialogService.isOpen()).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle field changes', () => {
      component.onFieldChange('ambientTemperature', 25);

      expect(component.measureData().ambientTemperature).toBe(25);
    });

    it('should handle multiple save calls', async () => {
      const plotService = TestBed.inject(PlotService);
      const modifySectionSpy = jest.spyOn(plotService, 'modifySection');

      // Open main dialog to initialize measureData from PlotService
      toolbarDialogService.openTool('field-measuring');
      toolbarDialogService.proceedToMainComponent();
      toolbarDialogService.completePendingTransition();

      await component.onSave();
      // Re-open for subsequent calls
      toolbarDialogService.openTool('field-measuring');
      toolbarDialogService.proceedToMainComponent();
      toolbarDialogService.completePendingTransition();
      await component.onSave();
      // Re-open for third call
      toolbarDialogService.openTool('field-measuring');
      toolbarDialogService.proceedToMainComponent();
      toolbarDialogService.completePendingTransition();
      await component.onSave();

      expect(modifySectionSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('Constructor Effect', () => {
    it('should create component with effect registered', () => {
      // The effect is registered in constructor
      expect(component).toBeTruthy();

      // Opening the dialog should trigger the effect
      toolbarDialogService.openTool('field-measuring');
      fixture.detectChanges();

      // field-measuring opens init phase first
      expect(toolbarDialogService.isOpen()).toBe(true);
      expect(toolbarDialogService.phase()).toBe('init');
    });
  });

  describe('initializeMeasureData', () => {
    it('should call initializeMeasureData when dialog opens to main view', async () => {
      const linesService = TestBed.inject(LinesService);

      const getLinesSpy = jest.spyOn(linesService, 'getLines');

      toolbarDialogService.openTool('field-measuring');
      toolbarDialogService.proceedToMainComponent();
      toolbarDialogService.completePendingTransition();
      fixture.detectChanges();

      // Wait for async operations (getLines, getCables)
      await new Promise((resolve) => setTimeout(resolve, 50));
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

      await component.onSave();

      expect(modifySpy).toHaveBeenCalledWith({
        field_measures: [existingMeasure, newMeasure]
      });
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
