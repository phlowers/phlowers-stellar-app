// Single source for every static color / glyph / symbol / size used by plotly drawings.
// Conventions:
// - sizes and widths drawn in the section plot are given per view: { '2d', '3d' }; plots that only exist in one view
//   (free positioning, conformity: 2D, support: 3D) use plain numbers
// - drawings whose look changes with the selection declare their `unselected` and `selected` looks (obstacle, floor,
//   free-positioning points); objects made of several points (obstacle, floor) also declare `inactivePoint`,
//   the look of the other points of the selected object. The icons (loads, cable modification, cut strands) only
//   declare `unselected`, plus the tooltip of the cut strands
// Conformity rule zone colors are excluded: they come from the catalog json config.
export const PlotlyDrawings = {
  plot: {
    // the font of every plot text, with the fallbacks of the app's $font-family (see _vars.scss): the font file is
    // bundled with the app (see _typography.scss), but Plotly's image export cannot use it
    fontFamily: "'Nunito', Arial, sans-serif",
    background: '#e3e6eb',
    backgroundTransparent: 'transparent',
    axisBackground: '#f4f5f7',
    axisGrid: '#cdd5df'
  },
  span: {
    color: '#2563eb',
    lineWidth: { '2d': 4, '3d': 8 },
    markerSize: { '2d': 5, '3d': 3 },
    // background copy of the section, alpha included in the color. The 3D view draws it as an opaque color with that
    // alpha as trace opacity, the only transparency WebGL blends correctly (see createShadowDataObject)
    shadow: { color2d: 'rgba(37, 99, 235, 0.3)', color3d: 'rgba(37, 99, 235, 0.3)' }
  },
  support: {
    color: '#37414e',
    lineWidth: { '2d': 4, '3d': 8 },
    markerSize: { '2d': 4, '3d': 3 }
  },
  insulator: {
    color: '#5C6B7A',
    lineWidth: { '2d': 4, '3d': 8 },
    markerSize: { '2d': 6, '3d': 4 }
  },
  // shared by loadPunctual, loadMarking, cableModification and cutStrands
  clickableIconAnnotation: {
    fontFamily: 'FontAwesome',
    arrowHead: 0
  },
  loadPunctual: {
    icon: '&#xf5cd;', // FontAwesome location-dot
    iconSize: { '2d': 8, '3d': 8 },
    borderPad: { '2d': 6, '3d': 6 },
    arrowWidth: { '2d': 1, '3d': 1 },
    arrowYOffset: -50,
    unselected: { color: '#5B3A75' }
  },
  loadMarking: {
    icon: '&#xf08d;', // FontAwesome thumbtack
    iconSize: { '2d': 8, '3d': 8 },
    borderPad: { '2d': 6, '3d': 6 },
    arrowWidth: { '2d': 1, '3d': 1 },
    arrowYOffset: -50,
    unselected: { color: '#5B3A75' }
  },

  cableModification: {
    icon: '&#xe4ba;', // FontAwesome arrows-left-right-to-line
    iconSize: { '2d': 8, '3d': 8 },
    borderPad: { '2d': 6, '3d': 6 },
    arrowWidth: { '2d': 1, '3d': 1 },
    // 40 px above the load icon (-50) so both never overlap when they share an anchor point
    arrowYOffset: -90,
    label: {
      size: { '2d': 11, '3d': 11 },
      // ~20 px gap above the icon (|arrowYOffset| = 90), whatever the zoom
      yShift: 110
    },
    unselected: { color: '#4A355A' }
  },

  // RRTS marking: scissors icon above the cut span, joined to it by a dashed line
  cutStrands: {
    icon: '&#xf0c4;', // FontAwesome scissors
    iconSize: { '2d': 12, '3d': 12 },
    borderPad: { '2d': 6, '3d': 6 },
    // pixels, never data units: the gap stays the same at any zoom level. The dashed line stops at the bottom edge of
    // the icon box, worked out from iconSize and borderPad (see getCutStrandsLineLength)
    offsetY: 90,
    lineWidth: { '2d': 1, '3d': 1 },
    dashLength: 6,
    dashGap: 4,
    unselected: { color: '#5B3A75' },
    tooltipText: { backgroundColor: '#5B3A75', textColor: '#ffffff' }
  },

  // section plot obstacle annotations
  obstacle: {
    unselected: { color: '#9F1239', symbol: '◆', size: { '2d': 14, '3d': 16 } },
    selected: { color: '#E11D48', symbol: '◈', size: { '2d': 14, '3d': 16 } },
    inactivePoint: { color: '#E11D48', symbol: '◇', size: { '2d': 14, '3d': 16 } },
    // the label rises with the glyph size so both never touch
    label: { size: { '2d': 10, '3d': 10 }, yShift: { '2d': 12, '3d': 14 } }
  },

  floor: {
    unselected: { color: '#0F766E', symbol: '●', size: { '2d': 16, '3d': 16 } },
    selected: { color: '#0D9488', symbol: '◉', size: { '2d': 16, '3d': 16 } },
    inactivePoint: { color: '#0D9488', symbol: '○', size: { '2d': 16, '3d': 16 } },
    label: { size: { '2d': 10, '3d': 10 }, yShift: { '2d': 24, '3d': 24 } },
    line: { color: '#0F766E', width: { '2d': 2, '3d': 1 } },
    ribbon: { color: '#0F766E', opacity: 0.3, halfWidth: 10 }
  },

  distance: {
    color: '#f14662',
    lineWidth: { '2d': 4, '3d': 4 },
    lineStyle: { direct: 'solid', virtual: 'dot' },
    symbol: 'circle',
    markerSize: { '2d': 6, '3d': 6 },
    label: { size: { '2d': 11, '3d': 11 } }
  },

  distanceMeasuringPoint: {
    color: '#4BB3E8',
    symbol: 'diamond',
    markerSize: { '2d': 5, '3d': 3 },
    lineWidth: { '2d': 4, '3d': 2 },
    lineStyle: 'dash'
  },

  freePositioning: {
    category: {
      obstacle: {
        symbol: 'circle',
        unselected: { color: '#9F1239', size: 10, outlineColor: '#9F1239', outlineWidth: 0 },
        selected: { color: '#E11D48', size: 10, outlineColor: 'rgba(225, 29, 72, 0.3)', outlineWidth: 8 }
      },
      floor: {
        symbol: 'triangle-up',
        unselected: { color: '#0F766E', size: 10, outlineColor: '#0F766E', outlineWidth: 0 },
        selected: { color: '#0D9488', size: 10, outlineColor: 'rgba(13, 148, 136, 0.3)', outlineWidth: 8 }
      },
      distance: {
        symbol: 'diamond',
        unselected: { color: '#3a90bb', size: 10, outlineColor: '#4BB3E8', outlineWidth: 0 },
        selected: { color: '#4BB3E8', size: 10, outlineColor: 'rgba(75, 179, 232, 0.3)', outlineWidth: 8 }
      },
      loads: {
        symbol: 'square',
        unselected: { color: '#5B3A75', size: 10, outlineColor: '#5B3A75', outlineWidth: 0 },
        selected: { color: '#8d37cf', size: 10, outlineColor: 'rgba(141, 55, 207, 0.3)', outlineWidth: 8 }
      }
    },
    // line joining the points of the floor, in their order
    floorLine: { color: '#0F766E', width: 1, style: 'dot' },
    // a point placed on the plot but not yet calculated (e.g. a load awaiting calculate & save)
    pendingPointOpacity: 0.45
  },

  conformity: {
    cablePoint: { color: '#2563EB', markerSize: 7 },
    obstaclePoint: { color: '#9F1239', symbol: 'diamond', markerSize: 10 },
    defaultZoneColor: '#888888', // used when a rule has no catalog color
    fillOpacity: 0.2,
    borderWidth: 2,
    borderMarkerSize: 4
  },

  supportPlot: {
    shapeLine: { color: '#37414E', width: 2 },
    selectedMarker: { color: '#5B3A75', opacity: 0.5, size: 10 },
    textFontSize: 15
  }
} as const;
