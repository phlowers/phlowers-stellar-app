import { TestBed } from '@angular/core/testing';
import { TemplateRef } from '@angular/core';
import { ToolbarDialogService } from './toolbar-dialog.service';
import { FieldMeasuringComponent } from './field-measuring/field-measuring.component';
import { InitComponent } from './field-measuring/components/init/init.component';

describe('ToolbarDialogService', () => {
  let service: ToolbarDialogService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToolbarDialogService);
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

    it('should initialize with phase as main', () => {
      expect(service.phase()).toBe('main');
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

    it('should open with init phase for tools with initComponent', () => {
      service.openTool('field-measuring');
      expect(service.isOpen()).toBe(true);
      expect(service.phase()).toBe('init');
    });

    it('should open with main phase for tools without initComponent', () => {
      service.openTool('other-tool');
      expect(service.isOpen()).toBe(true);
      expect(service.phase()).toBe('main');
    });

    it('should handle opening different tools', () => {
      service.openTool('field-measuring');
      expect(service.currentTool()).toBe('field-measuring');

      service.openTool('other-tool');
      expect(service.currentTool()).toBe('other-tool');
    });

    it('should keep dialog open when switching tools', () => {
      service.openTool('field-measuring');
      expect(service.isOpen()).toBe(true);
      expect(service.phase()).toBe('init');

      service.openTool('other-tool');
      expect(service.isOpen()).toBe(true);
      expect(service.phase()).toBe('main');
    });

    it('should reset to init phase when reopening tool with initComponent', () => {
      service.openTool('field-measuring');
      service.proceedToMainComponent();
      service.completePendingTransition();
      expect(service.isOpen()).toBe(true);
      expect(service.phase()).toBe('main');

      service.openTool('field-measuring');
      expect(service.isOpen()).toBe(true);
      expect(service.phase()).toBe('init');
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
        expect(service.phase()).toBe('init');
        done();
      }, 100);
    });
  });

  describe('getComponent', () => {
    it('should return null when no tool is selected', () => {
      expect(service.getComponent()).toBeNull();
    });

    it('should return InitComponent when field-measuring tool is opened (init phase)', () => {
      service.openTool('field-measuring');
      expect(service.getComponent()).toBe(InitComponent);
    });

    it('should return FieldMeasuringComponent after proceeding to main phase', () => {
      service.openTool('field-measuring');
      service.proceedToMainComponent();
      service.completePendingTransition();
      expect(service.getComponent()).toBe(FieldMeasuringComponent);
    });

    it('should return null for other-tool in init phase check', () => {
      service.openTool('other-tool');
      // other-tool has no initComponent, so it opens directly in main phase
      expect(service.phase()).toBe('main');
    });

    it('should return component after closing tool (until timeout)', () => {
      service.openTool('field-measuring');
      service.closeTool();

      // Still has component until timeout (phase is still 'init')
      expect(service.getComponent()).toBe(InitComponent);
    });
  });

  describe('getDialogStyle', () => {
    it('should return empty object when no tool is selected', () => {
      expect(service.getDialogStyle()).toEqual({});
    });

    it('should return init style when field-measuring tool is opened', () => {
      service.openTool('field-measuring');
      expect(service.getDialogStyle()).toEqual({
        width: '29rem',
        'max-width': '90%'
      });
    });

    it('should return main style after proceeding from init', () => {
      service.openTool('field-measuring');
      service.proceedToMainComponent();
      service.completePendingTransition();
      expect(service.getDialogStyle()).toEqual({
        width: '72.5rem',
        'max-width': '90%'
      });
    });

    it('should return empty object for other-tool with no custom style', () => {
      service.openTool('other-tool');
      expect(service.getDialogStyle()).toEqual({});
    });

    it('should return style after closing tool (until timeout)', () => {
      service.openTool('field-measuring');
      service.closeTool();

      // Still has style until timeout
      expect(service.getDialogStyle()).toEqual({
        width: '29rem',
        'max-width': '90%'
      });
    });
  });

  describe('proceedToMainComponent', () => {
    it('should close dialog and set transitioning flag', () => {
      service.openTool('field-measuring');
      expect(service.isOpen()).toBe(true);
      expect(service.phase()).toBe('init');

      service.proceedToMainComponent();
      expect(service.isOpen()).toBe(false);
      expect(service.isTransitioning()).toBe(true);
      expect(service.phase()).toBe('init');
    });

    it('should not affect currentTool when called', () => {
      service.openTool('field-measuring');
      service.proceedToMainComponent();

      expect(service.currentTool()).toBe('field-measuring');
    });
  });

  describe('completePendingTransition', () => {
    it('should switch to main phase and reopen dialog', () => {
      service.openTool('field-measuring');
      service.proceedToMainComponent();

      service.completePendingTransition();
      expect(service.isOpen()).toBe(true);
      expect(service.phase()).toBe('main');
      expect(service.isTransitioning()).toBe(false);
    });

    it('should do nothing if no transition is pending', () => {
      service.openTool('field-measuring');
      expect(service.phase()).toBe('init');

      service.completePendingTransition();
      expect(service.phase()).toBe('init');
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

    it('should update isOpen and phase signal values when changed', () => {
      expect(service.isOpen()).toBe(false);

      service.openTool('field-measuring');
      expect(service.isOpen()).toBe(true);
      expect(service.phase()).toBe('init');

      service.closeTool();
      expect(service.isOpen()).toBe(false);
    });

    it('should update phase signal value when transitioning to main', () => {
      expect(service.isOpen()).toBe(false);

      service.openTool('field-measuring');
      expect(service.isOpen()).toBe(true);
      expect(service.phase()).toBe('init');

      service.proceedToMainComponent();
      expect(service.isOpen()).toBe(false);
      expect(service.isTransitioning()).toBe(true);

      service.completePendingTransition();
      expect(service.isOpen()).toBe(true);
      expect(service.phase()).toBe('main');
      expect(service.isTransitioning()).toBe(false);
    });
  });

  describe('Tool Configuration', () => {
    it('should have field-measuring in tool map', () => {
      service.openTool('field-measuring');
      expect(service.getComponent()).toBeDefined();
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
      expect(service.phase()).toBe('init');
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
