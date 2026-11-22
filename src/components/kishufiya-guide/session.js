// The editor's half of the session, request and 'locate' protocol, as pure decisions (platform SPEC-lesson-layers section 3,
// "session ו-request", stage A1). Nothing of an editor is known here - no DOM, no blocks: the editor hands in each message
// it hears and each look at a target, and does what comes back.
//
// ONE PROTOCOL, TWO EDITORS. This file is the same, byte for byte, in כישופייה (src/components/kishufiya-guide/session.js)
// and in כישופונת (src/editor/guide-session.js), and both run the same cases against it (guide-contract.cases.json, also
// the same in both and in the platform). A change here is a change of the contract: change the cases, raise
// CONTRACT_VERSION with their `version`, and copy both files to the other editor.
//
// - A session is one connection of the editor to the page, numbered by the page. Its number only grows: a message of a
//   number lower than the highest heard is stale and dropped. A session that begins - the first heard, or a higher one -
//   starts from nothing: the mark, the places asked, the freeze, the pick and the name asked of before are gone.
// - A message with no `session` is the engine before the layers: handled exactly as it always was, nothing voided, nothing
//   added to its answers. It cannot ask for a place.
// - A request ties an answer to what was asked: `request` of a 'guide' or a 'locate' (a guide with none: its `id`). Every
//   answer about a message of a session says {session, request}, and its `id` IS the request (id === request).
// - 'locate' {session, request, want: {key, point, highlight}} asks where a target is (`point`: a guide's target), apart
//   from the mark; several at once. 'locate-clear' {session, request} ends one, with no request all of them.
// - 'located' {type, id, key, session, request, found, via, rect, drop, scroller, reason?, by?} answers it:
//   found true - the rect is the target's own (in a scrolling box, with its `scroller`: the page asks for the scroll with
//   'guide-scroll' {id: request}); said when found and on every change.
//   found false - with `reason`: said at once when a found one is lost and for a reason that is no wait ('on-the-way',
//   'no-game', 'unsupported:...'), else once the target stays missing for `after` ms; again when the reason changes.
//   Only the way to the target is on screen (a closed category, another sprite's tile): found false, reason 'on-the-way',
//   `via` the way's kind, no rect.
// - The soft mark (`highlight`) is drawn at a found target only: never on the way, never while it is out of its box's view.

export const CONTRACT_VERSION = 1;

// What this build knows of the protocol, said on 'editor-ready' {caps}. A page says a session and 'locate' only to an
// editor that said so.
export const CAPS = Object.freeze(['session', 'locate']);

const numbered = value => typeof value === 'number' && Number.isFinite(value);
const PLACES = ['locate', 'locate-clear'];

// Nothing heard yet: no session, no place asked
export const newContract = () => ({session: null, locates: []});

// The request of a message: its `request`, or the `id` a guide has always had
export const requestOf = msg => {
    if (msg && numbered(msg.request)) return msg.request;
    return msg && numbered(msg.id) ? msg.id : null;
};

// What an answer about `msg` says of the session: {session, request}, or null for a message with no session
export const asking = msg => (msg && numbered(msg.session) ? {session: msg.session, request: requestOf(msg)} : null);

// The id the answers about `msg` carry: its request in a session, else its `id` exactly as it came
export const answerId = msg => {
    const ask = asking(msg);
    if (ask) return ask.request;
    return msg ? msg.id : undefined; // eslint-disable-line no-undefined
};

// An answer about what `ask` (asking(msg)) asked: with the session, the request, the request as its id and `more` (what
// only the new protocol says). With no session: the same object, untouched.
export const inSession = (answer, ask, more) => (ask ?
    {...answer, ...(more || {}), id: ask.request, session: ask.session, request: ask.request} : answer);

// What the editor tells itself when a session begins, in this order, each done as if the page had said it
const sessionStarts = () => [{type: 'guide-clear'}, {type: 'freeze', on: false}, {type: 'pick', on: false}];

const asked = (locates, msg) => {
    const request = requestOf(msg);
    const want = msg.want || {};
    if (request === null || !want.point || typeof want.point !== 'object') return locates;
    const one = {
        request,
        session: msg.session,
        key: typeof want.key === 'string' ? want.key : null,
        target: want.point,
        highlight: Boolean(want.highlight),
        told: '', // the last 'located' said of it, to say only a change
        found: false,
        since: null // when it was first seen missing
    };
    return [...locates.filter(other => other.request !== request), one];
};

const cleared = (locates, msg) => {
    const request = requestOf(msg);
    return request === null ? [] : locates.filter(one => one.request !== request);
};

// A message of the page, heard. -> {state, heard, orders, pass}:
//   heard  - 'old' (no session), 'stale' (a session that is over), 'new' (a session begins), 'same';
//   orders - what the editor does first, as messages to its own handler (a session that begins: the mark, the freeze and
//            the pick go; the places are already gone from `state`);
//   pass   - whether the editor then handles the message itself (false: it was dropped, or it was a place's and is in `state`).
export const heard = (state, msg) => {
    const places = Boolean(msg) && PLACES.includes(msg.type);
    if (!msg || !numbered(msg.session)) return {state, heard: 'old', orders: [], pass: Boolean(msg) && !places};
    if (state.session !== null && msg.session < state.session) return {state, heard: 'stale', orders: [], pass: false};
    const begins = state.session === null || msg.session > state.session;
    const from = begins ? {session: msg.session, locates: []} : state;
    let locates = from.locates;
    if (msg.type === 'locate') locates = asked(locates, msg);
    if (msg.type === 'locate-clear') locates = cleared(locates, msg);
    return {
        state: locates === from.locates ? from : {...from, locates},
        heard: begins ? 'new' : 'same',
        orders: begins ? sessionStarts() : [],
        pass: !places
    };
};

// The editor's one way in for a message of the page: the contract hears it, `keep` takes the state after it, the orders
// are done by the editor's own handler, and then the message itself when it is the editor's to handle.
// -> what the handler said of the message, true for one the contract dropped or kept.
export const hearWith = (state, msg, keep, handle) => {
    const step = heard(state, msg);
    keep(step.state);
    step.orders.forEach(order => handle(order));
    return step.pass ? handle(msg) : true;
};

// The place asked for by this request, while it is alive (a 'guide-scroll' {id: request} is done for it as for the guide's)
export const locateOf = (state, request) => state.locates.find(one => one.request === request) || null;

// Every place is told anew at the next look (the editor moved everything: a tidy)
export const toldAnew = state => ({...state, locates: state.locates.map(one => ({...one, told: ''}))});

const noWait = reason => reason === 'on-the-way' || reason === 'no-game' || reason.indexOf('unsupported:') === 0;

// One look at the place of `request`, at `now` ms. `look`, as the editor sees the target:
//   {rect, via, drop?, scroller?, scrolling?} - the target itself (scrolling: out of its scrolling box's view), or
//   {missing: reason, via?, by?, passing?}    - not here (passing: on its way by itself, not counted as missing), or
//   {} / null                                 - nowhere ('offscreen').
// -> {state, say, soft}: the 'located' to say, if any, and whether the soft mark is drawn at the target now.
export const looked = (state, request, look, now, after) => {
    const one = locateOf(state, request);
    if (!one) return {state, say: [], soft: false};
    const see = look || {};
    const keep = next => ({...state, locates: state.locates.map(other => (other === one ? next : other))});
    const there = Boolean(see.rect) && !see.missing;
    let fields = null;
    let next = null;
    if (there) {
        fields = {found: true, via: see.via || null, rect: see.rect, drop: see.drop || null, scroller: see.scroller || null};
        next = {...one, found: true, since: null};
    } else {
        const reason = see.missing || 'offscreen';
        if (see.passing && !one.found) return {state: keep({...one, since: null}), say: [], soft: false};
        const since = one.since === null ? now : one.since;
        if (!one.found && !noWait(reason) && now - since < after) return {state: keep({...one, since}), say: [], soft: false};
        fields = {
            found: false,
            via: reason === 'on-the-way' ? see.via || null : null,
            rect: null,
            drop: null,
            scroller: null,
            reason,
            ...(see.by ? {by: see.by} : {})
        };
        next = {...one, found: false, since};
    }
    const told = JSON.stringify(fields);
    const say = told === one.told ? [] :
        [{type: 'located', id: one.request, key: one.key, session: one.session, request: one.request, ...fields}];
    return {state: keep({...next, told}), say, soft: there && one.highlight && !see.scrolling};
};

// The reason a guide's target is missing, as said in a session: one word in both editors for "not on the screen"
// ('offscreen'). With no session the editor's own word goes out as it always did.
export const reasonSaid = (reason, ask) => (ask && (!reason || reason === 'not-on-screen') ? 'offscreen' : reason);
