import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { SortEvent } from 'primeng/api';
import { L0SumComponent } from './l0-sum.component';
import { ToolbarDialogService } from '../../services/toolbar-dialog.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PlotService } from '@services/plot/plot.service';

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

describe('L0SumComponent', () => {
  let component: L0SumComponent;
  let fixture: ComponentFixture<L0SumComponent>;
  let toolbarDialogService: ToolbarDialogService;

  beforeEach(async () => {
    const mockLitData = {
      L0: [100, 200, 150, 300, 250],
      spans: [],
      insulators: [],
      supports: [],
      elevation: [],
      line_angle: [],
      vtl_under_chain: [],
      vtl_under_console: [],
      r_under_chain: [],
      r_under_console: [],
      ground_altitude: [],
      load_angle: [],
      displacement: [],
      span_length: []
    };

    const mockPlotService = {
      loading: vi.fn().mockReturnValue(false),
      litData: vi.fn().mockReturnValue(mockLitData)
    } as unknown as PlotService;

    await TestBed.configureTestingModule({
      providers: [ToolbarDialogService, provideHttpClientTesting(), { provide: PlotService, useValue: mockPlotService }]
    })
      .overrideComponent(L0SumComponent, {
        set: {
          imports: [MockButtonComponent, MockIconComponent]
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(L0SumComponent);
    component = fixture.componentInstance;
    toolbarDialogService = TestBed.inject(ToolbarDialogService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize rows and totalL0', () => {
    expect(component.l0Rows().length).toBeGreaterThan(0);
    expect(component.totalL0()).toBeGreaterThan(0);
  });

  it('should inject ToolbarDialogService', () => {
    expect(toolbarDialogService).toBeDefined();
  });

  describe('onVisibleChange', () => {
    it('should call closeTool when visible is false', () => {
      const closeSpy = vi.spyOn(toolbarDialogService, 'closeTool');
      component.onVisibleChange(false);
      expect(closeSpy).toHaveBeenCalled();
    });

    it('should not call closeTool when visible is true', () => {
      const closeSpy = vi.spyOn(toolbarDialogService, 'closeTool');
      component.onVisibleChange(true);
      expect(closeSpy).not.toHaveBeenCalled();
    });
  });

  describe('onExport', () => {
    it('should log export data', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      component.onExport();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Export L0 sum',
        expect.objectContaining({ rows: expect.any(Array), total: expect.any(Number) })
      );
      consoleSpy.mockRestore();
    });
  });

  describe('getSortIcon', () => {
    it('should return swap_vert when field does not match current sort field', () => {
      component.sortField.set('');
      component.sortOrder.set(0);
      expect(component.getSortIcon('span')).toBe('swap_vert');
    });

    it('should return arrow_upward when sorted ascending on the field', () => {
      component.sortField.set('span');
      component.sortOrder.set(1);
      expect(component.getSortIcon('span')).toBe('arrow_upward');
    });

    it('should return arrow_downward when sorted descending on the field', () => {
      component.sortField.set('l0');
      component.sortOrder.set(-1);
      expect(component.getSortIcon('l0')).toBe('arrow_downward');
    });

    it('should return swap_vert when field matches but order is 0', () => {
      component.sortField.set('span');
      component.sortOrder.set(0);
      expect(component.getSortIcon('span')).toBe('swap_vert');
    });
  });

  describe('customSort', () => {
    it('should update sortField and sortOrder', () => {
      const event = { field: 'span', order: 1, data: [] };
      component.customSort(event);
      expect(component.sortField()).toBe('span');
      expect(component.sortOrder()).toBe(1);
    });

    it('should sort span data ascending by index', () => {
      const data = [
        { span: '2-3', l0: 150, index: 1 },
        { span: '1-2', l0: 100, index: 0 },
        { span: '3-4', l0: 200, index: 2 }
      ];
      const event = { field: 'span', order: 1, data };
      component.customSort(event);
      expect(data[0].index).toBe(0);
      expect(data[1].index).toBe(1);
      expect(data[2].index).toBe(2);
    });

    it('should sort span data descending by index', () => {
      const data = [
        { span: '1-2', l0: 100, index: 0 },
        { span: '2-3', l0: 150, index: 1 },
        { span: '3-4', l0: 200, index: 2 }
      ];
      const event = { field: 'span', order: -1, data };
      component.customSort(event);
      expect(data[0].index).toBe(2);
      expect(data[1].index).toBe(1);
      expect(data[2].index).toBe(0);
    });

    it('should sort l0 data ascending', () => {
      const data = [
        { span: '2-3', l0: 200, index: 1 },
        { span: '1-2', l0: 100, index: 0 },
        { span: '3-4', l0: 150, index: 2 }
      ];
      const event = { field: 'l0', order: 1, data };
      component.customSort(event);
      expect(data[0].l0).toBe(100);
      expect(data[1].l0).toBe(150);
      expect(data[2].l0).toBe(200);
    });

    it('should sort l0 data descending', () => {
      const data = [
        { span: '1-2', l0: 100, index: 0 },
        { span: '2-3', l0: 200, index: 1 },
        { span: '3-4', l0: 150, index: 2 }
      ];
      const event = { field: 'l0', order: -1, data };
      component.customSort(event);
      expect(data[0].l0).toBe(200);
      expect(data[1].l0).toBe(150);
      expect(data[2].l0).toBe(100);
    });

    it('should handle null order gracefully', () => {
      const data = [
        { span: '2-3', l0: 150, index: 1 },
        { span: '1-2', l0: 100, index: 0 }
      ];
      const event = { field: 'span', order: null, data };
      expect(() => component.customSort(event as SortEvent)).not.toThrow();
    });
  });
});
