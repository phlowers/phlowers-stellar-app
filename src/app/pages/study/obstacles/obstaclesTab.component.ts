import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  signal
} from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
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
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCrosshairs } from '@fortawesome/free-solid-svg-icons';
import { ModifyPositionModalComponent } from './modify-position-modal';
import { SelectModule } from 'primeng/select';

const targetIcon = `<?xml version="1.0" encoding="iso-8859-1"?>
<!-- Uploaded to: SVG Repo, www.svgrepo.com, Generator: SVG Repo Mixer Tools -->
<svg fill="#000000" height="800px" width="800px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
	 viewBox="0 0 503.607 503.607" xml:space="preserve">
<g transform="translate(1 1)">
	<g>
		<g>
			<path d="M250.803-1C112.311-1-1,111.472-1,250.803s113.311,251.803,251.803,251.803s251.803-113.311,251.803-251.803
				S389.295-1,250.803-1z M250.803,485.82c-129.259,0-235.016-105.757-235.016-235.016S121.544,15.787,250.803,15.787
				S485.82,121.544,485.82,250.803S380.062,485.82,250.803,485.82z"/>
			<path d="M250.803,32.574c-120.026,0-218.229,98.203-218.229,218.229c0,120.866,98.203,218.23,218.229,218.23
				s218.23-97.364,218.23-218.23C469.033,130.777,370.829,32.574,250.803,32.574z M250.803,452.246
				c-110.793,0-201.443-90.649-201.443-201.443S140.01,49.361,250.803,49.361s201.443,90.649,201.443,201.443
				S361.597,452.246,250.803,452.246z"/>
			<path d="M250.803,309.557c-5.036,0-8.393,3.357-8.393,8.393v83.934c0,5.036,3.357,8.393,8.393,8.393s8.393-3.357,8.393-8.393
				v-83.934C259.197,312.915,255.839,309.557,250.803,309.557z"/>
			<path d="M250.803,192.049c5.036,0,8.393-3.357,8.393-8.393V99.721c0-5.036-3.357-8.393-8.393-8.393s-8.393,3.357-8.393,8.393
				v83.934C242.41,188.692,245.767,192.049,250.803,192.049z"/>
			<path d="M183.656,242.41H99.721c-5.036,0-8.393,3.357-8.393,8.393s3.357,8.393,8.393,8.393h83.934
				c5.036,0,8.393-3.357,8.393-8.393S188.692,242.41,183.656,242.41z"/>
			<path d="M401.885,242.41h-83.934c-5.036,0-8.393,3.357-8.393,8.393s3.357,8.393,8.393,8.393h83.934
				c5.036,0,8.393-3.357,8.393-8.393S406.921,242.41,401.885,242.41z"/>
			<path d="M250.803,234.016c-9.233,0-16.787,7.554-16.787,16.787c0,9.233,7.554,16.787,16.787,16.787
				c9.233,0,16.787-7.554,16.787-16.787C267.59,241.57,260.036,234.016,250.803,234.016z"/>
		</g>
	</g>
</g>
</svg>`;

@Component({
  selector: 'app-obstacles-tab',
  standalone: true,
  imports: [
    ButtonModule,
    ProgressSpinnerModule,
    CommonModule,
    TableModule,
    InputTextModule,
    FormsModule,
    CheckboxModule,
    TabsModule,
    CardModule,
    DividerModule,
    DialogModule,
    FontAwesomeModule,
    ModifyPositionModalComponent,
    SelectModule
  ],
  template: `<div>
    <div class="pb-5">
      <p-button i18n severity="info" (click)="addObstacle()"
        >Add Obstacle</p-button
      >
    </div>
    <p-table
      [paginator]="true"
      [alwaysShowPaginator]="true"
      [showCurrentPageReport]="true"
      [rows]="10"
      [rowsPerPageOptions]="[10, 20, 30]"
      [value]="obstacles"
      [tableStyle]="{ 'min-width': '50rem' }"
    >
      <ng-template #header>
        <tr>
          <th i18n>Name</th>
          <th i18n>Type</th>
          <th i18n>Support</th>
          <th i18n>Position X</th>
          <th i18n>Position Y</th>
          <th i18n>Position Z</th>
          <th i18n style="width: 20px"></th>
          <!-- <th i18n>Second Position X</th>
          <th i18n>Second Position Y</th> -->
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
            <p-select
              [appendTo]="'body'"
              [(ngModel)]="obstacle.type"
              [options]="['tree', 'pole', 'building', 'other']"
            >
            </p-select>
            <!-- <p-cellEditor> -->
            <!-- </p-cellEditor> -->
          </td>
          <td
            [pEditableColumn]="obstacle.support"
            pEditableColumnField="support"
          >
            <p-select
              [appendTo]="'body'"
              [(ngModel)]="obstacle.support"
              [options]="['support 1', 'support 2', 'support 3', 'support 4']"
            >
            </p-select>

            <!-- <p-cellEditor>
              <ng-template #input>
                <input pInputText type="text" [(ngModel)]="obstacle.support" />
              </ng-template>
              <ng-template #output>
                {{ obstacle.support }}
              </ng-template>
            </p-cellEditor> -->
          </td>
          <td
            [pEditableColumn]="obstacle.positions[0].x"
            pEditableColumnField="position"
          >
            <p-cellEditor>
              <ng-template #input>
                <input
                  pInputText
                  type="number"
                  [(ngModel)]="obstacle.positions[0].x"
                />
              </ng-template>
              <ng-template #output>
                {{ obstacle.positions[0].x }}
              </ng-template>
            </p-cellEditor>
          </td>
          <td
            [pEditableColumn]="obstacle.positions[0].y"
            pEditableColumnField="position"
          >
            <p-cellEditor>
              <ng-template #input>
                <input
                  pInputText
                  type="number"
                  [(ngModel)]="obstacle.positions[0].y"
                />
              </ng-template>
              <ng-template #output>
                {{ obstacle.positions[0].y }}
              </ng-template>
            </p-cellEditor>
          </td>
          <td
            [pEditableColumn]="obstacle.positions[0].z"
            pEditableColumnField="position"
          >
            <p-cellEditor>
              <ng-template #input>
                <input
                  pInputText
                  type="number"
                  [(ngModel)]="obstacle.positions[0].z"
                />
              </ng-template>
              <ng-template #output>
                {{ obstacle.positions[0].z }}
              </ng-template>
            </p-cellEditor>
          </td>
          <td class="flex gap-2">
            <p-button
              icon="pi pi-bullseye"
              i18n
              size="large"
              severity="secondary"
              outlined="true"
              (click)="openModifyPositionModal(obstacle.uuid)"
            >
              <!-- <i class="fa-solid fa-crosshairs"></i> -->
              <!-- <fa-icon [icon]="faCoffee"></fa-icon> -->
            </p-button>
            <p-button
              icon="pi pi-trash"
              i18n
              size="large"
              severity="danger"
              outlined="true"
              (click)="deleteObstacle(obstacle.uuid)"
            >
            </p-button>
          </td>
        </tr>
      </ng-template>
    </p-table>
    <app-modify-position-modal
      [visible]="modifyPositionModal()"
      (visibleChange)="modifyPositionModal.set($event)"
      (modifyObstacle)="modifyObstacle($event)"
      [uuid]="uuid()"
    ></app-modify-position-modal>
  </div>`
})
export class ObstaclesTabComponent implements OnInit {
  @Input() obstacles: Obstacle[] = [];
  @Output() obstaclesChange = new EventEmitter<Obstacle[]>();
  @Input() initialObstaclesObjects: Obstacle[] = [];
  targetIcon = targetIcon;
  faCoffee = faCrosshairs;
  uuid = signal<string>('');
  modifyPositionModal = signal(false);

  ngOnInit() {
    if (!this.obstacles || this.obstacles.length === 0) {
      this.obstacles = this.initialObstaclesObjects;
    }
  }

  openModifyPositionModal(uuid: string) {
    this.modifyPositionModal.set(true);
    this.uuid.set(uuid);
  }

  modifyObstacle(event: any) {
    console.log('modifyObstacle', event);
    const obstacle = this.obstacles.find(
      (obstacle) => obstacle.uuid === event.uuid
    );
    if (!obstacle) {
      return;
    }
    obstacle.positions[0].x = Number(event.x.toFixed(2));
    obstacle.positions[0].y = Number(event.y.toFixed(2));
    obstacle.positions[0].z = Number(event.z.toFixed(2));
  }

  addObstacle() {
    const newObstacle: Obstacle = {
      uuid: uuidv4(),
      name: `obstacle ${this.obstacles.length + 1}`,
      type: 'other',
      positions: [
        {
          x: 0,
          y: 0,
          z: 0
        }
        // {
        //   x: 0,
        //   y: 0,
        //   z: 0
        // }
      ],
      support: ''
      // height: 10,
      // width: 10,
      // length: 10
    };

    this.obstacles.push(newObstacle);
    this.obstaclesChange.emit(this.obstacles);
  }

  deleteObstacle(uuid: string) {
    this.obstacles = this.obstacles.filter(
      (obstacle) => obstacle.uuid !== uuid
    );
    // this.obstaclesChange.emit(this.obstacles);
  }
}
