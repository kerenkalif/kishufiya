// K12 (2026-10-28): what the guide tells the lesson the child did - the pure parts (detect.js).
//   npx jest test/unit/kishufiya-guide
import {forwardedKey, gameHeard, gameKey, libraryMissing, spriteOnStage, typing} from '../../../src/components/kishufiya-guide/detect.js';

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
    test('...not while frozen, not a repeat, not without a key', () => {
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
    test('hidden, or wholly off the stage: cannot be clicked, and says why', () => {
        expect(spriteOnStage({visible: false, bounds: {left: 0, right: 1, top: 1, bottom: 0}, stage, canvas})).toEqual({missing: 'hidden'});
        expect(spriteOnStage({visible: true, bounds: {left: 300, right: 340, top: 10, bottom: -10}, stage, canvas})).toEqual({missing: 'offstage'});
        expect(spriteOnStage({visible: true, bounds: null, stage, canvas})).toEqual({missing: 'offstage'});
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
