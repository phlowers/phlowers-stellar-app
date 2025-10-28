import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { SpanComponent } from './span.component';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';

describe('SpanComponent', () => {
  let component: SpanComponent;
  let fixture: ComponentFixture<SpanComponent>;

  const mockSpans = [
    { label: 'Span 1', value: 'span1', supports: [1, 2] },
    { label: 'Span 2', value: 'span2', supports: [2, 3] },
    { label: 'Span 3', value: 'span3', supports: [1, 3] }
  ];

  const mockSupports = [
    { label: 'Support 1', value: 1 },
    { label: 'Support 2', value: 2 },
    { label: 'Support 3', value: 3 }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        SpanComponent,
        ReactiveFormsModule,
        ButtonComponent,
        IconComponent
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SpanComponent);
    component = fixture.componentInstance;

    // Set required inputs
    fixture.componentRef.setInput('spans', mockSpans);
    fixture.componentRef.setInput('supports', mockSupports);

    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize form with correct controls', () => {
      expect(component.form.get('spanSelect')).toBeTruthy();
      expect(component.form.get('supportNumber')).toBeTruthy();
      expect(component.form.get('loadType')).toBeTruthy();
      expect(component.form.get('spanLoad')).toBeTruthy();
      expect(component.form.get('cableLengthChange')).toBeTruthy();
      expect(component.form.get('pointLoadDist')).toBeTruthy();
    });

    it('should have spanSelect and loadType as required fields', () => {
      expect(component.form.get('spanSelect')?.hasError('required')).toBe(true);
      expect(component.form.get('loadType')?.hasError('required')).toBe(true);
    });

    it('should initialize all form values as null', () => {
      expect(component.form.get('spanSelect')?.value).toBeNull();
      expect(component.form.get('supportNumber')?.value).toBeNull();
      expect(component.form.get('loadType')?.value).toBeNull();
    });
  });

  describe('Available Spans Filtering', () => {
    it('should return all spans when no support is selected', () => {
      expect(component['availableSpans']()).toEqual(mockSpans);
    });

    it('should filter spans based on selected support', () => {
      component.form.patchValue({ supportNumber: 1 });
      fixture.detectChanges();

      const filtered = component['availableSpans']();
      expect(filtered).toHaveLength(2);
      expect(filtered.map((s) => s.value)).toEqual(['span1', 'span3']);
    });

    it('should filter spans for support 2', () => {
      component.form.patchValue({ supportNumber: 2 });
      fixture.detectChanges();

      const filtered = component['availableSpans']();
      expect(filtered).toHaveLength(2);
      expect(filtered.map((s) => s.value)).toEqual(['span1', 'span2']);
    });
  });

  describe('Available Supports Filtering', () => {
    it('should return all supports when no span is selected', () => {
      expect(component['availableSupports']()).toEqual(mockSupports);
    });

    it('should filter supports based on selected span', () => {
      component.form.patchValue({ spanSelect: 'span1' });
      fixture.detectChanges();

      const filtered = component['availableSupports']();
      expect(filtered).toHaveLength(2);
      expect(filtered.map((s) => s.value)).toEqual([1, 2]);
    });

    it('should return all supports if selected span is not found', () => {
      component.form.patchValue({ spanSelect: 'nonexistent' });
      fixture.detectChanges();

      expect(component['availableSupports']()).toEqual(mockSupports);
    });
  });

  describe('Form Control State Management - Punctual Load', () => {
    beforeEach(() => {
      component.form.patchValue({ loadType: 'punctual' });
      fixture.detectChanges();
    });

    it('should enable supportNumber, spanLoad, and pointLoadDist for punctual load', () => {
      expect(component.form.get('supportNumber')?.enabled).toBe(true);
      expect(component.form.get('spanLoad')?.enabled).toBe(true);
      expect(component.form.get('pointLoadDist')?.enabled).toBe(true);
    });

    it('should disable cableLengthChange for punctual load', () => {
      expect(component.form.get('cableLengthChange')?.disabled).toBe(true);
    });

    it('should keep spanSelect and loadType enabled', () => {
      expect(component.form.get('spanSelect')?.enabled).toBe(true);
      expect(component.form.get('loadType')?.enabled).toBe(true);
    });
  });

  describe('Form Control State Management - Distributed Load', () => {
    beforeEach(() => {
      component.form.patchValue({ loadType: 'distributed' });
      fixture.detectChanges();
    });

    it('should enable only spanLoad for distributed load', () => {
      expect(component.form.get('spanLoad')?.enabled).toBe(true);
    });

    it('should disable supportNumber, cableLengthChange, and pointLoadDist', () => {
      expect(component.form.get('supportNumber')?.disabled).toBe(true);
      expect(component.form.get('cableLengthChange')?.disabled).toBe(true);
      expect(component.form.get('pointLoadDist')?.disabled).toBe(true);
    });
  });

  describe('Form Control State Management - Shortening/Lengthening', () => {
    beforeEach(() => {
      component.form.patchValue({ loadType: 'shortlength' });
      fixture.detectChanges();
    });

    it('should enable only cableLengthChange for shortlength load', () => {
      expect(component.form.get('cableLengthChange')?.enabled).toBe(true);
    });

    it('should disable supportNumber, spanLoad, and pointLoadDist', () => {
      expect(component.form.get('supportNumber')?.disabled).toBe(true);
      expect(component.form.get('spanLoad')?.disabled).toBe(true);
      expect(component.form.get('pointLoadDist')?.disabled).toBe(true);
    });
  });

  describe('Form Reset', () => {
    beforeEach(() => {
      component.form.patchValue({
        spanSelect: 'span1',
        supportNumber: 1,
        loadType: 'punctual',
        spanLoad: 100,
        pointLoadDist: 5
      });
    });

    it('should reset all form values to null', () => {
      component.resetForm();

      expect(component.form.get('spanSelect')?.value).toBeNull();
      expect(component.form.get('supportNumber')?.value).toBeNull();
      expect(component.form.get('loadType')?.value).toBeNull();
      expect(component.form.get('spanLoad')?.value).toBeNull();
      expect(component.form.get('pointLoadDist')?.value).toBeNull();
    });

    it('should reset selectedSpan and selectedSupport signals', () => {
      component.resetForm();
      fixture.detectChanges();

      expect(component['availableSpans']()).toEqual(mockSpans);
      expect(component['availableSupports']()).toEqual(mockSupports);
    });
  });

  describe('Form Submission', () => {
    it('should not submit when form is invalid', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      component.submitForm();

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should submit form values when valid', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      component.form.patchValue({
        spanSelect: 'span1',
        loadType: 'distributed',
        spanLoad: 150
      });

      component.submitForm();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Submit (save):',
        expect.objectContaining({
          spanSelect: 'span1',
          loadType: 'distributed',
          spanLoad: 150
        })
      );
      consoleSpy.mockRestore();
    });

    it('should only include enabled fields in submission', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      component.form.patchValue({
        spanSelect: 'span1',
        loadType: 'distributed',
        spanLoad: 150
      });

      component.submitForm();
      const submittedValue = consoleSpy.mock.calls[0][1];

      // Check that the value includes enabled fields
      expect(submittedValue).toHaveProperty('spanSelect', 'span1');
      expect(submittedValue).toHaveProperty('loadType', 'distributed');
      expect(submittedValue).toHaveProperty('spanLoad', 150);

      consoleSpy.mockRestore();
    });
  });

  describe('Form Calculation', () => {
    it('should not calculate when form is invalid', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Form is invalid - missing required fields
      component.form.reset();
      component.calculForm();

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log calculation values when form is valid', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      component.form.patchValue({
        spanSelect: 'span2',
        loadType: 'punctual',
        supportNumber: 2,
        spanLoad: 200,
        pointLoadDist: 10
      });

      component.calculForm();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Calculus values:',
        expect.objectContaining({
          spanSelect: 'span2',
          loadType: 'punctual',
          supportNumber: 2,
          spanLoad: 200,
          pointLoadDist: 10
        })
      );
      consoleSpy.mockRestore();
    });
  });

  describe('Form Validation', () => {
    it('should return true when form is invalid', () => {
      expect(component.isFormInvalid()).toBe(true);
    });

    it('should return false when required fields are filled', () => {
      component.form.patchValue({
        spanSelect: 'span1',
        loadType: 'distributed'
      });

      expect(component.isFormInvalid()).toBe(false);
    });

    it('should validate form with punctual load type', () => {
      component.form.patchValue({
        spanSelect: 'span1',
        loadType: 'punctual',
        supportNumber: 1,
        spanLoad: 100,
        pointLoadDist: 5
      });

      expect(component.isFormInvalid()).toBe(false);
    });
  });

  describe('Erase Form', () => {
    it('should trigger alert when eraseForm is called', () => {
      const alertSpy = jest.spyOn(global, 'alert').mockImplementation(() => {});
      component.eraseForm();

      expect(alertSpy).toHaveBeenCalledWith('erase the load case!');
      alertSpy.mockRestore();
    });
  });

  describe('Load Type Options', () => {
    it('should have three load type options', () => {
      expect(component.loadTypeOptions).toHaveLength(3);
    });

    it('should have correct load type values', () => {
      const values = component.loadTypeOptions.map((opt) => opt.value);
      expect(values).toEqual(['punctual', 'distributed', 'shortlength']);
    });
  });

  describe('Subscription Cleanup', () => {
    it('should unsubscribe on destroy', () => {
      const unsubscribeSpy = jest.spyOn(
        component['subscriptions'],
        'unsubscribe'
      );
      component.ngOnDestroy();

      expect(unsubscribeSpy).toHaveBeenCalled();
    });
  });

  describe('Cross-field Interactions', () => {
    it('should update available spans when support changes', () => {
      component.form.patchValue({ supportNumber: 1 });
      fixture.detectChanges();

      expect(component['availableSpans']()).toHaveLength(2);

      component.form.patchValue({ supportNumber: 3 });
      fixture.detectChanges();

      expect(component['availableSpans']()).toHaveLength(2);
      expect(component['availableSpans']().map((s) => s.value)).toEqual([
        'span2',
        'span3'
      ]);
    });

    it('should update available supports when span changes', () => {
      component.form.patchValue({ spanSelect: 'span1' });
      fixture.detectChanges();

      expect(component['availableSupports']().map((s) => s.value)).toEqual([
        1, 2
      ]);

      component.form.patchValue({ spanSelect: 'span3' });
      fixture.detectChanges();

      expect(component['availableSupports']().map((s) => s.value)).toEqual([
        1, 3
      ]);
    });

    it('should handle switching between load types', () => {
      component.form.patchValue({ loadType: 'punctual' });
      expect(component.form.get('pointLoadDist')?.enabled).toBe(true);

      component.form.patchValue({ loadType: 'distributed' });
      expect(component.form.get('pointLoadDist')?.disabled).toBe(true);

      component.form.patchValue({ loadType: 'shortlength' });
      expect(component.form.get('cableLengthChange')?.enabled).toBe(true);
    });
  });
});
