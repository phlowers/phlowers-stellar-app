import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';
import { vi, type MockInstance } from 'vitest';

import { PrimeDebugComponent } from './prime-debug.component';

describe('PrimeDebugComponent', () => {
  let component: PrimeDebugComponent;
  let fixture: ComponentFixture<PrimeDebugComponent>;
  let addSpy: MockInstance<MessageService['add']>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrimeDebugComponent],
      providers: [provideNoopAnimations()]
    }).compileComponents();

    fixture = TestBed.createComponent(PrimeDebugComponent);
    component = fixture.componentInstance;

    const messageService = fixture.debugElement.injector.get(MessageService);
    addSpy = vi.spyOn(messageService, 'add').mockImplementation(() => undefined);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose the demo options used by select-like components', () => {
    expect(component.demoOptions).toEqual([
      { label: 'Option A', value: 'a' },
      { label: 'Option B', value: 'b' },
      { label: 'Option C', value: 'c' }
    ]);
  });

  it('should expose the tools menu items', () => {
    expect(component.toolsMenuItems.map((item) => item.label)).toEqual(['Rename', 'Duplicate', 'Delete']);
  });

  it('should initialize form-related state with sensible defaults', () => {
    expect(component.checkboxValue).toBe(false);
    expect(component.radioValue).toBe('plan');
    expect(component.toggleSwitchValue).toBe(false);
    expect(component.selectValue).toBeNull();
    expect(component.multiSelectValues).toEqual(['a']);
    expect(component.dialogVisible).toBe(false);
  });

  it('should expose the demo table rows', () => {
    expect(component.tableRows).toHaveLength(3);
    expect(component.tableRows[0]).toEqual({ span: 'S1-S2', length: 245.12 });
  });

  describe('showToast', () => {
    it('should call MessageService.add with a success toast', () => {
      component.showToast();

      expect(addSpy).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Toast',
        detail: 'This is a p-toast message with the app override applied.'
      });
    });
  });
});
