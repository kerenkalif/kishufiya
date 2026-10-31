// The first script of an empty sprite has a place to drag to (2026-10-31: the very first hat showed no dashed outline, every
// later one did - findFreeSpot had nothing to measure under): the pure math (detect.js firstScriptSpot) and resolve with a
// stand-in workspace and document (the way stage-point.test.js and look-targets.test.js stand in for them).
//   npx jest test/unit/kishufiya-guide/first-script
import {FIRST_SCRIPT_PX, firstScriptSpot} from '../../../src/components/kishufiya-guide/detect.js';
import {resolve} from '../../../src/components/kishufiya-guide/targets.js';

const area = {left: 0, right: 550, top: 0, bottom: 600, width: 550, height: 600};

describe('where the first script goes', () => {
    test('a right-to-left editor: in from the top-right corner of the code area, where a dropped hat starts', () => {
        expect(firstScriptSpot({area, rtl: true})).toEqual({x: 550 - FIRST_SCRIPT_PX, y: FIRST_SCRIPT_PX});
    });
    test('a left-to-right editor: in from the top-left corner', () => {
        expect(firstScriptSpot({area, rtl: false})).toEqual({x: FIRST_SCRIPT_PX, y: FIRST_SCRIPT_PX});
    });
    test('clear of the edge: the margin is more than the guide keeps a drop from the area\'s edge (guide.js DROP_MARGIN 24)', () => {
        expect(FIRST_SCRIPT_PX).toBeGreaterThan(24);
    });
    test('no code area (none on the screen, or collapsed): no spot', () => {
        expect(firstScriptSpot({area: null, rtl: true})).toBeNull();
        expect(firstScriptSpot({area: {...area, width: 0}, rtl: true})).toBeNull();
    });
});

describe('resolve: a hat from the palette into an empty sprite', () => {
    const rect = r => ({...r, width: r.right - r.left, height: r.bottom - r.top});
    const el = r => ({getBoundingClientRect: () => rect(r)});
    // the whole workspace SVG; the palette's blocks (the flyout) on its right, as in a right-to-left editor
    const svg = el({left: 0, right: 800, top: 0, bottom: 600});
    const flyoutSvg = el({left: 550, right: 800, top: 0, bottom: 600});
    const hatRect = rect({left: 600, right: 700, top: 100, bottom: 140});
    const hat = {
        type: 'event_whenflagclicked',
        getSvgRoot: () => el(hatRect),
        nextConnection: {},
        previousConnection: null
    };
    let tops = [];
    const ws = {
        RTL: true,
        scale: 0.675,
        getParentSvg: () => svg,
        getFlyout: () => ({getWorkspace: () => ({getTopBlocks: () => [hat]}), svgGroup_: flyoutSvg, scrollTarget: 0}),
        getTopBlocks: () => tops,
        isDragging: () => false,
        getToolbox: () => null
    };
    const vm = {editingTarget: null, runtime: {getTargetForStage: () => null}};
    beforeAll(() => {
        global.window = {ScratchBlocks: {getMainWorkspace: () => ws}};
        global.document = {querySelector: () => null, querySelectorAll: () => [], activeElement: null};
    });
    test('no code yet: the hat in the palette, and a drop point in the code area\'s top-right, nothing to scroll to', () => {
        tops = [];
        expect(resolve({block: 'event_whenflagclicked', in: 'palette'}, vm))
            .toEqual({rect: hatRect, via: 'block', drop: {x: 550 - FIRST_SCRIPT_PX, y: FIRST_SCRIPT_PX}, anchor: null});
    });
    test('code there already: under its lowest script, as before (the first script\'s spot is only for an empty sprite)', () => {
        const script = {
            getRelativeToSurfaceXY: () => ({x: 0, y: 0}),
            getHeightWidth: () => ({height: 100, width: 100}),
            getSvgRoot: () => el({left: 300, right: 500, top: 50, bottom: 150})
        };
        tops = [script];
        const found = resolve({block: 'event_whenflagclicked', in: 'palette'}, vm);
        expect(found).toMatchObject({via: 'block', drop: {x: 500, y: 150 + (32 * 0.675)}});
        expect(found.anchor).toBe(script);
    });
});
