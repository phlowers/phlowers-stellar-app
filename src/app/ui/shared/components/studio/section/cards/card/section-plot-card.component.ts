import { Component, input, signal, computed } from '@angular/core';
import {
  trigger,
  state,
  style,
  transition,
  animate
} from '@angular/animations';
import { CardComponent } from '@ui/shared/components/atoms/card/card.component';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';

interface DataField {
  label: string;
  value: string;
}

interface DataSection {
  title?: string;
  fields: DataField[];
  indent?: boolean;
}

@Component({
  selector: 'app-section-plot-card',
  templateUrl: './section-plot-card.component.html',
  styleUrl: './section-plot-card.component.scss',
  imports: [CardComponent, IconComponent],
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
      transition('collapsed <=> expanded', [
        animate('300ms cubic-bezier(0.4, 0.0, 0.2, 1)')
      ])
    ])
  ]
})
export class SectionPlotCardComponent {
  isExpanded = signal(false);
  type = input<'span' | 'support'>('support');
  index = input<number>(0);

  cardTitle = computed(() => {
    const idx = this.index();
    return this.type() === 'support' ? `N°${idx + 1}` : `${idx + 1}-${idx + 2}`;
  });

  cardColor = computed(() =>
    this.type() === 'support' ? 'icon-wrapper--support' : 'icon-wrapper--line'
  );

  // Data structure for support type
  supportData = computed((): DataSection[] => [
    {
      title: 'VHL (sous chaine)',
      fields: [
        { label: $localize`V :`, value: '1234' },
        { label: $localize`H :`, value: '1234' },
        { label: $localize`L :`, value: '1234' },
        { label: $localize`Résultante :`, value: '1234' }
      ],
      indent: true
    },
    {
      fields: [{ label: $localize`Angle en ligne :`, value: '1234' }]
    }
  ]);

  // Expanded data for support type
  supportExpandedData = computed((): DataSection[] => [
    {
      title: 'VHL (sous console)',
      fields: [
        { label: $localize`V :`, value: '1234' },
        { label: $localize`H :`, value: '1234' },
        { label: $localize`L :`, value: '1234' },
        { label: $localize`Résultante :`, value: '1234' }
      ],
      indent: true
    },
    {
      fields: [{ label: $localize`Alt. pied supp :`, value: '1234' }]
    },
    {
      title: 'Deplacement chaine acc.',
      fields: [
        { label: $localize`X :`, value: '1234' },
        { label: $localize`Y :`, value: '1234' },
        { label: $localize`Z :`, value: '1234' }
      ],
      indent: true
    },
    {
      fields: [
        { label: $localize`Angle balencement :`, value: '1234' },
        { label: $localize`Pente du câble acc. :`, value: '1234' }
      ]
    }
  ]);

  // Data structure for span type
  spanData = computed((): DataField[] => [
    { label: $localize`Longeur portée :`, value: '1234' },
    { label: $localize`Dénivelé (m) :`, value: '1234' },
    { label: $localize`Tension supp (Max) :`, value: '1234' },
    { label: $localize`Longueur naturelle LO :`, value: '1234' }
  ]);

  // Expanded data for span type
  spanExpandedData = computed((): DataField[] => [
    { label: $localize`Fleche F1 :`, value: '1234' },
    { label: $localize`Fleche F2 :`, value: '1234' },
    { label: $localize`Dist. horizontal acc. :`, value: '1234' },
    { label: $localize`Longueur d'arc LA :`, value: '1234' },
    { label: $localize`Th - T0 :`, value: '1234' },
    { label: $localize`Tension inf acc. :`, value: '1234' }
  ]);
}
