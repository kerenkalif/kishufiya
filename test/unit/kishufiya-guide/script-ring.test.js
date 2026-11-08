// A whole script as a target (platform point-help, 2026-11-08: a pointing question's help after the second different wrong
// block is "the block is in this script"): resolve gives the box of the script's top block's SVG group - every block under it,
// in its mouths and in its inputs - and the guide rings it alone (detect.js ringAlone). A stand-in workspace and document, as in
// first-script.test.js.
//   npx jest test/unit/kishufiya-guide/script-ring
import {resolve} from '../../../src/components/kishufiya-guide/targets.js';
import {onTheWay, ringAlone} from '../../../src/components/kishufiya-guide/detect.js';

const box = (left, top, right, bottom) => ({left, top, right, bottom, width: right - left, height: bottom - top});
const el = r => ({getBoundingClientRect: () => r});
const covers = (outer, inner) =>
    outer.left <= inner.left && outer.right >= inner.right && outer.top <= inner.top && outer.bottom >= inner.bottom;

// One script as scratch-blocks draws it (screen pixels): a hat, an "if" under it with a "touching?" block in its condition (its
// menu a shadow), a "turn" in its mouth that is wider than the "if" itself, and a "say" under the "if". The hat's SVG group holds
// all of them, so its box is the whole script. Another script beside it, of its own.
const script = box(300, 100, 560, 292);
const rows = {
    hat: box(300, 100, 460, 140),
    ifThen: box(300, 132, 480, 260),
    touching: box(360, 140, 470, 170),
    turn: box(316, 172, 560, 212),
    say: box(300, 252, 420, 292)
};
const blocks = {};
const block = (id, type, group, more) => {
    blocks[id] = {
        id,
        type,
        isShadow: () => false,
        getParent: () => null,
        svgPath_: el(rows[id] || group),
        getSvgRoot: () => el(group),
        getRootBlock: () => blocks.hat,
        ...more
    };
    return blocks[id];
};
block('hat', 'event_whenflagclicked', script);
block('ifThen', 'control_if', box(300, 132, 560, 292));
block('touching', 'sensing_touchingobject', rows.touching);
block('menu', 'sensing_touchingobjectmenu', box(380, 144, 460, 166), {
    isShadow: () => true,
    getParent: () => blocks.touching
});
block('turn', 'motion_turnright', rows.turn);
block('say', 'looks_say', rows.say);
// the other script: a key's hat and a move under it
const other = box(600, 100, 800, 200);
block('keyHat', 'event_whenkeypressed', other, {getRootBlock: () => blocks.keyHat});
block('move', 'motion_movesteps', box(600, 140, 760, 180), {getRootBlock: () => blocks.keyHat});
// a script out of the code area's view: scratch-blocks does not draw it (its IntersectionObserver), so it has no box
block('farHat', 'event_whenthisspriteclicked', box(0, 0, 0, 0), {getRootBlock: () => blocks.farHat});
block('farTurn', 'motion_turnleft', box(0, 0, 0, 0), {getRootBlock: () => blocks.farHat});

const ws = {
    RTL: true,
    scale: 0.675,
    getBlockById: id => blocks[id] || null,
    getAllBlocks: () => Object.values(blocks),
    getParentSvg: () => el(box(0, 0, 900, 700)),
    getFlyout: () => null,
    getToolbox: () => null
};
const vm = open => ({editingTarget: {getName: () => open}, runtime: {getTargetForStage: () => null}});
const tile = box(950, 500, 1010, 560);
let tiles = [];

beforeEach(() => {
    global.window = {ScratchBlocks: {getMainWorkspace: () => ws}};
    global.document = {
        querySelector: () => null,
        querySelectorAll: selector => (selector.includes('sprite-selector-item_sprite-name_') ? tiles : []),
        activeElement: null
    };
    tiles = [];
});

describe('resolve: a whole script', () => {
    test('a block in it: the whole script, from its top block down - not the block, not its top block alone', () => {
        const found = resolve({blockId: 'turn', in: 'code', sprite: 'Cat', script: true}, vm('Cat'));
        expect(found).toEqual({rect: script, via: 'script', block: blocks.hat});
        for (const row of Object.values(rows)) expect(covers(found.rect, row)).toBe(true);
        expect(found.rect).not.toEqual(rows.turn);
        expect(found.rect).not.toEqual(rows.hat);
        // only its own script
        expect(covers(found.rect, other)).toBe(false);
    });
    test('the same script from any of its blocks: the top block, a block in a condition, a value (a shadow), by opcode', () => {
        for (const blockId of ['hat', 'ifThen', 'touching', 'menu', 'say']) {
            expect(resolve({blockId, in: 'code', script: true}, vm('Cat'))).toEqual({rect: script, via: 'script', block: blocks.hat});
        }
        expect(resolve({block: 'motion_turnright', in: 'code', script: true}, vm('Cat')))
            .toEqual({rect: script, via: 'script', block: blocks.hat});
        expect(resolve({blockId: 'move', in: 'code', script: true}, vm('Cat')))
            .toEqual({rect: other, via: 'script', block: blocks.keyHat});
    });
    test('without script: true a block of the code is as before - its own row, via block', () => {
        expect(resolve({blockId: 'turn', in: 'code', sprite: 'Cat'}, vm('Cat'))).toEqual({rect: rows.turn, via: 'block', block: blocks.turn});
        expect(resolve({blockId: 'hat', in: 'code'}, vm('Cat'))).toEqual({rect: rows.hat, via: 'block', block: blocks.hat});
    });
    test('a script out of the code area\'s view: its top block, for the guide to scroll to (as for a block)', () => {
        expect(resolve({blockId: 'farTurn', in: 'code', script: true}, vm('Cat'))).toEqual({offscreen: true, block: blocks.farHat});
    });
    test('the way to it is as for a block: its sprite\'s tile while another sprite is open, ringed as on the way', () => {
        tiles = [{textContent: 'Cat', closest: () => el(tile)}];
        const target = {blockId: 'turn', in: 'code', sprite: 'Cat', script: true};
        expect(resolve(target, vm('Dog'))).toEqual({rect: tile, via: 'sprite'});
        expect(onTheWay(target, 'sprite')).toBe(true);
        tiles = [];
        expect(resolve(target, vm('Dog'))).toEqual({missing: 'sprite'});
    });
    test('no such block in the open sprite\'s code: not-in-code', () => {
        expect(resolve({blockId: 'gone', in: 'code', script: true}, vm('Cat'))).toEqual({missing: 'not-in-code'});
        expect(resolve({block: 'pen_clear', in: 'code', script: true}, vm('Cat'))).toEqual({missing: 'not-in-code'});
    });
});

describe('what comes with the ring', () => {
    test('a whole script: the ring alone - no arrow, no words, no louder ring', () => {
        expect(ringAlone('script')).toBe(true);
    });
    test('every other target keeps its arrow and its words', () => {
        const others = ['block', 'field', 'category', 'ui', 'sprite', 'library', 'library-tag', 'search', 'stage-sprite',
            'stage-point', null, undefined];
        for (const via of others) expect(ringAlone(via)).toBe(false);
    });
});
