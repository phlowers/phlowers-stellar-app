/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppFooter } from './app.footer';
import { By } from '@angular/platform-browser';

describe('AppFooter Component', () => {
  let fixture: ComponentFixture<AppFooter>;
  let component: AppFooter;

  beforeEach(() => {
    TestBed.configureTestingModule({
      // declarations: [AppFooter]
    }).compileComponents();

    fixture = TestBed.createComponent(AppFooter);
    component = fixture.componentInstance;
    fixture.detectChanges(); // Trigger initial change detection
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the footer text correctly', () => {
    const footerElement = fixture.debugElement.query(By.css('.layout-footer')).nativeElement;
    expect(footerElement.textContent).toContain('STELLAR by RTE');
  });
});
