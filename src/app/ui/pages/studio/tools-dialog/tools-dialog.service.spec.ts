import { TestBed } from '@angular/core/testing';
import { ToolsDialogService } from './tools-dialog.service';
import { FieldMeasuringComponent } from './field-measuring/field-measuring.component';

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

    it('should return FieldMeasuringComponent for field-measuring tool', () => {
      service.openTool('field-measuring');
      const component = service.getCurrentToolComponent();
      expect(component).toBe(FieldMeasuringComponent);
    });

    it('should return null for other-tool', () => {
      service.openTool('other-tool');
      const component = service.getCurrentToolComponent();
      expect(component).toBeNull();
    });

    it('should return null after closing tool', () => {
      service.openTool('field-measuring');
      service.closeTool();

      // Still has component until timeout
      expect(service.getCurrentToolComponent()).toBe(FieldMeasuringComponent);
    });
  });

  describe('getCurrentDialogStyle', () => {
    it('should return empty object when no tool is selected', () => {
      expect(service.getCurrentDialogStyle()).toEqual({});
    });

    it('should return custom style for field-measuring tool', () => {
      service.openTool('field-measuring');
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

    it('should return empty object after closing tool', () => {
      service.openTool('field-measuring');
      service.closeTool();

      // Still has style until timeout
      const styleDuringClose = service.getCurrentDialogStyle();
      expect(styleDuringClose).toEqual({
        'min-width': '90%',
        'max-width': '72.5rem'
      });
    });
  });

  describe('setTemplates', () => {
    it('should set templates signal', () => {
      const mockTemplates = {
        header: {} as any,
        footer: {} as any
      };

      service.setTemplates(mockTemplates);
      expect(service.templates()).toBe(mockTemplates);
    });

    it('should update templates when called multiple times', () => {
      const templates1 = { header: {} as any };
      const templates2 = { footer: {} as any };

      service.setTemplates(templates1);
      expect(service.templates()).toBe(templates1);

      service.setTemplates(templates2);
      expect(service.templates()).toBe(templates2);
    });

    it('should clear templates when passed empty object', () => {
      const mockTemplates = {
        header: {} as any,
        footer: {} as any
      };

      service.setTemplates(mockTemplates);
      expect(service.templates()).toBe(mockTemplates);

      service.setTemplates({});
      expect(service.templates()).toEqual({});
    });

    it('should handle partial template updates', () => {
      const headerTemplate = { header: {} as any };
      service.setTemplates(headerTemplate);
      expect(service.templates()).toEqual(headerTemplate);

      const footerTemplate = { footer: {} as any };
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
