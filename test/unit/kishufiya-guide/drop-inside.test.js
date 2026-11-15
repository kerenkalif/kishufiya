// A drawn drop outline lies inside the code area, where a released block is accepted (detect.js insideArea; the palette beside
// the area takes a block back, so a mark over it is one the child follows and fails).
//   npx jest test/unit/kishufiya-guide/drop-inside
import {insideArea} from '../../../src/components/kishufiya-guide/detect.js';

const area = {left: 100, right: 500, top: 50, bottom: 450};

describe('a drop outline kept to the code area', () => {
    test('inside: as it is', () => {
        const box = {left: 200, right: 300, top: 100, bottom: 144};
        expect(insideArea(box, area)).toEqual(box);
    });
    test('a block wider than the room left in the area is cut at its edge, not drawn over the palette', () => {
        expect(insideArea({left: 60, right: 180, top: 100, bottom: 144}, area)).toEqual({left: 100, right: 180, top: 100, bottom: 144});
        expect(insideArea({left: 450, right: 560, top: 100, bottom: 144}, area)).toEqual({left: 450, right: 500, top: 100, bottom: 144});
    });
    test('wholly outside: nothing is drawn', () => {
        expect(insideArea({left: 510, right: 600, top: 100, bottom: 144}, area)).toBeNull();
        expect(insideArea({left: 200, right: 300, top: 460, bottom: 500}, area)).toBeNull();
    });
    test('no code area: the box as it is', () => {
        const box = {left: 1, right: 2, top: 3, bottom: 4};
        expect(insideArea(box, null)).toBe(box);
    });
});
