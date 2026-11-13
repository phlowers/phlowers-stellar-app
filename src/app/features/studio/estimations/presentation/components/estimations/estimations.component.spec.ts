/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { EstimationsComponent } from '@features/studio/estimations/presentation/components/estimations/estimations.component';
import { TemperatureEstimationComponent } from '@features/studio/estimations/presentation/components/temperature-estimation/temperature-estimation.component';
import { ToolbarDialogService } from '@features/studio/toolbar/presentation/services/toolbar-dialog.service';

@Component({ selector: 'app-temperature-estimation', template: '<p data-testid="temperature-estimation-stub"></p>' })
class TemperatureEstimationStubComponent {}

describe('EstimationsComponent', () => {
  let component: EstimationsComponent;
  let fixture: ComponentFixture<EstimationsComponent>;
  let mockToolbarDialogService: { setTemplates: ReturnType<typeof vi.fn> };

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  beforeEach(async () => {
    mockToolbarDialogService = { setTemplates: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [
        EstimationsComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              'studio.estimations.title': 'Estimations',
              'studio.estimations.conformity-temperature-label': 'Conformity temperature',
              'studio.estimations.wind-pressure-tab': 'Wind pressure for min. distance',
              'studio.estimations.vertical-effort-tab': 'Vertical cable displacement effort'
            }
          },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' }
        })
      ],
      providers: [{ provide: ToolbarDialogService, useValue: mockToolbarDialogService }]
    })
      .overrideComponent(EstimationsComponent, {
        remove: { imports: [TemperatureEstimationComponent] },
        add: { imports: [TemperatureEstimationStubComponent] }
      })
      .compileComponents();

    fixture = TestBed.createComponent(EstimationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('registers its header with the toolbar dialog service', () => {
    expect(mockToolbarDialogService.setTemplates).toHaveBeenCalledWith({ header: component.headerTemplate() });
  });

  it('titles the dialog "Estimations"', () => {
    const view = component.headerTemplate()!.createEmbeddedView(null);
    view.detectChanges();
    const container = document.createElement('div');
    container.append(...view.rootNodes);

    expect(container.querySelector('span')?.textContent?.trim()).toBe('Estimations');
  });

  it('clears its templates when destroyed', () => {
    fixture.destroy();
    expect(mockToolbarDialogService.setTemplates).toHaveBeenLastCalledWith({});
  });

  it('shows three tabs, only the temperature one being usable', () => {
    const tabs = [
      ['temperature-tab', 'Conformity temperature'],
      ['wind-pressure-tab', 'Wind pressure for min. distance'],
      ['vertical-effort-tab', 'Vertical cable displacement effort']
    ];
    for (const [testId, label] of tabs) {
      expect(getByTestId(testId)?.textContent?.trim()).toBe(label);
    }
    expect(getByTestId('temperature-tab')?.getAttribute('aria-disabled')).toBe('false');
    expect(getByTestId('wind-pressure-tab')?.getAttribute('aria-disabled')).toBe('true');
    expect(getByTestId('vertical-effort-tab')?.getAttribute('aria-disabled')).toBe('true');
  });

  it('opens on the temperature tab', () => {
    expect(component.activeTab()).toBe('temperature');
    expect(getByTestId('temperature-estimation-stub')).not.toBeNull();
  });
});
