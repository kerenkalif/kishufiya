// SPEC-editor-base 15.1 (key bar): reserve {top, bottom}, stage-mode, and keys held / two at once.
//   npx jest test/unit/kishufiya-guide/key-bar
import Keyboard from 'scratch-vm/src/io/keyboard';
import {
    reserveOf, reserveMetrics, reservedMetrics, codeAreaMessage, stageModeMessage, forwardedKey
} from '../../../src/components/kishufiya-guide/detect.js';
import {
    setKeptBottom, keptBottomPx, browserFullscreenAllowed, fullScreenStageHeight
} from '../../../src/lib/kishufiya-key-bar.js';

describe('reserve message', () => {
    test('reserve {top, bottom}: whole px, both edges', () => {
        expect(reserveOf({type: 'reserve', top: 64, bottom: 80})).toEqual({top: 64, bottom: 80});
        expect(reserveOf({type: 'reserve', top: 63.6, bottom: 0})).toEqual({top: 64, bottom: 0});
        expect(reserveOf({type: 'reserve', top: 0, bottom: 0})).toEqual({top: 0, bottom: 0});
    });
    test('a field that is missing is 0; one that is not a number >= 0 spoils the message', () => {
        expect(reserveOf({type: 'reserve', bottom: 40})).toEqual({top: 0, bottom: 40});
        for (const bad of ['5', -1, NaN, Infinity, null]) {
            expect(reserveOf({type: 'reserve', top: bad, bottom: 0})).toBeNull();
            expect(reserveOf({type: 'reserve', top: 0, bottom: bad})).toBeNull();
        }
    });
    test('reserve-top {px} is the alias: top px, bottom 0', () => {
        expect(reserveOf({type: 'reserve-top', px: 136})).toEqual({top: 136, bottom: 0});
        expect(reserveOf({type: 'reserve-top', px: -2})).toBeNull();
        expect(reserveOf({type: 'reserve-top'})).toBeNull();
    });
    test('other messages and none: nothing', () => {
        expect(reserveOf(null)).toBeNull();
        expect(reserveOf({type: 'freeze'})).toBeNull();
    });
});

describe('reserve on the workspace metrics: the bottom strip', () => {
    const m = {absoluteTop: 10, absoluteLeft: 120, viewHeight: 500, viewWidth: 600, contentHeight: 900, toolboxWidth: 120};
    test('top moves the start, bottom shortens the end; the height is viewHeight - top - bottom', () => {
        expect(reserveMetrics(m, 64, 80)).toMatchObject({absoluteTop: 74, viewHeight: 356, absoluteLeft: 120, toolboxWidth: 120});
    });
    test('bottom alone leaves the start where it is (zoom controls, placed from viewHeight, rise by it)', () => {
        const r = reserveMetrics(m, 0, 80);
        expect(r.absoluteTop).toBe(10);
        expect(r.viewHeight).toBe(420);
        // the scroll reaches every block: the content is not changed, so the most one can scroll grows by the strip
        expect(r.contentHeight - r.viewHeight).toBe(480);
        expect(m.viewHeight).toBe(500);
    });
    test('0 and 0: the same metrics back; reservedMetrics (top only) agrees with the old behaviour', () => {
        expect(reserveMetrics(m, 0, 0)).toBe(m);
        expect(reserveMetrics(m, 0)).toBe(m);
        expect(reservedMetrics(m, 64)).toEqual(reserveMetrics(m, 64, 0));
    });
    test('never a negative height', () => {
        expect(reserveMetrics(m, 400, 400).viewHeight).toBe(0);
    });
});

describe('code-area message with both edges', () => {
    const rect = {left: 1, top: 80, width: 300, height: 400};
    test('reserved (top) and reservedBottom, both in the key', () => {
        const a = codeAreaMessage(rect, [], 64, 80);
        expect(a.msg).toEqual({type: 'code-area', rect, avoid: [], reserved: 64, reservedBottom: 80});
        expect(a.key).not.toBe(codeAreaMessage(rect, [], 64, 0).key);
        expect(a.key).not.toBe(codeAreaMessage(rect, [], 0, 80).key);
    });
    test('none kept: no fields; top only is as before', () => {
        expect(codeAreaMessage(rect, [], 0, 0).msg).toEqual({type: 'code-area', rect, avoid: []});
        expect(codeAreaMessage(rect, [], 64).msg).toEqual({type: 'code-area', rect, avoid: [], reserved: 64});
    });
    test('a bottom alone says only reservedBottom', () => {
        expect(codeAreaMessage(rect, [], 0, 50).msg).toEqual({type: 'code-area', rect, avoid: [], reservedBottom: 50});
    });
});

describe('stage-mode', () => {
    test('said on change only', () => {
        expect(stageModeMessage(false, false)).toBeNull();
        expect(stageModeMessage(false, true)).toEqual({type: 'stage-mode', fullscreen: true});
        expect(stageModeMessage(true, true)).toBeNull();
        expect(stageModeMessage(true, false)).toEqual({type: 'stage-mode', fullscreen: false});
    });
});

describe('full-screen with a bottom strip', () => {
    afterEach(() => setKeptBottom(0));
    test('the browser full-screen is on only while no bottom is kept', () => {
        expect(browserFullscreenAllowed()).toBe(true);
        setKeptBottom(72);
        expect(keptBottomPx()).toBe(72);
        expect(browserFullscreenAllowed()).toBe(false);
        setKeptBottom(0);
        expect(browserFullscreenAllowed()).toBe(true);
    });
    test('the stage is shrunk by the bottom', () => {
        expect(fullScreenStageHeight(800, 50)).toBe(750);
        setKeptBottom(72);
        expect(fullScreenStageHeight(800, 50)).toBe(678);
        expect(fullScreenStageHeight(100, 50)).toBe(0);
    });
    test('a bad number is 0', () => {
        setKeptBottom(-5);
        expect(keptBottomPx()).toBe(0);
        setKeptBottom(NaN);
        expect(keptBottomPx()).toBe(0);
    });
});

describe('key-press: hold and two keys at once reach the VM keyboard, keyup always', () => {
    const keyboard = () => new Keyboard({startHats: () => [], emit: () => {}});
    const send = (kb, msg, frozen = false) => {
        const f = forwardedKey(msg, frozen);
        if (f) kb.postData(f.io);
        return f;
    };
    const pressed = kb => kb._keysPressed.slice().sort();
    const right = {key: 'ArrowRight', code: 'ArrowRight', keyCode: 39};
    const up = {key: 'ArrowUp', code: 'ArrowUp', keyCode: 38};

    test('held: down once stays down until the up', () => {
        const kb = keyboard();
        send(kb, {...right, down: true});
        expect(pressed(kb)).toEqual(['right arrow']);
        send(kb, {...right, down: false});
        expect(pressed(kb)).toEqual([]);
    });
    test('two keys at once: both down, each let go on its own', () => {
        const kb = keyboard();
        send(kb, {...right, down: true});
        send(kb, {...up, down: true});
        expect(pressed(kb)).toEqual(['right arrow', 'up arrow']);
        send(kb, {...up, down: false});
        expect(pressed(kb)).toEqual(['right arrow']);
        send(kb, {...right, down: false});
        expect(pressed(kb)).toEqual([]);
    });
    test('a second down of the same key is one key held, one up lets it go', () => {
        const kb = keyboard();
        send(kb, {...right, down: true});
        send(kb, {...right, down: true});
        expect(pressed(kb)).toEqual(['right arrow']);
        send(kb, {...right, down: false});
        expect(pressed(kb)).toEqual([]);
    });
    test('keyup is delivered while frozen, keydown is not', () => {
        const kb = keyboard();
        send(kb, {...right, down: true});
        expect(send(kb, {...up, down: true}, true)).toBeNull();
        expect(pressed(kb)).toEqual(['right arrow']);
        expect(send(kb, {...right, down: false}, true)).not.toBeNull();
        expect(pressed(kb)).toEqual([]);
    });
    test('only a keydown is told back to the lesson', () => {
        expect(forwardedKey({...right, down: true}, false).tell).toEqual({type: 'key', key: 'ArrowRight', code: 'ArrowRight'});
        expect(forwardedKey({...right, down: false}, false).tell).toBeNull();
    });
});
