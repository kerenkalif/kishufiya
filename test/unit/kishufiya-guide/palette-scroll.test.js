// A palette block under the palette's lower edge: the editor tells where it is and the palette's box and holds the mark back; the
// scroll itself is the base's decision (scroll-target.ts), done here on 'guide-scroll' (Keren, 2026-11-14: "קבע y" in the
// donuts, 1911x915). Stand-in workspace, flyout and document, as look-targets does.
//   npx jest test/unit/kishufiya-guide/palette-scroll
import {resolve, scrollContainer, paletteBlockBox} from '../../../src/components/kishufiya-guide/targets.js';

const rect = (top, bottom) => ({left: 0, right: 200, top, bottom, width: 200, height: bottom - top});
const PALETTE = {top: 100, bottom: 700}; // a palette 600 tall

// `blockTop`: where the block's row is on the screen now
const setup = blockTop => {
    const calls = [];
    const state = {top: blockTop};
    const block = {
        type: 'looks_show',
        getSvgRoot: () => ({getBoundingClientRect: () => rect(state.top, state.top + 40)}),
        nextConnection: null,
        previousConnection: {}
    };
    const flyout = {
        scrollTarget: null,
        svgGroup_: {getBoundingClientRect: () => rect(PALETTE.top, PALETTE.bottom)},
        scrollTo: pos => calls.push(pos),
        getWorkspace: () => ({
            getTopBlocks: () => [block],
            getMetrics: () => ({contentHeight: 3000, viewHeight: 600}),
            scrollY: -500,
            scale: 0.5
        })
    };
    const ws = {
        getFlyout: () => flyout,
        getToolbox: () => ({getSelectedItem: () => ({id_: 'looks'})}),
        getParentSvg: () => ({getBoundingClientRect: () => rect(100, 700)})
    };
    global.window = {ScratchBlocks: {getMainWorkspace: () => ws}, innerHeight: 900};
    global.document = {querySelector: () => ({getBoundingClientRect: () => rect(0, 50)}), activeElement: null};
    return {calls, state};
};

describe('palette targets', () => {
    test('a block under the lower edge: told with the palette box, not drawn', () => {
        setup(720);
        expect(resolve({block: 'looks_show', in: 'palette'}, null)).toMatchObject({
            via: 'block',
            scrolling: true,
            rect: {top: 720, bottom: 760},
            scroller: {id: 'palette', top: 100, bottom: 700, scrollTop: 500, maxScrollTop: 2400}
        });
    });

    test('a block cut by the lower edge is held back too', () => {
        setup(680);
        expect(resolve({block: 'looks_show', in: 'palette'}, null)).toMatchObject({scrolling: true});
    });

    test('a block in view is marked as before, with the palette box for the base', () => {
        const {calls} = setup(300);
        const found = resolve({block: 'looks_show', in: 'palette'}, null);
        expect(found).toMatchObject({via: 'block', scroller: {id: 'palette'}});
        expect(found.scrolling).toBeUndefined();
        expect(calls).toEqual([]);
    });

    test('a block under the window lower edge (a palette taller than the window) is held back', () => {
        setup(850);
        global.window.innerHeight = 800;
        expect(resolve({block: 'looks_show', in: 'palette'}, null)).toMatchObject({scrolling: true});
    });

    test('guide-scroll scrolls the palette: screen px to the flyout workspace units, never 0', () => {
        const {calls} = setup(720);
        scrollContainer('palette', 840);
        scrollContainer('palette', 0);
        expect(calls).toEqual([840 / 0.5, 1]);
    });
});

// The palette as scratch-blocks really is: a block wholly out of its view is not drawn (intersection_observer.js sets display:none on
// its group), so its group has no box. In a low window (a laptop: 1366x768, 1280x720, Windows scaling) "קבע y" is there, and the
// editor said "not in view of this category" and pointed at the category for ever (Keren, 2026-11-17). Whatever the palette's height.
describe('a palette block that is not drawn', () => {
    const SCALE = 0.675;
    const BLOCK = {x: 358, y: 952, width: 150, height: 56}; // "קבע y" in "תנועה", in the palette's own units
    // `height`: the palette's height on the screen; `scrollY`: the palette's scroll (0 or less)
    const low = (height, scrollY = 0, rtl = true) => {
        const area = {left: 1064, right: 1315, top: 93, bottom: 93 + height, width: 251, height};
        const top = area.top + scrollY + (BLOCK.y * SCALE);
        const bottom = top + (BLOCK.height * SCALE);
        // as scratch-blocks: drawn only when some of it is in the palette's view
        const drawn = () => bottom > area.top && top < area.bottom;
        const block = {
            type: 'motion_sety',
            getSvgRoot: () => ({getBoundingClientRect: () => (drawn() ?
                {left: 1100, right: 1201, top, bottom, width: 101, height: bottom - top} :
                {left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0})}),
            getRelativeToSurfaceXY: () => ({x: BLOCK.x, y: BLOCK.y}),
            getHeightWidth: () => ({width: BLOCK.width, height: BLOCK.height}),
            nextConnection: {},
            previousConnection: {}
        };
        const flyout = {
            scrollTarget: null,
            svgGroup_: {getBoundingClientRect: () => area},
            getWorkspace: () => ({
                getTopBlocks: () => [block],
                getMetrics: () => ({contentHeight: 6107, viewHeight: height}),
                scrollX: 0,
                scrollY,
                scale: SCALE,
                RTL: rtl
            })
        };
        const ws = {
            getFlyout: () => flyout,
            getToolbox: () => ({getSelectedItem: () => ({id_: 'motion'})}),
            getParentSvg: () => ({getBoundingClientRect: () => area})
        };
        global.window = {ScratchBlocks: {getMainWorkspace: () => ws}, innerHeight: area.bottom};
        global.document = {querySelector: () => ({getBoundingClientRect: () => rect(93, 138)}), activeElement: null};
        return {top, bottom, drawn: drawn()};
    };

    test('whatever the height of the window: under the palette it is told with its place and the palette box, never its category', () => {
        for (const height of [250, 300, 372, 445, 520, 600]) {
            const at = low(height);
            expect(at.drawn).toBe(false);
            const found = resolve({block: 'motion_sety', in: 'palette'}, null);
            expect(found).toMatchObject({via: 'block', scrolling: true, scroller: {id: 'palette', top: 93, bottom: 93 + height}});
            expect(found.rect.top).toBeCloseTo(at.top);
            expect(found.rect.bottom).toBeCloseTo(at.bottom);
        }
    });

    test('above the palette (the child scrolled past it) it is told too', () => {
        const at = low(445, -2454);
        expect(at.drawn).toBe(false);
        const found = resolve({block: 'motion_sety', in: 'palette'}, null);
        expect(found).toMatchObject({via: 'block', scrolling: true});
        expect(found.rect.bottom).toBeLessThan(93);
    });

    test('in a high window it is drawn, and marked where it is drawn', () => {
        const at = low(800);
        expect(at.drawn).toBe(true);
        const found = resolve({block: 'motion_sety', in: 'palette'}, null);
        expect(found).toMatchObject({via: 'block', rect: {left: 1100, width: 101}});
        expect(found.scrolling).toBeUndefined();
    });

    test('its box from the palette own numbers: x is the right edge in a right-to-left palette', () => {
        const area = {left: 1000, top: 100};
        const of = {area, scrollX: 0, scrollY: -50, scale: 0.5, x: 300, y: 400, width: 100, height: 40};
        expect(paletteBlockBox({...of, rtl: true})).toEqual({left: 1100, top: 250, width: 50, height: 20, right: 1150, bottom: 270});
        expect(paletteBlockBox({...of, rtl: false})).toEqual({left: 1150, top: 250, width: 50, height: 20, right: 1200, bottom: 270});
    });
});
