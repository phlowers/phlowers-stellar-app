/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { vi } from 'vitest';
import { signal } from '@angular/core';
import { CableSupportManipComponent } from './cable-support-manip.component';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { CableSupportManipService } from '../../services/cableSupportManip.service';
import { NotificationService } from '@services/notification/notification.service';
import { Section } from '@shared/domain';

const mockSection: Partial<Section> = {
  uuid: 'section-uuid-1',
  supports: [
    { uuid: 'support-uuid-1', number: 'PA1' } as Section['supports'][0],
    { uuid: 'support-uuid-2', number: 'PA2' } as Section['supports'][0]
  ],
  cable_support_manipulations: [],
  selected_cable_support_manipulation_uuid: null,
  selected_charge_uuid: 'charge-uuid-1',
  start_latitude: null,
  start_longitude: null,
  start_azimuth: null
};

describe('CableSupportManipComponent', () => {
  let component: CableSupportManipComponent;
  let fixture: ComponentFixture<CableSupportManipComponent>;
  let mockPlotService: vi.Mocked<PlotService>;
  let mockPlotSpanService: vi.Mocked<PlotSpanService>;
  let mockCableSupportManipService: vi.Mocked<CableSupportManipService>;
  let mockNotificationService: { success: vi.Mock; error: vi.Mock };

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  beforeEach(async () => {
    mockPlotService = {
      loading: signal(false),
      plotOptionsChange: vi.fn()
    } as unknown as vi.Mocked<PlotService>;

    mockPlotSpanService = {
      section: signal<Partial<Section> | null>(mockSection)
    } as unknown as vi.Mocked<PlotSpanService>;

    mockCableSupportManipService = {
      save: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      reloadSection: vi.fn().mockResolvedValue(undefined)
    } as unknown as vi.Mocked<CableSupportManipService>;

    mockNotificationService = {
      success: vi.fn(),
      error: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [CableSupportManipComponent],
      providers: [
        provideNoopAnimations(),
        { provide: PlotService, useValue: mockPlotService },
        { provide: PlotSpanService, useValue: mockPlotSpanService },
        { provide: CableSupportManipService, useValue: mockCableSupportManipService },
        { provide: NotificationService, useValue: mockNotificationService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CableSupportManipComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // isCalculating computed
  // ---------------------------------------------------------------------------
  describe('isCalculating computed', () => {
    it('should be false by default', () => {
      expect(component.isCalculating()).toBe(false);
    });

    it('should be true when plotService.loading() is true', () => {
      mockPlotService.loading.set(true);
      expect(component.isCalculating()).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // supportsOptions computed
  // ---------------------------------------------------------------------------
  describe('supportsOptions computed', () => {
    it('should return select options from current section supports', () => {
      const options = component.supportsOptions();
      expect(options).toHaveLength(2);
      expect(options[0]).toEqual({ label: 'PA1', value: 'support-uuid-1' });
      expect(options[1]).toEqual({ label: 'PA2', value: 'support-uuid-2' });
    });

    it('should return empty array when section has no supports', () => {
      mockPlotSpanService.section.set({ ...mockSection, supports: [] } as unknown as Section);
      expect(component.supportsOptions()).toHaveLength(0);
    });

    it('should return empty array when section is null', () => {
      mockPlotSpanService.section.set(null);
      expect(component.supportsOptions()).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // HTML rendering — button states
  // ---------------------------------------------------------------------------
  describe('HTML rendering - button states', () => {
    it('should disable save button when form is invalid', () => {
      const btn = getByTestId('cable-support-manip-save') as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });

    it('should disable calculate button when form is invalid', () => {
      const btn = getByTestId('cable-support-manip-calculate') as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });

    it('should disable erase button when no saved manipulation', () => {
      const btn = getByTestId('cable-support-manip-erase') as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });

    it('should enable erase button when a manipulation is saved', () => {
      component.hasSavedManipulation.set(true);
      fixture.detectChanges();
      const btn = getByTestId('cable-support-manip-erase') as HTMLButtonElement;
      expect(btn.disabled).toBe(false);
    });

    it('should disable save and calculate when isLoading is true even with valid form', () => {
      component.form.controls.support.setValue('support-uuid-1');
      component.form.controls.manip1Type.setValue('shifting');
      component.isLoading.set(true);
      fixture.detectChanges();

      const save = getByTestId('cable-support-manip-save') as HTMLButtonElement;
      const calculate = getByTestId('cable-support-manip-calculate') as HTMLButtonElement;
      expect(save.disabled).toBe(true);
      expect(calculate.disabled).toBe(true);
    });

    it('should disable add-manip2 button when manip1 type is shifting', () => {
      component.form.controls.manip1Type.setValue('shifting');
      fixture.detectChanges();
      const btn = getByTestId('cable-support-manip-add-manip2') as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });

    it('should enable add-manip2 button when manip1 type is crane', () => {
      component.form.controls.manip1Type.setValue('crane');
      fixture.detectChanges();
      const btn = getByTestId('cable-support-manip-add-manip2') as HTMLButtonElement;
      expect(btn.disabled).toBe(false);
    });

    it('should enable add-manip2 button when manip1 type is rope', () => {
      component.form.controls.manip1Type.setValue('rope');
      fixture.detectChanges();
      const btn = getByTestId('cable-support-manip-add-manip2') as HTMLButtonElement;
      expect(btn.disabled).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // HTML rendering — accessibility
  // ---------------------------------------------------------------------------
  describe('HTML rendering - accessibility', () => {
    it('should set aria-busy to false when not loading', () => {
      const form = getByTestId('cable-support-manip-form');
      expect(form?.getAttribute('aria-busy')).toBe('false');
    });

    it('should set aria-busy to true when loading', () => {
      component.isLoading.set(true);
      fixture.detectChanges();
      const form = getByTestId('cable-support-manip-form');
      expect(form?.getAttribute('aria-busy')).toBe('true');
    });
  });

  // ---------------------------------------------------------------------------
  // HTML rendering — conditional crane fields
  // ---------------------------------------------------------------------------
  describe('HTML rendering - crane fields', () => {
    it('should show vert displacement and lateral distance inputs when manip1 is crane', () => {
      component.form.controls.manip1Type.setValue('crane');
      fixture.detectChanges();
      expect(getByTestId('cable-support-manip-vert-displacement')).toBeTruthy();
      expect(getByTestId('cable-support-manip-lateral-distance')).toBeTruthy();
    });

    it('should hide crane fields when manip1 is rope', () => {
      component.form.controls.manip1Type.setValue('rope');
      fixture.detectChanges();
      expect(getByTestId('cable-support-manip-vert-displacement')).toBeNull();
      expect(getByTestId('cable-support-manip-lateral-distance')).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // HTML rendering — conditional rope fields
  // ---------------------------------------------------------------------------
  describe('HTML rendering - rope fields', () => {
    it('should show rope length input when manip1 is rope', () => {
      component.form.controls.manip1Type.setValue('rope');
      fixture.detectChanges();
      expect(getByTestId('cable-support-manip-rope-length')).toBeTruthy();
    });

    it('should hide rope length input when manip1 is shifting', () => {
      component.form.controls.manip1Type.setValue('shifting');
      fixture.detectChanges();
      expect(getByTestId('cable-support-manip-rope-length')).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // HTML rendering — conditional shifting fields
  // ---------------------------------------------------------------------------
  describe('HTML rendering - shifting fields', () => {
    it('should show shifting clamp length input when manip1 is shifting', () => {
      component.form.controls.manip1Type.setValue('shifting');
      fixture.detectChanges();
      expect(getByTestId('cable-support-manip-shifting-clamp-length')).toBeTruthy();
    });

    it('should hide shifting clamp length input when manip1 is crane', () => {
      component.form.controls.manip1Type.setValue('crane');
      fixture.detectChanges();
      expect(getByTestId('cable-support-manip-shifting-clamp-length')).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // HTML rendering — manip2 conditional section
  // ---------------------------------------------------------------------------
  describe('HTML rendering - manip2 section', () => {
    it('should not render manip2 controls by default', () => {
      expect(getByTestId('cable-support-manip-remove-manip2')).toBeNull();
      expect(getByTestId('cable-support-manip-manip2-type')).toBeNull();
    });

    it('should show manip2 section after addManip2 is called', () => {
      component.form.controls.manip1Type.setValue('crane');
      component.addManip2();
      fixture.detectChanges();
      expect(getByTestId('cable-support-manip-remove-manip2')).toBeTruthy();
      expect(getByTestId('cable-support-manip-manip2-type')).toBeTruthy();
    });

    it('should hide manip2 section after removeManip2 is called', fakeAsync(() => {
      // Disable manip2 animations so the @if leave transition does not delay
      // DOM removal in the test environment. The afterRender() hook re-enables
      // it after each render cycle, so it must be set again right before remove.
      component.disableManip2Anim.set(true);
      component.form.controls.manip1Type.setValue('crane');
      component.addManip2();
      tick();
      fixture.detectChanges();
      component.disableManip2Anim.set(true);
      component.removeManip2();
      fixture.detectChanges();
      expect(getByTestId('cable-support-manip-remove-manip2')).toBeNull();
    }));

    it('should show manip2 shifting clamp length input when manip2 is shown', () => {
      component.form.controls.manip1Type.setValue('rope');
      component.addManip2();
      fixture.detectChanges();
      expect(getByTestId('cable-support-manip-manip2-shifting-clamp-length')).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // isCrane / isRope / isShifting computed
  // ---------------------------------------------------------------------------
  describe('type computed signals', () => {
    it('should set isCrane to true when manip1Type is crane', () => {
      component.form.controls.manip1Type.setValue('crane');
      expect(component.isCrane()).toBe(true);
      expect(component.isRope()).toBe(false);
      expect(component.isShifting()).toBe(false);
    });

    it('should set isRope to true when manip1Type is rope', () => {
      component.form.controls.manip1Type.setValue('rope');
      expect(component.isCrane()).toBe(false);
      expect(component.isRope()).toBe(true);
      expect(component.isShifting()).toBe(false);
    });

    it('should set isShifting to true when manip1Type is shifting', () => {
      component.form.controls.manip1Type.setValue('shifting');
      expect(component.isCrane()).toBe(false);
      expect(component.isRope()).toBe(false);
      expect(component.isShifting()).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // isManip2Available computed
  // ---------------------------------------------------------------------------
  describe('isManip2Available computed', () => {
    it('should be true when manip1 is crane', () => {
      component.form.controls.manip1Type.setValue('crane');
      expect(component.isManip2Available()).toBe(true);
    });

    it('should be true when manip1 is rope', () => {
      component.form.controls.manip1Type.setValue('rope');
      expect(component.isManip2Available()).toBe(true);
    });

    it('should be false when manip1 is shifting', () => {
      component.form.controls.manip1Type.setValue('shifting');
      expect(component.isManip2Available()).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // addManip2 / removeManip2
  // ---------------------------------------------------------------------------
  describe('addManip2() / removeManip2()', () => {
    it('should set showManip2 to true', () => {
      component.addManip2();
      expect(component.showManip2()).toBe(true);
    });

    it('should set showManip2 to false after removeManip2', () => {
      component.addManip2();
      component.removeManip2();
      expect(component.showManip2()).toBe(false);
    });

    it('should reset manip2 controls to defaults after removeManip2', () => {
      component.addManip2();
      component.form.controls.manip2ShiftingClampLength.setValue(5);
      component.removeManip2();
      expect(component.form.controls.manip2ShiftingClampLength.value).toBe(0);
      expect(component.form.controls.manip2Type.value).toBe('shifting');
    });

    it('should clear manip2 when manip1 type changes to shifting', fakeAsync(() => {
      component.form.controls.manip1Type.setValue('crane');
      component.addManip2();
      tick();
      fixture.detectChanges();
      expect(component.showManip2()).toBe(true);
      component.form.controls.manip1Type.setValue('shifting');
      tick();
      fixture.detectChanges();
      expect(component.showManip2()).toBe(false);
    }));
  });

  // ---------------------------------------------------------------------------
  // onSupportChange()
  // ---------------------------------------------------------------------------
  describe('onSupportChange()', () => {
    it('should set hasSavedManipulation to false when uuid is null', () => {
      component.hasSavedManipulation.set(true);
      component.onSupportChange(null);
      expect(component.hasSavedManipulation()).toBe(false);
    });

    it('should hide manip2 and reset form to defaults when uuid is null', () => {
      component.form.controls.manip1Type.setValue('crane');
      component.addManip2();
      component.form.controls.vertDisplacement.setValue(42);
      component.onSupportChange(null);
      expect(component.showManip2()).toBe(false);
      expect(component.form.controls.vertDisplacement.value).toBe(0);
      expect(component.form.controls.support.value).toBeNull();
    });

    it('should set hasSavedManipulation to false when no saved manipulation exists', () => {
      component.onSupportChange('support-uuid-1');
      expect(component.hasSavedManipulation()).toBe(false);
    });

    it('should load saved manipulation values when one exists for the support and charge', () => {
      mockPlotSpanService.section.set({
        ...mockSection,
        selected_charge_uuid: 'charge-uuid-1',
        cable_support_manipulations: [
          {
            uuid: 'manip-uuid-1',
            supportUuid: 'support-uuid-1',
            chargeUuid: 'charge-uuid-1',
            manip1: {
              type: 'crane',
              vertDisplacement: 10,
              anchoring: 'with_chain',
              lateralDistance: 2,
              ropeLength: null,
              shiftingClampLength: null
            },
            manip2: null
          }
        ]
      } as unknown as Section);

      component.onSupportChange('support-uuid-1');

      expect(component.hasSavedManipulation()).toBe(true);
      expect(component.form.controls.manip1Type.value).toBe('crane');
      expect(component.form.controls.vertDisplacement.value).toBe(10);
      expect(component.form.controls.anchoring.value).toBe('with_chain');
      expect(component.form.controls.lateralDistance.value).toBe(2);
    });

    it('should load manip2 when saved manipulation has manip2', () => {
      mockPlotSpanService.section.set({
        ...mockSection,
        selected_charge_uuid: 'charge-uuid-1',
        cable_support_manipulations: [
          {
            uuid: 'manip-uuid-1',
            supportUuid: 'support-uuid-1',
            chargeUuid: 'charge-uuid-1',
            manip1: {
              type: 'rope',
              vertDisplacement: null,
              anchoring: null,
              lateralDistance: null,
              ropeLength: 15,
              shiftingClampLength: null
            },
            manip2: {
              type: 'shifting',
              vertDisplacement: null,
              anchoring: null,
              lateralDistance: null,
              ropeLength: null,
              shiftingClampLength: 3
            }
          }
        ]
      } as unknown as Section);

      component.onSupportChange('support-uuid-1');

      expect(component.showManip2()).toBe(true);
      expect(component.form.controls.manip2ShiftingClampLength.value).toBe(3);
    });

    it('should not load a saved manipulation that belongs to a different charge case', () => {
      mockPlotSpanService.section.set({
        ...mockSection,
        selected_charge_uuid: 'charge-uuid-1',
        cable_support_manipulations: [
          {
            uuid: 'manip-uuid-1',
            supportUuid: 'support-uuid-1',
            chargeUuid: 'OTHER-charge-uuid',
            manip1: {
              type: 'crane',
              vertDisplacement: 5,
              anchoring: 'without_chain',
              lateralDistance: 0,
              ropeLength: null,
              shiftingClampLength: null
            },
            manip2: null
          }
        ]
      } as unknown as Section);

      component.onSupportChange('support-uuid-1');

      expect(component.hasSavedManipulation()).toBe(false);
      expect(component.form.controls.manip1Type.value).toBeNull();
    });

    it('should clear manip2 when no saved manipulation for the support', () => {
      component.form.controls.manip1Type.setValue('crane');
      component.addManip2();
      component.onSupportChange('support-uuid-1');
      expect(component.showManip2()).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // resetForm()
  // ---------------------------------------------------------------------------
  describe('resetForm()', () => {
    it('should reset content fields to defaults', () => {
      component.form.controls.vertDisplacement.setValue(50);
      component.form.controls.lateralDistance.setValue(20);
      component.resetForm();
      expect(component.form.controls.vertDisplacement.value).toBe(0);
      expect(component.form.controls.lateralDistance.value).toBe(0);
    });

    it('should preserve the currently selected support', () => {
      component.form.controls.support.setValue('support-uuid-1', { emitEvent: false });
      component.resetForm();
      expect(component.form.controls.support.value).toBe('support-uuid-1');
    });

    it('should clear manip2 on reset', () => {
      component.form.controls.manip1Type.setValue('crane');
      component.addManip2();
      component.resetForm();
      expect(component.showManip2()).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // zoomToSupport()
  // ---------------------------------------------------------------------------
  describe('zoomToSupport()', () => {
    it('should not call plotOptionsChange when no support is selected', () => {
      component.form.controls.support.setValue(null);
      vi.clearAllMocks();
      component.zoomToSupport();
      expect(mockPlotService.plotOptionsChange).not.toHaveBeenCalled();
    });

    it('should call plotOptionsChange with support index when a support is selected', () => {
      component.form.controls.support.setValue('support-uuid-1');
      component.zoomToSupport();
      // support-uuid-1 is at index 0 → startSupport=0, endSupport=1
      expect(mockPlotService.plotOptionsChange).toHaveBeenCalledWith({ startSupport: 0, endSupport: 1 });
    });

    it('should not call plotOptionsChange when uuid is not found in supports list', () => {
      component.form.controls.support.setValue('unknown-uuid');
      vi.clearAllMocks();
      component.zoomToSupport();
      expect(mockPlotService.plotOptionsChange).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // saveForm()
  // ---------------------------------------------------------------------------
  describe('saveForm()', () => {
    beforeEach(() => {
      component.form.controls.support.setValue('support-uuid-1');
      component.form.controls.manip1Type.setValue('shifting');
    });

    it('should not call save service when form is invalid', async () => {
      component.form.controls.support.setValue(null);
      await component.saveForm();
      expect(mockCableSupportManipService.save).not.toHaveBeenCalled();
    });

    it('should not call save service when no charge uuid is available', async () => {
      mockPlotSpanService.section.set({ ...mockSection, selected_charge_uuid: null } as unknown as Section);
      await component.saveForm();
      expect(mockCableSupportManipService.save).not.toHaveBeenCalled();
    });

    it('should call save service with form values', async () => {
      await component.saveForm();
      expect(mockCableSupportManipService.save).toHaveBeenCalledWith(
        expect.objectContaining({
          supportUuid: 'support-uuid-1',
          chargeUuid: 'charge-uuid-1',
          manip1: expect.objectContaining({ type: 'shifting' })
        })
      );
    });

    it('should null out non-crane fields when manip1Type is crane', async () => {
      component.form.controls.manip1Type.setValue('crane');
      component.form.controls.vertDisplacement.setValue(10);
      component.form.controls.lateralDistance.setValue(2);
      component.form.controls.ropeLength.setValue(5);
      component.form.controls.shiftingClampLength.setValue(3);
      await component.saveForm();
      const call = mockCableSupportManipService.save.mock.calls[0][0];
      expect(call.manip1.type).toBe('crane');
      expect(call.manip1.vertDisplacement).toBe(10);
      expect(call.manip1.lateralDistance).toBe(2);
      expect(call.manip1.ropeLength).toBeNull();
      expect(call.manip1.shiftingClampLength).toBeNull();
    });

    it('should null out non-rope fields when manip1Type is rope', async () => {
      component.form.controls.manip1Type.setValue('rope');
      component.form.controls.ropeLength.setValue(8);
      component.form.controls.vertDisplacement.setValue(10);
      component.form.controls.shiftingClampLength.setValue(3);
      await component.saveForm();
      const call = mockCableSupportManipService.save.mock.calls[0][0];
      expect(call.manip1.type).toBe('rope');
      expect(call.manip1.ropeLength).toBe(8);
      expect(call.manip1.vertDisplacement).toBeNull();
      expect(call.manip1.anchoring).toBeNull();
      expect(call.manip1.lateralDistance).toBeNull();
      expect(call.manip1.shiftingClampLength).toBeNull();
    });

    it('should null out non-shifting fields when manip1Type is shifting', async () => {
      component.form.controls.manip1Type.setValue('shifting');
      component.form.controls.shiftingClampLength.setValue(2);
      component.form.controls.vertDisplacement.setValue(10);
      component.form.controls.ropeLength.setValue(5);
      await component.saveForm();
      const call = mockCableSupportManipService.save.mock.calls[0][0];
      expect(call.manip1.type).toBe('shifting');
      expect(call.manip1.shiftingClampLength).toBe(2);
      expect(call.manip1.vertDisplacement).toBeNull();
      expect(call.manip1.anchoring).toBeNull();
      expect(call.manip1.lateralDistance).toBeNull();
      expect(call.manip1.ropeLength).toBeNull();
    });

    it('should pass manip2 as null when showManip2 is false', async () => {
      await component.saveForm();
      expect(mockCableSupportManipService.save).toHaveBeenCalledWith(expect.objectContaining({ manip2: null }));
    });

    it('should pass manip2 data when showManip2 is true', async () => {
      component.form.controls.manip1Type.setValue('crane');
      component.addManip2();
      component.form.controls.manip2ShiftingClampLength.setValue(4);
      await component.saveForm();
      const call = mockCableSupportManipService.save.mock.calls[0][0];
      expect(call.manip2).not.toBeNull();
      expect(call.manip2?.shiftingClampLength).toBe(4);
    });

    it('should set hasSavedManipulation to true after successful save', async () => {
      component.hasSavedManipulation.set(false);
      await component.saveForm();
      expect(component.hasSavedManipulation()).toBe(true);
    });

    it('should clear isLoading after save', async () => {
      await component.saveForm();
      expect(component.isLoading()).toBe(false);
    });

    it('should call notificationService.success after save', async () => {
      await component.saveForm();
      expect(mockNotificationService.success).toHaveBeenCalled();
    });

    it('should call reloadSection after save', async () => {
      await component.saveForm();
      expect(mockCableSupportManipService.reloadSection).toHaveBeenCalled();
    });

    it('should call notificationService.error and clear isLoading when save rejects', async () => {
      mockCableSupportManipService.save.mockRejectedValue(new Error('fail'));
      await component.saveForm();
      expect(mockNotificationService.error).toHaveBeenCalled();
      expect(component.isLoading()).toBe(false);
    });

    it('should not set hasSavedManipulation to true when save rejects', async () => {
      mockCableSupportManipService.save.mockRejectedValue(new Error('fail'));
      component.hasSavedManipulation.set(false);
      await component.saveForm();
      expect(component.hasSavedManipulation()).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // deleteForm()
  // ---------------------------------------------------------------------------
  describe('deleteForm()', () => {
    it('should call delete service with the uuid of the saved manipulation', async () => {
      const manipUuid = 'manip-uuid-1';
      mockPlotSpanService.section.set({
        ...mockSection,
        selected_charge_uuid: 'charge-uuid-1',
        cable_support_manipulations: [
          {
            uuid: manipUuid,
            supportUuid: 'support-uuid-1',
            chargeUuid: 'charge-uuid-1',
            manip1: {
              type: 'crane',
              vertDisplacement: 5,
              anchoring: 'without_chain',
              lateralDistance: 0,
              ropeLength: null,
              shiftingClampLength: null
            },
            manip2: null
          }
        ]
      } as unknown as Section);
      component.form.controls.support.setValue('support-uuid-1');

      await component.deleteForm();

      expect(mockCableSupportManipService.delete).toHaveBeenCalledWith(manipUuid);
    });

    it('should not call delete service when no manipulation exists for the support', async () => {
      component.form.controls.support.setValue('support-uuid-1');
      await component.deleteForm();
      expect(mockCableSupportManipService.delete).not.toHaveBeenCalled();
    });

    it('should set hasSavedManipulation to false after deletion', async () => {
      component.hasSavedManipulation.set(true);
      await component.deleteForm();
      expect(component.hasSavedManipulation()).toBe(false);
    });

    it('should reset form fields to defaults after deletion', async () => {
      component.form.controls.vertDisplacement.setValue(50);
      await component.deleteForm();
      expect(component.form.controls.vertDisplacement.value).toBe(0);
    });

    it('should clear manip2 after deletion', async () => {
      component.form.controls.manip1Type.setValue('crane');
      component.addManip2();
      await component.deleteForm();
      expect(component.showManip2()).toBe(false);
    });

    it('should call reloadSection when a uuid was found and deleted', async () => {
      const manipUuid = 'manip-uuid-1';
      mockPlotSpanService.section.set({
        ...mockSection,
        selected_charge_uuid: 'charge-uuid-1',
        cable_support_manipulations: [
          {
            uuid: manipUuid,
            supportUuid: 'support-uuid-1',
            chargeUuid: 'charge-uuid-1',
            manip1: {
              type: 'shifting',
              vertDisplacement: null,
              anchoring: null,
              lateralDistance: null,
              ropeLength: null,
              shiftingClampLength: 1
            },
            manip2: null
          }
        ]
      } as unknown as Section);
      component.form.controls.support.setValue('support-uuid-1');

      await component.deleteForm();

      expect(mockCableSupportManipService.reloadSection).toHaveBeenCalled();
    });

    it('should call notificationService.success when a manipulation is actually deleted', async () => {
      const manipUuid = 'manip-uuid-1';
      mockPlotSpanService.section.set({
        ...mockSection,
        selected_charge_uuid: 'charge-uuid-1',
        cable_support_manipulations: [
          {
            uuid: manipUuid,
            supportUuid: 'support-uuid-1',
            chargeUuid: 'charge-uuid-1',
            manip1: {
              type: 'crane',
              vertDisplacement: 5,
              anchoring: 'without_chain',
              lateralDistance: 0,
              ropeLength: null,
              shiftingClampLength: null
            },
            manip2: null
          }
        ]
      } as unknown as Section);
      component.form.controls.support.setValue('support-uuid-1');

      await component.deleteForm();

      expect(mockNotificationService.success).toHaveBeenCalled();
    });

    it('should NOT call notificationService.success when no manipulation exists for the selected support', async () => {
      component.form.controls.support.setValue('support-uuid-1');
      // mockSection has empty cable_support_manipulations — no uuid will be found
      await component.deleteForm();
      expect(mockNotificationService.success).not.toHaveBeenCalled();
    });

    it('should call notificationService.error and clear isLoading when delete rejects', async () => {
      const manipUuid = 'manip-uuid-1';
      mockPlotSpanService.section.set({
        ...mockSection,
        selected_charge_uuid: 'charge-uuid-1',
        cable_support_manipulations: [
          {
            uuid: manipUuid,
            supportUuid: 'support-uuid-1',
            chargeUuid: 'charge-uuid-1',
            manip1: {
              type: 'shifting',
              vertDisplacement: null,
              anchoring: null,
              lateralDistance: null,
              ropeLength: null,
              shiftingClampLength: 1
            },
            manip2: null
          }
        ]
      } as unknown as Section);
      component.form.controls.support.setValue('support-uuid-1');
      mockCableSupportManipService.delete.mockRejectedValue(new Error('fail'));

      await component.deleteForm();

      expect(mockNotificationService.error).toHaveBeenCalled();
      expect(component.isLoading()).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // isFormInvalid()
  // ---------------------------------------------------------------------------
  describe('isFormInvalid()', () => {
    it('should return true when support is null', () => {
      expect(component.isFormInvalid()).toBe(true);
    });

    it('should return true when manip1Type is null', () => {
      component.form.controls.support.setValue('support-uuid-1');
      expect(component.isFormInvalid()).toBe(true);
    });

    it('should return false when both required fields are filled', () => {
      component.form.controls.support.setValue('support-uuid-1');
      component.form.controls.manip1Type.setValue('shifting');
      expect(component.isFormInvalid()).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // getErrorIds()
  // ---------------------------------------------------------------------------
  describe('getErrorIds()', () => {
    it('should return null when control has no errors', () => {
      component.form.controls.vertDisplacement.setValue(0);
      expect(component.getErrorIds('vertDisplacement', ['min', 'max'])).toBeNull();
    });

    it('should return the aria error id when control has a matching error', () => {
      component.form.controls.manip1Type.setValue('crane');
      component.form.controls.vertDisplacement.setValue(-200);
      component.form.controls.vertDisplacement.updateValueAndValidity();
      const result = component.getErrorIds('vertDisplacement', ['min', 'max']);
      expect(result).toContain('vertDisplacement-error-min');
    });

    it('should return null when error type does not match any present error', () => {
      component.form.controls.manip1Type.setValue('crane');
      component.form.controls.vertDisplacement.setValue(-200);
      component.form.controls.vertDisplacement.updateValueAndValidity();
      expect(component.getErrorIds('vertDisplacement', ['max'])).toBeNull();
    });
  });
});
