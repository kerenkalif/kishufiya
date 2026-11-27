// What the editor reports for the conductor: dialog, next, clip, carried and 'guide-busy' (rects.js), and that a 'located' answer carries them.
//   npx jest test/unit/kishufiya-guide/rects
import {dialogBox, nextBox} from '../../../src/components/kishufiya-guide/rects-dom.js';
import {rectsOf, visibleOf, isBusy, busyEdge, frame, busyTracker} from '../../../src/components/kishufiya-guide/rects.js';
import {looked, newContract, hearWith} from '../../../src/components/kishufiya-guide/session.js';

const box = (left, top, width, height) => ({left, top, width, height, right: left + width, bottom: top + height});

describe('rectsOf', () => {
    test('only what is there: nothing in, nothing said', () => {
        expect(rectsOf({})).toEqual({});
        expect(rectsOf()).toEqual({});
        expect(rectsOf({dialog: box(0, 0, 0, 10), carried: false})).toEqual({});
    });
    test('boxes as whole pixels, carried only when true', () => {
        expect(rectsOf({dialog: box(10.4, 20.6, 100, 50), next: {left: 1, top: 2, right: 11, bottom: 22}, clip: box(0, 0, 5, 5), carried: true}))
            .toEqual({dialog: {left: 10, top: 21, width: 100, height: 50}, next: {left: 1, top: 2, width: 10, height: 20}, clip: {left: 0, top: 0, width: 5, height: 5}, carried: true});
    });
});

describe('visibleOf', () => {
    test('a container taller than the window is cut at the window', () => {
        expect(visibleOf(box(0, -100, 200, 2000), {left: 0, top: 0, right: 800, bottom: 600})).toEqual({left: 0, top: 0, width: 200, height: 600});
    });
    test('wholly off screen: none', () => {
        expect(visibleOf(box(0, 700, 200, 50), {left: 0, top: 0, right: 800, bottom: 600})).toBeNull();
        expect(visibleOf(null, {left: 0, top: 0, right: 1, bottom: 1})).toBeNull();
    });
});

describe('busy', () => {
    test('a carried block, a library with nothing in it, a dialog that moved: busy; still: not', () => {
        expect(isBusy({carried: true})).toBe(true);
        expect(isBusy({loading: true})).toBe(true);
        expect(isBusy({dialog: box(0, 0, 10, 10), lastDialog: box(0, 5, 10, 10)})).toBe(true);
        expect(isBusy({dialog: box(0, 0, 10, 10), lastDialog: null})).toBe(true);
        expect(isBusy({dialog: box(0, 0, 10, 10), lastDialog: box(0, 0, 10, 10)})).toBe(false);
        expect(isBusy({})).toBe(false);
    });
    test('one event per change, none while idle', () => {
        expect(busyEdge(false, false)).toBeNull();
        expect(busyEdge(false, true)).toEqual({type: 'guide-busy', on: true});
        expect(busyEdge(true, true)).toBeNull();
        expect(busyEdge(true, false)).toEqual({type: 'guide-busy', on: false});
    });
    test('frame ignores a box with no size', () => {
        expect(frame(box(1, 1, 0, 0))).toBeNull();
    });
});

describe('a located answer carries the rects', () => {
    test('found: dialog, next, clip, carried are in the answer; absent when the look has none', () => {
        let s = newContract();
        hearWith(s, {type: 'locate', session: 1, request: 5, want: {key: 'k', point: {ui: 'flag'}}}, next => { s = next; }, () => true, () => {});
        const rects = rectsOf({dialog: box(1, 2, 3, 4), carried: true});
        const step = looked(s, 5, {rect: {left: 0, top: 0, width: 5, height: 5}, via: 'ui', rects}, 0, 1000);
        expect(step.say).toHaveLength(1);
        expect(step.say[0]).toMatchObject({type: 'located', found: true, dialog: {left: 1, top: 2, width: 3, height: 4}, carried: true});
        expect(step.say[0]).not.toHaveProperty('next');
        const plain = looked(s, 5, {rect: {left: 0, top: 0, width: 5, height: 5}, via: 'ui'}, 0, 1000);
        expect(plain.say[0]).not.toHaveProperty('dialog');
    });
});

describe('busy never stays on after the guide stops', () => {
    test('busy told, then the guide stops: one on:false, and the next guide starts clean', () => {
        const t = busyTracker();
        expect(t.look({carried: true})).toEqual({type: 'guide-busy', on: true});
        expect(t.stop()).toEqual({type: 'guide-busy', on: false});
        expect(t.stop()).toBeNull();
        // a new guide, the same still dialog: it is not "moved" from the last guide's dialog beyond the first look
        expect(t.look({dialog: box(0, 0, 10, 10)})).toEqual({type: 'guide-busy', on: true});
        expect(t.look({dialog: box(0, 0, 10, 10)})).toEqual({type: 'guide-busy', on: false});
    });
    test('never told busy: stopping says nothing', () => {
        expect(busyTracker().stop()).toBeNull();
    });
});

describe('the dialog is never the full-screen overlay', () => {
    const rect = {left: 0, top: 0, width: 1000, height: 800};
    const doc = parts => ({querySelectorAll: () => [], querySelector: sel => (Object.keys(parts).find(k => sel.includes(k)) ? parts[Object.keys(parts).find(k => sel.includes(k))] : null)});
    test('only the overlay found: no dialog reported', () => {
        const overlay = {getBoundingClientRect: () => rect, querySelector: () => null};
        expect(dialogBox(doc({'modal_modal-overlay': overlay}))).toBeNull();
        expect(nextBox(doc({'modal_modal-overlay': overlay}))).toBeNull();
    });
});
