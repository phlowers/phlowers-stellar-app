/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppMenuComponent } from './app.menu';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';

@Component({ selector: 'app-menuitem', template: '' })
class MockAppMenuitemComponent {
  item: MenuItem | undefined;
  index: number | undefined;
  root: boolean | undefined;
}

describe('AppMenu', () => {
  let component: AppMenuComponent;
  let fixture: ComponentFixture<AppMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, CommonModule],
      declarations: [],
      providers: []
      // standalone: true
    })
      .overrideComponent(AppMenuComponent, {
        set: {
          imports: [CommonModule, MockAppMenuitemComponent, RouterModule]
          // declarations: []
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(AppMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize model with menu items', () => {
    component.ngOnInit();
    expect(component.model).toEqual([
      {
        label: 'Home',
        items: [
          { label: 'Studies', icon: 'pi pi-fw pi-share-alt', routerLink: ['/'] },
          {
            icon: 'pi pi-fw pi-bolt',
            label: 'Sections',
            routerLink: ['/sections']
          },
          { label: 'Tools', icon: 'pi pi-fw pi-wrench', routerLink: ['/tools'] },
          { label: 'Admin', icon: 'pi pi-fw pi-cog', routerLink: ['/admin'] },
          {
            icon: 'pi pi-fw pi-database',
            label: 'test',
            routerLink: ['/offline-storage-poc']
          },
          {
            label: 'plotly',
            icon: 'pi pi-fw pi-chart-line',
            routerLink: ['/plotly']
          }
        ]
      }
    ]);
  });

  it('should render one menu item', () => {
    component.ngOnInit();
    fixture.detectChanges();
    const menuItems = fixture.debugElement.nativeElement.querySelectorAll('li');
    expect(menuItems.length).toBe(1);
  });

  it('should render menu separator', () => {
    component.model = [{ separator: true }];
    fixture.detectChanges();

    const separator = fixture.debugElement.nativeElement.querySelector('.menu-separator');
    expect(separator).toBeTruthy();
  });

  it('should not render app-menuitem for separator', () => {
    component.model = [{ separator: true }, { label: 'item' }];
    fixture.detectChanges();

    const menuItems = fixture.debugElement.nativeElement.querySelectorAll('li');
    expect(menuItems.length).toBe(2);
  });
});
