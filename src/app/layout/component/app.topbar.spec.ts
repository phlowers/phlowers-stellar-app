/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppTopbarComponent } from './app.topbar';
import { LayoutService } from '../service/layout.service';
import { OnlineService } from '../../core/api/services/online.service';
import { WorkerService } from '../../core/engine/worker/worker.service';
import { UpdateService } from '../../core/update/update.service';
import { BehaviorSubject } from 'rxjs';
import { By } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StyleClassModule } from 'primeng/styleclass';
import { RouterTestingModule } from '@angular/router/testing';

describe('AppTopbarComponent', () => {
  let component: AppTopbarComponent;
  let fixture: ComponentFixture<AppTopbarComponent>;
  let layoutServiceMock: { onMenuToggle: jest.Mock };
  let onlineServiceMock: { online$: BehaviorSubject<boolean>; serverOnline$: BehaviorSubject<string> };
  let workerServiceMock: { ready$: BehaviorSubject<boolean> };
  let updateServiceMock: { needUpdate: boolean };

  // Observable sources
  const onlineSubject = new BehaviorSubject<boolean>(false);
  const workerReadySubject = new BehaviorSubject<boolean>(false);
  const serverOnlineSubject = new BehaviorSubject<string>('LOADING');

  beforeEach(async () => {
    // Create mock services
    layoutServiceMock = {
      onMenuToggle: jest.fn()
    };

    onlineServiceMock = {
      online$: onlineSubject,
      serverOnline$: serverOnlineSubject
    };

    workerServiceMock = {
      ready$: workerReadySubject
    };

    updateServiceMock = {
      needUpdate: false
    };

    await TestBed.configureTestingModule({
      imports: [CommonModule, RouterModule, StyleClassModule, RouterTestingModule, AppTopbarComponent],
      providers: [
        { provide: LayoutService, useValue: layoutServiceMock },
        { provide: OnlineService, useValue: onlineServiceMock },
        { provide: WorkerService, useValue: workerServiceMock },
        { provide: UpdateService, useValue: updateServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AppTopbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.offline).toBe(true);
    expect(component.workerReady).toBe(false);
    expect(component.serverOnline).toBe('LOADING');
  });

  it('should subscribe to online status changes', () => {
    // Initially offline
    expect(component.offline).toBe(true);

    // Change to online
    onlineSubject.next(true);
    expect(component.offline).toBe(false);

    // Change back to offline
    onlineSubject.next(false);
    expect(component.offline).toBe(true);
  });

  it('should subscribe to worker ready status changes', () => {
    // Initially not ready
    expect(component.workerReady).toBe(false);

    // Change to ready
    workerReadySubject.next(true);
    expect(component.workerReady).toBe(true);

    // Change back to not ready
    workerReadySubject.next(false);
    expect(component.workerReady).toBe(false);
  });

  it('should subscribe to server online status changes', () => {
    // Initially loading
    expect(component.serverOnline).toBe('LOADING');

    // Change to online
    serverOnlineSubject.next('ONLINE');
    expect(component.serverOnline).toBe('ONLINE');

    // Change to offline
    serverOnlineSubject.next('OFFLINE');
    expect(component.serverOnline).toBe('OFFLINE');
  });

  it('should call layoutService.onMenuToggle when menu button is clicked', () => {
    const menuButton = fixture.debugElement.query(By.css('.layout-menu-button'));
    menuButton.triggerEventHandler('click', null);

    expect(layoutServiceMock.onMenuToggle).toHaveBeenCalled();
  });

  it('should display correct engine status based on workerReady', () => {
    // Initially not ready
    let engineElement = fixture.debugElement.query(By.css('.layout-topbar-online[style*="orange"]'));
    expect(engineElement).toBeTruthy();
    expect(engineElement.nativeElement.textContent).toContain('ENGINE LOADING');

    // Change to ready
    workerReadySubject.next(true);
    fixture.detectChanges();

    engineElement = fixture.debugElement.query(By.css('.layout-topbar-online[style*="white"]'));
    expect(engineElement).toBeTruthy();
    expect(engineElement.nativeElement.textContent).toContain('ENGINE READY');
  });
});
