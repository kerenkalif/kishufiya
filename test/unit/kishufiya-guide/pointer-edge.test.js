// The guide's arrow and ring at a target on the screen's edge, and the soft mark's colour (detect.js pointerPlace,
// ringInScreen, softMarkColours; pure, so tested here).
//   npx jest test/unit/kishufiya-guide/pointer-edge
import {pointerPlace, ringInScreen, softMarkColours} from '../../../src/components/kishufiya-guide/detect.js';

const screen = {width: 1000, height: 700};
const box = (left, top, width, height) => ({left, top, right: left + width, bottom: top + height});

describe('the arrow\'s side', () => {
    test('a target with room and no neighbour: as before, above it', () => {
        const put = pointerPlace({rect: box(400, 300, 100, 40), neighbours: [], screen, size: 34});
        expect(put.side).toBe('above');
        expect(put.top).toBe(300 - 34 - 6);
    });
    test('no room above: below it', () => {
        expect(pointerPlace({rect: box(400, 10, 100, 40), neighbours: [], screen, size: 34}).side).toBe('below');
    });
    test('a button at the bottom with its neighbour over it: not above (it covers the neighbour), the free side', () => {
        const target = box(20, 640, 120, 44);
        const over = box(20, 590, 120, 44); // "בחרו דמות" over "בחרו רקע"
        const put = pointerPlace({rect: target, neighbours: [over, target], screen, size: 34});
        expect(put.side).toBe('right');
        expect(put.left).toBe(140 + 6);
    });
    test('in a corner the arrow takes the side that is on the screen and off the neighbours', () => {
        const target = box(940, 650, 56, 44);
        const left = box(800, 650, 90, 44); // 10px of room between it and the target
        const above = box(940, 600, 56, 44);
        const put = pointerPlace({rect: target, neighbours: [left, above], screen, size: 34});
        expect(put.side).toBe('left');
        const arrow = box(put.left, put.top, 34, 34);
        for (const n of [left, above]) {
            expect(arrow.left < n.right && n.left < arrow.right && arrow.top < n.bottom && n.top < arrow.bottom).toBe(false);
        }
        expect(arrow.right).toBeLessThanOrEqual(screen.width);
        expect(arrow.bottom).toBeLessThanOrEqual(screen.height);
    });
    test('a box that touches the target (its own frame) is not a neighbour', () => {
        const target = box(400, 300, 100, 40);
        const frame = box(396, 296, 108, 48);
        expect(pointerPlace({rect: target, neighbours: [frame], screen, size: 34}).side).toBe('above');
    });
    test('nothing free: the default side, as before', () => {
        const target = box(400, 300, 100, 40);
        const walls = [box(0, 0, 1000, 296), box(0, 344, 1000, 356), box(0, 296, 396, 48), box(504, 296, 496, 48)];
        expect(pointerPlace({rect: target, neighbours: walls, screen, size: 34}).side).toBe('above');
    });
    test('a grown arrow (its size is its real size) is still kept off the neighbour', () => {
        const target = box(20, 640, 120, 44);
        const over = box(20, 560, 120, 70);
        expect(pointerPlace({rect: target, neighbours: [over], screen, size: 68}).side).not.toBe('above');
    });
    test('bounds (a column of categories) decide the default side', () => {
        const put = pointerPlace({rect: box(10, 120, 60, 50), neighbours: [], screen, size: 34, bounds: {top: 100, bottom: 600}});
        expect(put.side).toBe('below');
    });
});

describe('the ring inside the screen', () => {
    test('a target wholly off the screen: no ring', () => {
        expect(ringInScreen(box(1100, 100, 50, 30), screen, 4)).toEqual({ring: null, edge: []});
        expect(ringInScreen(box(100, -80, 50, 30), screen, 4)).toEqual({ring: null, edge: []});
    });
    test('a target away from the edge: 4px out on every side, no edge', () => {
        const {ring, edge} = ringInScreen(box(100, 100, 50, 30), screen, 4);
        expect(ring).toEqual({left: 96, right: 154, top: 96, bottom: 134});
        expect(edge).toEqual([]);
    });
    test('a button on the bottom edge: the ring stops at the screen, the side is told', () => {
        const {ring, edge} = ringInScreen(box(20, 656, 120, 44), screen, 4);
        expect(ring.bottom).toBe(700);
        expect(edge).toEqual(['bottom']);
    });
    test('a corner: both sides', () => {
        const {ring, edge} = ringInScreen(box(0, 0, 40, 40), screen, 4);
        expect([ring.left, ring.top]).toEqual([0, 0]);
        expect(edge).toEqual(['top', 'left']);
    });
});

describe('the soft mark\'s colour', () => {
    test('the platform\'s block colour: the line and its glows', () => {
        expect(softMarkColours('#e0b100')).toEqual({line: '#e0b100', glow: 'rgba(224, 177, 0, 0.65)', glowPoint: 'rgba(224, 177, 0, 0.8)', halo: 'rgba(224, 177, 0, 0.35)'});
    });
    test('a short hex is read too', () => {
        expect(softMarkColours('#fa0').line).toBe('#ffaa00');
    });
    test('none, or not a hex colour: null - the mark keeps guide.css\'s purple', () => {
        for (const bad of [undefined, null, '', 'red', '#12', 'url(x)', '#e0b100; x', 5]) expect(softMarkColours(bad)).toBeNull();
    });
});

// SPEC-editor-base 15.1 reserve-top: the px the base asks for, a whole number of pixels or nothing
import {reserveTopPx} from '../../../src/components/kishufiya-guide/detect.js';
describe('reserve-top px', () => {
    test('0 or more is kept, rounded', () => {
        expect(reserveTopPx(0)).toBe(0);
        expect(reserveTopPx(64)).toBe(64);
        expect(reserveTopPx(63.6)).toBe(64);
    });
    test('anything else is ignored', () => {
        for (const bad of [undefined, null, '64', -1, NaN, Infinity]) expect(reserveTopPx(bad)).toBeNull();
    });
});

// SPEC-editor-base 15.2: guide.css holds the fallback colours once; the message's colour is what guide.js sets
describe('mark colour for a ring', () => {
    test('a red or purple markColour gives the line and the glows', () => {
        expect(softMarkColours('#e53935').line).toBe('#e53935');
        expect(softMarkColours('#6a1b9a').glow).toBe('rgba(106, 27, 154, 0.65)');
    });
    test('guide.css keeps each fallback in one place', () => {
        const css = require('fs').readFileSync(require('path').join(__dirname, '../../../src/components/kishufiya-guide/guide.css'), 'utf8');
        expect(css.match(/--mark-fallback: #e53935/g)).toHaveLength(1);
        expect(css.match(/--mark-fallback: #6a1b9a/g)).toHaveLength(1);
        expect(css).not.toMatch(/border: [38]px solid #(e53935|6a1b9a)/);
    });
});

// review 28.11 (1, 4): the code area alone moves, the strip's px go out in code-area
import {reservedMetrics, codeAreaMessage} from '../../../src/components/kishufiya-guide/detect.js';
describe('reserve-top on the workspace metrics', () => {
    const m = {absoluteTop: 0, absoluteLeft: 120, viewHeight: 500, viewWidth: 600, toolboxWidth: 120, flyoutWidth: 120};
    test('the code area starts px lower and is px shorter; the sides (palette) stay', () => {
        const r = reservedMetrics(m, 64);
        expect(r).toMatchObject({absoluteTop: 64, viewHeight: 436, absoluteLeft: 120, toolboxWidth: 120, flyoutWidth: 120});
        expect(m.viewHeight).toBe(500);
    });
    test('0, or none: the metrics as they are', () => {
        expect(reservedMetrics(m, 0)).toBe(m);
        expect(reservedMetrics(m, -1)).toBe(m);
    });
});
describe('code-area message', () => {
    const rect = {left: 1, top: 80, width: 300, height: 400};
    test('carries reserved, and it is in the key', () => {
        const a = codeAreaMessage(rect, [], 64);
        expect(a.msg).toEqual({type: 'code-area', rect, avoid: [], own: true, reserved: 64});
        expect(a.key).not.toBe(codeAreaMessage(rect, [], 0).key);
    });
    test('none kept: no reserved field', () => {
        expect(codeAreaMessage(rect, [], 0).msg).toEqual({type: 'code-area', rect, avoid: [], own: true});
    });
});
