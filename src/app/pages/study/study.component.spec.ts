/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StudyComponent } from './study.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';

// Mock Plotly imports
jest.mock('plotly.js-dist-min', () => ({
  newPlot: jest.fn(),
  react: jest.fn(),
  purge: jest.fn(),
  Plots: {
    resize: jest.fn()
  }
}));

describe('StudyComponent', () => {
  let component: StudyComponent;
  let fixture: ComponentFixture<StudyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, StudyComponent],
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

  it('should have the correct tabs defined', () => {
    const expectedTabs = [
      'General',
      'Supports',
      'Obstacles',
      'Weather',
      'Visualization',
      'Calculations'
    ];
    expect(component.tabs).toEqual(expectedTabs);
    expect(component.currentTab).toBe(expectedTabs[0]);
  });

  it('should initialize with the correct data structure', () => {
    expect(component.data).toBeDefined();
    expect(component.data.supports).toEqual(component.dataToObject);
    expect(component.data.obstacles.length).toBeGreaterThan(0);
    expect(component.data.general).toBeDefined();
  });

  it('should have properly initialized support data', () => {
    expect(component.dataToObject.length).toBe(7);
    expect(component.dataToObject[0].name).toBe('support 1');
    expect(component.dataToObject[1].suspension).toBe(true);
    expect(component.dataToObject[2].conductor_attachment_altitude).toBe(20.0);
    expect(component.dataToObject[3].span_length).toBe(300);
  });
});
