/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrimeDebugRowComponent } from './prime-debug-row.component';

describe('PrimeDebugRowComponent', () => {
  let fixture: ComponentFixture<PrimeDebugRowComponent>;

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrimeDebugRowComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PrimeDebugRowComponent);
    fixture.componentRef.setInput('name', 'p-button');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the provided name', () => {
    expect(getByTestId('prime-debug-row-name')?.textContent?.trim()).toBe('p-button');
  });

  it('should default overrideClass and usage when not provided', () => {
    expect(fixture.componentInstance.overrideClass()).toBe('base styling only');
    expect(fixture.componentInstance.usage()).toBe('—');

    expect(getByTestId('prime-debug-row-override')?.textContent?.trim()).toBe('base styling only');
    expect(getByTestId('prime-debug-row-usage')?.textContent?.trim()).toBe('—');
  });

  it('should render provided overrideClass and usage', () => {
    fixture.componentRef.setInput('overrideClass', '.app-button--primary');
    fixture.componentRef.setInput('usage', 'shared/components/atoms/button');
    fixture.detectChanges();

    expect(getByTestId('prime-debug-row-override')?.textContent?.trim()).toBe('.app-button--primary');
    expect(getByTestId('prime-debug-row-usage')?.textContent?.trim()).toBe('shared/components/atoms/button');
  });

  it('should not render a screenshot figure when none is provided', () => {
    expect(getByTestId('prime-debug-row-screenshot')).toBeNull();
  });

  it('should render a screenshot figure when provided', () => {
    fixture.componentRef.setInput('screenshot', '/assets/baseline/p-button.png');
    fixture.detectChanges();

    const figure = getByTestId('prime-debug-row-screenshot');
    const img = figure?.querySelector('img');
    expect(figure).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('/assets/baseline/p-button.png');
    expect(img?.getAttribute('alt')).toBe('Baseline reference screenshot for p-button');
  });

  it('should project content into the demo slot', () => {
    expect(getByTestId('prime-debug-row-demo')).not.toBeNull();
  });
});
