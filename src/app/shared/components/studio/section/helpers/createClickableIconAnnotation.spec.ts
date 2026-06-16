import { describe, it, expect } from 'vitest';
import { buildClickableIconAnnotation } from './createClickableIconAnnotation';
import { ClickableIconAnnotationParams } from './createClickableIconAnnotation.interfaces';

type AnnotationWithExtras = ReturnType<typeof buildClickableIconAnnotation> & {
  z?: number;
  data?: Record<string, unknown>;
};

const makeParams = (overrides: Partial<ClickableIconAnnotationParams> = {}): ClickableIconAnnotationParams => ({
  arrowTipX: 1,
  arrowTipY: 2,
  arrowTipZ: 3,
  icon: '&#xf5cd;',
  color: '#4A355A',
  arrowYOffset: -50,
  data: { type: 'spanLoad', supportUuid: 'uuid-1' },
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
});
