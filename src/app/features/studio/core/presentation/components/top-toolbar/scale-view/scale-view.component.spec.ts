import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { ScaleViewComponent } from './scale-view.component';

import { PlotService } from '@services/plot/plot.service';
import { PlotResolutionService } from '@services/plot/plot-resolution.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { ScalingFactors } from '@shared/types/plot.types';

describe('ScaleViewComponent', () => {
  let component: ScaleViewComponent;
  let fixture: ComponentFixture<ScaleViewComponent>;
  let resolutionSignal: ReturnType<typeof signal<number>>;
  let mockPlotService: { refreshProjection: ReturnType<typeof vi.fn> };
  let resolutionServiceMock: {
    resolution: ReturnType<typeof signal<number>>;
    defaultResolution: ReturnType<typeof signal<number>>;
    setResolution: ReturnType<typeof vi.fn>;
    applyResolution: ReturnType<typeof vi.fn>;
  };
  let plotOptionsServiceMock: {
    setScalingFactors: ReturnType<typeof vi.fn>;
    scalingFactors: ReturnType<typeof signal<ScalingFactors>>;
  };
  let mockPopover: { toggle: vi.Mock };
  let scalingFactorsSignal: ReturnType<typeof signal<ScalingFactors>>;

  beforeEach(async () => {
    resolutionSignal = signal(100);
    scalingFactorsSignal = signal<ScalingFactors>({ x: 1, y: 1, z: 1, aspectMode: 'data' });

    mockPlotService = {
      refreshProjection: vi.fn().mockResolvedValue(undefined)
    };
    resolutionServiceMock = {
      resolution: resolutionSignal,
      defaultResolution: signal(250),
      setResolution: vi.fn(),
      applyResolution: vi.fn().mockResolvedValue(undefined)
    };
    plotOptionsServiceMock = {
      setScalingFactors: vi.fn(),
      scalingFactors: scalingFactorsSignal
    };

    mockPopover = { toggle: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ScaleViewComponent],
      providers: [
        { provide: PlotService, useValue: mockPlotService },
        { provide: PlotResolutionService, useValue: resolutionServiceMock },
        { provide: PlotOptionsService, useValue: plotOptionsServiceMock },
        provideNoopAnimations()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ScaleViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    Object.defineProperty(component, 'popover', {
      value: (() => mockPopover) as unknown as ReturnType<(typeof component)['popover']>,
      writable: true
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize popoverOpen as false', () => {
      expect(component.popoverOpen()).toBe(false);
    });

    it('should have scaleMin set to 25', () => {
      expect(component.scaleMin).toBe(25);
    });

    it('should have scaleMax set to 250', () => {
      expect(component.scaleMax).toBe(250);
    });

    it('should initialize the scale form control to "auto"', () => {
      expect(component.formScaleView.get('scale')?.value).toBe('auto');
    });

    it('should initialize sliderControl with the plotService resolution', () => {
      expect(component.sliderControl.value).toBe(100);
    });

    it('should initialize pointsControl with the plotService resolution', () => {
      expect(component.pointsControl.value).toBe(100);
    });
  });

  describe('setupResolutionSync()', () => {
    it('should update sliderControl when plotService.resolution signal changes', () => {
      resolutionSignal.set(150);
      fixture.detectChanges();

      expect(component.sliderControl.value).toBe(150);
    });

    it('should update pointsControl when plotService.resolution signal changes', () => {
      resolutionSignal.set(150);
      fixture.detectChanges();

      expect(component.pointsControl.value).toBe(150);
    });

    it('should not update sliderControl when the resolution value has not changed', () => {
      const spy = vi.spyOn(component.sliderControl, 'setValue');

      resolutionSignal.set(100); // same value — signal does not change
      fixture.detectChanges();

      expect(spy).not.toHaveBeenCalled();
    });

    it('should not update pointsControl when the resolution value has not changed', () => {
      const spy = vi.spyOn(component.pointsControl, 'setValue');

      resolutionSignal.set(100); // same value — signal does not change
      fixture.detectChanges();

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('setupControlsSynchronization()', () => {
    it('should sync pointsControl when sliderControl value changes', () => {
      component.sliderControl.setValue(75);
      fixture.detectChanges();

      expect(component.pointsControl.value).toBe(75);
    });

    it('should sync sliderControl when pointsControl value changes', () => {
      component.pointsControl.setValue(80);
      fixture.detectChanges();

      expect(component.sliderControl.value).toBe(80);
    });

    it('should not update pointsControl when slider emits the same value', () => {
      component.sliderControl.setValue(60);
      fixture.detectChanges();

      const spy = vi.spyOn(component.pointsControl, 'setValue');
      component.sliderControl.setValue(60); // same value — toSignal does not update signal
      fixture.detectChanges();

      expect(spy).not.toHaveBeenCalled();
    });

    it('should not update sliderControl when pointsControl emits the same value', () => {
      component.pointsControl.setValue(60);
      fixture.detectChanges();

      const spy = vi.spyOn(component.sliderControl, 'setValue');
      component.pointsControl.setValue(60); // same value — toSignal does not update signal
      fixture.detectChanges();

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('togglePopover()', () => {
    it('should set popoverOpen to true when currently false', () => {
      expect(component.popoverOpen()).toBe(false);

      component.togglePopover(new Event('click'));

      expect(component.popoverOpen()).toBe(true);
    });

    it('should set popoverOpen to false when currently true', () => {
      component.popoverOpen.set(true);

      component.togglePopover(new Event('click'));

      expect(component.popoverOpen()).toBe(false);
    });

    it('should call popover.toggle with the provided event', () => {
      const event = new Event('click');

      component.togglePopover(event);

      expect(mockPopover.toggle).toHaveBeenCalledWith(event);
    });
  });

  describe('onValidate()', () => {
    beforeEach(() => {
      component.popoverOpen.set(true); // simulate open popover state
    });

    it('should close the popover', async () => {
      await component.onValidate();

      expect(component.popoverOpen()).toBe(false);
      expect(mockPopover.toggle).toHaveBeenCalled();
    });

    it('should call setResolution with the current pointsControl value', async () => {
      component.pointsControl.setValue(75);

      await component.onValidate();

      expect(resolutionServiceMock.setResolution).toHaveBeenCalledWith(75);
    });

    it('should call applyResolution with the current pointsControl value', async () => {
      component.pointsControl.setValue(80);

      await component.onValidate();

      expect(resolutionServiceMock.applyResolution).toHaveBeenCalledWith(80);
    });

    it('should call refreshProjection', async () => {
      await component.onValidate();

      expect(mockPlotService.refreshProjection).toHaveBeenCalled();
    });

    describe('getScaleNorms — scale axis mapping', () => {
      it('should call setScalingFactors with plan norms when scale is "plan"', async () => {
        component.formScaleView.get('scale')?.setValue('plan');

        await component.onValidate();

        expect(plotOptionsServiceMock.setScalingFactors).toHaveBeenCalledWith({
          x: 0.2,
          y: 1,
          z: 1,
          aspectMode: 'manual'
        });
      });

      it('should call setScalingFactors with geo norms when scale is "geo"', async () => {
        component.formScaleView.get('scale')?.setValue('geo');

        await component.onValidate();

        expect(plotOptionsServiceMock.setScalingFactors).toHaveBeenCalledWith({
          x: 1,
          y: 1,
          z: 1,
          aspectMode: 'manual'
        });
      });

      it('should call setScalingFactors with celeste norms when scale is "celeste"', async () => {
        component.formScaleView.get('scale')?.setValue('celeste');

        await component.onValidate();

        expect(plotOptionsServiceMock.setScalingFactors).toHaveBeenCalledWith({
          x: 1,
          y: 1,
          z: 0.5,
          aspectMode: 'manual'
        });
      });

      it('should call setScalingFactors with auto norms when scale is "auto"', async () => {
        component.formScaleView.get('scale')?.setValue('auto');

        await component.onValidate();

        expect(plotOptionsServiceMock.setScalingFactors).toHaveBeenCalledWith({
          x: 1,
          y: 1,
          z: 1,
          aspectMode: 'data'
        });
      });

      it('should fall back to data aspectMode for any unknown scale value', async () => {
        component.formScaleView.get('scale')?.setValue('unknown');

        await component.onValidate();

        expect(plotOptionsServiceMock.setScalingFactors).toHaveBeenCalledWith({
          x: 1,
          y: 1,
          z: 1,
          aspectMode: 'data'
        });
      });
    });
  });

  describe('Template — data-testid', () => {
    describe('Trigger button', () => {
      it('should render the trigger p-button element', () => {
        const el = fixture.nativeElement.querySelector('[data-testid="scale-view-trigger"]');
        expect(el).toBeTruthy();
      });

      it('should have aria-haspopup="dialog"', () => {
        const el = fixture.nativeElement.querySelector('[data-testid="scale-view-trigger"]');
        expect(el.getAttribute('aria-haspopup')).toBe('dialog');
      });

      it('should have aria-expanded="false" when popover is closed', () => {
        const el = fixture.nativeElement.querySelector('[data-testid="scale-view-trigger"]');
        expect(el.getAttribute('aria-expanded')).toBe('false');
      });

      it('should have aria-expanded="true" when popover is open', () => {
        component.popoverOpen.set(true);
        fixture.detectChanges();

        const el = fixture.nativeElement.querySelector('[data-testid="scale-view-trigger"]');
        expect(el.getAttribute('aria-expanded')).toBe('true');
      });

      it('inner button should gain view-button--active class when popover is open', () => {
        component.popoverOpen.set(true);
        fixture.detectChanges();

        const btn = fixture.nativeElement.querySelector('[data-testid="scale-view-trigger"]');
        expect(btn.classList).toContain('view-button--active');
      });

      it('inner button should NOT have view-button--active class when popover is closed', () => {
        const btn = fixture.nativeElement.querySelector('[data-testid="scale-view-trigger"]');
        expect(btn.classList).not.toContain('view-button--active');
      });

      it('clicking the inner button should call togglePopover', () => {
        const spy = vi.spyOn(component, 'togglePopover');
        const btn = fixture.nativeElement.querySelector('[data-testid="scale-view-trigger"]');

        btn.click();

        expect(spy).toHaveBeenCalled();
      });
    });

    describe('Popover form content (opened)', () => {
      // These tests open the real PrimeNG Popover so its content is rendered to document.body.
      beforeEach(() => {
        // Restore the real viewChild signal for popover rendering
        fixture = TestBed.createComponent(ScaleViewComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        // Click the real trigger button so event.target is a DOM element (not null),
        // preventing absolutePosition from throwing in JSDOM.
        const innerViewBtn = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
          '[data-testid="scale-view-trigger"]'
        );
        innerViewBtn?.click();
        fixture.detectChanges();
      });

      afterEach(() => {
        document.body.querySelectorAll('.p-popover').forEach((el) => el.remove());
      });

      it('form should be rendered in document.body after opening', () => {
        const form = document.body.querySelector('[data-testid="scale-view-form"]');
        expect(form).toBeTruthy();
      });

      it('form should have aria-label "View configuration"', () => {
        const form = document.body.querySelector('[data-testid="scale-view-form"]');
        expect(form?.getAttribute('aria-label')).toBe('View configuration');
      });

      it('scale fieldset should be present', () => {
        const fieldset = document.body.querySelector('[data-testid="scale-fieldset"]');
        expect(fieldset).toBeTruthy();
      });

      it('should render all 4 radio scale options', () => {
        for (const id of ['scale-radio-plan', 'scale-radio-geo', 'scale-radio-celeste', 'scale-radio-auto']) {
          expect(document.body.querySelector(`[data-testid="${id}"]`)).toBeTruthy();
        }
      });

      it('points fieldset should be present', () => {
        const fieldset = document.body.querySelector('[data-testid="points-fieldset"]');
        expect(fieldset).toBeTruthy();
      });

      it('slider should be present', () => {
        const slider = document.body.querySelector('[data-testid="scale-slider"]');
        expect(slider).toBeTruthy();
      });

      it('slider should have aria-label "Number of points per range"', () => {
        const slider = document.body.querySelector('[data-testid="scale-slider"]');
        expect(slider?.getAttribute('aria-label')).toBe('Number of points per range');
      });

      it('input number should be present', () => {
        const input = document.body.querySelector('[data-testid="scale-input-number"]');
        expect(input).toBeTruthy();
      });

      it('input number should have aria-label "Number of points per range"', () => {
        const input = document.body.querySelector('[data-testid="scale-input-number"]');
        expect(input?.getAttribute('aria-label')).toBe('Number of points per range');
      });

      it('validate button should be present', () => {
        const btn = document.body.querySelector('[data-testid="scale-validate-btn"]');
        expect(btn).toBeTruthy();
      });

      it('validate button should have type="submit"', () => {
        const btn = document.body.querySelector('[data-testid="scale-validate-btn"]');
        expect(btn?.getAttribute('type')).toBe('submit');
      });

      it('clicking the validate inner button should call onValidate', () => {
        const spy = vi.spyOn(component, 'onValidate').mockResolvedValue(undefined);
        const btn = document.body.querySelector<HTMLButtonElement>('[data-testid="scale-validate-btn"]');

        btn?.click();

        expect(spy).toHaveBeenCalled();
      });
    });
  });

  describe('setupScaleSync()', () => {
    it('should set scale form control to "plan" when scalingFactors changes to plan norms', () => {
      scalingFactorsSignal.set({ x: 0.2, y: 1, z: 1, aspectMode: 'manual' });
      fixture.detectChanges();

      expect(component.formScaleView.get('scale')?.value).toBe('plan');
    });

    it('should set scale form control to "geo" when scalingFactors changes to geo norms', () => {
      scalingFactorsSignal.set({ x: 1, y: 1, z: 1, aspectMode: 'manual' });
      fixture.detectChanges();

      expect(component.formScaleView.get('scale')?.value).toBe('geo');
    });

    it('should set scale form control to "celeste" when scalingFactors changes to celeste norms', () => {
      scalingFactorsSignal.set({ x: 1, y: 1, z: 0.5, aspectMode: 'manual' });
      fixture.detectChanges();

      expect(component.formScaleView.get('scale')?.value).toBe('celeste');
    });

    it('should set scale form control to "auto" when scalingFactors changes to auto norms', () => {
      // Start with a different value first
      scalingFactorsSignal.set({ x: 0.2, y: 1, z: 1, aspectMode: 'manual' });
      fixture.detectChanges();

      scalingFactorsSignal.set({ x: 1, y: 1, z: 1, aspectMode: 'data' });
      fixture.detectChanges();

      expect(component.formScaleView.get('scale')?.value).toBe('auto');
    });

    it('should fall back to "auto" for an unrecognized ScalingFactors combination', () => {
      scalingFactorsSignal.set({ x: 99, y: 99, z: 99, aspectMode: 'manual' });
      fixture.detectChanges();

      expect(component.formScaleView.get('scale')?.value).toBe('auto');
    });

    it('should not emit valueChanges when the scale radio is updated by sync', () => {
      const emittedValues: string[] = [];
      const sub = component.formScaleView.get('scale')!.valueChanges.subscribe((v) => emittedValues.push(v));

      scalingFactorsSignal.set({ x: 0.2, y: 1, z: 1, aspectMode: 'manual' });
      fixture.detectChanges();

      sub.unsubscribe();
      expect(emittedValues).toHaveLength(0);
    });
  });
});
