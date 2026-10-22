import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SortEvent } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TranslocoModule, TranslocoTestingModule } from '@jsverse/transloco';
import { L0SumComponent } from './l0-sum.component';
import { ToolbarDialogService } from '../../services/toolbar-dialog.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { NotificationService } from '@core/services/notification/notification.service';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';

@Component({
  selector: 'app-icon',
  standalone: true,
  template: ''
})
class MockIconComponent {
  icon = input<string>();
}

describe('L0SumComponent', () => {
  let component: L0SumComponent;
  let fixture: ComponentFixture<L0SumComponent>;
  let toolbarDialogService: ToolbarDialogService;
  let notificationService: { error: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    const mockLitData = {
      output_parameters: {
        L0: [100, 200.5, 150, 300, 250],
        span_length: [101.25, 201, 150.5, 301, 250.75]
      }
    };

    const mockPlotService = {
      loading: vi.fn().mockReturnValue(false),
      litData: vi.fn().mockReturnValue(mockLitData),
      study: vi.fn().mockReturnValue({ title: 'Study A' })
    } as unknown as PlotService;

    const mockPlotSpanService = {
      section: vi.fn().mockReturnValue(null)
    } as unknown as PlotSpanService;

    notificationService = { error: vi.fn() };

    await TestBed.configureTestingModule({
      providers: [
        ToolbarDialogService,
        { provide: NotificationService, useValue: notificationService },
        provideHttpClientTesting(),
        { provide: PlotService, useValue: mockPlotService },
        { provide: PlotSpanService, useValue: mockPlotSpanService }
      ],
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' }
        })
      ]
    })
      .overrideComponent(L0SumComponent, {
        set: {
          imports: [
            CommonModule,
            TableModule,
            ProgressSpinnerModule,
            TranslocoModule,
            ButtonComponent,
            MockIconComponent
          ]
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(L0SumComponent);
    component = fixture.componentInstance;
    toolbarDialogService = TestBed.inject(ToolbarDialogService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize one row per span', () => {
    expect(component.l0Rows()).toHaveLength(5);
  });

  it('should expose the span length of each span', () => {
    expect(component.l0Rows().map((row) => row.spanLength)).toEqual([101.25, 201, 150.5, 301, 250.75]);
  });

  it('should accumulate the L0 of the previous spans', () => {
    expect(component.l0Rows().map((row) => row.cumulatedL0)).toEqual([100, 300.5, 450.5, 750.5, 1000.5]);
  });

  it('should not leak floating point noise in the cumulated L0', () => {
    const litData = {
      output_parameters: { L0: [0.1, 0.2], span_length: [1, 2] }
    };
    (TestBed.inject(PlotService).litData as unknown as ReturnType<typeof vi.fn>).mockReturnValue(litData);
    const noisyFixture = TestBed.createComponent(L0SumComponent);
    noisyFixture.detectChanges();
    expect(noisyFixture.componentInstance.l0Rows().map((row) => row.cumulatedL0)).toEqual([0.1, 0.3]);
  });

  it('should render the paginator above the table', () => {
    const table = fixture.nativeElement.querySelector('[data-testid="l0-table"]');
    const paginator = table.querySelector('.p-paginator');
    const content = table.querySelector('.p-datatable-table-container');
    expect(paginator.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('should translate the current page report', () => {
    const report = fixture.nativeElement.querySelector('[data-testid="l0-table"] .p-paginator-current');
    expect(report.textContent).toContain('studio.l0-sum.current-page-report');
  });

  it('should inject ToolbarDialogService', () => {
    expect(toolbarDialogService).toBeDefined();
  });

  describe('onVisibleChange', () => {
    it('should call closeTool when visible is false', () => {
      const closeSpy = vi.spyOn(toolbarDialogService, 'closeTool');
      component.onVisibleChange(false);
      expect(closeSpy).toHaveBeenCalled();
    });

    it('should not call closeTool when visible is true', () => {
      const closeSpy = vi.spyOn(toolbarDialogService, 'closeTool');
      component.onVisibleChange(true);
      expect(closeSpy).not.toHaveBeenCalled();
    });
  });

  describe('onExport', () => {
    let createdLink: HTMLAnchorElement | undefined;
    let clickSpy: ReturnType<typeof vi.fn>;
    let blobs: Blob[];
    let revokeSpy: ReturnType<typeof vi.fn>;

    // happy-dom does not implement Blob.prototype.text
    const readBlobAsText = (blob: Blob): Promise<string> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(blob);
      });

    beforeEach(() => {
      blobs = [];
      createdLink = undefined;
      clickSpy = vi.fn();
      revokeSpy = vi.fn();

      vi.stubGlobal('URL', {
        createObjectURL: vi.fn((blob: Blob) => {
          blobs.push(blob);
          return 'blob:l0';
        }),
        revokeObjectURL: revokeSpy
      });
      const realCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const element = realCreateElement(tag);
        if (tag === 'a') {
          createdLink = element as HTMLAnchorElement;
          createdLink.click = clickSpy as unknown as () => void;
        }
        return element;
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    describe('file name', () => {
      beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(2026, 8, 30, 14, 5, 9));
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('should name the file after the translated prefix, the study, the section and the generation time', () => {
        (TestBed.inject(PlotSpanService).section as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
          name: 'Section 1',
          supports: []
        });

        component.onExport();

        expect(createdLink?.download).toBe(
          'studio.l0-sum.csv-filename-prefix_Study A_Section 1_2026-09-30_14-05-09.csv'
        );
      });

      it('should use the generation time of each export', () => {
        component.onExport();
        vi.setSystemTime(new Date(2026, 8, 30, 14, 6, 10));
        component.onExport();

        expect(createdLink?.download).toContain('_2026-09-30_14-06-10.csv');
      });

      it('should replace the characters that are illegal in a file name', () => {
        (TestBed.inject(PlotService).study as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
          title: 'Study: A/B'
        });
        (TestBed.inject(PlotSpanService).section as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
          name: 'Section "1"?',
          supports: []
        });

        component.onExport();

        expect(createdLink?.download).toBe(
          'studio.l0-sum.csv-filename-prefix_Study- A-B_Section -1--_2026-09-30_14-05-09.csv'
        );
      });

      it('should fall back to a dash when the study or the section is not available', () => {
        (TestBed.inject(PlotService).study as unknown as ReturnType<typeof vi.fn>).mockReturnValue(null);

        component.onExport();

        expect(createdLink?.download).toBe('studio.l0-sum.csv-filename-prefix_-_-_2026-09-30_14-05-09.csv');
      });
    });

    it('should download the table through a temporary blob link', () => {
      component.onExport();

      expect(createdLink?.download).toMatch(/\.csv$/);
      expect(createdLink?.href).toContain('blob:l0');
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(revokeSpy).toHaveBeenCalledWith('blob:l0');
      expect(notificationService.error).not.toHaveBeenCalled();
    });

    it('should declare the CSV content as UTF-8', () => {
      component.onExport();

      expect(blobs[0].type).toBe('text/csv;charset=utf-8');
    });

    it('should export the translated heading then one line per span', async () => {
      component.onExport();

      const lines = (await readBlobAsText(blobs[0])).split('\r\n');
      expect(lines[0]).toBe(
        'COMMON.SPAN-LABEL;STUDIO.L0-SUM.CSV-SPAN-LENGTH-LABEL;STUDIO.L0-SUM.CSV-L0-LABEL;STUDIO.L0-SUM.CSV-CUMULATED-L0-LABEL'
      );
      expect(lines.slice(1, 3)).toEqual(['"=""1-2""";101.25;100;100', '"=""2-3""";201;200.5;300.5']);
      expect(lines).toHaveLength(7);
    });

    it('should export a span built from a support number starting with "=" as text, not as a formula', async () => {
      (TestBed.inject(PlotSpanService).section as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        supports: [{ number: '=1+1' }, { number: '2' }]
      });
      const formulaFixture = TestBed.createComponent(L0SumComponent);
      formulaFixture.detectChanges();

      formulaFixture.componentInstance.onExport();

      const lines = (await readBlobAsText(blobs[0])).split('\r\n');
      expect(lines[1]).toBe('"=""=1+1-2""";101.25;100;100');
    });

    // The footer is rendered by the toolbar dialog, not in the component view
    const renderExportButton = (target: ComponentFixture<L0SumComponent>): HTMLButtonElement => {
      const view = target.componentInstance.footerTemplate()!.createEmbeddedView(null);
      view.detectChanges();
      return view.rootNodes.find((node) => node instanceof HTMLButtonElement)!;
    };

    it('should enable the export button once the data is loaded', () => {
      const button = renderExportButton(fixture);

      expect(button.disabled).toBe(false);
      expect(button.classList).not.toContain('app-btn-loading');
    });

    it('should lock the export button while the data is recalculated', () => {
      // the previous litData is kept until the worker returns, so the rows are still there under the spinner
      (TestBed.inject(PlotService).loading as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
      const loadingFixture = TestBed.createComponent(L0SumComponent);
      loadingFixture.detectChanges();
      expect(loadingFixture.componentInstance.l0Rows()).toHaveLength(5);

      const button = renderExportButton(loadingFixture);
      button.click();

      expect(button.disabled).toBe(true);
      expect(button.classList).toContain('app-btn-loading');
      expect(clickSpy).not.toHaveBeenCalled();
      expect(blobs).toHaveLength(0);
    });

    it('should keep the dialog open', () => {
      const closeSpy = vi.spyOn(toolbarDialogService, 'closeTool');

      component.onExport();

      expect(closeSpy).not.toHaveBeenCalled();
    });

    it('should notify an error and not download when the table is empty', () => {
      component.l0Rows.set([]);

      component.onExport();

      expect(notificationService.error).toHaveBeenCalledWith('studio.l0-sum.export-invalid-table');
      expect(clickSpy).not.toHaveBeenCalled();
    });

    it('should notify an error and not download when a value is not a finite number', () => {
      component.l0Rows.update((rows) => [
        ...rows,
        { span: '6-7', spanLength: Number.NaN, l0: 1, cumulatedL0: 1, index: 5 }
      ]);

      component.onExport();

      expect(notificationService.error).toHaveBeenCalledWith('studio.l0-sum.export-invalid-table');
      expect(clickSpy).not.toHaveBeenCalled();
    });
  });

  describe('getSortIcon', () => {
    it('should return swap_vert when field does not match current sort field', () => {
      component.sortField.set('');
      component.sortOrder.set(0);
      expect(component.getSortIcon('span')).toBe('swap_vert');
    });

    it('should return arrow_upward when sorted ascending on the field', () => {
      component.sortField.set('span');
      component.sortOrder.set(1);
      expect(component.getSortIcon('span')).toBe('arrow_upward');
    });

    it('should return arrow_downward when sorted descending on the field', () => {
      component.sortField.set('l0');
      component.sortOrder.set(-1);
      expect(component.getSortIcon('l0')).toBe('arrow_downward');
    });

    it('should return swap_vert when field matches but order is 0', () => {
      component.sortField.set('span');
      component.sortOrder.set(0);
      expect(component.getSortIcon('span')).toBe('swap_vert');
    });
  });

  describe('customSort', () => {
    it('should update sortField and sortOrder', () => {
      const event = { field: 'span', order: 1, data: [] };
      component.customSort(event);
      expect(component.sortField()).toBe('span');
      expect(component.sortOrder()).toBe(1);
    });

    it('should sort span data ascending by index', () => {
      const data = [
        { span: '2-3', spanLength: 0, l0: 150, cumulatedL0: 0, index: 1 },
        { span: '1-2', spanLength: 0, l0: 100, cumulatedL0: 0, index: 0 },
        { span: '3-4', spanLength: 0, l0: 200, cumulatedL0: 0, index: 2 }
      ];
      const event = { field: 'span', order: 1, data };
      component.customSort(event);
      expect(data[0].index).toBe(0);
      expect(data[1].index).toBe(1);
      expect(data[2].index).toBe(2);
    });

    it('should sort span data descending by index', () => {
      const data = [
        { span: '1-2', spanLength: 0, l0: 100, cumulatedL0: 0, index: 0 },
        { span: '2-3', spanLength: 0, l0: 150, cumulatedL0: 0, index: 1 },
        { span: '3-4', spanLength: 0, l0: 200, cumulatedL0: 0, index: 2 }
      ];
      const event = { field: 'span', order: -1, data };
      component.customSort(event);
      expect(data[0].index).toBe(2);
      expect(data[1].index).toBe(1);
      expect(data[2].index).toBe(0);
    });

    it('should sort l0 data ascending', () => {
      const data = [
        { span: '2-3', spanLength: 0, l0: 200, cumulatedL0: 0, index: 1 },
        { span: '1-2', spanLength: 0, l0: 100, cumulatedL0: 0, index: 0 },
        { span: '3-4', spanLength: 0, l0: 150, cumulatedL0: 0, index: 2 }
      ];
      const event = { field: 'l0', order: 1, data };
      component.customSort(event);
      expect(data[0].l0).toBe(100);
      expect(data[1].l0).toBe(150);
      expect(data[2].l0).toBe(200);
    });

    it('should sort l0 data descending', () => {
      const data = [
        { span: '1-2', spanLength: 0, l0: 100, cumulatedL0: 0, index: 0 },
        { span: '2-3', spanLength: 0, l0: 200, cumulatedL0: 0, index: 1 },
        { span: '3-4', spanLength: 0, l0: 150, cumulatedL0: 0, index: 2 }
      ];
      const event = { field: 'l0', order: -1, data };
      component.customSort(event);
      expect(data[0].l0).toBe(200);
      expect(data[1].l0).toBe(150);
      expect(data[2].l0).toBe(100);
    });

    it('should handle null order gracefully', () => {
      const data = [
        { span: '2-3', spanLength: 0, l0: 150, cumulatedL0: 0, index: 1 },
        { span: '1-2', spanLength: 0, l0: 100, cumulatedL0: 0, index: 0 }
      ];
      const event = { field: 'span', order: null, data };
      expect(() => component.customSort(event as unknown as SortEvent)).not.toThrow();
    });
  });
});
