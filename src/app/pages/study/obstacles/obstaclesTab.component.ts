import { CommonModule } from '@angular/common';
import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { Obstacle } from '../types';

@Component({
  selector: 'app-obstacles-tab',
  standalone: true,
  imports: [ButtonModule, ProgressSpinnerModule, CommonModule, TableModule, InputTextModule, FormsModule, CheckboxModule, TabsModule, CardModule, DividerModule, DialogModule],
  template: `<div>
    <div class="pb-5">
      <p-button i18n severity="info" (click)="addObstacle()">Add Obstacle</p-button>
    </div>
    <p-table [paginator]="true" [alwaysShowPaginator]="true" [showCurrentPageReport]="true" [rows]="10" [rowsPerPageOptions]="[10, 20, 30]" [value]="obstacles" [tableStyle]="{ 'min-width': '50rem' }">
      <ng-template #header>
        <tr>
          <th i18n>Name</th>
          <th i18n>Type</th>
          <th i18n>Support</th>
          <th i18n>Position X</th>
          <th i18n>Position Y</th>
          <th i18n>Height</th>
          <th i18n>Width</th>
          <th i18n>Length</th>
        </tr>
      </ng-template>
      <ng-template #body let-obstacle let-editing="editing">
        <tr>
          <td [pEditableColumn]="obstacle.name" pEditableColumnField="name">
            <p-cellEditor>
              <ng-template #input>
                <input pInputText type="text" [(ngModel)]="obstacle.name" />
              </ng-template>
              <ng-template #output>
                {{ obstacle.name }}
              </ng-template>
            </p-cellEditor>
          </td>
          <td [pEditableColumn]="obstacle.type" pEditableColumnField="type">
            <p-cellEditor>
              <ng-template #input>
                <input pInputText type="text" [(ngModel)]="obstacle.type" />
              </ng-template>
              <ng-template #output>
                {{ obstacle.type }}
              </ng-template>
            </p-cellEditor>
          </td>
          <td [pEditableColumn]="obstacle.support" pEditableColumnField="support">
            <p-cellEditor>
              <ng-template #input>
                <input pInputText type="text" [(ngModel)]="obstacle.support" />
              </ng-template>
              <ng-template #output>
                {{ obstacle.support }}
              </ng-template>
            </p-cellEditor>
          </td>
          <td [pEditableColumn]="obstacle.position.x" pEditableColumnField="position">
            <p-cellEditor>
              <ng-template #input>
                <input pInputText type="number" [(ngModel)]="obstacle.position.x" />
              </ng-template>
              <ng-template #output>
                {{ obstacle.position.x }}
              </ng-template>
            </p-cellEditor>
          </td>
          <td [pEditableColumn]="obstacle.position.y" pEditableColumnField="position">
            <p-cellEditor>
              <ng-template #input>
                <input pInputText type="number" [(ngModel)]="obstacle.position.y" />
              </ng-template>
              <ng-template #output>
                {{ obstacle.position.y }}
              </ng-template>
            </p-cellEditor>
          </td>
          <td [pEditableColumn]="obstacle.height" pEditableColumnField="height">
            <p-cellEditor>
              <ng-template #input>
                <input pInputText type="number" [(ngModel)]="obstacle.height" />
              </ng-template>
              <ng-template #output>
                {{ obstacle.height }}
              </ng-template>
            </p-cellEditor>
          </td>
          <td [pEditableColumn]="obstacle.width" pEditableColumnField="width">
            <p-cellEditor>
              <ng-template #input>
                <input pInputText type="number" [(ngModel)]="obstacle.width" />
              </ng-template>
              <ng-template #output>
                {{ obstacle.width }}
              </ng-template>
            </p-cellEditor>
          </td>
          <td [pEditableColumn]="obstacle.length" pEditableColumnField="length">
            <p-cellEditor>
              <ng-template #input>
                <input pInputText type="number" [(ngModel)]="obstacle.length" />
              </ng-template>
              <ng-template #output>
                {{ obstacle.length }}
              </ng-template>
            </p-cellEditor>
          </td>
        </tr>
      </ng-template>
    </p-table>
  </div>`
})
export class ObstaclesTabComponent implements OnInit {
  @Input() obstacles: Obstacle[] = [];
  @Output() obstaclesChange = new EventEmitter<Obstacle[]>();
  @Input() initialObstaclesObjects: Obstacle[] = [];

  ngOnInit() {
    if (!this.obstacles || this.obstacles.length === 0) {
      this.obstacles = this.initialObstaclesObjects;
    }
  }

  addObstacle() {
    const newObstacle: Obstacle = {
      name: `obstacle ${this.obstacles.length + 1}`,
      type: 'cylinder',
      position: {
        x: 0,
        y: 0
      },
      support: '',
      height: 10,
      width: 10,
      length: 10
    };

    this.obstacles.push(newObstacle);
    this.obstaclesChange.emit(this.obstacles);
  }
}
