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

// The code area's scroll the base asks for (platform drop-frame.ts decideDrop: dockShift + scrollForDock, mirrored here as the protocol says).
import {scriptsScroller, scriptsScrollY, SCRIPTS_ID} from '../../../src/components/kishufiya-guide/detect.js';
const dockShift = (n, a) => {
    if (n.height > a.height) return 0;
    if (n.top < a.top) return Math.round(a.top - n.top);
    const over = n.top + n.height - (a.top + a.height);
    return over > 0 ? -Math.round(over) : 0;
};
describe('the code area reports its scroll and scrolls as the base asks', () => {
    const metrics = {viewTop: 300, contentTop: 100, viewHeight: 400, contentHeight: 1000};
    test('dropScroller: id scripts, the view\'s distance from the content top, the most it can be', () => {
        expect(scriptsScroller(metrics)).toEqual({id: SCRIPTS_ID, scrollTop: 200, maxScrollTop: 600});
        expect(scriptsScroller({viewTop: 0, contentTop: 0, viewHeight: 500, contentHeight: 300}).maxScrollTop).toBe(0);
    });
    test('guide-scroll top maps to the workspace scrollY, and back', () => {
        expect(scriptsScrollY(metrics, 200)).toBe(-300);
        expect(scriptsScrollY(metrics, 0)).toBe(-100);
    });
    test('an RTL ghost (right edge at the drop point) protruding below the code area: scrolling moves the whole frame inside', () => {
        const accept = {left: 100, top: 50, width: 500, height: 300};
        const r = {left: 0, right: 120, top: 0, bottom: 200};
        const drop = {x: 560, y: 330};
        const frame = dropBox(r, drop, null); // 440..560, 330..374: 24px below the area
        const natural = {left: frame.left, top: frame.top, width: frame.right - frame.left, height: frame.bottom - frame.top};
        const shift = dockShift(natural, accept);
        expect(shift).toBe(-24);
        const s = scriptsScroller({viewTop: 400, contentTop: 100, viewHeight: 300, contentHeight: 1000});
        const to = Math.max(0, Math.min(s.maxScrollTop, Math.round(s.scrollTop - shift)));
        // the workspace content moves by `shift`: scrollY goes from -(contentTop+scrollTop) to -(contentTop+to)
        const moved = scriptsScrollY({contentTop: 100}, to) - scriptsScrollY({contentTop: 100}, s.scrollTop);
        expect(moved).toBe(shift);
        const after = {top: natural.top + moved, bottom: natural.top + moved + natural.height};
        expect(after.top).toBeGreaterThanOrEqual(accept.top);
        expect(after.bottom).toBeLessThanOrEqual(accept.top + accept.height);
        expect(natural.left).toBeGreaterThanOrEqual(accept.left); // RTL: the left side stays off the flyout's side
    });
});
