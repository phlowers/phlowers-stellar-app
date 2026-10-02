import { describe, it, expect } from 'vitest';
import { buildClickableIconAnnotation } from './createClickableIconAnnotation';
import {
  ClickableIconWithArrowParams,
  ClickableIconWithoutArrowParams
} from './createClickableIconAnnotation.interfaces';

type AnnotationWithExtras = ReturnType<typeof buildClickableIconAnnotation> & {
  z?: number;
  yshift?: number;
  hovertext?: string;
  hoverlabel?: { bgcolor?: string; bordercolor?: string; font?: { color?: string } };
  data?: Record<string, unknown>;
};

const makeParams = (overrides: Partial<ClickableIconWithArrowParams> = {}): ClickableIconWithArrowParams => ({
  arrowTipX: 1,
  arrowTipY: 2,
  arrowTipZ: 3,
  icon: '&#xf5cd;',
  color: '#4A355A',
  arrowYOffset: -50,
  data: { type: 'spanLoad', supportUuid: 'uuid-1' },
  ...overrides
});

const makeStandaloneParams = (
  overrides: Partial<ClickableIconWithoutArrowParams> = {}
): ClickableIconWithoutArrowParams => ({
  showArrow: false,
  arrowTipX: 1,
  arrowTipY: 2,
  arrowTipZ: 3,
  icon: '&#xf0c4;',
  color: '#7D5A9F',
  yShift: 90,
  data: { type: 'cutStrands' },
  ...overrides
});

describe('buildClickableIconAnnotation', () => {
  describe('structural fixed fields', () => {
    it('should set xref and yref to data-space coordinates', () => {
      const result = buildClickableIconAnnotation(makeParams());
      expect(result.xref).toBe('x');
      expect(result.yref).toBe('y');
    });

    it('should set showarrow to true', () => {
      const result = buildClickableIconAnnotation(makeParams());
      expect(result.showarrow).toBe(true);
    });

    it('should set arrowhead to 0 (no arrowhead on the cable end)', () => {
      const result = buildClickableIconAnnotation(makeParams());
      expect(result.arrowhead).toBe(0);
    });

    it('should set startarrowhead to 6 (filled arrowhead on the icon end)', () => {
      const result = buildClickableIconAnnotation(makeParams());
      expect(result.startarrowhead).toBe(6);
    });

    it('should set arrowwidth to 1', () => {
      const result = buildClickableIconAnnotation(makeParams());
      expect(result.arrowwidth).toBe(1);
    });

    it('should set captureevents to true so the annotation is clickable', () => {
      const result = buildClickableIconAnnotation(makeParams());
      expect(result.captureevents).toBe(true);
    });

    it('should set borderpad to 6', () => {
      const result = buildClickableIconAnnotation(makeParams());
      expect(result.borderpad).toBe(6);
    });

    it('should set bgcolor to transparent', () => {
      const result = buildClickableIconAnnotation(makeParams());
      expect(result.bgcolor).toBe('rgba(0,0,0,0)');
    });

    it('should set font.family to FontAwesome', () => {
      const result = buildClickableIconAnnotation(makeParams());
      expect(result.font?.family).toBe('FontAwesome');
    });

    it('should set font.size to 8', () => {
      const result = buildClickableIconAnnotation(makeParams());
      expect(result.font?.size).toBe(8);
    });
  });

  describe('position parameters', () => {
    it('should set x, y from params', () => {
      const result = buildClickableIconAnnotation(makeParams({ arrowTipX: 10, arrowTipY: 20 }));
      expect(result.x).toBe(10);
      expect(result.y).toBe(20);
    });

    it('should set z (non-standard 3D property) from params', () => {
      const result = buildClickableIconAnnotation(makeParams({ arrowTipZ: 42 })) as AnnotationWithExtras;
      expect(result.z).toBe(42);
    });
  });

  describe('offset parameters', () => {
    it('should set ay from arrowYOffset', () => {
      const result = buildClickableIconAnnotation(makeParams({ arrowYOffset: -90 }));
      expect(result.ay).toBe(-90);
    });

    it('should default ax to 0 when arrowXOffset is omitted', () => {
      const params = makeParams();
      delete params.arrowXOffset;
      const result = buildClickableIconAnnotation(params);
      expect(result.ax).toBe(0);
    });

    it('should set ax from arrowXOffset when provided', () => {
      const result = buildClickableIconAnnotation(makeParams({ arrowXOffset: 15 }));
      expect(result.ax).toBe(15);
    });

    it('should set ax to 0 when arrowXOffset is explicitly 0', () => {
      const result = buildClickableIconAnnotation(makeParams({ arrowXOffset: 0 }));
      expect(result.ax).toBe(0);
    });
  });

  describe('color propagation', () => {
    it('should propagate color to arrowcolor', () => {
      const result = buildClickableIconAnnotation(makeParams({ color: '#ff0000' }));
      expect(result.arrowcolor).toBe('#ff0000');
    });

    it('should propagate color to bordercolor', () => {
      const result = buildClickableIconAnnotation(makeParams({ color: '#ff0000' }));
      expect(result.bordercolor).toBe('#ff0000');
    });

    it('should propagate color to font.color', () => {
      const result = buildClickableIconAnnotation(makeParams({ color: '#ff0000' }));
      expect(result.font?.color).toBe('#ff0000');
    });
  });

  describe('icon and data payload', () => {
    it('should set text from icon param', () => {
      const result = buildClickableIconAnnotation(makeParams({ icon: '&#xe4ba;' }));
      expect(result.text).toBe('&#xe4ba;');
    });

    it('should attach the data payload as-is', () => {
      const data = { type: 'cableModification', spanUuid: 'span-1', cableModificationUuid: 'mod-1' };
      const result = buildClickableIconAnnotation(makeParams({ data })) as AnnotationWithExtras;
      expect(result.data).toEqual(data);
    });

    it('should preserve all fields in an arbitrary data payload', () => {
      const data = { type: 'obstacle', obstacleUuid: 'obs-1', obstaclePositionIndex: 2 };
      const result = buildClickableIconAnnotation(makeParams({ data })) as AnnotationWithExtras;
      expect(result.data).toStrictEqual(data);
    });
  });

  describe('click capture', () => {
    it('should capture events explicitly, with or without arrow and hover label', () => {
      expect(buildClickableIconAnnotation(makeParams()).captureevents).toBe(true);
      expect(buildClickableIconAnnotation(makeStandaloneParams()).captureevents).toBe(true);
    });
  });

  describe('icon size and border padding', () => {
    it('should set font.size and borderpad from iconSize and borderPad when provided', () => {
      const result = buildClickableIconAnnotation(makeParams({ iconSize: 12, borderPad: 4 }));
      expect(result.font?.size).toBe(12);
      expect(result.borderpad).toBe(4);
    });

    it('should default to 8 and 6 when omitted', () => {
      const result = buildClickableIconAnnotation(makeParams());
      expect(result.font?.size).toBe(8);
      expect(result.borderpad).toBe(6);
    });
  });

  describe('hover label', () => {
    it('should not set a hover label by default', () => {
      const result = buildClickableIconAnnotation(makeParams()) as AnnotationWithExtras;
      expect(result.hovertext).toBeUndefined();
      expect(result.hoverlabel).toBeUndefined();
    });

    it('should show its text over the icon color', () => {
      const result = buildClickableIconAnnotation(
        makeParams({ color: '#ff0000', hover: { text: 'Cut strands', textColor: '#ffffff' } })
      ) as AnnotationWithExtras;
      expect(result.hovertext).toBe('Cut strands');
      expect(result.hoverlabel).toEqual({ bgcolor: '#ff0000', bordercolor: '#ff0000', font: { color: '#ffffff' } });
    });
  });

  describe('without arrow', () => {
    it('should hide the arrow and shift the icon above its anchor', () => {
      const result = buildClickableIconAnnotation(makeStandaloneParams({ yShift: 90 })) as AnnotationWithExtras;
      expect(result.showarrow).toBe(false);
      expect(result.yshift).toBe(90);
      expect(result.ax).toBeUndefined();
      expect(result.ay).toBeUndefined();
      expect(result.arrowcolor).toBeUndefined();
    });

    it('should keep the position, color and data payload', () => {
      const data = { type: 'cutStrands' };
      const result = buildClickableIconAnnotation(
        makeStandaloneParams({ arrowTipX: 10, arrowTipY: 20, arrowTipZ: 30, color: '#ff0000', data })
      ) as AnnotationWithExtras;
      expect([result.x, result.y, result.z]).toEqual([10, 20, 30]);
      expect(result.bordercolor).toBe('#ff0000');
      expect(result.data).toEqual(data);
    });
  });
});
