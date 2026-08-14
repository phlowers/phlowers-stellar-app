import { ChangeDetectionStrategy, Component, input, signal, computed, inject } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { CardComponent } from '@shared/components/atoms/card/card.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { GetSectionOutput } from '@services/worker_python/tasks/types';
import { round } from 'lodash';
import { truncateNumberToOneDecimal } from '@shared/helpers/truncateDecimals';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { formatSupportNumber } from '@shared/helpers/formatSupportNumber';

/** Represents a single data field with label, value, and unit. */
interface DataField {
  label: string;
  value: string | number;
  unit: string;
}

/** Represents a group of data fields, optionally titled and indented. */
interface DataSection {
  /** Optional heading for this section. */
  title?: string;
  fields: DataField[];
  indent?: boolean;
}

@Component({
  selector: 'app-section-plot-card',
  templateUrl: './section-plot-card.component.html',
  styleUrl: './section-plot-card.component.scss',
  imports: [CardComponent, IconComponent, TranslocoModule],
  animations: [
    trigger('expandCollapse', [
      state(
        'collapsed',
        style({
          height: '0',
          opacity: '0',
          overflow: 'hidden'
        })
      ),
      state(
        'expanded',
        style({
          height: '*',
          opacity: '1',
          overflow: 'hidden'
        })
      ),
      transition('collapsed <=> expanded', [animate('300ms cubic-bezier(0.4, 0.0, 0.2, 1)')])
    ])
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Card component displaying computed section plot data for a support or span. */
export class SectionPlotCardComponent {
  /** Whether the card details are expanded. */
  isExpanded = signal(false);
  /** Computed section output data to display. */
  litData = input.required<GetSectionOutput | null>();
  /** Type of section element: span or support. */
  type = input<'span' | 'support'>('support');
  /** Zero-based index of the support or span. */
  index = input.required<number>();

  private readonly spanService = inject(PlotSpanService);
  private readonly translocoService = inject(TranslocoService);

  cardTitle = computed(() => {
    const idx = this.index();
    const supports = this.spanService.section()?.supports;
    if (this.type() === 'support') {
      const num = supports?.[idx]?.number;
      return num ? formatSupportNumber(num) : String(idx + 1);
    }
    const numLeft = supports?.[idx]?.number;
    const numRight = supports?.[idx + 1]?.number;
    const left = numLeft ? formatSupportNumber(numLeft) : String(idx + 1);
    const right = numRight ? formatSupportNumber(numRight) : String(idx + 2);
    return `${left}-${right}`;
  });

  cardColor = computed(() => (this.type() === 'support' ? 'icon-wrapper--support' : 'icon-wrapper--line'));

  private readonly getFormatedNumberIndex = (value: number[] | undefined, decimalPlaces = 2): number | string => {
    if (value === undefined) {
      return '-';
    }
    return round(value?.[this.index()], decimalPlaces);
  };

  private readonly getParameterValue = (value: number[] | undefined): number | string => {
    if (value === undefined) return '-';
    const v = value[this.index()];
    return v !== undefined ? truncateNumberToOneDecimal(v) : '-';
  };

  // Data structure for support type
  supportData = computed((): DataSection[] => {
    const vtl_under_chain = this.litData()?.output_parameters.vtl_under_chain;
    const r_under_chain = this.litData()?.output_parameters.r_under_chain;
    const lineAngle = this.litData()?.output_parameters.line_angle;

    return [
      {
        title: this.translocoService.translate('studio.section-plot-card.vtl-under-chain-title'),
        fields: [
          {
            label: this.translocoService.translate('studio.section-plot-card.v-label'),
            value: this.getFormatedNumberIndex(vtl_under_chain?.[0]),
            unit: 'daN'
          },
          {
            label: this.translocoService.translate('studio.section-plot-card.t-label'),
            value: this.getFormatedNumberIndex(vtl_under_chain?.[1]),
            unit: 'daN'
          },
          {
            label: this.translocoService.translate('studio.section-plot-card.l-label'),
            value: this.getFormatedNumberIndex(vtl_under_chain?.[2]),
            unit: 'daN'
          },
          {
            label: this.translocoService.translate('studio.section-plot-card.resultant-label'),
            value: this.getFormatedNumberIndex(r_under_chain),
            unit: 'daN'
          }
        ],
        indent: true
      },
      {
        fields: [
          {
            label: this.translocoService.translate('studio.section-plot-card.line-angle-label'),
            value: this.getFormatedNumberIndex(lineAngle),
            unit: 'gr'
          }
        ]
      }
    ];
  });

  // Expanded data for support type
  supportExpandedData = computed((): DataSection[] => {
    const vtl_under_console = this.litData()?.output_parameters.vtl_under_console;
    const r_under_console = this.litData()?.output_parameters.r_under_console;
    const groundAltitude = this.litData()?.output_parameters.ground_altitude;
    const displacement = this.litData()?.output_parameters.displacement;
    const loadAngle = this.litData()?.output_parameters.load_angle;

    return [
      {
        title: this.translocoService.translate('studio.section-plot-card.vtl-under-console-title'),
        fields: [
          {
            label: this.translocoService.translate('studio.section-plot-card.v-label'),
            value: this.getFormatedNumberIndex(vtl_under_console?.[0]),
            unit: 'daN'
          },
          {
            label: this.translocoService.translate('studio.section-plot-card.t-label'),
            value: this.getFormatedNumberIndex(vtl_under_console?.[1]),
            unit: 'daN'
          },
          {
            label: this.translocoService.translate('studio.section-plot-card.l-label'),
            value: this.getFormatedNumberIndex(vtl_under_console?.[2]),
            unit: 'daN'
          },
          {
            label: this.translocoService.translate('studio.section-plot-card.resultant-label'),
            value: this.getFormatedNumberIndex(r_under_console),
            unit: 'daN'
          }
        ],
        indent: true
      },
      {
        fields: [
          {
            label: this.translocoService.translate('studio.section-plot-card.alt-supp-foot-label'),
            value: this.getFormatedNumberIndex(groundAltitude),
            unit: 'm'
          }
        ]
      },
      {
        title: this.translocoService.translate('studio.section-plot-card.chain-displacement-acc-title'),
        fields: [
          {
            label: this.translocoService.translate('studio.section-plot-card.x-label'),
            value: this.getFormatedNumberIndex(displacement?.[0]),
            unit: 'm'
          },
          {
            label: this.translocoService.translate('studio.section-plot-card.y-label'),
            value: this.getFormatedNumberIndex(displacement?.[1]),
            unit: 'm'
          },
          {
            label: this.translocoService.translate('studio.section-plot-card.z-label'),
            value: this.getFormatedNumberIndex(displacement?.[2]),
            unit: 'm'
          }
        ],
        indent: true
      },
      {
        fields: [
          {
            label: this.translocoService.translate('studio.section-plot-card.angle-balancement-label'),
            value: this.getFormatedNumberIndex(loadAngle),
            unit: '°'
          }
        ]
      }
    ];
  });

  // Data structure for span type
  spanData = computed((): DataField[] => {
    const litData = this.litData();
    const spanLength = litData?.output_parameters.span_length;
    const elevation = litData?.output_parameters.elevation;
    const L0 = litData?.output_parameters.L0;
    const parameter = litData?.output_parameters.parameter;
    const tensionSup = litData?.output_parameters.tension_sup;
    return [
      {
        label: this.translocoService.translate('studio.section-plot-card.span-length-label'),
        value: this.getFormatedNumberIndex(spanLength),
        unit: 'm'
      },
      {
        label: this.translocoService.translate('studio.section-plot-card.elevation-label'),
        value: this.getFormatedNumberIndex(elevation),
        unit: 'm'
      },
      {
        label: this.translocoService.translate('studio.section-plot-card.parameter-label'),
        value: this.getParameterValue(parameter),
        unit: 'm'
      },
      {
        label: this.translocoService.translate('studio.section-plot-card.supp-tension-max-label'),
        value: this.getFormatedNumberIndex(tensionSup),
        unit: 'daN'
      },
      {
        label: this.translocoService.translate('studio.section-plot-card.natural-length-l0-label'),
        value: this.getFormatedNumberIndex(L0),
        unit: 'm'
      }
    ];
  });

  // Expanded data for span type
  spanExpandedData = computed((): DataField[] => {
    const litData = this.litData();
    const sag = litData?.output_parameters.sag;
    const sagS2 = litData?.output_parameters.sag_s2;
    const horizontalDistance = litData?.output_parameters.horizontal_distance;
    const arcLength = litData?.output_parameters.arc_length;
    const th = litData?.output_parameters.T_h;
    const tensionInf = litData?.output_parameters.tension_inf;
    const slopeLeft = litData?.output_parameters.slope_left;
    const slopeRight = litData?.output_parameters.slope_right;
    return [
      {
        label: this.translocoService.translate('studio.section-plot-card.arrow-f1-label'),
        value: this.getFormatedNumberIndex(sag),
        unit: 'm'
      },
      {
        label: this.translocoService.translate('studio.section-plot-card.arrow-f2-label'),
        value: this.getFormatedNumberIndex(sagS2),
        unit: 'm'
      },
      {
        label: this.translocoService.translate('studio.section-plot-card.horizontal-dist-acc-label'),
        value: this.getFormatedNumberIndex(horizontalDistance),
        unit: 'm'
      },
      {
        label: this.translocoService.translate('studio.section-plot-card.arc-length-la-label'),
        value: this.getFormatedNumberIndex(arcLength),
        unit: 'm'
      },
      {
        label: this.translocoService.translate('studio.section-plot-card.th-t0-label'),
        value: this.getFormatedNumberIndex(th),
        unit: 'daN'
      },
      {
        label: this.translocoService.translate('studio.section-plot-card.inf-tension-acc-label'),
        value: this.getFormatedNumberIndex(tensionInf),
        unit: 'daN'
      },
      {
        label: this.translocoService.translate('studio.section-plot-card.cable-slope-left-att-label'),
        value: this.getFormatedNumberIndex(slopeLeft),
        unit: '°'
      },
      {
        label: this.translocoService.translate('studio.section-plot-card.cable-slope-right-att-label'),
        value: this.getFormatedNumberIndex(slopeRight),
        unit: '°'
      }
    ];
  });
}
