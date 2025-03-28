/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router, NavigationEnd } from '@angular/router';
import { of, Subject } from 'rxjs';
import { AppLayout } from './app.layout';
import { AppTopbar } from './app.topbar';
import { AppSidebar } from './app.sidebar';
import { LayoutService } from '../service/layout.service';
import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Renderer2 } from '@angular/core';
import { expect, jest, test } from '@jest/globals';

@Component({ selector: 'app-topbar', template: '' })
class MockAppTopbar {}

@Component({ selector: 'app-sidebar', template: '' })
class MockAppSidebar {}

describe('AppLayout', () => {
  let component: AppLayout;
  let fixture: ComponentFixture<AppLayout>;
  let layoutService: LayoutService;
  let router: Router;
  let renderer: Renderer2;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, CommonModule],
      declarations: [],
      providers: [LayoutService, { provide: AppTopbar, useClass: MockAppTopbar }, { provide: AppSidebar, useClass: MockAppSidebar }, Renderer2]
      // standalone: true
    })
      .overrideComponent(AppLayout, {
        set: {
          imports: [CommonModule, MockAppTopbar, MockAppSidebar, RouterTestingModule]
          // declarations: []
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(AppLayout);
    component = fixture.componentInstance;
    layoutService = TestBed.inject(LayoutService);
    router = TestBed.inject(Router);
    renderer = TestBed.inject(Renderer2);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have app-topbar and app-sidebar', () => {
    const topbar = fixture.debugElement.nativeElement.querySelector('app-topbar');
    const sidebar = fixture.debugElement.nativeElement.querySelector('app-sidebar');
    expect(topbar).toBeTruthy();
    expect(sidebar).toBeTruthy();
  });

  it('should have router-outlet', () => {
    const routerOutlet = fixture.debugElement.nativeElement.querySelector('router-outlet');
    expect(routerOutlet).toBeTruthy();
  });

  it('should have correct containerClass for static menu', () => {
    // vi.spyOn(layoutService, 'layoutConfig').and.returnValue({ menuMode: 'static' });
    jest.spyOn(layoutService, 'layoutConfig').mockImplementation(() => ({ menuMode: 'static' }));
    // vi.spyOn(layoutService, 'layoutState').and.returnValue({ staticMenuDesktopInactive: false });
    jest.spyOn(layoutService, 'layoutState').mockImplementation(() => ({ staticMenuDesktopInactive: false }));

    fixture.detectChanges();

    expect(component.containerClass).toEqual({
      'layout-static': true,
      'layout-static-inactive': false
    });
  });

  it('should have correct containerClass for static menu with staticMenuDesktopInactive', () => {
    // vi.spyOn(layoutService, 'layoutConfig').and.returnValue({ menuMode: 'static' });
    jest.spyOn(layoutService, 'layoutConfig').mockImplementation(() => ({ menuMode: 'static' }));
    // vi.spyOn(layoutService, 'layoutState').and.returnValue({ staticMenuDesktopInactive: true });
    jest.spyOn(layoutService, 'layoutState').mockImplementation(() => ({ staticMenuDesktopInactive: true }));

    fixture.detectChanges();

    expect(component.containerClass).toEqual({
      'layout-static': true,
      'layout-static-inactive': true
    });
  });

  it('should have correct containerClass for other menu modes', () => {
    // vi.spyOn(layoutService, 'layoutConfig').and.returnValue({ menuMode: 'overlay' });
    jest.spyOn(layoutService, 'layoutConfig').mockImplementation(() => ({ menuMode: 'overlay' }));
    // vi.spyOn(layoutService, 'layoutState').and.returnValue({ staticMenuDesktopInactive: true });
    jest.spyOn(layoutService, 'layoutState').mockImplementation(() => ({ staticMenuDesktopInactive: true }));

    fixture.detectChanges();

    expect(component.containerClass).toEqual({
      'layout-static': false,
      'layout-static-inactive': false
    });
  });
});
