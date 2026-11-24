import {drawnBoxes} from '../../../src/components/kishufiya-guide/detect.js';

describe('drawnBoxes: what the guide drew by the target, for the bubble to keep off', () => {
    const box = (left, top, width = 10, height = 10) => ({left, top, width, height});
    test('every drawn thing is a box of its own', () => {
        const out = drawnBoxes({tag: box(1, 2), drop: box(5, 6), choice: box(7, 8), label: box(9, 10)});
        expect(out).toHaveLength(4);
        expect(out[0]).toEqual(box(1, 2));
    });
    test('what is not drawn, or has no size, is left out', () => {
        expect(drawnBoxes({tag: null, drop: box(1, 1, 0, 5), choice: null, label: null})).toEqual([]);
        expect(drawnBoxes({tag: box(1, 1), choice: null})).toEqual([box(1, 1)]);
    });
    test('a box is copied, never the editor\'s own object', () => {
        const tag = box(1, 1);
        expect(drawnBoxes({tag})[0]).not.toBe(tag);
    });
    test('the arrow is no part of it: it grows, and every step would be a new report', () => {
        expect(drawnBoxes({tag: box(1, 1), arrow: box(3, 4)})).toEqual([box(1, 1)]);
    });
});
