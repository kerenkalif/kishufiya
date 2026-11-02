// The code area's scroll rule (src/lib/kishufiya-scroll.js, platform decision 50).
//   npx jest test/unit/kishufiya-tidy
import {OVERFLOW_ROOM, SCROLL_PAD, scrollArea} from '../../../src/lib/kishufiya-scroll.js';
import {TOP_MARGIN} from '../../../src/lib/kishufiya-tidy-layout.js';

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
});
