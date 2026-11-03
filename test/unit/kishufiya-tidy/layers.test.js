// The stage order that decides when a layer click is a change to save (src/lib/kishufiya-layers.js).
//   npx jest test/unit/kishufiya-tidy
import {layerOrderChanged, stageOrder} from '../../../src/lib/kishufiya-layers.js';

describe('stageOrder', () => {
    test('the sprites back to front, whatever order the list comes in', () => {
        expect(stageOrder([{id: 'a', layer: 3}, {id: 'b', layer: 1}, {id: 'c', layer: 2}])).toBe('b,c,a');
    });
    test('no sprites: empty', () => {
        expect(stageOrder([])).toBe('');
    });
    test('does not reorder the list it is given', () => {
        const entries = [{id: 'a', layer: 2}, {id: 'b', layer: 1}];
        stageOrder(entries);
        expect(entries[0].id).toBe('a');
    });
});

describe('layerOrderChanged', () => {
    test('same order: no change', () => {
        expect(layerOrderChanged('b,a', 'b,a')).toBe(false);
    });
    test('a sprite sent to the back: a change', () => {
        expect(layerOrderChanged('b,a', 'a,b')).toBe(true);
    });
    test('no baseline yet: no answer, so no change', () => {
        expect(layerOrderChanged(null, 'a,b')).toBe(false);
    });
});
