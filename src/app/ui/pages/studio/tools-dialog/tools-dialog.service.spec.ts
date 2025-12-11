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

    it('should initialize with showingInit as false', () => {
      expect(service.showingInit()).toBe(false);
    });

    it('should initialize with isOpen as false', () => {
      expect(service.isOpen()).toBe(false);
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

    it('should set isOpen to true', () => {
      service.openTool('field-measuring');
      expect(service.isOpen()).toBe(true);
    });

    it('should set showingInit to true for tools with initComponent', () => {
      service.openTool('field-measuring');
      expect(service.showingInit()).toBe(true);
    });

    it('should set showingInit to false for tools without initComponent', () => {
      service.openTool('other-tool');
      expect(service.showingInit()).toBe(false);
    });

    it('should handle opening different tools', () => {
      service.openTool('field-measuring');
      expect(service.currentTool()).toBe('field-measuring');

      service.openTool('other-tool');
      expect(service.currentTool()).toBe('other-tool');
    });

    it('should keep isOpen true when switching tools', () => {
      service.openTool('field-measuring');
      expect(service.isOpen()).toBe(true);

      service.openTool('other-tool');
      expect(service.isOpen()).toBe(true);
    });

    it('should reset showingInit when reopening tool with initComponent', () => {
      service.openTool('field-measuring');
      service.proceedToMainComponent();
      expect(service.showingInit()).toBe(false);

      service.openTool('field-measuring');
      expect(service.showingInit()).toBe(true);
    });
  });

  describe('closeTool', () => {
    beforeEach(() => {
      service.openTool('field-measuring');
    });

    it('should set isOpen to false immediately', () => {
      service.closeTool();
      expect(service.isOpen()).toBe(false);
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

    it('should reset showingInit to false after delay', (done) => {
      expect(service.showingInit()).toBe(true);
      service.closeTool();

      // Should still have showingInit immediately after close
      expect(service.showingInit()).toBe(true);

      // Should reset showingInit after 300ms
      setTimeout(() => {
        expect(service.showingInit()).toBe(false);
        done();
      }, 350);
    });

    it('should allow reopening tool before timeout completes', (done) => {
      service.closeTool();

      // Reopen before the 300ms timeout
      setTimeout(() => {
        service.openTool('field-measuring');
        expect(service.currentTool()).toBe('field-measuring');
        expect(service.isOpen()).toBe(true);
        done();
      }, 100);
    });
  });

  describe('getCurrentToolComponent', () => {
    it('should return null when no tool is selected', () => {
      expect(service.getCurrentToolComponent()).toBeNull();
    });

    it('should return InitComponent when field-measuring tool is opened initially', () => {
      service.openTool('field-measuring');
      const component = service.getCurrentToolComponent();
      expect(component).toBe(InitComponent);
    });

    it('should return FieldMeasuringComponent after proceeding from init', () => {
      service.openTool('field-measuring');
      service.proceedToMainComponent();
      const component = service.getCurrentToolComponent();
      expect(component).toBe(FieldMeasuringComponent);
    });

    it('should return null for other-tool', () => {
      service.openTool('other-tool');
      const component = service.getCurrentToolComponent();
      expect(component).toBeNull();
    });

    it('should return InitComponent after closing tool (until timeout)', () => {
      service.openTool('field-measuring');
      service.closeTool();

      // Still has init component until timeout
      expect(service.getCurrentToolComponent()).toBe(InitComponent);
    });
  });

  describe('getCurrentDialogStyle', () => {
    it('should return empty object when no tool is selected', () => {
      expect(service.getCurrentDialogStyle()).toEqual({});
    });

    it('should return init style when field-measuring tool is opened initially', () => {
      service.openTool('field-measuring');
      const style = service.getCurrentDialogStyle();
      expect(style).toEqual({
        'min-width': '29rem',
        'max-width': '90%'
      });
    });

    it('should return main style after proceeding from init', () => {
      service.openTool('field-measuring');
      service.proceedToMainComponent();
      const style = service.getCurrentDialogStyle();
      expect(style).toEqual({
        'min-width': '90%',
        'max-width': '72.5rem'
      });
    });

    it('should return empty object for other-tool with no custom style', () => {
      service.openTool('other-tool');
      const style = service.getCurrentDialogStyle();
      expect(style).toEqual({});
    });

    it('should return init style after closing tool (until timeout)', () => {
      service.openTool('field-measuring');
      service.closeTool();

      // Still has init style until timeout
      const styleDuringClose = service.getCurrentDialogStyle();
      expect(styleDuringClose).toEqual({
        'min-width': '29rem',
        'max-width': '90%'
      });
    });
  });

  describe('proceedToMainComponent', () => {
    it('should set showingInit to false', () => {
      service.openTool('field-measuring');
      expect(service.showingInit()).toBe(true);

      service.proceedToMainComponent();
      expect(service.showingInit()).toBe(false);
    });

    it('should change current component from init to main', () => {
      service.openTool('field-measuring');
      expect(service.getCurrentToolComponent()).toBe(InitComponent);

      service.proceedToMainComponent();
      expect(service.getCurrentToolComponent()).toBe(FieldMeasuringComponent);
    });

    it('should not affect other state when called', () => {
      service.openTool('field-measuring');
      service.proceedToMainComponent();

      expect(service.currentTool()).toBe('field-measuring');
      expect(service.isOpen()).toBe(true);
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

    it('should update isOpen signal value when changed', () => {
      expect(service.isOpen()).toBe(false);

      service.openTool('field-measuring');
      expect(service.isOpen()).toBe(true);

      service.closeTool();
      expect(service.isOpen()).toBe(false);
    });

    it('should update showingInit signal value when changed', () => {
      expect(service.showingInit()).toBe(false);

      service.openTool('field-measuring');
      expect(service.showingInit()).toBe(true);

      service.proceedToMainComponent();
      expect(service.showingInit()).toBe(false);
    });
  });

  describe('Tool Configuration', () => {
    it('should have field-measuring in tool map', () => {
      service.openTool('field-measuring');
      expect(service.getCurrentToolComponent()).toBeDefined();
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
      expect(service.isOpen()).toBe(true);
    });

    it('should handle closing when already closed', () => {
      expect(service.isOpen()).toBe(false);
      service.closeTool();
      expect(service.isOpen()).toBe(false);
    });

    it('should handle opening same tool twice', () => {
      service.openTool('field-measuring');
      const firstOpen = service.isOpen();

      service.openTool('field-measuring');
      const secondOpen = service.isOpen();

      expect(firstOpen).toBe(true);
      expect(secondOpen).toBe(true);
      expect(service.currentTool()).toBe('field-measuring');
    });
  });
});
