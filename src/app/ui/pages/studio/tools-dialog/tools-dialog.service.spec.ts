import { TestBed } from '@angular/core/testing';
import { TemplateRef } from '@angular/core';
import { ToolsDialogService } from './tools-dialog.service';
import { FieldMeasuringComponent } from './field-measuring/field-measuring.component';
import { InitComponent } from './field-measuring/components/init/init.component';

describe('ToolsDialogService', () => {
  let service: ToolsDialogService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToolsDialogService);
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with null currentTool', () => {
      expect(service.currentTool()).toBeNull();
    });

    it('should initialize with isInitOpen as false', () => {
      expect(service.isInitOpen()).toBe(false);
    });

    it('should initialize with isMainOpen as false', () => {
      expect(service.isMainOpen()).toBe(false);
    });

    it('should initialize with empty templates', () => {
      expect(service.templates()).toEqual({});
    });
  });

  describe('openTool', () => {
    it('should set currentTool signal', () => {
      service.openTool('field-measuring');
      expect(service.currentTool()).toBe('field-measuring');
    });

    it('should set isInitOpen to true for tools with initComponent', () => {
      service.openTool('field-measuring');
      expect(service.isInitOpen()).toBe(true);
      expect(service.isMainOpen()).toBe(false);
    });

    it('should set isMainOpen to true for tools without initComponent', () => {
      service.openTool('other-tool');
      expect(service.isInitOpen()).toBe(false);
      expect(service.isMainOpen()).toBe(true);
    });

    it('should handle opening different tools', () => {
      service.openTool('field-measuring');
      expect(service.currentTool()).toBe('field-measuring');

      service.openTool('other-tool');
      expect(service.currentTool()).toBe('other-tool');
    });

    it('should keep dialog open when switching tools', () => {
      service.openTool('field-measuring');
      expect(service.isInitOpen()).toBe(true);

      service.openTool('other-tool');
      expect(service.isMainOpen()).toBe(true);
    });

    it('should reset isInitOpen when reopening tool with initComponent', (done) => {
      service.openTool('field-measuring');
      service.proceedToMainComponent();
      expect(service.isInitOpen()).toBe(false);

      // Wait for the timeout that opens main dialog
      setTimeout(() => {
        expect(service.isMainOpen()).toBe(true);

        service.openTool('field-measuring');
        expect(service.isInitOpen()).toBe(true);
        expect(service.isMainOpen()).toBe(false);
        done();
      }, 200);
    });
  });

  describe('closeTool', () => {
    beforeEach(() => {
      service.openTool('field-measuring');
    });

    it('should set isInitOpen and isMainOpen to false immediately', () => {
      service.closeTool();
      expect(service.isInitOpen()).toBe(false);
      expect(service.isMainOpen()).toBe(false);
    });

    it('should set currentTool to null after delay', (done) => {
      service.closeTool();

      // Should still have currentTool immediately after close
      expect(service.currentTool()).toBe('field-measuring');

      // Should clear currentTool after 300ms
      setTimeout(() => {
        expect(service.currentTool()).toBeNull();
        done();
      }, 350);
    });

    it('should allow reopening tool before timeout completes', (done) => {
      service.closeTool();

      // Reopen before the 300ms timeout
      setTimeout(() => {
        service.openTool('field-measuring');
        expect(service.currentTool()).toBe('field-measuring');
        expect(service.isInitOpen()).toBe(true);
        done();
      }, 100);
    });
  });

  describe('getInitComponent and getMainComponent', () => {
    it('should return null when no tool is selected', () => {
      expect(service.getInitComponent()).toBeNull();
      expect(service.getMainComponent()).toBeNull();
    });

    it('should return InitComponent when field-measuring tool is opened', () => {
      service.openTool('field-measuring');
      const initComponent = service.getInitComponent();
      const mainComponent = service.getMainComponent();
      expect(initComponent).toBe(InitComponent);
      expect(mainComponent).toBe(FieldMeasuringComponent);
    });

    it('should return correct components after proceeding from init', () => {
      service.openTool('field-measuring');
      service.proceedToMainComponent();
      const initComponent = service.getInitComponent();
      const mainComponent = service.getMainComponent();
      expect(initComponent).toBe(InitComponent);
      expect(mainComponent).toBe(FieldMeasuringComponent);
    });

    it('should return null for other-tool initComponent', () => {
      service.openTool('other-tool');
      const initComponent = service.getInitComponent();
      expect(initComponent).toBeNull();
    });

    it('should return components after closing tool (until timeout)', () => {
      service.openTool('field-measuring');
      service.closeTool();

      // Still has components until timeout
      expect(service.getInitComponent()).toBe(InitComponent);
      expect(service.getMainComponent()).toBe(FieldMeasuringComponent);
    });
  });

  describe('getInitDialogStyle and getMainDialogStyle', () => {
    it('should return empty object when no tool is selected', () => {
      expect(service.getInitDialogStyle()).toEqual({});
      expect(service.getMainDialogStyle()).toEqual({});
    });

    it('should return correct styles when field-measuring tool is opened', () => {
      service.openTool('field-measuring');
      const initStyle = service.getInitDialogStyle();
      const mainStyle = service.getMainDialogStyle();
      expect(initStyle).toEqual({
        'min-width': '29rem',
        'max-width': '90%'
      });
      expect(mainStyle).toEqual({
        'min-width': '90%',
        'max-width': '72.5rem'
      });
    });

    it('should return correct styles after proceeding from init', () => {
      service.openTool('field-measuring');
      service.proceedToMainComponent();
      const initStyle = service.getInitDialogStyle();
      const mainStyle = service.getMainDialogStyle();
      expect(initStyle).toEqual({
        'min-width': '29rem',
        'max-width': '90%'
      });
      expect(mainStyle).toEqual({
        'min-width': '90%',
        'max-width': '72.5rem'
      });
    });

    it('should return empty object for other-tool with no custom style', () => {
      service.openTool('other-tool');
      const initStyle = service.getInitDialogStyle();
      const mainStyle = service.getMainDialogStyle();
      expect(initStyle).toEqual({});
      expect(mainStyle).toEqual({});
    });

    it('should return styles after closing tool (until timeout)', () => {
      service.openTool('field-measuring');
      service.closeTool();

      // Still has styles until timeout
      const initStyleDuringClose = service.getInitDialogStyle();
      const mainStyleDuringClose = service.getMainDialogStyle();
      expect(initStyleDuringClose).toEqual({
        'min-width': '29rem',
        'max-width': '90%'
      });
      expect(mainStyleDuringClose).toEqual({
        'min-width': '90%',
        'max-width': '72.5rem'
      });
    });
  });

  describe('proceedToMainComponent', () => {
    it('should close init dialog and open main dialog', (done) => {
      service.openTool('field-measuring');
      expect(service.isInitOpen()).toBe(true);
      expect(service.isMainOpen()).toBe(false);

      service.proceedToMainComponent();
      expect(service.isInitOpen()).toBe(false);

      // Wait for the timeout that opens main dialog
      setTimeout(() => {
        expect(service.isMainOpen()).toBe(true);
        done();
      }, 200);
    });

    it('should not affect other state when called', () => {
      service.openTool('field-measuring');
      service.proceedToMainComponent();

      expect(service.currentTool()).toBe('field-measuring');
    });
  });

  describe('setTemplates', () => {
    it('should set templates signal', () => {
      const mockTemplates = {
        header: {} as TemplateRef<unknown>,
        footer: {} as TemplateRef<unknown>
      };

      service.setTemplates(mockTemplates);
      expect(service.templates()).toBe(mockTemplates);
    });

    it('should update templates when called multiple times', () => {
      const templates1 = { header: {} as TemplateRef<unknown> };
      const templates2 = { footer: {} as TemplateRef<unknown> };

      service.setTemplates(templates1);
      expect(service.templates()).toBe(templates1);

      service.setTemplates(templates2);
      expect(service.templates()).toBe(templates2);
    });

    it('should clear templates when passed empty object', () => {
      const mockTemplates = {
        header: {} as TemplateRef<unknown>,
        footer: {} as TemplateRef<unknown>
      };

      service.setTemplates(mockTemplates);
      expect(service.templates()).toBe(mockTemplates);

      service.setTemplates({});
      expect(service.templates()).toEqual({});
    });

    it('should handle partial template updates', () => {
      const headerTemplate = { header: {} as TemplateRef<unknown> };
      service.setTemplates(headerTemplate);
      expect(service.templates()).toEqual(headerTemplate);

      const footerTemplate = { footer: {} as TemplateRef<unknown> };
      service.setTemplates(footerTemplate);
      expect(service.templates()).toEqual(footerTemplate);
    });
  });

  describe('Signal Reactivity', () => {
    it('should update currentTool signal value when changed', () => {
      expect(service.currentTool()).toBeNull();

      service.openTool('field-measuring');
      expect(service.currentTool()).toBe('field-measuring');

      service.openTool('other-tool');
      expect(service.currentTool()).toBe('other-tool');
    });

    it('should update isInitOpen and isMainOpen signal values when changed', () => {
      expect(service.isInitOpen()).toBe(false);
      expect(service.isMainOpen()).toBe(false);

      service.openTool('field-measuring');
      expect(service.isInitOpen()).toBe(true);
      expect(service.isMainOpen()).toBe(false);

      service.closeTool();
      expect(service.isInitOpen()).toBe(false);
      expect(service.isMainOpen()).toBe(false);
    });

    it('should update isInitOpen signal value when transitioning to main', () => {
      expect(service.isInitOpen()).toBe(false);

      service.openTool('field-measuring');
      expect(service.isInitOpen()).toBe(true);

      service.proceedToMainComponent();
      expect(service.isInitOpen()).toBe(false);
    });
  });

  describe('Tool Configuration', () => {
    it('should have field-measuring in tool map', () => {
      service.openTool('field-measuring');
      expect(service.getMainComponent()).toBeDefined();
      expect(service.getInitComponent()).toBeDefined();
    });

    it('should have other-tool in tool map', () => {
      service.openTool('other-tool');
      expect(service.currentTool()).toBe('other-tool');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid open/close cycles', () => {
      service.openTool('field-measuring');
      service.closeTool();
      service.openTool('other-tool');
      service.closeTool();
      service.openTool('field-measuring');

      expect(service.currentTool()).toBe('field-measuring');
      expect(service.isInitOpen()).toBe(true);
    });

    it('should handle closing when already closed', () => {
      expect(service.isInitOpen()).toBe(false);
      expect(service.isMainOpen()).toBe(false);
      service.closeTool();
      expect(service.isInitOpen()).toBe(false);
      expect(service.isMainOpen()).toBe(false);
    });

    it('should handle opening same tool twice', () => {
      service.openTool('field-measuring');
      const firstOpenInit = service.isInitOpen();

      service.openTool('field-measuring');
      const secondOpenInit = service.isInitOpen();

      expect(firstOpenInit).toBe(true);
      expect(secondOpenInit).toBe(true);
      expect(service.currentTool()).toBe('field-measuring');
    });
  });
});
