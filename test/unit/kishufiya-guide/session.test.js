// The editor's one way in for a message of the page (session.js hearWith, what guide.js handleGuide runs): what reaches
// the editor's own handler, and in which order. The shapes of the protocol are the contract's cases
// (guide-contract.test.js); here is what the editor DOES with them.
//   npx jest test/unit/kishufiya-guide/session
import {answerId, asking, hearWith, inSession, looked, newContract} from '../../../src/components/kishufiya-guide/session.js';

// An editor that only writes down what its handler was given
const editor = () => {
    const it = {state: newContract(), done: [], said: []};
    it.hear = msg => hearWith(it.state, msg, next => {
        it.state = next;
    }, said => {
        it.done.push(said);
        return said.type !== 'not-the-guides';
    }, answer => it.said.push(answer));
    return it;
};
const place = (session, request) => ({type: 'locate', session, request, want: {key: 'k', point: {ui: 'flag'}}});
const START = [{type: 'guide-clear'}, {type: 'freeze', on: false}, {type: 'pick', on: false}];

describe('a session begins', () => {
    test('the mark, the freeze and the pick of before go first, then the message itself is handled', () => {
        const it = editor();
        const guide = {type: 'guide', session: 1, request: 7, target: {ui: 'flag'}};
        it.hear(guide);
        expect(it.done).toEqual([...START, guide]);
    });
    test('a higher session does the same again, and the places asked in the one before are gone', () => {
        const it = editor();
        it.hear({type: 'freeze', on: true, session: 1});
        it.hear(place(1, 5));
        it.done.length = 0;
        const next = {type: 'pick', on: true, session: 2};
        it.hear(next);
        expect(it.done).toEqual([...START, next]);
        expect(it.state).toEqual({session: 2, locates: []});
    });
    test('a message of the session it is in starts nothing', () => {
        const it = editor();
        it.hear({type: 'guide-clear', session: 1});
        it.done.length = 0;
        const freeze = {type: 'freeze', on: true, session: 1};
        it.hear(freeze);
        expect(it.done).toEqual([freeze]);
    });
});

describe('the opening', () => {
    test('engine-hello is answered with the highest session heard, and nothing else happens', () => {
        const it = editor();
        expect(it.hear({type: 'engine-hello'})).toBe(true);
        it.hear({type: 'guide-clear', session: 6});
        it.hear(place(6, 5));
        const held = it.state;
        it.done.length = 0;
        it.hear({type: 'engine-hello'});
        expect(it.said).toEqual([
            {type: 'engine-welcome', caps: ['session', 'locate'], session: 0},
            {type: 'engine-welcome', caps: ['session', 'locate'], session: 6}
        ]);
        expect(it.done).toEqual([]);
        expect(it.state).toBe(held);
    });
});

describe('a session that is over', () => {
    test('its pan and its freeze never reach the editor, and nothing held changes', () => {
        const it = editor();
        it.hear({type: 'guide-clear', session: 2});
        it.hear(place(2, 5));
        const held = it.state;
        it.done.length = 0;
        expect(it.hear({type: 'pan', session: 1, dx: 10, dy: 0})).toBe(true);
        expect(it.hear({type: 'freeze', on: true, session: 1})).toBe(true);
        expect(it.done).toEqual([]);
        expect(it.state).toBe(held);
    });
});

describe('a place asked or cleared', () => {
    test('is kept by the contract and is not the handler\'s', () => {
        const it = editor();
        it.hear({type: 'guide-clear', session: 2});
        it.done.length = 0;
        expect(it.hear(place(2, 5))).toBe(true);
        expect(it.hear({type: 'locate-clear', session: 2, request: 5})).toBe(true);
        expect(it.done).toEqual([]);
    });
});

describe('a message with no session', () => {
    test('after a session it voids nothing: only the message is handled, the session and its places stay', () => {
        const it = editor();
        it.hear({type: 'guide-clear', session: 2});
        it.hear(place(2, 5));
        const held = it.state;
        it.done.length = 0;
        const freeze = {type: 'freeze', on: true};
        it.hear(freeze);
        expect(it.done).toEqual([freeze]);
        expect(it.state).toBe(held);
    });
});

describe('the engine before the layers (the children use it now): exactly as it was', () => {
    const before = [
        {type: 'guide', id: 4, target: {ui: 'flag'}, text: 'press'},
        {type: 'guide-scroll', id: 4, container: 'palette', top: 30},
        {type: 'guide-frame', id: 4, frame: null},
        {type: 'freeze', on: true, note: 'wait'},
        {type: 'pick', on: true},
        {type: 'freeze', on: false},
        {type: 'find', id: 9, opcode: 'motion_movesteps'},
        {type: 'names', names: ['score']},
        {type: 'guide-clear'}
    ];
    test('every message reaches the handler once, the very object, with nothing before it and nothing kept', () => {
        const it = editor();
        for (const msg of before) it.hear(msg);
        expect(it.done.length).toBe(before.length);
        expect(it.said).toEqual([]);
        it.done.forEach((said, at) => expect(said).toBe(before[at]));
        expect(it.state).toEqual(newContract());
    });
    test('what the handler says of a message is what comes back (a message that is not the guide\'s)', () => {
        const it = editor();
        expect(it.hear({type: 'not-the-guides'})).toBe(false);
        expect(it.hear({type: 'guide-clear'})).toBe(true);
    });
    test('its answers are the very objects, and their id is the id it sent', () => {
        for (const msg of before) {
            const answer = {type: 'guide-at', id: msg.id, rect: null};
            expect(asking(msg)).toBe(null);
            expect(inSession(answer, asking(msg), {found: false})).toBe(answer);
            expect(answerId(msg)).toBe(msg.id);
        }
    });
});

describe('a located answer for a target inside the stage', () => {
    const state = () => ({session: 's', locates: [{request: 'r', key: 'k', session: 's', found: false, since: null, told: '', highlight: false}]});
    const stage = {left: 10, top: 20, width: 480, height: 360};
    test('says the stage box with the place', () => {
        const out = looked(state(), 'r', {rect: {left: 1, top: 2, width: 3, height: 4}, via: 'stage-sprite', stage}, 0, 0);
        expect(out.say[0].stage).toEqual(stage);
    });
    test('says none for any other target', () => {
        const out = looked(state(), 'r', {rect: {left: 1, top: 2, width: 3, height: 4}, via: 'ui'}, 0, 0);
        expect('stage' in out.say[0]).toBe(false);
    });
});
