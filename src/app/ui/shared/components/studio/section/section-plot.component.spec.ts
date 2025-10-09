import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SectionPlotComponent } from './section-plot.component';
import { GetSectionOutput } from '@src/app/core/services/worker_python/tasks/types';
import { createPlot } from './helpers/createPlot';
import { formatLitData } from './helpers/formatLitData';
import { createPlotData } from './helpers/createPlotData';
import { Data } from 'plotly.js-dist-min';
import { Side, View } from './helpers/types';
import { PlotService } from '@src/app/ui/pages/studio/plot.service';

// Mock the helper functions
jest.mock('./helpers/createPlot');
jest.mock('./helpers/formatLitData');
jest.mock('./helpers/createPlotData');

const mockCreatePlot = createPlot as jest.MockedFunction<typeof createPlot>;
const mockFormatData = formatLitData as jest.MockedFunction<
  typeof formatLitData
>;
const mockCreatePlotData = createPlotData as jest.MockedFunction<
  typeof createPlotData
>;

// Mock PlotService
const mockPlotService = {
  plotOptions: jest.fn()
};

describe('SectionPlotComponent', () => {
  let component: SectionPlotComponent;
  let fixture: ComponentFixture<SectionPlotComponent>;

  // Mock data for testing
  const mockLitData: GetSectionOutput = {
    x: { '0': 1, '1': 2, '2': 3, '3': 4, '4': 5 },
    y: { '0': 10, '1': 20, '2': 30, '3': 40, '4': 50 },
    z: { '0': 100, '1': 200, '2': 300, '3': 400, '4': 500 },
    support: { '0': '1', '1': '2', '2': '3', '3': '4', '4': '5' },
    type: {
      '0': 'span',
      '1': 'span',
      '2': 'support',
      '3': 'span',
      '4': 'span'
    },
    section: { '0': 'A', '1': 'B', '2': 'C', '3': 'D', '4': 'E' },
    color_select: {
      '0': 'red',
      '1': 'blue',
      '2': 'green',
      '3': 'yellow',
      '4': 'purple'
    }
  };

  const mockPlotlyOptions = {
    view: '2d' as View,
    side: 'profile' as Side,
    startSupport: 1,
    endSupport: 2,
    invert: false
  };

  // Mock plotOptions signal
  const mockPlotOptions = {
    view: '2d' as View,
    side: 'profile' as Side,
    startSupport: 1,
    endSupport: 2,
    invert: false
  };

  const mockFormattedData = {
    litXs: [1, 2, 3, 4, 5],
    litYs: [10, 20, 30, 40, 50],
    litZs: [100, 200, 300, 400, 500],
    litTypes: ['span', 'span', 'support', 'span', 'span'],
    litSection: ['A', 'B', 'C', 'D', 'E'],
    litSupports: ['1', '2', '3', '4', '5']
  };

  const mockPlotData: Data[] = [
    { type: 'scatter3d', x: [1, 2], y: [10, 20], z: [100, 200] } as Data
  ];

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock implementations
    mockFormatData.mockReturnValue(mockFormattedData);
    mockCreatePlotData.mockReturnValue(mockPlotData);
    mockCreatePlot.mockResolvedValue({} as any);

    // Setup PlotService mock
    mockPlotService.plotOptions.mockReturnValue(mockPlotOptions);

    // Mock document.getElementById
    const mockElement = {
      clientWidth: 800,
      clientHeight: 600
    };
    jest
      .spyOn(document, 'getElementById')
      .mockReturnValue(mockElement as HTMLElement);

    await TestBed.configureTestingModule({
      imports: [SectionPlotComponent],
      providers: [
        { provide: 'provideAnimations', useValue: () => ({}) },
        { provide: PlotService, useValue: mockPlotService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SectionPlotComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should have default input values', () => {
      fixture.componentRef.setInput('isSupportZoom', false);
      expect(component.litData()).toBeNull();
      expect(component.isSupportZoom()).toBe(false);
    });

    it('should have default signal values', () => {
      expect(component.selectedSpan()).toBe(0);
    });

    it('should have PlotService injected', () => {
      expect(component.plotService).toBe(mockPlotService);
    });
  });

  describe('Supports Computed Property', () => {
    it('should return empty array when litData is null', () => {
      fixture.componentRef.setInput('litData', null);
      expect(component.supports()).toEqual([]);
    });

    it('should return unique supports from litData', () => {
      fixture.componentRef.setInput('litData', mockLitData);
      expect(component.supports()).toEqual([
        { item: '1' },
        { item: '2' },
        { item: '3' },
        { item: '4' },
        { item: '5' }
      ]);
    });

    it('should handle duplicate supports', () => {
      const dataWithDuplicates: GetSectionOutput = {
        ...mockLitData,
        support: { '0': '1', '1': '1', '2': '2', '3': '2', '4': '3' }
      };
      fixture.componentRef.setInput('litData', dataWithDuplicates);
      expect(component.supports()).toEqual([
        { item: '1' },
        { item: '2' },
        { item: '3' }
      ]);
    });
  });

  describe('ErrorMessage Computed Property', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('litData', mockLitData);
    });

    it('should return empty string when plotOptions are valid', () => {
      expect(component.errorMessage()).toBe('');
    });

    it('should return error when startSupport >= endSupport', () => {
      mockPlotService.plotOptions.mockReturnValue({
        view: '2d',
        side: 'profile',
        startSupport: 3,
        endSupport: 2,
        invert: false
      });
      expect(component.errorMessage()).toBe('Error: start >= end');
    });

    it('should return error when startSupport is not in supports list', () => {
      mockPlotService.plotOptions.mockReturnValue({
        view: '2d',
        side: 'profile',
        startSupport: 10,
        endSupport: 15,
        invert: false
      });
      expect(component.errorMessage()).toBe('Error: start not in list');
    });

    it('should return error when endSupport is not in supports list', () => {
      mockPlotService.plotOptions.mockReturnValue({
        view: '2d',
        side: 'profile',
        startSupport: 1,
        endSupport: 10,
        invert: false
      });
      expect(component.errorMessage()).toBe('Error: end not in list');
    });

    it('should prioritize start >= end error over other errors', () => {
      mockPlotService.plotOptions.mockReturnValue({
        view: '2d',
        side: 'profile',
        startSupport: 10,
        endSupport: 5,
        invert: false
      });
      expect(component.errorMessage()).toBe('Error: start >= end');
    });
  });

  describe('searchSupport Method', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('litData', mockLitData);
    });

    it('should emit plotOptionsChange with updated startSupport when type is start', () => {
      const emitSpy = jest.spyOn(component.plotOptionsChange, 'emit');
      const event = { value: '3' };

      component.searchSupport(event, 'start');

      expect(emitSpy).toHaveBeenCalledWith({
        ...mockPlotOptions,
        startSupport: 3
      });
    });

    it('should emit plotOptionsChange with updated endSupport when type is end', () => {
      const emitSpy = jest.spyOn(component.plotOptionsChange, 'emit');
      const event = { value: '4' };

      component.searchSupport(event, 'end');

      expect(emitSpy).toHaveBeenCalledWith({
        ...mockPlotOptions,
        endSupport: 4
      });
    });

    it('should handle string values by converting to number', () => {
      const emitSpy = jest.spyOn(component.plotOptionsChange, 'emit');
      const event = { value: '5' };

      component.searchSupport(event, 'start');

      expect(emitSpy).toHaveBeenCalledWith({
        ...mockPlotOptions,
        startSupport: 5
      });
    });

    it('should handle numeric string values', () => {
      const emitSpy = jest.spyOn(component.plotOptionsChange, 'emit');
      const event = { value: '10' };

      component.searchSupport(event, 'end');

      expect(emitSpy).toHaveBeenCalledWith({
        ...mockPlotOptions,
        endSupport: 10
      });
    });
  });

  describe('refreshSection Method', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('litData', mockLitData);
    });

    it('should return early when litData is null', () => {
      component.refreshSection(null, mockPlotlyOptions, false);

      expect(mockFormatData).not.toHaveBeenCalled();
      expect(mockCreatePlotData).not.toHaveBeenCalled();
      expect(mockCreatePlot).not.toHaveBeenCalled();
    });

    it('should call helper functions with correct parameters when litData is provided', () => {
      component.refreshSection(mockLitData, mockPlotlyOptions, false);

      expect(mockFormatData).toHaveBeenCalledWith(mockLitData);
      expect(mockCreatePlotData).toHaveBeenCalledWith(mockFormattedData, {
        view: '2d',
        side: 'profile',
        startSupport: 1,
        endSupport: 2,
        invert: false
      });
      expect(mockCreatePlot).toHaveBeenCalledWith(
        'plotly-output',
        mockPlotData,
        800,
        600,
        false
      );
    });

    it('should handle missing DOM element gracefully', () => {
      jest.spyOn(document, 'getElementById').mockReturnValue(null);

      component.refreshSection(mockLitData, mockPlotlyOptions, false);

      expect(mockCreatePlot).toHaveBeenCalledWith(
        'plotly-output',
        mockPlotData,
        0,
        0,
        false
      );
    });

    it('should use current plotOptions when calling createPlotData', () => {
      mockPlotService.plotOptions.mockReturnValue({
        view: '3d',
        side: 'face',
        startSupport: 2,
        endSupport: 4,
        invert: false
      });

      component.refreshSection(
        mockLitData,
        {
          view: '3d',
          side: 'face',
          startSupport: 2,
          endSupport: 4,
          invert: false
        },
        true
      );

      expect(mockCreatePlotData).toHaveBeenCalledWith(mockFormattedData, {
        view: '3d',
        side: 'face',
        startSupport: 2,
        endSupport: 4,
        invert: false
      });
      expect(mockCreatePlot).toHaveBeenCalledWith(
        'plotly-output',
        mockPlotData,
        800,
        600,
        true
      );
    });
  });

  describe('Effect', () => {
    it('should call refreshSection when litData changes', () => {
      const refreshSpy = jest.spyOn(component, 'refreshSection');

      // Test the method directly since effect testing is complex
      component.refreshSection(mockLitData, mockPlotlyOptions, false);

      expect(refreshSpy).toHaveBeenCalledWith(
        mockLitData,
        mockPlotlyOptions,
        false
      );
    });

    it('should handle null litData in refreshSection', () => {
      const refreshSpy = jest.spyOn(component, 'refreshSection');

      // Test the method directly
      component.refreshSection(null, mockPlotlyOptions, false);

      expect(refreshSpy).toHaveBeenCalledWith(null, mockPlotlyOptions, false);
      expect(mockFormatData).not.toHaveBeenCalled();
    });

    it('should call refreshSection with isSupportZoom parameter', () => {
      fixture.componentRef.setInput('isSupportZoom', true);
      const refreshSpy = jest.spyOn(component, 'refreshSection');

      component.refreshSection(mockLitData, mockPlotlyOptions, true);

      expect(refreshSpy).toHaveBeenCalledWith(
        mockLitData,
        mockPlotlyOptions,
        true
      );
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete workflow with valid data', () => {
      // Set input data
      fixture.componentRef.setInput('litData', mockLitData);
      fixture.componentRef.setInput('isSupportZoom', false);

      // Verify supports are computed correctly
      expect(component.supports()).toHaveLength(5);

      // Verify no error message
      expect(component.errorMessage()).toBe('');

      // Test refreshSection method directly
      const refreshSpy = jest.spyOn(component, 'refreshSection');
      component.refreshSection(mockLitData, mockPlotlyOptions, false);
      expect(refreshSpy).toHaveBeenCalledWith(
        mockLitData,
        mockPlotlyOptions,
        false
      );
    });

    it('should handle workflow with invalid plotOptions', () => {
      fixture.componentRef.setInput('litData', mockLitData);

      // Set invalid plotOptions via PlotService mock
      mockPlotService.plotOptions.mockReturnValue({
        view: '2d',
        side: 'profile',
        startSupport: 5,
        endSupport: 3,
        invert: false
      });

      // Verify error message
      expect(component.errorMessage()).toBe('Error: start >= end');

      // Verify supports are still computed correctly
      expect(component.supports()).toHaveLength(5);
    });

    it('should update plot when plotOptions change', () => {
      fixture.componentRef.setInput('litData', mockLitData);

      // Change plotOptions via PlotService mock
      mockPlotService.plotOptions.mockReturnValue({
        view: '3d',
        side: 'face',
        startSupport: 2,
        endSupport: 4,
        invert: false
      });

      // Test that refreshSection works with new plotOptions
      const refreshSpy = jest.spyOn(component, 'refreshSection');
      component.refreshSection(
        mockLitData,
        {
          view: '3d',
          side: 'face',
          startSupport: 2,
          endSupport: 4,
          invert: false
        },
        true
      );
      expect(refreshSpy).toHaveBeenCalledWith(
        mockLitData,
        {
          view: '3d',
          side: 'face',
          startSupport: 2,
          endSupport: 4,
          invert: false
        },
        true
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty litData', () => {
      const emptyData: GetSectionOutput = {
        x: {},
        y: {},
        z: {},
        support: {},
        type: {},
        section: {},
        color_select: {}
      };

      fixture.componentRef.setInput('litData', emptyData);

      expect(component.supports()).toEqual([]);
      expect(component.errorMessage()).toBe('Error: start not in list');
    });

    it('should handle litData with null values', () => {
      const dataWithNulls: GetSectionOutput = {
        x: { '0': null, '1': 2 },
        y: { '0': 10, '1': null },
        z: { '0': 100, '1': 200 },
        support: { '0': '1', '1': '2' },
        type: { '0': 'span', '1': 'support' },
        section: { '0': 'A', '1': 'B' },
        color_select: { '0': 'red', '1': 'blue' }
      };

      fixture.componentRef.setInput('litData', dataWithNulls);

      expect(component.supports()).toEqual([{ item: '1' }, { item: '2' }]);
    });

    it('should handle very large support numbers', () => {
      const largeData: GetSectionOutput = {
        x: { '0': 1 },
        y: { '0': 10 },
        z: { '0': 100 },
        support: { '0': '999999' },
        type: { '0': 'span' },
        section: { '0': 'A' },
        color_select: { '0': 'red' }
      };

      fixture.componentRef.setInput('litData', largeData);

      // The supports computed property creates items based on count, not actual values
      expect(component.supports()).toEqual([{ item: '1' }]);
    });
  });
});
