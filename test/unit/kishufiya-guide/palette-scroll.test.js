// A palette block under the palette's lower edge: the editor tells where it is and the palette's box and holds the mark back; the
// scroll itself is the base's decision (scroll-target.ts), done here on 'guide-scroll' (Keren, 2026-11-14: "קבע y" in the
// donuts, 1911x915). Stand-in workspace, flyout and document, as look-targets does.
//   npx jest test/unit/kishufiya-guide/palette-scroll
import {resolve, scrollContainer} from '../../../src/components/kishufiya-guide/targets.js';

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
