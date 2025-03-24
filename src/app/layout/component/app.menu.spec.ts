import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppMenu } from './app.menu';
import { AppMenuitem } from './app.menuitem';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { describe, it, expect, beforeEach } from 'vitest';

@Component({ selector: 'app-menuitem', template: '' })
class MockAppMenuitem {
  item: MenuItem | undefined;
  index: number | undefined;
  root: boolean | undefined;
}

describe('AppMenu', () => {
  let component: AppMenu;
  let fixture: ComponentFixture<AppMenu>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, CommonModule],
      declarations: [],
      providers: []
      // standalone: true
    })
      .overrideComponent(AppMenu, {
        set: {
          imports: [CommonModule, MockAppMenuitem, RouterModule]
          // declarations: []
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(AppMenu);
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
          { label: 'Admin', icon: 'pi pi-fw pi-cog', routerLink: ['/admin'] },
          { label: 'Storage POC', icon: 'pi pi-fw pi-cog', routerLink: ['/offline-storage-poc'] }
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
