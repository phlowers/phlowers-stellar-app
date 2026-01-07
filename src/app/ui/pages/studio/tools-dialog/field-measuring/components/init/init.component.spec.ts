import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { InitComponent } from './init.component';
import { PlotService } from '../../../../services/plot.service';
import { ToolsDialogService } from '../../../tools-dialog.service';

describe('Init component', () => {
  let component: InitComponent;
  let fixture: ComponentFixture<InitComponent>;

  beforeEach(async () => {
    const mockPlotService = {
      section: signal(null)
    } as unknown as PlotService;

    await TestBed.configureTestingModule({
      imports: [InitComponent],
      providers: [
        ToolsDialogService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PlotService, useValue: mockPlotService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
