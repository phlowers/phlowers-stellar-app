/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StudyComponent } from './study.component.old';
import { WorkerService } from '@core/services/worker_python/worker_python.service';
import { Task } from '@core/services/worker_python/tasks';
import { BehaviorSubject } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';

describe('StudyComponent', () => {
  let component: StudyComponent;
  let fixture: ComponentFixture<StudyComponent>;
  let workerServiceMock: jest.Mocked<WorkerService>;
  let readySubject: BehaviorSubject<boolean>;

  beforeEach(async () => {
    readySubject = new BehaviorSubject<boolean>(false);
    workerServiceMock = {
      runTask: jest.fn(),
      ready$: readySubject.asObservable()
    } as unknown as jest.Mocked<WorkerService>;

    await TestBed.configureTestingModule({
      imports: [FormsModule, StudyComponent],
      providers: [{ provide: WorkerService, useValue: workerServiceMock }],
      schemas: [NO_ERRORS_SCHEMA] // To ignore PrimeNG component errors
    }).compileComponents();

    fixture = TestBed.createComponent(StudyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with loading state true', () => {
    expect(component.loading).toBe(true);
  });

  it('should set loading to false when worker is ready', () => {
    expect(component.loading).toBe(true);

    readySubject.next(true);
    fixture.detectChanges();

    expect(component.loading).toBe(false);
    expect(component.workerReady).toBe(true);
  });

  it('should initialize with the correct initial data', () => {
    expect(component.dataToObject.length).toBe(4);
    expect(component.dataToObject[0].name).toBe('1');
    expect(component.dataToObject[1].suspension).toBe(true);
    expect(component.dataToObject[2].conductor_attachment_altitude).toBe(20.0);
    expect(component.dataToObject[3].span_length).toBe(0);
  });

  it('should add a new support when addSupport is called', () => {
    const initialLength = component.dataToObject.length;
    component.addSupport();

    expect(component.dataToObject.length).toBe(initialLength + 1);
    expect(component.dataToObject[initialLength].name).toBe(
      `support ${initialLength + 1}`
    );
    expect(component.dataToObject[initialLength].suspension).toBe(false);
    expect(
      component.dataToObject[initialLength].conductor_attachment_altitude
    ).toBe(30);
    expect(component.dataToObject[initialLength].crossarm_length).toBe(5);
    expect(component.dataToObject[initialLength].line_angle).toBe(0);
    expect(component.dataToObject[initialLength].insulator_length).toBe(0);
    expect(component.dataToObject[initialLength].span_length).toBe(0);
  });

  it('should call workerService.runTask with correct data when runPython is called', () => {
    // Spy on console.log to avoid cluttering test output
    // jest.spyOn(console, 'log').mockImplementation(() => {
    //   console.log('log');
    // });

    component.runPython();

    const expectedData = {
      name: component.dataToObject.map((item) => item.name),
      suspension: component.dataToObject.map((item) => item.suspension),
      conductor_attachment_altitude: component.dataToObject.map(
        (item) => item.conductor_attachment_altitude
      ),
      crossarm_length: component.dataToObject.map(
        (item) => item.crossarm_length
      ),
      line_angle: component.dataToObject.map((item) => item.line_angle),
      insulator_length: component.dataToObject.map(
        (item) => item.insulator_length
      ),
      span_length: component.dataToObject.map((item) => item.span_length)
    };

    expect(workerServiceMock.runTask).toHaveBeenCalledWith(
      Task.runPython,
      expectedData
    );
  });

  // it('should properly unsubscribe when component is destroyed', () => {
  //   jest.spyOn(component.subscriptions, 'unsubscribe');

  //   component.ngOnDestroy();

  //   expect(component.subscriptions.unsubscribe).toHaveBeenCalled();
  // });
});
