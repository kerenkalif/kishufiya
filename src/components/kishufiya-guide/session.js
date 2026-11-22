// The session of the page's messages and the places it asks for ('locate'), as pure decisions (platform SPEC-lesson-layers
// section 3, "session ו-request", stage A1; guide.js does what is decided here). Nothing of this editor is known here - no
// Blockly, no DOM - and כישופונת speaks the same protocol, message for message (one protocol, both editors).
//
// A page of the engine before the layers says none of this: no `session` in its messages and no 'locate'. For it nothing
// here does anything (sessionStep passes every message as it is, no place is asked for), so the guide is as it was.
//
// - A session is one connection of this editor to the page, numbered by the page (its number only grows; a new one after
//   every 'editor-ready'). The page that speaks so says it in every message: {..., session}. That is how it announces the
//   new protocol: this editor said what it knows on 'editor-ready' (`caps`), and a page that knows it too answers with a session.
// - A request is the number that ties an answer to what was asked: `request` of a 'guide' or a 'locate' (a guide with none:
//   its `id`). Every answer about a message that came with a session says that session and request (and `id`, as ever).
// - 'locate' {session, request, want: {key, point, highlight}} asks where a target is, apart from the guide: several at
//   once, each closed by its own 'locate-clear' {session, request}, none of them touching the mark (no ring, no arrow, no
//   scroll; with highlight, the soft mark). Answered with 'located'.

// What this build knows of the protocol, said on 'editor-ready' {caps}. A page sends 'locate' and a session only to an editor
// that said so; an editor from before says no `caps`.
export const CAPS = Object.freeze(['session', 'locate']);

const numbered = value => typeof value === 'number' && Number.isFinite(value);

// What a message's session means here. `known`: the session this editor is in, null before any was said.
// -> {session, start, stale}: start - a session begins with this message: nothing told in the one before holds (the mark,
// the places asked, the freeze, the name asked), the page says all it wants again; stale - a message of a session that is
// over: dropped. A message with no session (the engine before, and what a page says outside the runner) is as it was.
export const sessionStep = (known, msg) => {
    const said = msg ? msg.session : null;
    if (!numbered(said)) return {session: known, start: false, stale: false};
    if (known !== null && said < known) return {session: known, start: false, stale: true};
    return {session: said, start: known === null || said > known, stale: false};
};

// The request of a message: its `request`, or the `id` it has always had.
export const requestOf = msg => {
    if (msg && numbered(msg.request)) return msg.request;
    return msg && numbered(msg.id) ? msg.id : null;
};

// An answer about a message `ask` ({session, request}), with both - and `more`, what only the new protocol says. None of it
// for a message that came with no session: the engine before gets its answers exactly as it always did.
export const inSession = (answer, ask, more) => (ask && numbered(ask.session) ?
    {...answer, ...(more || {}), session: ask.session, request: ask.request} : answer);

// ---- the places asked for ----

// The target of a place asked for: `want.point`, read as a guide's target - or the guide's fields with the target in
// them ({target, ...}), as the base makes a mark's point.
const targetOf = point => (point && typeof point === 'object' && point.target ? point.target : point);

// 'locate': asked for from now on. The same request again replaces what was asked (and is told anew); one with no
// request or no point cannot be answered, and is not kept.
// `told`: what was last said (said again only on a change); `since` / `reported`: the count of a missing target.
export const locateAsked = (locates, msg) => {
    const request = requestOf(msg);
    const want = (msg && msg.want) || {};
    const target = targetOf(want.point);
    if (request === null || !target || typeof target !== 'object') return locates;
    const one = {
        request,
        session: numbered(msg.session) ? msg.session : null,
        key: typeof want.key === 'string' ? want.key : null,
        target,
        highlight: Boolean(want.highlight),
        markColour: want.point.markColour,
        told: '',
        found: false,
        since: 0,
        reported: null
    };
    return [...locates.filter(other => other.request !== request), one];
};

// 'locate-clear' {request}: that one is over. With no request: all of them (the page is going away).
export const locateCleared = (locates, msg) => {
    const request = requestOf(msg);
    return request === null ? [] : locates.filter(one => one.request !== request);
};

// The place asked for by this request, if it is alive (the base's 'guide-scroll' for it is done as for the guide's).
export const locateOf = (locates, request) => locates.find(one => one.request === request) || null;

// What to say of one place now. `found`: where the editor sees its target - {rect: {left, top, width, height}, via,
// scroller?} or {missing: reason, by?}; `missingStep`: detect.js's count, handed in so there is one rule for "missing".
// -> {locate, say}: the place with what was told kept, and the 'located' to send, if any:
//   found - when it is found and on every change of where it is;
//   not found - at once when a found one is lost, else once it stays missing for `after` ms (again when the reason changes).
export const locateTold = (locate, found, now, after, missingStep) => {
    const answer = fields => ({
        type: 'located', id: locate.request, key: locate.key, session: locate.session, request: locate.request, ...fields
    });
    if (found && found.rect && !found.missing) {
        const at = {found: true, via: found.via || null, rect: found.rect, drop: null, scroller: found.scroller || null};
        const told = JSON.stringify(at);
        return {
            locate: {...locate, told, found: true, since: 0, reported: null},
            say: told === locate.told ? [] : [answer(at)]
        };
    }
    const reason = (found && found.missing) || 'offscreen';
    const by = (found && found.by) || null;
    const lost = {found: false, via: null, rect: null, drop: null, reason, by};
    if (locate.found) {
        return {locate: {...locate, told: '', found: false, since: now, reported: `${reason}|${by || ''}`}, say: [answer(lost)]};
    }
    const step = missingStep({reason, by, since: locate.since, reported: locate.reported, now, after});
    return {locate: {...locate, told: '', since: step.since, reported: step.reported}, say: step.tell ? [answer(lost)] : []};
};
