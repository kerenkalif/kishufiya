// K12 (2026-10-28): what the guide tells the lesson the child did - the pure parts (detect.js).
//   npx jest test/unit/kishufiya-guide
import {categoryOf} from '../../../src/components/kishufiya-guide/targets.js';
import {coveredBy, forwardedKey, gameHeard, gameKey, libraryMissing, onTheWay, quietReports, samplePoints, spriteOnStage, typing} from '../../../src/components/kishufiya-guide/detect.js';

describe('keys', () => {
    test('the game gets the key as scratch-gui gives it', () => {
        expect(gameKey({key: 'ArrowRight', keyCode: 39})).toEqual({key: 'ArrowRight', keyCode: 39});
        expect(gameKey({key: 'Dead', keyCode: 65})).toEqual({key: 65, keyCode: 65});
    });
    test('scratch-gui itself passes only a key pressed on the page: a focused button or tab is ours to pass', () => {
        const body = {tagName: 'BODY'};
        const doc = {body};
        expect(gameHeard(doc, doc)).toBe(true);
        expect(gameHeard(body, doc)).toBe(true);
        expect(gameHeard({tagName: 'BUTTON'}, doc)).toBe(false);
    });
    test('a box being typed into is not a key press', () => {
        expect(typing({tagName: 'INPUT'})).toBe(true);
        expect(typing({tagName: 'DIV', isContentEditable: true})).toBe(true);
        expect(typing({tagName: 'BUTTON'})).toBe(false);
        expect(typing(null)).toBe(false);
    });
    test('a key from the lesson (the focus was there): the game gets it, the lesson is told back on keydown', () => {
        expect(forwardedKey({key: 'ArrowUp', code: 'ArrowUp', keyCode: 38, down: true}, false)).toEqual({
            io: {key: 'ArrowUp', keyCode: 38, isDown: true},
            tell: {type: 'key', key: 'ArrowUp', code: 'ArrowUp'}
        });
        expect(forwardedKey({key: 'ArrowUp', code: 'ArrowUp', keyCode: 38, down: false}, false)).toEqual({
            io: {key: 'ArrowUp', keyCode: 38, isDown: false},
            tell: null
        });
    });
    test('...a keyup even while frozen: a key let go of never stays held in the game (K12 review)', () => {
        expect(forwardedKey({key: 'ArrowUp', keyCode: 38, down: false}, true)).toEqual({
            io: {key: 'ArrowUp', keyCode: 38, isDown: false},
            tell: null
        });
    });
    test('...no keydown while frozen, not a repeat, not without a key', () => {
        expect(forwardedKey({key: ' ', keyCode: 32, down: true}, true)).toBe(null);
        expect(forwardedKey({key: ' ', keyCode: 32, down: true, repeat: true}, false)).toBe(null);
        expect(forwardedKey({key: '', down: true}, false)).toBe(null);
        expect(forwardedKey(null, false)).toBe(null);
    });
});

describe('a sprite on the stage', () => {
    const stage = {width: 480, height: 360};
    const canvas = {left: 100, top: 50, width: 240, height: 180}; // half size
    test('visible: its bounds on the screen', () => {
        const on = spriteOnStage({visible: true, bounds: {left: -20, right: 20, top: 10, bottom: -10}, stage, canvas});
        expect(on.rect).toEqual({left: 100 + 110, right: 100 + 130, top: 50 + 85, bottom: 50 + 95});
    });
    test('half off the stage: the part on it', () => {
        const on = spriteOnStage({visible: true, bounds: {left: 220, right: 300, top: 10, bottom: -10}, stage, canvas});
        expect(on.rect.right).toBe(100 + 240);
        expect(on.rect.left).toBe(100 + 230);
    });
    test('hidden, a ghost of 100, or wholly off the stage: cannot be clicked, and says why', () => {
        expect(spriteOnStage({visible: false, bounds: {left: 0, right: 1, top: 1, bottom: 0}, stage, canvas})).toEqual({missing: 'hidden'});
        expect(spriteOnStage({visible: true, ghost: 100, bounds: {left: 0, right: 1, top: 1, bottom: 0}, stage, canvas})).toEqual({missing: 'hidden'});
        expect(spriteOnStage({visible: true, bounds: {left: 300, right: 340, top: 10, bottom: -10}, stage, canvas})).toEqual({missing: 'offstage'});
        expect(spriteOnStage({visible: true, bounds: null, stage, canvas})).toEqual({missing: 'offstage'});
    });
    test('the stage hidden comes first - never "the sprite is hidden" then', () => {
        const bounds = {left: 0, right: 1, top: 1, bottom: 0};
        expect(spriteOnStage({visible: true, bounds, stage, canvas: null})).toEqual({missing: 'stage-hidden'});
        expect(spriteOnStage({visible: false, bounds, stage, canvas: {left: 0, top: 0, width: 0, height: 0}})).toEqual({missing: 'stage-hidden'});
    });
    test('covered: another sprite on top at every point asked, none of it its own', () => {
        expect(samplePoints({left: 0, right: 100, top: 0, bottom: 40})[0]).toEqual({x: 50, y: 20});
        expect(samplePoints({left: 0, right: 100, top: 0, bottom: 40})).toHaveLength(5);
        expect(coveredBy([3, 3, 3, 3, 3], 5)).toBe(3);
        expect(coveredBy([3, 5, -1, 3, 3], 5)).toBe(null); // a part of it shows: it can be clicked there
        expect(coveredBy([-1, -1, -1, -1, -1], 5)).toBe(null); // nothing there: its transparent corners
        expect(coveredBy([-1, 4, -1, -1, -1], 5)).toBe(4);
    });
});

describe('a library item not ringed', () => {
    test('the library closed: its button', () => {
        expect(libraryMissing({open: false, search: false, name: 'Cat'})).toBe('library');
    });
    test('open, no search box: not in it - never its button behind the open library (the K11 loop)', () => {
        expect(libraryMissing({open: true, search: false, name: 'Cat'})).toBe('not-in-library');
    });
    test('open with a search box: searched for, until the whole name is typed and still nothing', () => {
        expect(libraryMissing({open: true, search: true, searched: '', name: 'Cat'})).toBe(null);
        expect(libraryMissing({open: true, search: true, searched: 'Ca', name: 'Cat'})).toBe(null);
        expect(libraryMissing({open: true, search: true, searched: ' cat ', name: 'Cat'})).toBe('not-in-library');
    });
});

describe('a palette block out of view: its category', () => {
    test('every extension a lesson may add (add_extension) has its category, translate too', () => {
        for (const id of ['pen', 'music', 'videoSensing', 'text2speech', 'translate']) {
            expect(categoryOf(`${id}_someBlock`)).toBe(id);
        }
        expect(categoryOf('translate_getTranslate')).toBe('translate');
        expect(categoryOf('data_setvariableto')).toBe('variables');
        expect(categoryOf('nothing_here')).toBe(null);
    });
});

describe('a quiet guide (levels 2-3) says only what the child can act on', () => {
    test('covered, hidden, the stage hidden, the focus in a box, a library item', () => {
        for (const reason of ['covered', 'hidden', 'stage-hidden', 'typing', 'library', 'not-in-library']) {
            expect(quietReports(reason)).toBe(true);
        }
    });
    test('not a block not built yet, out of view, or the palette scrolling: the usual state there (K12 review)', () => {
        for (const reason of ['offscreen', 'palette', 'scrolling', 'not-in-code', 'not-in-palette', 'no-field']) {
            expect(quietReports(reason)).toBe(false);
        }
    });
});

describe('script-ran (platform K17)', () => {
    const {gameState, scriptRan} = require('../../../src/components/kishufiya-guide/detect.js');
    const ship = {isOriginal: true, sprite: {name: 'חללית'}, x: 0, y: 14, direction: 90, size: 100, visible: true,
        currentCostume: 0, variables: {}};
    const stage = {isStage: true, currentCostume: 0, variables: {a: {name: 'ניקוד', value: 0}}};
    test('a move, a variable, a clone change the state; nothing else does', () => {
        const before = gameState([stage, ship]);
        expect(gameState([stage, {...ship}])).toBe(before);
        expect(gameState([stage, {...ship, y: 0}])).not.toBe(before);
        expect(gameState([{...stage, variables: {a: {name: 'ניקוד', value: 1}}}, ship])).not.toBe(before);
        expect(gameState([stage, ship, {...ship, isOriginal: false}])).not.toBe(before);
    });
    test('the message: sprites of its threads, its key, changed and done', () => {
        const threads = [{target: ship}, {target: {...ship, isOriginal: false}}];
        expect(scriptRan({hat: 'event_whenkeypressed', fields: {KEY_OPTION: 'up arrow'}, threads, before: 'a', after: 'b',
            done: true, blocks: true})).toEqual({type: 'script-ran', hat: 'event_whenkeypressed', key: 'up arrow',
            sprites: ['חללית'], blocks: true, changed: true, done: true});
        expect(scriptRan({hat: 'event_whenflagclicked', threads, before: 'a', after: 'a', done: false}))
            .toEqual({type: 'script-ran', hat: 'event_whenflagclicked', sprites: ['חללית'], blocks: false, changed: false,
                done: false});
    });
});

describe('what the lesson counts as a press (platform K17 review)', () => {
    const {gameKey: keyOf, keyReadNow, ranUnder} = require('../../../src/components/kishufiya-guide/detect.js');
    test('a letter by its place on a Hebrew layout; a digit; an arrow as it is', () => {
        expect(keyOf({key: 'ש', code: 'KeyA', keyCode: 65})).toEqual({key: 'a', keyCode: 65});
        expect(keyOf({key: '!', code: 'Digit1', keyCode: 49})).toEqual({key: '1', keyCode: 49});
        expect(keyOf({key: 'ArrowUp', code: 'ArrowUp', keyCode: 38})).toEqual({key: 'ArrowUp', keyCode: 38});
        expect(keyOf({key: ' ', code: 'Space', keyCode: 32})).toEqual({key: ' ', keyCode: 32});
        expect(keyOf({key: 'ArrowUp', code: 'Numpad8', keyCode: 38})).toEqual({key: 'ArrowUp', keyCode: 38});
        expect(keyOf({key: '8', code: 'Numpad8', keyCode: 104})).toEqual({key: '8', keyCode: 104});
    });
    test('a block under the hat ran: ended, moved on, or still running when the look ends; never a bare hat', () => {
        expect(ranUnder({hasNext: true, done: true, atTop: true})).toBe(true);
        expect(ranUnder({hasNext: true, done: false, atTop: false})).toBe(true);
        expect(ranUnder({hasNext: true, done: false, atTop: true, late: true})).toBe(true);
        expect(ranUnder({hasNext: true, done: false, atTop: true, late: false})).toBe(false);
        expect(ranUnder({hasNext: null, done: true, atTop: true})).toBe(false);
    });
    test('"מקש נלחץ?" told once each time it turns true', () => {
        const last = new Map();
        expect(keyReadNow(last, 'up arrow', false)).toBe(false);
        expect(keyReadNow(last, 'up arrow', true)).toBe(true);
        expect(keyReadNow(last, 'up arrow', true)).toBe(false);
        expect(keyReadNow(last, 'space', true)).toBe(true);
        expect(keyReadNow(last, 'up arrow', false)).toBe(false);
        expect(keyReadNow(last, 'up arrow', true)).toBe(true);
    });
});

describe('guide-missing: told once it stays, never for the palette scrolling (2026-10-29)', () => {
    const {missingStep} = require('../../../src/components/kishufiya-guide/detect.js');
    const after = 500;
    test('a target missing is told after half a second, once per reason', () => {
        let s = missingStep({reason: 'palette', since: 0, reported: null, now: 1000, after});
        expect(s).toEqual({since: 1000, reported: null, tell: false});
        s = missingStep({reason: 'palette', since: s.since, reported: s.reported, now: 1499, after});
        expect(s.tell).toBe(false);
        s = missingStep({reason: 'palette', since: s.since, reported: s.reported, now: 1500, after});
        expect(s).toEqual({since: 1000, reported: 'palette|', tell: true});
        s = missingStep({reason: 'palette', since: s.since, reported: s.reported, now: 2500, after});
        expect(s.tell).toBe(false);
        s = missingStep({reason: 'covered', by: 'Cat', since: s.since, reported: s.reported, now: 2600, after});
        expect(s).toEqual({since: 1000, reported: 'covered|Cat', tell: true});
    });
    test('the palette scrolling to the block, however long, is never told (donuts 2.1: a category click and two ' +
        'scrolls)', () => {
        let s = {since: 0, reported: null};
        for (let now = 0; now <= 2000; now += 16) {
            s = missingStep({reason: 'scrolling', since: s.since, reported: s.reported, now, after});
            expect(s.tell).toBe(false);
        }
        expect(s).toEqual({since: 0, reported: null, tell: false});
    });
    test('...and the count starts over after it: a scroll is not half a second of missing already', () => {
        let s = missingStep({reason: 'palette', since: 0, reported: null, now: 0, after});
        s = missingStep({reason: 'scrolling', since: s.since, reported: s.reported, now: 400, after});
        s = missingStep({reason: 'palette', since: s.since, reported: s.reported, now: 700, after});
        expect(s.tell).toBe(false);
        s = missingStep({reason: 'palette', since: s.since, reported: s.reported, now: 1200, after});
        expect(s.tell).toBe(true);
    });
});

// Platform K24 (2026-10-29): a new block's "why" is said beside it with no ring and no arrow - the guide locates the
// block (msg.locate) and marks only the way to it.
describe('locate without marking: the way is ringed, the target is not', () => {
    const block = {block: 'event_whenflagclicked', in: 'palette', sprite: 'רקטה'};
    test('a palette block: its category and its sprite\'s tile are the way; the block itself is the target', () => {
        expect(onTheWay(block, 'category')).toBe(true);
        expect(onTheWay(block, 'sprite')).toBe(true);
        expect(onTheWay(block, 'ui')).toBe(true); // the code tab, while the costumes are open
        expect(onTheWay(block, 'block')).toBe(false);
    });
    test('a target that is itself a category, a button or a field is never "on the way"', () => {
        expect(onTheWay({category: 'events'}, 'category')).toBe(false);
        expect(onTheWay({ui: 'green-flag'}, 'ui')).toBe(false);
        expect(onTheWay({block: 'motion_setx', field: 'X'}, 'field')).toBe(false);
        expect(onTheWay({sprite: 'רקטה'}, 'sprite')).toBe(false);
        expect(onTheWay({library: 'Rocketship'}, 'search')).toBe(true);
        expect(onTheWay(null, 'category')).toBe(false);
    });
});
