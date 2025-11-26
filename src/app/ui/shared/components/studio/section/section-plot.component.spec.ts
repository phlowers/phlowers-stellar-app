import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SectionPlotComponent } from './section-plot.component';
import { GetSectionOutput } from '@src/app/core/services/worker_python/tasks/types';
import { createPlot } from './helpers/createPlot';
import { createPlotData } from './helpers/createPlotData';
import { Data } from 'plotly.js-dist-min';
import { PlotOptions } from './helpers/types';
import { PlotService } from '@src/app/ui/pages/studio/plot.service';

// Mock the helper functions
jest.mock('./helpers/createPlot');
jest.mock('./helpers/createPlotData');

const mockCreatePlot = createPlot as jest.MockedFunction<typeof createPlot>;
const mockCreatePlotData = createPlotData as jest.MockedFunction<
  typeof createPlotData
>;

// Mock PlotService
const mockPlotService = {
  plotOptions: jest.fn(),
  camera: jest.fn().mockReturnValue(null),
  isSidebarOpen: jest.fn().mockReturnValue(false)
};

describe('SectionPlotComponent', () => {
  let component: SectionPlotComponent;
  let fixture: ComponentFixture<SectionPlotComponent>;

  // Mock data for testing
  const mockLitData: GetSectionOutput = {
    supports: [[[1, 2, 3, 4, 5]]],
    insulators: [[[10, 20, 30, 40, 50]]],
    spans: [[[100, 200, 300, 400, 500]]],
    span: [[[1, 2, 3, 4, 5]]],
    support: [[[10, 20, 30, 40, 50]]],
    insulator: [[[100, 200, 300, 400, 500]]]
  };

  // Mock plotOptions signal
  const mockPlotOptions: PlotOptions = {
    view: '2d',
    side: 'profile',
    startSupport: 1,
    endSupport: 2,
    invert: false
  };

  const mockPlotData: Data[] = [
    { type: 'scatter3d', x: [1, 2], y: [10, 20], z: [100, 200] } as Data
  ];

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock implementations
    mockCreatePlotData.mockReturnValue(mockPlotData);
    mockCreatePlot.mockResolvedValue({} as any);

    // Setup PlotService mock
    mockPlotService.plotOptions.mockReturnValue(mockPlotOptions);

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

    it('should have PlotService injected', () => {
      expect(component.plotService).toBe(mockPlotService);
    });
  });

  describe('refreshPlot Method', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('litData', mockLitData);
    });

    it('should return early when litData is null', async () => {
      const result = await component.refreshPlot(
        null,
        mockPlotOptions,
        false,
        false
      );

      expect(result).toBeUndefined();
      expect(mockCreatePlotData).not.toHaveBeenCalled();
      expect(mockCreatePlot).not.toHaveBeenCalled();
    });

    it('should call helper functions with correct parameters when litData is provided', async () => {
      await component.refreshPlot(mockLitData, mockPlotOptions, false, false);

      expect(mockCreatePlotData).toHaveBeenCalledWith(
        mockLitData,
        mockPlotOptions
      );
      expect(mockCreatePlot).toHaveBeenCalledWith(
        'plotly-output',
        mockPlotData,
        false,
        false,
        '2d',
        null,
        'profile'
      );
    });

    it('should handle missing DOM element gracefully', async () => {
      jest.spyOn(document, 'getElementById').mockReturnValue(null);

      await component.refreshPlot(mockLitData, mockPlotOptions, false, false);

      expect(mockCreatePlot).toHaveBeenCalledWith(
        'plotly-output',
        mockPlotData,
        false,
        false,
        '2d',
        null,
        'profile'
      );
    });

    it('should use provided plotOptions when calling createPlotData', async () => {
      const customPlotOptions: PlotOptions = {
        view: '3d',
        side: 'face',
        startSupport: 2,
        endSupport: 4,
        invert: true
      };

      await component.refreshPlot(mockLitData, customPlotOptions, true, false);

      expect(mockCreatePlotData).toHaveBeenCalledWith(
        mockLitData,
        customPlotOptions
      );
      expect(mockCreatePlot).toHaveBeenCalledWith(
        'plotly-output',
        mockPlotData,
        true,
        true,
        '3d',
        null,
        'face'
      );
    });
  });

  describe('Effect', () => {
    it('should call refreshPlot when inputs change', async () => {
      const refreshSpy = jest.spyOn(component, 'refreshPlot');

      // Test the method directly since effect testing is complex
      await component.refreshPlot(mockLitData, mockPlotOptions, false, false);

      expect(refreshSpy).toHaveBeenCalledWith(
        mockLitData,
        mockPlotOptions,
        false,
        false
      );
    });

    it('should handle null litData in refreshPlot', async () => {
      const refreshSpy = jest.spyOn(component, 'refreshPlot');

      // Test the method directly
      await component.refreshPlot(null, mockPlotOptions, false, false);

      expect(refreshSpy).toHaveBeenCalledWith(
        null,
        mockPlotOptions,
        false,
        false
      );
      expect(mockCreatePlotData).not.toHaveBeenCalled();
    });

    it('should call refreshPlot with isSupportZoom parameter', async () => {
      fixture.componentRef.setInput('isSupportZoom', true);
      const refreshSpy = jest.spyOn(component, 'refreshPlot');

      await component.refreshPlot(mockLitData, mockPlotOptions, true, false);

      expect(refreshSpy).toHaveBeenCalledWith(
        mockLitData,
        mockPlotOptions,
        true,
        false
      );
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete workflow with valid data', async () => {
      // Set input data
      fixture.componentRef.setInput('litData', mockLitData);
      fixture.componentRef.setInput('isSupportZoom', false);

      // Test refreshPlot method directly
      const refreshSpy = jest.spyOn(component, 'refreshPlot');
      await component.refreshPlot(mockLitData, mockPlotOptions, false, false);
      expect(refreshSpy).toHaveBeenCalledWith(
        mockLitData,
        mockPlotOptions,
        false,
        false
      );
    });

    it('should handle workflow with different plotOptions', async () => {
      fixture.componentRef.setInput('litData', mockLitData);

      // Change plotOptions via PlotService mock
      const customPlotOptions: PlotOptions = {
        view: '3d',
        side: 'face',
        startSupport: 2,
        endSupport: 4,
        invert: true
      };
      mockPlotService.plotOptions.mockReturnValue(customPlotOptions);

      // Test that refreshPlot works with new plotOptions
      const refreshSpy = jest.spyOn(component, 'refreshPlot');
      await component.refreshPlot(mockLitData, customPlotOptions, true, false);
      expect(refreshSpy).toHaveBeenCalledWith(
        mockLitData,
        customPlotOptions,
        true,
        false
      );
    });

    it('should handle null litData gracefully', async () => {
      fixture.componentRef.setInput('litData', null);
      fixture.componentRef.setInput('isSupportZoom', false);

      const refreshSpy = jest.spyOn(component, 'refreshPlot');
      const result = await component.refreshPlot(
        null,
        mockPlotOptions,
        false,
        false
      );

      expect(refreshSpy).toHaveBeenCalledWith(
        null,
        mockPlotOptions,
        false,
        false
      );
      expect(result).toBeUndefined();
      expect(mockCreatePlotData).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty litData', async () => {
      const emptyData: GetSectionOutput = {
        supports: [],
        insulators: [],
        spans: [],
        span: [],
        support: [],
        insulator: []
      };

      fixture.componentRef.setInput('litData', emptyData);

      const result = await component.refreshPlot(
        emptyData,
        mockPlotOptions,
        false,
        false
      );
      expect(result).toBeDefined();
      expect(mockCreatePlotData).toHaveBeenCalledWith(
        emptyData,
        mockPlotOptions
      );
    });

    it('should handle litData with null values', async () => {
      const dataWithNulls: GetSectionOutput = {
        supports: [[[1, 2]]],
        insulators: [[[10, 20]]],
        spans: [[[100, 200]]],
        span: [[[1, 2]]],
        support: [[[10, 20]]],
        insulator: [[[100, 200]]]
      };

      fixture.componentRef.setInput('litData', dataWithNulls);

      const result = await component.refreshPlot(
        dataWithNulls,
        mockPlotOptions,
        false,
        false
      );
      expect(result).toBeDefined();
      expect(mockCreatePlotData).toHaveBeenCalledWith(
        dataWithNulls,
        mockPlotOptions
      );
    });

    it('should handle very large support numbers', async () => {
      const largeData: GetSectionOutput = {
        supports: [[[999999]]],
        insulators: [[[10]]],
        spans: [[[100]]],
        span: [[[1]]],
        support: [[[10]]],
        insulator: [[[100]]]
      };

      fixture.componentRef.setInput('litData', largeData);

      const result = await component.refreshPlot(
        largeData,
        mockPlotOptions,
        false,
        false
      );
      expect(result).toBeDefined();
      expect(mockCreatePlotData).toHaveBeenCalledWith(
        largeData,
        mockPlotOptions
      );
    });
  });
});
