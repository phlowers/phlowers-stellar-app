/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TemplateRef } from '@angular/core';
import { By } from '@angular/platform-browser';
import { Component } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { EstimationsComponent } from '@features/studio/estimations/presentation/components/estimations/estimations.component';
import { TemperatureEstimationComponent } from '@features/studio/estimations/presentation/components/temperature-estimation/temperature-estimation.component';
import { EffortEstimationComponent } from '@features/studio/estimations/presentation/components/effort-estimation/effort-estimation.component';
import { ToolbarDialogService } from '@features/studio/toolbar/presentation/services/toolbar-dialog.service';

@Component({ selector: 'app-temperature-estimation', template: '' })
class TemperatureEstimationStubComponent {}

@Component({ selector: 'app-effort-estimation', template: '' })
class EffortEstimationStubComponent {}

describe('EstimationsComponent', () => {
  let fixture: ComponentFixture<EstimationsComponent>;
  let component: EstimationsComponent;
  let mockToolbarDialogService: { setTemplates: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockToolbarDialogService = { setTemplates: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [
        EstimationsComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              'studio.top-toolbar.estimations-tool': 'Estimations',
              'studio.temperature-estimation.tab-label': 'Conformity temperature',
              'studio.effort-estimation.tab-label': 'Cable vert. displacement effort'
            }
          },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' }
        })
      ],
      providers: [{ provide: ToolbarDialogService, useValue: mockToolbarDialogService }]
    })
      .overrideComponent(EstimationsComponent, {
        remove: { imports: [TemperatureEstimationComponent, EffortEstimationComponent] },
        add: { imports: [TemperatureEstimationStubComponent, EffortEstimationStubComponent] }
      })
      .compileComponents();

    fixture = TestBed.createComponent(EstimationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('registers only its header template with the toolbar dialog service', () => {
    expect(mockToolbarDialogService.setTemplates).toHaveBeenCalledWith({ header: component.headerTemplate() });
  });

  it('renders the dialog title in the header template', () => {
    const view = (component.headerTemplate() as TemplateRef<unknown>).createEmbeddedView(null);
    view.detectChanges();
    expect(view.rootNodes[0].textContent).toContain('Estimations');
  });

  it('opens on the temperature tab, listed first', () => {
    expect(component.activeTab()).toBe('temperature');
    const tabs = fixture.nativeElement.querySelectorAll('p-tab');
    expect(tabs[0].getAttribute('data-testid')).toBe('temperature-tab');
    expect(tabs[0].textContent?.trim()).toBe('Conformity temperature');
    expect(tabs[1].getAttribute('data-testid')).toBe('effort-tab');
    expect(tabs[1].textContent?.trim()).toBe('Cable vert. displacement effort');
  });

  it('shows the temperature estimation in the temperature tab', () => {
    expect(fixture.debugElement.query(By.directive(TemperatureEstimationStubComponent))).not.toBeNull();
  });

  it('shows the effort estimation in the effort tab', () => {
    expect(fixture.debugElement.query(By.directive(EffortEstimationStubComponent))).not.toBeNull();
  });
});
