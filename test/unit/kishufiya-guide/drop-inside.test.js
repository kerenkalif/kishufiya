// The drop frame is decided once in the platform's base (drop-frame.ts, SPEC-editor-base 3.3); this editor REPORTS the box a dragged
// block would have (guide-at `dropRect`, unclipped), the code area as `accept`, and draws only what 'guide-frame' says.
//   npx jest test/unit/kishufiya-guide/drop-inside
import {dropBox, GHOST_ROW} from '../../../src/components/kishufiya-guide/detect.js';

describe('the box reported for a dragged block', () => {
    test('a block going to a drop point: its first row, joined by its top-right corner at the point, whole - never cut to an area', () => {
        const r = {left: 0, right: 120, top: 0, bottom: 200};
        expect(dropBox(r, {x: 560, y: 100}, null)).toEqual({left: 440, right: 560, top: 100, bottom: 100 + GHOST_ROW});
    });
    test('a short block is its own height', () => {
        expect(dropBox({left: 0, right: 80, top: 0, bottom: 30}, {x: 100, y: 10}, null)).toEqual({left: 20, right: 100, top: 10, bottom: 40});
    });
    test('a slot is the slot itself', () => {
        const slot = {left: 5, right: 50, top: 6, bottom: 30};
        expect(dropBox({left: 0, right: 80, top: 0, bottom: 30}, {x: 1, y: 1}, slot)).toBe(slot);
    });
});
