// A palette block under the palette's lower edge: the palette scrolls to bring it to the middle of its height, once
// (Keren, 2026-11-14: "קבע y" in the donuts, 1911x915). Stand-in workspace, flyout and document, as look-targets does.
//   npx jest test/unit/kishufiya-guide/palette-scroll
import {resetScrolls, resolve} from '../../../src/components/kishufiya-guide/targets.js';

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
    beforeEach(() => resetScrolls());

    test('a block under the lower edge: the palette scrolls so that it is in the middle, and nothing is ringed meanwhile', () => {
        const {calls} = setup(720);
        expect(resolve({block: 'looks_show', in: 'palette'}, null)).toEqual({missing: 'scrolling'});
        // block middle 740 -> container middle 400: 340px lower; scroll now 500px -> 840px, in workspace units / 0.5
        expect(calls).toEqual([840 / 0.5]);
    });

    test('a block cut by the lower edge (its middle is seen) scrolls too', () => {
        const {calls} = setup(680);
        expect(resolve({block: 'looks_show', in: 'palette'}, null)).toEqual({missing: 'scrolling'});
        expect(calls).toHaveLength(1);
    });

    test('a block seen is ringed and the palette is left alone', () => {
        const {calls} = setup(300);
        expect(resolve({block: 'looks_show', in: 'palette'}, null)).toMatchObject({via: 'block'});
        expect(calls).toEqual([]);
    });

    test('a block under the window\'s lower edge (a palette taller than the window) scrolls', () => {
        const {calls, state} = setup(850);
        global.window.innerHeight = 800;
        state.top = 850;
        expect(resolve({block: 'looks_show', in: 'palette'}, null)).toEqual({missing: 'scrolling'});
        expect(calls).toHaveLength(1);
    });
});
