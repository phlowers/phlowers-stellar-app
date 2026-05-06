import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { vi } from 'vitest';
import { LocationComponent } from '@features/study/presentation/components/sections-tab/newSectionModal/manualSection/location/location.component';
import { LOCATION_CONFIG } from '@features/study/presentation/components/sections-tab/newSectionModal/manualSection/location/location.constantes';

describe('LocationComponent', () => {
  let component: LocationComponent;
  let fixture: ComponentFixture<LocationComponent>;

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  const triggerInput = (testId: string, value: string): void => {
    const input = getByTestId(testId) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocationComponent],
      providers: [provideNoopAnimations()]
    }).compileComponents();

    fixture = TestBed.createComponent(LocationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('HTML rendering - structure', () => {
    it('should render the latitude input', () => {
      expect(getByTestId('latitude-input')?.tagName).toBe('INPUT');
    });

    it('should render the longitude input', () => {
      expect(getByTestId('longitude-input')?.tagName).toBe('INPUT');
    });

    it('should render the azimuth input', () => {
      expect(getByTestId('azimuth-input')?.tagName).toBe('INPUT');
    });
  });

  describe('HTML rendering - initial displayed values', () => {
    it('should display the default latitude value', () => {
      const input = getByTestId('latitude-input') as HTMLInputElement;
      expect(+input.value).toBe(LOCATION_CONFIG.latitude.default);
    });

    it('should display the default longitude value', () => {
      const input = getByTestId('longitude-input') as HTMLInputElement;
      expect(+input.value).toBe(LOCATION_CONFIG.longitude.default);
    });

    it('should display azimuth default as "0.0"', () => {
      const input = getByTestId('azimuth-input') as HTMLInputElement;
      expect(input.value).toBe('0.0');
    });
  });

  describe('linkedSignal reactivity - initial inputs update the displayed value', () => {
    it('should update displayed latitude when initialLatitude input changes', () => {
      fixture.componentRef.setInput('initialLatitude', 45);
      fixture.detectChanges();
      const input = getByTestId('latitude-input') as HTMLInputElement;
      expect(+input.value).toBe(45);
    });

    it('should update displayed longitude when initialLongitude input changes', () => {
      fixture.componentRef.setInput('initialLongitude', 10);
      fixture.detectChanges();
      const input = getByTestId('longitude-input') as HTMLInputElement;
      expect(+input.value).toBe(10);
    });

    it('should update displayed azimuth as "45.0" when initialAzimuth input changes to integer', () => {
      fixture.componentRef.setInput('initialAzimuth', 45);
      fixture.detectChanges();
      const input = getByTestId('azimuth-input') as HTMLInputElement;
      expect(input.value).toBe('45.0');
    });

    it('should update displayed azimuth without reformatting when initialAzimuth input changes to decimal', () => {
      fixture.componentRef.setInput('initialAzimuth', 45.5);
      fixture.detectChanges();
      const input = getByTestId('azimuth-input') as HTMLInputElement;
      expect(+input.value).toBe(45.5);
    });
  });

  describe('HTML rendering - initial attribute bindings', () => {
    it('should bind latitude min, max and step from config', () => {
      const input = getByTestId('latitude-input') as HTMLInputElement;
      expect(input.getAttribute('min')).toBe(String(LOCATION_CONFIG.latitude.min));
      expect(input.getAttribute('max')).toBe(String(LOCATION_CONFIG.latitude.max));
      expect(input.getAttribute('step')).toBe(String(LOCATION_CONFIG.latitude.step));
    });

    it('should bind longitude min, max and step from config', () => {
      const input = getByTestId('longitude-input') as HTMLInputElement;
      expect(input.getAttribute('min')).toBe(String(LOCATION_CONFIG.longitude.min));
      expect(input.getAttribute('max')).toBe(String(LOCATION_CONFIG.longitude.max));
      expect(input.getAttribute('step')).toBe(String(LOCATION_CONFIG.longitude.step));
    });

    it('should bind azimuth min, max and step from config', () => {
      const input = getByTestId('azimuth-input') as HTMLInputElement;
      expect(input.getAttribute('min')).toBe(String(LOCATION_CONFIG.azimuth.min));
      expect(input.getAttribute('max')).toBe(String(LOCATION_CONFIG.azimuth.max));
      expect(input.getAttribute('step')).toBe(String(LOCATION_CONFIG.azimuth.step));
    });
  });

  describe('HTML rendering - no error messages on valid values', () => {
    it('should not show any error message on initial render', () => {
      expect(getByTestId('latitude-max-error')).toBeNull();
      expect(getByTestId('latitude-min-error')).toBeNull();
      expect(getByTestId('longitude-max-error')).toBeNull();
      expect(getByTestId('longitude-min-error')).toBeNull();
      expect(getByTestId('azimuth-max-error')).toBeNull();
      expect(getByTestId('azimuth-min-error')).toBeNull();
    });
  });

  describe('HTML rendering - latitude error messages', () => {
    it('should show latitude max error when value exceeds maximum', () => {
      triggerInput('latitude-input', String(LOCATION_CONFIG.latitude.max + 1));
      expect(getByTestId('latitude-max-error')).not.toBeNull();
      expect(getByTestId('latitude-min-error')).toBeNull();
    });

    it('should show latitude min error when value is below minimum', () => {
      triggerInput('latitude-input', String(LOCATION_CONFIG.latitude.min - 1));
      expect(getByTestId('latitude-min-error')).not.toBeNull();
      expect(getByTestId('latitude-max-error')).toBeNull();
    });

    it('should hide latitude error when value returns to valid range', () => {
      triggerInput('latitude-input', String(LOCATION_CONFIG.latitude.max + 1));
      triggerInput('latitude-input', '0');
      expect(getByTestId('latitude-max-error')).toBeNull();
      expect(getByTestId('latitude-min-error')).toBeNull();
    });
  });

  describe('HTML rendering - longitude error messages', () => {
    it('should show longitude max error when value exceeds maximum', () => {
      triggerInput('longitude-input', String(LOCATION_CONFIG.longitude.max + 1));
      expect(getByTestId('longitude-max-error')).not.toBeNull();
      expect(getByTestId('longitude-min-error')).toBeNull();
    });

    it('should show longitude min error when value is below minimum', () => {
      triggerInput('longitude-input', String(LOCATION_CONFIG.longitude.min - 1));
      expect(getByTestId('longitude-min-error')).not.toBeNull();
      expect(getByTestId('longitude-max-error')).toBeNull();
    });

    it('should hide longitude error when value returns to valid range', () => {
      triggerInput('longitude-input', String(LOCATION_CONFIG.longitude.max + 1));
      triggerInput('longitude-input', '0');
      expect(getByTestId('longitude-max-error')).toBeNull();
      expect(getByTestId('longitude-min-error')).toBeNull();
    });
  });

  describe('HTML rendering - azimuth error messages', () => {
    it('should show azimuth max error when value exceeds maximum', () => {
      triggerInput('azimuth-input', String(LOCATION_CONFIG.azimuth.max + 1));
      expect(getByTestId('azimuth-max-error')).not.toBeNull();
      expect(getByTestId('azimuth-min-error')).toBeNull();
    });

    it('should show azimuth min error when value is below minimum', () => {
      triggerInput('azimuth-input', String(LOCATION_CONFIG.azimuth.min - 1));
      expect(getByTestId('azimuth-min-error')).not.toBeNull();
      expect(getByTestId('azimuth-max-error')).toBeNull();
    });

    it('should hide azimuth error when value returns to valid range', () => {
      triggerInput('azimuth-input', String(LOCATION_CONFIG.azimuth.max + 1));
      triggerInput('azimuth-input', '0');
      expect(getByTestId('azimuth-max-error')).toBeNull();
      expect(getByTestId('azimuth-min-error')).toBeNull();
    });
  });

  describe('HTML rendering - accessibility', () => {
    it('should not set aria-invalid on latitude input when value is valid', () => {
      expect(getByTestId('latitude-input')?.getAttribute('aria-invalid')).toBeNull();
    });

    it('should set aria-invalid on latitude input when over max', () => {
      triggerInput('latitude-input', String(LOCATION_CONFIG.latitude.max + 1));
      expect(getByTestId('latitude-input')?.getAttribute('aria-invalid')).toBe('true');
    });

    it('should set aria-invalid on latitude input when under min', () => {
      triggerInput('latitude-input', String(LOCATION_CONFIG.latitude.min - 1));
      expect(getByTestId('latitude-input')?.getAttribute('aria-invalid')).toBe('true');
    });

    it('should set aria-errormessage to max error id on latitude input when over max', () => {
      triggerInput('latitude-input', String(LOCATION_CONFIG.latitude.max + 1));
      expect(getByTestId('latitude-input')?.getAttribute('aria-errormessage')).toBe('location-latitude-max-error');
    });

    it('should set aria-errormessage to min error id on latitude input when under min', () => {
      triggerInput('latitude-input', String(LOCATION_CONFIG.latitude.min - 1));
      expect(getByTestId('latitude-input')?.getAttribute('aria-errormessage')).toBe('location-latitude-min-error');
    });

    it('should not set aria-invalid on longitude input when value is valid', () => {
      expect(getByTestId('longitude-input')?.getAttribute('aria-invalid')).toBeNull();
    });

    it('should set aria-invalid on longitude input when over max', () => {
      triggerInput('longitude-input', String(LOCATION_CONFIG.longitude.max + 1));
      expect(getByTestId('longitude-input')?.getAttribute('aria-invalid')).toBe('true');
    });

    it('should set aria-errormessage to max error id on longitude input when over max', () => {
      triggerInput('longitude-input', String(LOCATION_CONFIG.longitude.max + 1));
      expect(getByTestId('longitude-input')?.getAttribute('aria-errormessage')).toBe('location-longitude-max-error');
    });

    it('should set aria-errormessage to min error id on longitude input when under min', () => {
      triggerInput('longitude-input', String(LOCATION_CONFIG.longitude.min - 1));
      expect(getByTestId('longitude-input')?.getAttribute('aria-errormessage')).toBe('location-longitude-min-error');
    });

    it('should not set aria-invalid on azimuth input when value is valid', () => {
      expect(getByTestId('azimuth-input')?.getAttribute('aria-invalid')).toBeNull();
    });

    it('should set aria-invalid on azimuth input when over max', () => {
      triggerInput('azimuth-input', String(LOCATION_CONFIG.azimuth.max + 1));
      expect(getByTestId('azimuth-input')?.getAttribute('aria-invalid')).toBe('true');
    });

    it('should set aria-errormessage to max error id on azimuth input when over max', () => {
      triggerInput('azimuth-input', String(LOCATION_CONFIG.azimuth.max + 1));
      expect(getByTestId('azimuth-input')?.getAttribute('aria-errormessage')).toBe('location-azimuth-max-error');
    });

    it('should set aria-errormessage to min error id on azimuth input when under min', () => {
      triggerInput('azimuth-input', String(LOCATION_CONFIG.azimuth.min - 1));
      expect(getByTestId('azimuth-input')?.getAttribute('aria-errormessage')).toBe('location-azimuth-min-error');
    });

    it('should set aria-describedby on all inputs', () => {
      expect(getByTestId('latitude-input')?.getAttribute('aria-describedby')).toBe('support1location');
      expect(getByTestId('longitude-input')?.getAttribute('aria-describedby')).toBe('support1location');
      expect(getByTestId('azimuth-input')?.getAttribute('aria-describedby')).toBe('support1location');
    });
  });

  describe('output - locationChange', () => {
    beforeEach(() => {
      vi.spyOn(component.locationChange, 'emit');
    });

    it('should emit locationChange when latitude input changes', () => {
      triggerInput('latitude-input', '45');
      expect(component.locationChange.emit).toHaveBeenCalledWith(expect.objectContaining({ latitude: 45 }));
    });

    it('should emit locationChange when longitude input changes', () => {
      triggerInput('longitude-input', '10');
      expect(component.locationChange.emit).toHaveBeenCalledWith(expect.objectContaining({ longitude: 10 }));
    });

    it('should emit locationChange when azimuth input changes', () => {
      triggerInput('azimuth-input', '45');
      expect(component.locationChange.emit).toHaveBeenCalledWith(expect.objectContaining({ azimuth: 45 }));
    });

    it('should emit all three field values together on latitude change', () => {
      triggerInput('longitude-input', '10');
      triggerInput('azimuth-input', '90');
      triggerInput('latitude-input', '45');
      expect(component.locationChange.emit).toHaveBeenLastCalledWith({
        latitude: 45,
        longitude: 10,
        azimuth: 90
      });
    });

    it('should truncate azimuth to one decimal before emitting', () => {
      triggerInput('azimuth-input', '45.15');
      expect(component.locationChange.emit).toHaveBeenCalledWith(expect.objectContaining({ azimuth: 45.1 }));
    });

    it('should emit null latitude when latitude is cleared', () => {
      triggerInput('latitude-input', '');
      expect(component.locationChange.emit).toHaveBeenCalledWith(expect.objectContaining({ latitude: null }));
    });

    it('should emit null longitude when longitude is cleared', () => {
      triggerInput('longitude-input', '');
      expect(component.locationChange.emit).toHaveBeenCalledWith(expect.objectContaining({ longitude: null }));
    });

    it('should emit null azimuth when azimuth is cleared', () => {
      triggerInput('azimuth-input', '');
      expect(component.locationChange.emit).toHaveBeenCalledWith(expect.objectContaining({ azimuth: null }));
    });

    it('should emit null latitude when latitude receives an invalid value', () => {
      triggerInput('latitude-input', 'abc');
      expect(component.locationChange.emit).toHaveBeenCalledWith(expect.objectContaining({ latitude: null }));
    });

    it('should emit null then the valid latitude after a valid value follows an empty field', () => {
      triggerInput('latitude-input', '');
      triggerInput('latitude-input', '45');
      expect(component.locationChange.emit).toHaveBeenCalledTimes(2);
      expect(component.locationChange.emit).toHaveBeenLastCalledWith(expect.objectContaining({ latitude: 45 }));
    });
  });

  describe('output - isValidChange', () => {
    beforeEach(() => {
      vi.spyOn(component.isValidChange, 'emit');
    });

    it('should emit true when all fields are within bounds', () => {
      triggerInput('latitude-input', '45');
      expect(component.isValidChange.emit).toHaveBeenCalledWith(true);
    });

    it('should emit false when latitude is over max', () => {
      triggerInput('latitude-input', String(LOCATION_CONFIG.latitude.max + 1));
      expect(component.isValidChange.emit).toHaveBeenCalledWith(false);
    });

    it('should emit false when latitude is under min', () => {
      triggerInput('latitude-input', String(LOCATION_CONFIG.latitude.min - 1));
      expect(component.isValidChange.emit).toHaveBeenCalledWith(false);
    });

    it('should emit false when longitude is over max', () => {
      triggerInput('longitude-input', String(LOCATION_CONFIG.longitude.max + 1));
      expect(component.isValidChange.emit).toHaveBeenCalledWith(false);
    });

    it('should emit false when longitude is under min', () => {
      triggerInput('longitude-input', String(LOCATION_CONFIG.longitude.min - 1));
      expect(component.isValidChange.emit).toHaveBeenCalledWith(false);
    });

    it('should emit false when azimuth is over max', () => {
      triggerInput('azimuth-input', String(LOCATION_CONFIG.azimuth.max + 1));
      expect(component.isValidChange.emit).toHaveBeenCalledWith(false);
    });

    it('should emit false when azimuth is under min', () => {
      triggerInput('azimuth-input', String(LOCATION_CONFIG.azimuth.min - 1));
      expect(component.isValidChange.emit).toHaveBeenCalledWith(false);
    });

    it('should emit true when value returns to valid range after being out of bounds', () => {
      triggerInput('latitude-input', String(LOCATION_CONFIG.latitude.max + 1));
      triggerInput('latitude-input', '45');
      expect(component.isValidChange.emit).toHaveBeenLastCalledWith(true);
    });

    it('should emit true when a field is cleared', () => {
      triggerInput('latitude-input', '');
      expect(component.isValidChange.emit).toHaveBeenCalledWith(true);
    });
  });

  describe('HTML rendering - no error shown on empty field', () => {
    it('should not show latitude error when field is cleared', () => {
      triggerInput('latitude-input', '');
      expect(getByTestId('latitude-max-error')).toBeNull();
      expect(getByTestId('latitude-min-error')).toBeNull();
    });

    it('should not show longitude error when field is cleared', () => {
      triggerInput('longitude-input', '');
      expect(getByTestId('longitude-max-error')).toBeNull();
      expect(getByTestId('longitude-min-error')).toBeNull();
    });

    it('should not show azimuth error when field is cleared', () => {
      triggerInput('azimuth-input', '');
      expect(getByTestId('azimuth-max-error')).toBeNull();
      expect(getByTestId('azimuth-min-error')).toBeNull();
    });
  });
});
