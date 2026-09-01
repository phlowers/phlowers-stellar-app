/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, NgModel } from '@angular/forms';
import { OneDecimalValidatorDirective, TwoDecimalValidatorDirective } from './decimalValidator.directive';

describe('OneDecimalValidatorDirective', () => {
  it('should return null for a value with at most one decimal', () => {
    const directive = new OneDecimalValidatorDirective();
    expect(directive.validate({ value: '1.5' } as never)).toBeNull();
  });

  it('should return an oneDecimal error for a value with more than one decimal', () => {
    const directive = new OneDecimalValidatorDirective();
    expect(directive.validate({ value: '1.55' } as never)).toEqual({ oneDecimal: true });
  });
});

describe('TwoDecimalValidatorDirective', () => {
  it('should return null for a value with at most two decimals', () => {
    const directive = new TwoDecimalValidatorDirective();
    expect(directive.validate({ value: '1.55' } as never)).toBeNull();
  });

  it('should return a twoDecimal error for a value with more than two decimals', () => {
    const directive = new TwoDecimalValidatorDirective();
    expect(directive.validate({ value: '1.555' } as never)).toEqual({ twoDecimal: true });
  });
});

@Component({
  standalone: true,
  imports: [FormsModule, OneDecimalValidatorDirective, TwoDecimalValidatorDirective],
  template: `
    <input name="oneDecimalField" appOneDecimal [(ngModel)]="oneDecimalValue" #oneDecimalModel="ngModel" />
    <input name="twoDecimalField" appTwoDecimals [(ngModel)]="twoDecimalValue" #twoDecimalModel="ngModel" />
  `
})
class TestHostComponent {
  oneDecimalValue = '';
  twoDecimalValue = '';
}

describe('decimal validator directives — NG_VALIDATORS registration', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TestHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  const getNgModel = (name: string): NgModel =>
    fixture.debugElement.children
      .map((child) => child.injector.get(NgModel, null))
      .find((ngModel) => ngModel?.name === name) as NgModel;

  it('should register appOneDecimal via NG_VALIDATORS and surface the oneDecimal error key', () => {
    const ngModel = getNgModel('oneDecimalField');
    ngModel.control.setValue('1.55');
    fixture.detectChanges();

    expect(ngModel.control.errors).toEqual({ oneDecimal: true });
  });

  it('should not report an error when appOneDecimal value has at most one decimal', () => {
    const ngModel = getNgModel('oneDecimalField');
    ngModel.control.setValue('1.5');
    fixture.detectChanges();

    expect(ngModel.control.errors).toBeNull();
  });

  it('should register appTwoDecimals via NG_VALIDATORS and surface the twoDecimal error key', () => {
    const ngModel = getNgModel('twoDecimalField');
    ngModel.control.setValue('1.555');
    fixture.detectChanges();

    expect(ngModel.control.errors).toEqual({ twoDecimal: true });
  });

  it('should not report an error when appTwoDecimals value has at most two decimals', () => {
    const ngModel = getNgModel('twoDecimalField');
    ngModel.control.setValue('1.55');
    fixture.detectChanges();

    expect(ngModel.control.errors).toBeNull();
  });
});
