// The scripts told to the lesson page as the own rectangles of their blocks (script-boxes.js): the left edge, in both directions,
// in workspace units.
import {scriptBoxes, topBlocksOf} from '../../../src/components/kishufiya-guide/script-boxes.js';

const part = (x, y, width, height) => ({xy: {x, y}, size: {width, height}});
const block = (id, ...parts) => ({id, parts});
const real = (id, x, y, width, height, extra = {}) => ({
    id, width, height, getRelativeToSurfaceXY: () => ({x, y}), isShadow: () => false, getDescendants: () => [], ...extra
});

describe('script boxes', () => {
    test('left to right: x is the left edge', () => {
        expect(scriptBoxes([block('a', part(10, 20, 100, 50))], false)).toEqual([{id: 'a', rects: [{x: 10, y: 20, w: 100, h: 50}]}]);
    });
    test("right to left: a block's x is its right edge, the rect reaches left of it", () => {
        expect(scriptBoxes([block('a', part(300, 20, 100, 50))], true)).toEqual([{id: 'a', rects: [{x: 200, y: 20, w: 100, h: 50}]}]);
    });
    test("a script is the list of its blocks' rects: a narrow hat over a wide block stays two rects", () => {
        expect(scriptBoxes([block('a', part(0, 0, 60, 48), part(0, 48, 200, 48))], false)[0].rects).toEqual([
            {x: 0, y: 0, w: 60, h: 48}, {x: 0, y: 48, w: 200, h: 48}
        ]);
    });
    test('numbers are rounded to a tenth', () => {
        expect(scriptBoxes([block('a', part(0.123, 0.987, 10.04, 5.06))], false)).toEqual([{id: 'a', rects: [{x: 0.1, y: 1, w: 10, h: 5.1}]}]);
    });
    test('read from a workspace: every block of the script by its own size, shadows left out', () => {
        const shadow = real('sh', 5, 5, 9, 9, {isShadow: () => true});
        const second = real('b2', 1, 52, 80, 40);
        const top = real('b', 1, 2, 3, 4);
        top.getDescendants = () => [top, second, shadow];
        const ws = {getTopBlocks: () => [top]};
        expect(topBlocksOf(ws)).toEqual([block('b', part(1, 2, 3, 4), part(1, 52, 80, 40))]);
    });
    test('a lone block is a script of one block', () => {
        const lone = real('l', 0, 0, 100, 48);
        lone.getDescendants = () => [lone];
        expect(scriptBoxes(topBlocksOf({getTopBlocks: () => [lone]}), false)).toEqual([{id: 'l', rects: [{x: 0, y: 0, w: 100, h: 48}]}]);
    });
});
