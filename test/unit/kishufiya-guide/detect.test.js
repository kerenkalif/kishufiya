// K12 (2026-10-28): what the guide tells the lesson the child did - the pure parts (detect.js).
//   npx jest test/unit/kishufiya-guide
import {categoryOf} from '../../../src/components/kishufiya-guide/targets.js';
import {coveredBy, forwardedKey, gameHeard, gameKey, libraryMissing, samplePoints, spriteOnStage, typing} from '../../../src/components/kishufiya-guide/detect.js';

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
