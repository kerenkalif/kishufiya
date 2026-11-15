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

// What the editor REPORTS for the base (platform drop-frame.ts decides; the whole loop - report, decision, drawing, a block attaching - is tested
// there, test:editor-parity). Here only the reports and the scroll the editor does when told.
import {SNAP_RADIUS} from '../../../src/lib/kishufiya-tidy-layout.js';
import {scriptsScroller, scriptsScrollX, scriptsScrollY, attachOf, SCRIPTS_ID} from '../../../src/components/kishufiya-guide/detect.js';
describe('the code area reports its scroll and scrolls as the base asks', () => {
    const metrics = {viewTop: 300, contentTop: 100, viewHeight: 400, contentHeight: 1000, viewLeft: 50, contentLeft: 20, viewWidth: 600, contentWidth: 900};
    test('dropScroller: id scripts, the distance of the view from the content top and left, the most it can be', () => {
        expect(scriptsScroller(metrics)).toEqual({id: SCRIPTS_ID, scrollTop: 200, maxScrollTop: 600, scrollLeft: 30, maxScrollLeft: 300});
        const small = scriptsScroller({viewTop: 0, contentTop: 0, viewHeight: 500, contentHeight: 300, viewLeft: 0, contentLeft: 0, viewWidth: 500, contentWidth: 300});
        expect([small.maxScrollTop, small.maxScrollLeft]).toEqual([0, 0]);
    });
    test('guide-scroll top and left map to the workspace scroll, and back', () => {
        expect(scriptsScrollY(metrics, 200)).toBe(-300);
        expect(scriptsScrollY(metrics, 0)).toBe(-100);
        expect(scriptsScrollX(metrics, 30)).toBe(-50);
    });
});
describe('a dock target reports its attach range: Blockly snap radius at the zoom, and the point the block is held by (its middle)', () => {
    test('an RTL block 120 by 44 joining by its top right corner: held 60 left of the drop point and 22 down', () => {
        const drop = {x: 560, y: 330};
        const whole = dropBox({left: 0, right: 120, top: 0, bottom: 200}, drop, null);
        expect(attachOf(whole, drop, 48, 0.675)).toEqual({radius: 32.4, held: {x: -60, y: 22}});
    });
    test('no radius or no place: nothing is reported', () => {
        expect(attachOf(null, {x: 1, y: 1}, 48, 1)).toBeNull();
        expect(attachOf({left: 0, right: 10, top: 0, bottom: 10}, {x: 10, y: 0}, 48, 0)).toBeNull();
    });
});

// Parity with the platform: what this editor reports must equal the numbers the platform's decision is tested against, ATTACH_RULES.kishufiya
// in KidsTeachingPlatform src/lib/lesson/editor-parity.test.ts (radius 48 * 0.675 = 32.4, held {x: -60, y: 22}). Copied here on purpose:
// change them there and here together.
describe('attach report equals the platform ATTACH_RULES.kishufiya', () => {
    test('radius SNAP_RADIUS (48) times zoom 0.675, held 60 left of the drop point and 22 down', () => {
        expect(SNAP_RADIUS).toBe(48);
        const drop = {x: 560, y: 330};
        const whole = dropBox({left: 0, right: 120, top: 0, bottom: 200}, drop, null);
        const attach = attachOf(whole, drop, SNAP_RADIUS, 0.675);
        expect(attach.radius).toBeCloseTo(48 * 0.675, 1);
        expect(attach.held).toEqual({x: -60, y: 22});
    });
});
