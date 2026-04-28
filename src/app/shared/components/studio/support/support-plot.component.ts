import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { KeyFilterModule } from 'primeng/keyfilter';
import { MessageModule } from 'primeng/message';
import plotly, { Data } from 'plotly.js-dist-min';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { Task } from '@services/worker_python/tasks/types';
import { LoggerService } from '@core/services/logger/logger.service';

/**
 * Formatted text data for plot annotations.
 * @internal
 */
interface FormattedTextData {
  /** Array of text strings to display */
  textToDisplay: string[];
  /** 2D array of coordinates for text placement */
  textDisplayPoints: number[][];
}

/**
 * Data structure for rendering support plots.
 * @internal
 */
interface PlotData {
  /** 2D array of shape coordinates */
  shapePoints: number[][];
  /** 2D array of text display coordinates */
  textDisplayPoints: number[][];
  /** Array of text strings to display */
  textToDisplay: string[];
  /** Currently selected attachment set number */
  selectedAttachmentSetNumber: number | undefined;
  /** Coordinates of the attachment set point */
  attachmentSetPoints: number[];
}

@Component({
  selector: 'app-support-plot',
  templateUrl: './support-plot.component.html',
  imports: [SelectModule, FormsModule, KeyFilterModule, MessageModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
/**
 * Renders an interactive 3D Plotly visualisation of a transmission-line support structure.
 * Reacts to coordinate and attachment-set input changes to refresh the plot.
 */
export class SupportPlotComponent {
  private static readonly PLOT_ELEMENT_ID = 'plotly-output-support';
  private static readonly PLOT_LAYOUT = {
    autosize: true,
    showlegend: false,
    margin: { l: 0, r: 0, t: 0, b: 0 },
    width: 550
  } as const;
  private static readonly SHAPE_LINE_CONFIG = {
    color: 'blue',
    width: 2
  } as const;
  private static readonly SELECTED_MARKER_CONFIG = {
    color: 'red',
    opacity: 0.5,
    size: 10
  } as const;
  private static readonly TEXT_FONT_CONFIG = {
    size: 15
  } as const;

  /** 2D array of coordinate tuples describing the support geometry. */
  coordinates = input<(number | undefined)[][]>();
  /** Available attachment-set numbers for the support. */
  attachmentSetNumbers = input<number[]>();
  /** Currently selected attachment-set number to highlight on the plot. */
  selectedAttachmentSetNumber = input<number | undefined>(undefined);

  private readonly workerPythonService = inject(WorkerPythonService);
  private readonly logger = inject(LoggerService);

  constructor() {
    effect(() => {
      const coords = this.coordinates();
      const attachmentSets = this.attachmentSetNumbers();

      if (coords?.length && attachmentSets?.length && this.workerPythonService.ready) {
        this.refreshPlot(coords, attachmentSets, this.selectedAttachmentSetNumber());
      } else {
        this.clearPlot();
      }
    });
  }

  /** Removes the current Plotly chart from the DOM element. */
  clearPlot(): void {
    plotly.purge(SupportPlotComponent.PLOT_ELEMENT_ID);
  }

  /**
   * Recomputes support coordinates via the Python worker and redraws the 3D plot.
   * @param coordinates - Raw support geometry coordinates.
   * @param attachmentSetNumbers - List of attachment-set identifiers.
   * @param selectedAttachmentSetNumber - The attachment-set to highlight, if any.
   */
  async refreshPlot(
    coordinates: (number | undefined)[][],
    attachmentSetNumbers: number[],
    selectedAttachmentSetNumber: number | undefined
  ): Promise<void> {
    try {
      const { result } = await this.workerPythonService.runTask(Task.getSupportCoordinates, {
        coordinates,
        attachmentSetNumbers
      });

      if (!result) {
        this.clearPlot();
        return;
      }

      const { shape_points, text_display_points, text_to_display } = result;
      const attachmentSetPoints = this.findAttachmentSetPoints(
        text_to_display,
        text_display_points,
        selectedAttachmentSetNumber
      );
      const formattedData = this.reformatTextToDisplay(text_to_display, text_display_points);

      this.createPlot({
        shapePoints: shape_points,
        textDisplayPoints: formattedData.textDisplayPoints,
        textToDisplay: formattedData.textToDisplay,
        selectedAttachmentSetNumber,
        attachmentSetPoints
      });
    } catch (error) {
      this.logger.error('Error refreshing plot:', error);
      this.clearPlot();
    }
  }

  private findAttachmentSetPoints(
    textToDisplay: number[],
    textDisplayPoints: number[][],
    selectedAttachmentSetNumber: number | undefined
  ): number[] {
    if (selectedAttachmentSetNumber === undefined) {
      return [];
    }

    const attachmentSetIndex = textToDisplay.indexOf(selectedAttachmentSetNumber);

    return attachmentSetIndex !== -1 ? textDisplayPoints[attachmentSetIndex] : [];
  }

  private reformatTextToDisplay(textToDisplay: number[], textDisplayPoints: number[][]): FormattedTextData {
    const groupedText: Record<string, string> = {};

    textDisplayPoints.forEach((point, index) => {
      const key = point.join('/');
      const value = textToDisplay[index].toString();

      if (groupedText[key]) {
        groupedText[key] = `${groupedText[key]}, ${value}`;
      } else {
        groupedText[key] = value;
      }
    });

    return {
      textToDisplay: Object.values(groupedText),
      textDisplayPoints: Object.keys(groupedText).map((key) => key.split('/').map(Number))
    };
  }

  private createPlot(data: PlotData): void {
    const shapeData = this.createShapeData(data.shapePoints);
    const textData = this.createTextData(data.textDisplayPoints, data.textToDisplay);
    const plotData: Data[] = [shapeData, textData];

    if (data.selectedAttachmentSetNumber !== undefined && data.attachmentSetPoints.length > 0) {
      const selectedMarkerData = this.createSelectedMarkerData(data.attachmentSetPoints);
      plotData.push(selectedMarkerData);
    }

    plotly.newPlot(SupportPlotComponent.PLOT_ELEMENT_ID, plotData, SupportPlotComponent.PLOT_LAYOUT);
  }

  private createShapeData(shapePoints: number[][]): Data {
    return {
      x: shapePoints.map((point) => point[0]),
      y: shapePoints.map((point) => point[1]),
      z: shapePoints.map((point) => point[2]),
      type: 'scatter3d',
      mode: 'lines',
      line: SupportPlotComponent.SHAPE_LINE_CONFIG
    };
  }

  private createTextData(textDisplayPoints: number[][], textToDisplay: string[]): Data {
    return {
      x: textDisplayPoints.map((point) => point[0]),
      y: textDisplayPoints.map((point) => point[1]),
      z: textDisplayPoints.map((point) => point[2]),
      type: 'scatter3d',
      mode: 'text',
      text: textToDisplay,
      textfont: SupportPlotComponent.TEXT_FONT_CONFIG,
      insidetextanchor: 'start',
      textposition: 'middle center'
    };
  }

  private createSelectedMarkerData(attachmentSetPoints: number[]): Data {
    return {
      x: [attachmentSetPoints[0]],
      y: [attachmentSetPoints[1]],
      z: [attachmentSetPoints[2]],
      type: 'scatter3d',
      mode: 'markers',
      marker: SupportPlotComponent.SELECTED_MARKER_CONFIG
    };
  }
}
