// The scripts told to the lesson page as boxes (script-boxes.js): the left edge, in both directions, in workspace units.
import {scriptBoxes, topBlocksOf} from '../../../src/components/kishufiya-guide/script-boxes.js';

const block = (id, x, y, width, height) => ({id, xy: {x, y}, size: {width, height}});

describe('script boxes', () => {
    test('left to right: x is the left edge', () => {
        expect(scriptBoxes([block('a', 10, 20, 100, 50)], false)).toEqual([{id: 'a', x: 10, y: 20, w: 100, h: 50}]);
    });
    test('right to left: a block\'s x is its right edge, the box reaches left of it', () => {
        expect(scriptBoxes([block('a', 300, 20, 100, 50)], true)).toEqual([{id: 'a', x: 200, y: 20, w: 100, h: 50}]);
    });
    test('numbers are rounded to a tenth', () => {
        expect(scriptBoxes([block('a', 0.123, 0.987, 10.04, 5.06)], false)).toEqual([{id: 'a', x: 0.1, y: 1, w: 10, h: 5.1}]);
    });
    test('read from a workspace', () => {
        const ws = {getTopBlocks: () => [{id: 'b', getRelativeToSurfaceXY: () => ({x: 1, y: 2}), getHeightWidth: () => ({width: 3, height: 4})}]};
        expect(topBlocksOf(ws)).toEqual([block('b', 1, 2, 3, 4)]);
    });
});
