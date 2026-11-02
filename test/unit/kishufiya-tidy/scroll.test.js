// The code area's scroll rule (src/lib/kishufiya-scroll.js, platform decision 50).
//   npx jest test/unit/kishufiya-tidy
import {OVERFLOW_ROOM, SCROLL_PAD, scrollArea} from '../../../src/lib/kishufiya-scroll.js';
import {BOTTOM_BAND, COLUMNS_GROW_TOWARD, TOP_MARGIN, layoutScripts} from '../../../src/lib/kishufiya-tidy-layout.js';

const view = {left: 0, top: 0, width: 500, height: 600};
const pad = {left: SCROLL_PAD, right: SCROLL_PAD, top: TOP_MARGIN, bottom: SCROLL_PAD};

describe('scrollArea', () => {
    test('nothing overflowing: the area is the view, no extra room', () => {
        const a = scrollArea({left: 100, top: TOP_MARGIN, right: 300, bottom: 300}, view, pad);
        expect(a).toEqual({left: 0, top: 0, width: 500, height: 600});
    });
    test('no blocks: the view', () => {
        expect(scrollArea(null, view, pad)).toEqual({left: 0, top: 0, width: 500, height: 600});
    });
    test('content taller than the view: OVERFLOW_ROOM past the bottom', () => {
        const a = scrollArea({left: 100, top: TOP_MARGIN, right: 300, bottom: 900}, view, pad);
        expect(a.height).toBeGreaterThan(900);
        expect(a.top + a.height).toBe(900 + SCROLL_PAD + OVERFLOW_ROOM);
        expect(a.width).toBe(500);
    });
    test('content wider than the view: OVERFLOW_ROOM past the far side (left in RTL)', () => {
        const a = scrollArea({left: -400, top: TOP_MARGIN, right: 300, bottom: 300}, view, pad, 'left');
        expect(a.left).toBe(-400 - SCROLL_PAD - OVERFLOW_ROOM);
        expect(a.height).toBe(600);
        const b = scrollArea({left: 100, top: TOP_MARGIN, right: 900, bottom: 300}, view, pad, 'right');
        expect(b.left + b.width).toBe(900 + SCROLL_PAD + OVERFLOW_ROOM);
    });
    test('the view is always inside the area', () => {
        const a = scrollArea({left: 100, top: 0, right: 200, bottom: 100}, {left: 5000, top: 5000, width: 500, height: 600}, pad);
        expect(a.left).toBeLessThanOrEqual(5000);
        expect(a.left + a.width).toBeGreaterThanOrEqual(5500);
    });
    test('content within BOTTOM_BAND of the view bottom counts as overflowing: the bar and the room come', () => {
        const edge = 600 - BOTTOM_BAND;
        expect(scrollArea({left: 100, top: TOP_MARGIN, right: 300, bottom: edge}, view, pad).height).toBe(600);
        const a = scrollArea({left: 100, top: TOP_MARGIN, right: 300, bottom: edge + 1}, view, pad);
        expect(a.height).toBe(edge + 1 + SCROLL_PAD + OVERFLOW_ROOM);
    });
    test('what tidy leaves needs no bar, and no more room than the band when one more block lands', () => {
        const scripts = Array.from({length: 9}, () => ({width: 100, height: 150}));
        const {positions} = layoutScripts(scripts, {width: 500, height: 600});
        const bottoms = positions.map((p, i) => p.top + scripts[i].height);
        const a = scrollArea({left: 0, top: TOP_MARGIN, right: 300, bottom: Math.max(...bottoms)}, view, pad);
        expect(a.height).toBe(600);
    });
    test('blocks at the view top edge need no bar for the top pad', () => {
        const a = scrollArea({left: 100, top: 0, right: 300, bottom: 200}, view, pad);
        expect(a.top).toBe(0);
        expect(a.height).toBe(600);
    });
    test('a single column close to the palette needs no bar for the pad on that side', () => {
        const narrow = {left: 0, top: 0, width: 280, height: 600};
        const a = scrollArea({left: 100, top: TOP_MARGIN, right: 270, bottom: 200}, narrow, {...pad, right: 10});
        expect(a.width).toBe(280);
    });
    test('room on the width goes to the side the layout grows to', () => {
        expect(COLUMNS_GROW_TOWARD).toBe('left');
        const wide = {left: -400, top: TOP_MARGIN, right: 300, bottom: 300};
        expect(scrollArea(wide, view, pad).left).toBe(-400 - SCROLL_PAD - OVERFLOW_ROOM);
        const {positions} = layoutScripts([{width: 300, height: 100}, {width: 300, height: 500}], {width: 500, height: 600});
        expect(positions[1].right).toBeGreaterThan(positions[0].right); // the second column is farther from the right edge: to the left
    });
});
