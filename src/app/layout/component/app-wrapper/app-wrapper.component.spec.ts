/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppWrapperComponent } from './app-wrapper.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { AppSidebarComponent } from '../app-sidebar/app.sidebar';
import { AppWrapperService } from '../../service/app-wrapper.service';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Renderer2 } from '@angular/core';
import { expect, jest } from '@jest/globals';

@Component({ selector: 'app-topbar', template: '' })
class MockAppTopbarComponent {}

@Component({ selector: 'app-sidebar', template: '' })
class MockAppSidebarComponent {}

describe('AppWrapper', () => {
  let component: AppWrapperComponent;
  let fixture: ComponentFixture<AppWrapperComponent>;
  let appWrapperService: AppWrapperService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, CommonModule],
      declarations: [],
      providers: [
        AppWrapperService,
        { provide: TopbarComponent, useClass: MockAppTopbarComponent },
        { provide: AppSidebarComponent, useClass: MockAppSidebarComponent },
        Renderer2
      ]
      // standalone: true
    })
      .overrideComponent(AppWrapperComponent, {
        set: {
          imports: [
            CommonModule,
            MockAppTopbarComponent,
            MockAppSidebarComponent,
            RouterTestingModule
          ]
          // declarations: []
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(AppWrapperComponent);
    component = fixture.componentInstance;
    appWrapperService = TestBed.inject(AppWrapperService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have app-topbar and app-sidebar', () => {
    const topbar =
      fixture.debugElement.nativeElement.querySelector('app-topbar');
    const sidebar =
      fixture.debugElement.nativeElement.querySelector('app-sidebar');
    expect(topbar).toBeTruthy();
    expect(sidebar).toBeTruthy();
  });

  it('should have router-outlet', () => {
    const routerOutlet =
      fixture.debugElement.nativeElement.querySelector('router-outlet');
    expect(routerOutlet).toBeTruthy();
  });

  it('should have correct containerClass for static menu', () => {
    // vi.spyOn(appWrapperService, 'appWrapperConfig').and.returnValue({ menuMode: 'static' });
    jest
      .spyOn(appWrapperService, 'appWrapperConfig')
      .mockImplementation(() => ({ menuMode: 'static' }));
    // vi.spyOn(appWrapperService, 'appWrapperState').and.returnValue({ staticMenuDesktopInactive: false });
    jest
      .spyOn(appWrapperService, 'appWrapperState')
      .mockImplementation(() => ({ staticMenuDesktopInactive: false }));

    fixture.detectChanges();

    expect(component.containerClass).toEqual({
      'app-wrapper-static': true,
      'app-wrapper-static-inactive': false
    });
  });

  it('should have correct containerClass for static menu with staticMenuDesktopInactive', () => {
    // vi.spyOn(appWrapperService, 'appWrapperConfig').and.returnValue({ menuMode: 'static' });
    jest
      .spyOn(appWrapperService, 'appWrapperConfig')
      .mockImplementation(() => ({ menuMode: 'static' }));
    // vi.spyOn(appWrapperService, 'appWrapperState').and.returnValue({ staticMenuDesktopInactive: true });
    jest
      .spyOn(appWrapperService, 'appWrapperState')
      .mockImplementation(() => ({ staticMenuDesktopInactive: true }));

    fixture.detectChanges();

    expect(component.containerClass).toEqual({
      'app-wrapper-static': true,
      'app-wrapper-static-inactive': true
    });
  });

  it('should have correct containerClass for other menu modes', () => {
    // vi.spyOn(appWrapperService, 'appWrapperConfig').and.returnValue({ menuMode: 'overlay' });
    jest
      .spyOn(appWrapperService, 'appWrapperConfig')
      .mockImplementation(() => ({ menuMode: 'overlay' }));
    // vi.spyOn(appWrapperService, 'appWrapperState').and.returnValue({ staticMenuDesktopInactive: true });
    jest
      .spyOn(appWrapperService, 'appWrapperState')
      .mockImplementation(() => ({ staticMenuDesktopInactive: true }));

    fixture.detectChanges();

    expect(component.containerClass).toEqual({
      'app-wrapper-static': false,
      'app-wrapper-static-inactive': false
    });
  });
});
