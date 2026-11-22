// The page's session and the places it asks for (platform SPEC-lesson-layers section 3, stage A1): session.js - pure, so
// tested here. One protocol with כישופונת: the shapes below are the contract.
//   npx jest test/unit/kishufiya-guide/session
import {CAPS, inSession, locateAsked, locateCleared, locateOf, locateTold, requestOf, sessionStep}
    from '../../../src/components/kishufiya-guide/session.js';
import {missingStep} from '../../../src/components/kishufiya-guide/detect.js';

const AFTER = 500;
const told = (locate, found, now) => locateTold(locate, found, now, AFTER, missingStep);
const ask = (request, more) => ({
    type: 'locate', session: 3, request, want: {key: `k${request}`, point: {target: {ui: 'flag'}}, highlight: false}, ...more
});
const RECT = {left: 10, top: 20, width: 30, height: 40};

describe('what this build says it knows', () => {
    test('the session and locate, by name', () => {
        expect(CAPS).toEqual(['session', 'locate']);
    });
});

describe('the engine before the layers: nothing changes', () => {
    test('a message with no session is never a start and never stale', () => {
        expect(sessionStep(null, {type: 'guide', id: 4})).toEqual({session: null, start: false, stale: false});
        expect(sessionStep(7, {type: 'guide-scroll', id: 4})).toEqual({session: 7, start: false, stale: false});
    });
    test('an answer about a message with no session is exactly as it was', () => {
        const answer = {type: 'guide-at', id: 4, rect: RECT};
        expect(inSession(answer, {session: undefined, request: 4}, {found: true})).toBe(answer);
        expect(inSession(answer, null)).toBe(answer);
    });
});

describe('the session', () => {
    test('the first one said starts it', () => {
        expect(sessionStep(null, {type: 'freeze', session: 1})).toEqual({session: 1, start: true, stale: false});
    });
    test('the same one again: neither a start nor stale', () => {
        expect(sessionStep(2, {type: 'guide', session: 2})).toEqual({session: 2, start: false, stale: false});
    });
    test('a newer one starts from nothing', () => {
        expect(sessionStep(2, {type: 'guide', session: 3})).toEqual({session: 3, start: true, stale: false});
    });
    test('a message of a session that is over is dropped', () => {
        expect(sessionStep(3, {type: 'guide', session: 2})).toEqual({session: 3, start: false, stale: true});
    });
    test('a session that is no number is no session', () => {
        expect(sessionStep(3, {type: 'guide', session: '4'})).toEqual({session: 3, start: false, stale: false});
    });
});

describe('the request of an answer', () => {
    test('a guide\'s request, else its id', () => {
        expect(requestOf({id: 5, request: 9})).toBe(9);
        expect(requestOf({id: 5})).toBe(5);
        expect(requestOf({})).toBe(null);
    });
    test('an answer in a session says the session and the request, and what only the new protocol says', () => {
        expect(inSession({type: 'guide-at', id: 5, rect: null}, {session: 2, request: 9}, {found: false}))
            .toEqual({type: 'guide-at', id: 5, rect: null, found: false, session: 2, request: 9});
    });
});

describe('the places asked for', () => {
    test('several at once, each by its own request', () => {
        const two = locateAsked(locateAsked([], ask(1)), ask(2));
        expect(two.map(one => one.request)).toEqual([1, 2]);
        expect(locateOf(two, 2).key).toBe('k2');
        expect(locateOf(two, 3)).toBe(null);
    });
    test('the point is a guide\'s target, or its fields with the target in them', () => {
        const plain = {type: 'locate', session: 1, request: 1, want: {key: 'a', point: {ui: 'flag'}, highlight: true}};
        expect(locateAsked([], plain)[0]).toMatchObject({target: {ui: 'flag'}, highlight: true});
        const fields = {type: 'locate', session: 1, request: 2, want: {key: 'b', point: {target: {ui: 'stop'}, markColour: '#abc'}}};
        expect(locateAsked([], fields)[0]).toMatchObject({target: {ui: 'stop'}, markColour: '#abc', highlight: false});
    });
    test('one that cannot be answered is not kept', () => {
        expect(locateAsked([], {type: 'locate', session: 1, want: {key: 'a', point: {ui: 'flag'}}})).toEqual([]);
        expect(locateAsked([], {type: 'locate', session: 1, request: 1})).toEqual([]);
    });
    test('the same request again replaces what was asked, and is told anew', () => {
        const first = told(locateAsked([], ask(1))[0], {rect: RECT, via: 'ui'}, 0).locate;
        const again = locateAsked([first], ask(1));
        expect(again).toHaveLength(1);
        expect(again[0].told).toBe('');
    });
    test('cleared by its own request; the others stay', () => {
        const two = locateAsked(locateAsked([], ask(1)), ask(2));
        expect(locateCleared(two, {type: 'locate-clear', session: 3, request: 1}).map(one => one.request)).toEqual([2]);
    });
    test('a clear with no request clears them all', () => {
        expect(locateCleared(locateAsked([], ask(1)), {type: 'locate-clear'})).toEqual([]);
    });
});

describe('what is said of a place', () => {
    const one = () => locateAsked([], ask(6))[0];
    test('found: located, with the key, the session and the request it was asked in', () => {
        const step = told(one(), {rect: RECT, via: 'ui'}, 0);
        expect(step.say).toEqual([{
            type: 'located', id: 6, key: 'k6', session: 3, request: 6, found: true, via: 'ui', rect: RECT, drop: null, scroller: null
        }]);
    });
    test('where it was: said once, and again only when it moves', () => {
        const first = told(one(), {rect: RECT, via: 'ui'}, 0);
        expect(told(first.locate, {rect: {...RECT}, via: 'ui'}, 100).say).toEqual([]);
        const moved = told(first.locate, {rect: {...RECT, top: 21}, via: 'ui'}, 200);
        expect(moved.say).toHaveLength(1);
        expect(moved.say[0].rect.top).toBe(21);
    });
    test('missing from the start: said only once it stays so', () => {
        const early = told(one(), {missing: 'hidden'}, 1000);
        expect(early.say).toEqual([]);
        expect(told(early.locate, {missing: 'hidden'}, 1400).say).toEqual([]);
        const late = told(early.locate, {missing: 'hidden'}, 1500);
        expect(late.say).toEqual([{
            type: 'located', id: 6, key: 'k6', session: 3, request: 6, found: false, via: null, rect: null, drop: null, reason: 'hidden', by: null
        }]);
        expect(told(late.locate, {missing: 'hidden'}, 2500).say).toEqual([]);
    });
    test('a found one that is lost: said at once, and not again while it stays lost', () => {
        const found = told(one(), {rect: RECT, via: 'ui'}, 0);
        const lost = told(found.locate, {missing: 'offscreen'}, 100);
        expect(lost.say).toHaveLength(1);
        expect(lost.say[0]).toMatchObject({type: 'located', found: false, rect: null, reason: 'offscreen'});
        expect(told(lost.locate, {missing: 'offscreen'}, 5000).say).toEqual([]);
    });
    test('found again where it was before: said again', () => {
        const found = told(one(), {rect: RECT, via: 'ui'}, 0);
        const lost = told(found.locate, {missing: 'offscreen'}, 100);
        expect(told(lost.locate, {rect: RECT, via: 'ui'}, 200).say).toHaveLength(1);
    });
    test('a place never answers as the guide does', () => {
        const types = [...told(one(), {rect: RECT, via: 'ui'}, 0).say, ...told(one(), {missing: 'hidden'}, 9999).say].map(msg => msg.type);
        expect(types.every(type => type === 'located')).toBe(true);
    });
});
