import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { SelectModule, Select } from 'primeng/select';
import { DividerModule } from 'primeng/divider';
import { By } from '@angular/platform-browser';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { SelectWithButtonsComponent } from './select-with-buttons.component';

import { TranslocoTestingModule } from '@jsverse/transloco';
describe('SelectWithButtonsComponent', () => {
  let component: SelectWithButtonsComponent<Record<string, unknown>>;
  let fixture: ComponentFixture<SelectWithButtonsComponent<Record<string, unknown>>>;

  const mockOptions = [
    { id: '1', name: 'Option 1', description: 'First option' },
    { id: '2', name: 'Option 2', description: 'Second option' },
    { id: '3', name: 'Option 3', description: 'Third option' }
  ];

  beforeAll(() => {
    // PrimeNG overlay rendering needs matchMedia
    Object.defineProperty(globalThis, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
    });
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        }),SelectWithButtonsComponent, FormsModule, SelectModule, DividerModule, NoopAnimationsModule],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(SelectWithButtonsComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('options', mockOptions);
    fixture.componentRef.setInput('selectedOption', '1');
    fixture.componentRef.setInput('optionLabel', 'name');
    fixture.componentRef.setInput('optionValue', 'id');
    fixture.componentRef.setInput('ariaLabel', 'Test select');
    fixture.componentRef.setInput('placeholder', 'Select an option');
    fixture.componentRef.setInput('showClear', true);

    fixture.detectChanges();
    await fixture.whenStable();

    // mock viewChild signal
    const mockSelect = {
      writeValue: vi.fn(),
      updateModel: vi.fn(),
      hide: vi.fn()
    };
    Object.defineProperty(component, 'selectComponent', {
      value: (() => mockSelect) as unknown as ReturnType<(typeof component)['selectComponent']>,
      writable: true
    });
  });

  afterEach(() => {
    document.querySelectorAll('.p-overlay, .p-select-overlay').forEach((e) => e.remove());
  });

  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize inputs correctly', () => {
      expect(component.options()).toEqual(mockOptions);
      expect(component.selectedOption()).toBe('1');
      expect(component.optionLabel()).toBe('name');
      expect(component.optionValue()).toBe('id');
      expect(component.ariaLabel()).toBe('Test select');
    });

    it('should set selectedOptionValue from selectedOption on init', () => {
      expect(component.selectedOptionValue()).toBe('1');
    });
  });

  describe('Computed selectedOptionLabel', () => {
    it('should compute correct label for selected option', () => {
      expect(component.selectedOptionLabel()).toBe('Option 1');
    });

    it('should return empty string if selectedOption is null', async () => {
      fixture.componentRef.setInput('selectedOption', null);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.selectedOptionLabel()).toBe('');
    });

    it('should update label when options change', async () => {
      const newOptions = [{ id: '1', name: 'New Option 1' }];
      fixture.componentRef.setInput('options', newOptions);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.selectedOptionLabel()).toBe('New Option 1');
    });
  });

  describe('Methods', () => {
    it('should emit selectOption when onSelectionChange is called with valid value', () => {
      const spy = vi.spyOn(component.selectOption, 'emit');
      component.onSelectionChange('2');
      expect(spy).toHaveBeenCalledWith(mockOptions[1]);
    });

    it('should not emit selectOption when value is null', () => {
      const spy = vi.spyOn(component.selectOption, 'emit');
      component.onSelectionChange(null);
      expect(spy).not.toHaveBeenCalled();
    });

    it('should clear selectedOptionValue and reset selectComponent when clearSelectedOptionValue is called', () => {
      const spy = vi.spyOn(component.selectOption, 'emit');

      component.clearSelectedOptionValue();

      expect(component.selectedOptionValue()).toBeUndefined();
      expect(spy).toHaveBeenCalledWith(undefined);
      expect(component.selectComponent()?.writeValue).toHaveBeenCalledWith(null);
      expect(component.selectComponent()?.updateModel).toHaveBeenCalledWith(null, null);
    });

    it('should emit selectOption and hide selectComponent onSelectItem', () => {
      const spy = vi.spyOn(component.selectOption, 'emit');
      const item = mockOptions[0];

      component.onSelectItem(item);

      expect(spy).toHaveBeenCalledWith(item);
      expect(component.selectComponent()?.hide).toHaveBeenCalled();
      expect(component.selectedOptionValue()).toBe('1');
    });
  });

  describe('Outputs', () => {
    type OutputNames = 'viewOption' | 'editOption' | 'duplicateOption' | 'deleteOption';

    it.each<OutputNames>(['viewOption', 'editOption', 'duplicateOption', 'deleteOption'])(
      'should define %s output emitter',
      (outputName) => {
        expect(component[outputName]).toBeDefined();
      }
    );
  });

  describe('Button visibility inputs', () => {
    let primeSelect: Select;

    beforeEach(() => {
      primeSelect = fixture.debugElement.query(By.directive(Select)).componentInstance as Select;
    });

    async function openDropdown(): Promise<void> {
      primeSelect.show();
      fixture.detectChanges();
      await fixture.whenStable();
    }

    const getInPanel = (testId: string): HTMLElement | null => document.body.querySelector(`[data-testid="${testId}"]`);

    it('should default all button visibility inputs to true', () => {
      expect(component.showViewButton()).toBe(true);
      expect(component.showEditButton()).toBe(true);
      expect(component.showDuplicateButton()).toBe(true);
      expect(component.showDeleteButton()).toBe(true);
    });

    it('should render all action buttons in the dropdown by default', async () => {
      await openDropdown();
      expect(getInPanel('select-view-btn')).toBeTruthy();
      expect(getInPanel('select-edit-btn')).toBeTruthy();
      expect(getInPanel('select-duplicate-btn')).toBeTruthy();
      expect(getInPanel('select-delete-btn')).toBeTruthy();
    });

    it('should hide view button in the dropdown when showViewButton is false', async () => {
      fixture.componentRef.setInput('showViewButton', false);
      fixture.detectChanges();
      await openDropdown();
      expect(component.showViewButton()).toBe(false);
      expect(getInPanel('select-view-btn')).toBeNull();
      expect(getInPanel('select-edit-btn')).toBeTruthy();
    });

    it('should hide edit button in the dropdown when showEditButton is false', async () => {
      fixture.componentRef.setInput('showEditButton', false);
      fixture.detectChanges();
      await openDropdown();
      expect(component.showEditButton()).toBe(false);
      expect(getInPanel('select-edit-btn')).toBeNull();
      expect(getInPanel('select-view-btn')).toBeTruthy();
    });

    it('should hide duplicate button in the dropdown when showDuplicateButton is false', async () => {
      fixture.componentRef.setInput('showDuplicateButton', false);
      fixture.detectChanges();
      await openDropdown();
      expect(component.showDuplicateButton()).toBe(false);
      expect(getInPanel('select-duplicate-btn')).toBeNull();
    });

    it('should hide delete button in the dropdown when showDeleteButton is false', async () => {
      fixture.componentRef.setInput('showDeleteButton', false);
      fixture.detectChanges();
      await openDropdown();
      expect(component.showDeleteButton()).toBe(false);
      expect(getInPanel('select-delete-btn')).toBeNull();
    });

    it('should show only delete button in the dropdown when view/edit/duplicate are disabled', async () => {
      fixture.componentRef.setInput('showViewButton', false);
      fixture.componentRef.setInput('showEditButton', false);
      fixture.componentRef.setInput('showDuplicateButton', false);
      fixture.detectChanges();
      await openDropdown();
      expect(getInPanel('select-view-btn')).toBeNull();
      expect(getInPanel('select-edit-btn')).toBeNull();
      expect(getInPanel('select-duplicate-btn')).toBeNull();
      expect(getInPanel('select-delete-btn')).toBeTruthy();
      expect(component.showDeleteButton()).toBe(true);
    });
  });

  describe('Reactive input changes', () => {
    it('should react to changing selectedOption input', async () => {
      fixture.componentRef.setInput('selectedOption', '2');
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.selectedOptionLabel()).toBe('Option 2');
    });

    it('should react to changing optionLabel input', async () => {
      fixture.componentRef.setInput('optionLabel', 'description');
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.selectedOptionLabel()).toBe('First option');
    });

    it('should handle unknown selectedOption gracefully', async () => {
      fixture.componentRef.setInput('selectedOption', '999');
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.selectedOptionLabel()).toBe('');
    });
  });

  describe('Template basics', () => {
    it('should render p-select', () => {
      const el = fixture.debugElement.query(By.css('p-select'));
      expect(el).toBeTruthy();
    });

    it('should show clear button when showClear is true and value selected', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      const clearBtn = fixture.debugElement.query(By.css('.clear-button'));
      expect(clearBtn).toBeTruthy();
    });
  });

  describe('HTML rendering', () => {
    const getByTestId = (testId: string): HTMLElement | null =>
      fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

    it('should render the select dropdown', () => {
      const el = getByTestId('select-dropdown');
      expect(el).toBeTruthy();
    });

    it('should render the clear selection button when value is selected', () => {
      const el = getByTestId('clear-selection-btn');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('BUTTON');
    });
  });
});
