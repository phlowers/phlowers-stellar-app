import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, TemplateRef } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FieldMeasuringComponent } from './field-measuring.component';
import { ToolsDialogService } from '../tools-dialog.service';
import { INITIAL_MEASURE_DATA, INITIAL_CALCULATION_RESULTS } from './mock-data';

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
    await TestBed.configureTestingModule({
      providers: [
        ToolsDialogService,
        provideAnimations(),
        provideHttpClient(),
        provideHttpClientTesting()
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

    it('should initialize measureData with INITIAL_MEASURE_DATA', () => {
      expect(component.measureData()).toEqual(INITIAL_MEASURE_DATA);
    });

    it('should initialize activeTab with terrainData', () => {
      expect(component.activeTab()).toBe('terrainData');
    });

    it('should initialize calculationResults with INITIAL_CALCULATION_RESULTS', () => {
      expect(component.calculationResults()).toEqual(
        INITIAL_CALCULATION_RESULTS
      );
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

    it('should react to dialog open state in effect', () => {
      toolsDialogService.openTool('field-measuring');
      fixture.detectChanges();

      // field-measuring opens init dialog first
      expect(toolsDialogService.isInitOpen()).toBe(true);
      expect(toolsDialogService.isMainOpen()).toBe(false);
    });
  });

  describe('Signal Properties', () => {
    it('should have spanOptions signal initialized', () => {
      expect(component.spanOptions()).toBeDefined();
      expect(Array.isArray(component.spanOptions())).toBe(true);
    });

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

    it('should have cableOptions signal initialized', () => {
      expect(component.cableOptions()).toBeDefined();
      expect(Array.isArray(component.cableOptions())).toBe(true);
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
      const initialLine = component.measureData().line;

      component.onFieldChange('longitude', 99.999999);

      expect(component.measureData().line).toBe(initialLine);
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
      component.onFieldChange('line', 'New Line Name');
      expect(component.measureData().line).toBe('New Line Name');
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
    it('should log save data', () => {
      const consoleSpy = jest.spyOn(console, 'log');

      component.onSave();

      expect(consoleSpy).toHaveBeenCalledWith('Save', component.measureData());
    });

    it('should close tool dialog', () => {
      const closeToolSpy = jest.spyOn(toolsDialogService, 'closeTool');

      component.onSave();

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

  describe('onCalculate', () => {
    it('should set calculation results', () => {
      component.onCalculate();

      const results = component.calculationResults();
      expect(results.parameter).toBe(123);
      expect(results.parameterUncertainty).toBe(123);
      expect(results.criteria05).toBe(true);
      expect(results.sideDValid).toBe(true);
      expect(results.validMeasurement).toBe(true);
    });

    it('should log calculate data', () => {
      const consoleSpy = jest.spyOn(console, 'log');

      component.onCalculate();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Calculate',
        component.measureData()
      );
    });

    it('should set parameter values', () => {
      component.onCalculate();

      const results = component.calculationResults();
      expect(results.parameter12).toBe(123);
      expect(results.parameter23).toBe(123);
      expect(results.parameter13).toBe(123);
    });

    it('should set cable temperature values', () => {
      component.onCalculate();

      const results = component.calculationResults();
      expect(results.cableTemperature).toBe(123);
      expect(results.cableTemperatureUncertainty).toBe(3);
      expect(results.cableSolarFlux).toBe(205);
    });

    it('should not set parameter 15C values', () => {
      component.onCalculate();

      const results = component.calculationResults();
      expect(results.parameter15CMinusUncertainty).toBeNull();
      expect(results.parameter15C).toBeNull();
      expect(results.parameter15CPlusUncertainty).toBeNull();
    });
  });

  describe('onCalculateParameter15C', () => {
    beforeEach(() => {
      // Set initial calculation results
      component.onCalculate();
    });

    it('should update calculation results with 15C parameters', () => {
      component.onCalculateParameter15C();

      const results = component.calculationResults();
      expect(results.parameter15CMinusUncertainty).toBe(1885);
      expect(results.parameter15C).toBe(1900);
      expect(results.parameter15CPlusUncertainty).toBe(1900);
    });

    it('should preserve existing calculation results', () => {
      const initialParameter = component.calculationResults().parameter;

      component.onCalculateParameter15C();

      expect(component.calculationResults().parameter).toBe(initialParameter);
    });

    it('should log calculate parameter at 15C data', () => {
      const consoleSpy = jest.spyOn(console, 'log');

      component.onCalculateParameter15C();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Calculate Parameter at 15°C',
        component.measureData()
      );
    });
  });

  describe('onCreateInitialCondition', () => {
    it('should log create initial condition for minus type', () => {
      const consoleSpy = jest.spyOn(console, 'log');

      component.onCreateInitialCondition('minus');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Create initial condition:',
        'minus'
      );
    });

    it('should log create initial condition for nominal type', () => {
      const consoleSpy = jest.spyOn(console, 'log');

      component.onCreateInitialCondition('nominal');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Create initial condition:',
        'nominal'
      );
    });

    it('should log create initial condition for plus type', () => {
      const consoleSpy = jest.spyOn(console, 'log');

      component.onCreateInitialCondition('plus');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Create initial condition:',
        'plus'
      );
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
    it('should work with service open state', (done) => {
      expect(toolsDialogService.isMainOpen()).toBe(false);

      toolsDialogService.openTool('field-measuring');
      expect(toolsDialogService.isInitOpen()).toBe(true);

      // Proceed to main component
      toolsDialogService.proceedToMainComponent();

      // Wait for the timeout that opens main dialog
      setTimeout(() => {
        expect(toolsDialogService.isMainOpen()).toBe(true);

        component.onSave();
        expect(toolsDialogService.isMainOpen()).toBe(false);
        done();
      }, 200);
    });

    it('should work with onVisibleChange integration', (done) => {
      toolsDialogService.openTool('field-measuring');
      toolsDialogService.proceedToMainComponent();

      // Wait for the timeout that opens main dialog
      setTimeout(() => {
        expect(toolsDialogService.isMainOpen()).toBe(true);

        component.onVisibleChange(false);
        expect(toolsDialogService.isMainOpen()).toBe(false);
        done();
      }, 200);
    });
  });

  describe('Edge Cases', () => {
    it('should handle repeated calculations', () => {
      component.onCalculate();
      const firstResults = component.calculationResults();

      component.onCalculate();
      const secondResults = component.calculationResults();

      expect(secondResults).toEqual(firstResults);
    });

    it('should handle field changes after calculation', () => {
      component.onCalculate();

      component.onFieldChange('ambientTemperature', 25);

      expect(component.measureData().ambientTemperature).toBe(25);
      expect(component.calculationResults().parameter).toBe(123);
    });

    it('should handle multiple save calls', () => {
      const closeToolSpy = jest.spyOn(toolsDialogService, 'closeTool');

      component.onSave();
      component.onSave();
      component.onSave();

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
});
