// כישופייה guide (2026-10-23): the lesson points into the editor instead of showing screenshots.
// Generic on purpose - it knows nothing of lessons, children or answers; the platform decides what to
// show and what a pick means. Messages (msg.type), from the page around the editor:
//   guide-scroll {id, container, top, left?}  the base's decision (platform scroll-target.ts, SPEC-editor-base 3.3 item 7): scroll the box
//                                      'palette', 'sprite-list', 'library' or 'scripts' (the code area) to `top` (screen px). A target in such a box is told in
//                                      'guide-at' with its `rect` even out of the box's view, and `scroller` {id, top, bottom, scrollTop,
//                                      maxScrollTop}; until it is wholly in view nothing is drawn. The editor holds no rule for this.
//   guide        {target, text?, textCategory?, textSprite?}
//                                      ring the target (targets.js) and bounce an arrow at it; with a
//                                      text, also a speech bubble beside it (the page may draw its own
//                                      instead, where 'guide-at' says the target is). While the target is
//                                      reached through its category or its sprite's tile (the child has
//                                      to open it first), textCategory / textSprite replace text.
//                                      A whole script (a code target with `script: true`, targets.js) is ringed
//                                      alone: no arrow, no bubble, never the louder ring, cut to the code area -
//                                      'guide-at' says via 'script', arrow null and the rect of the part seen
//                                      (platform point-help, 2026-11-08) - in every marking below too (quiet,
//                                      locate; with highlight its soft mark is cut so). The code scrolls to it,
//                                      as to a block, when it is not seen as well as the area can show it: all
//                                      of it, or half the view of one longer than the view - and not once it
//                                      was seen so: the child's own scrolling after that is left alone
//                                      quiet: nothing drawn, nothing scrolled - only told where it is and
//                                      when it is clicked (a guide level that marks nothing, K12 2026-10-28)
//                                      locate: found as a guide is - the code and the palette scroll to it
//                                      (its category's own scroll too), missing told as usual - but the target
//                                      itself has no ring, arrow or outline; only the way to it (its category,
//                                      its sprite's tile) is ringed. For the page's bubble beside a new block
//                                      (platform K24, 2026-10-29). Not `quiet`: that one scrolls nothing,
//                                      marks no way either, and keeps most missing to itself (guide levels 2-3)
//                                      highlight (with locate): a soft mark at the target itself - an outline
//                                      and a glow in ניצוצי's purple, no arrow, no pulse, nothing that asks for
//                                      a press; a point on the stage stays round. The thing a window of the
//                                      lesson talks about (the flag, the stage, a sprite, a point; platform
//                                      decision 32, 2026-10-31): the red ring and arrow mean "do this here" and
//                                      are kept for actions. An editor from before 2026-10-31 knows `locate`
//                                      and draws nothing at it (no red); one from before 2026-10-29 rings it.
//                                      A located target never says guide-clicked (detect.js tellsClick)
//                                      clearOf: a block of the code (a target {blockId | block, in: 'code', sprite?})
//                                      whose whole script the page's window keeps off while it points at THIS target:
//                                      for a target that is no block (the stage), where 'guide-at' would say no `clear`
//                                      of its own (platform decision 44, 2026-11-01). Said as `clear` in 'guide-at';
//                                      none when that block is not in the open sprite's code. Older editors ignore it
//                                      A target {libraryTag: label} rings a category button of the open library
//                                      (platform decision 46); pressing it is never guide-clicked
//                                      While a guide's target is in a library ({library} or {libraryTag}) the editor picks
//                                      one item per click: marking several at once (Ctrl+click, a long press) is off,
//                                      so a one-sprite step behaves as ever (multi-pick, 2026-11-02)
//                                      unless the target says `multi: true` (platform decision 55: a step with several sprites to add
//                                      together): marking is on then, and each sprite arrives as its own library-pick
//   names        {name, kind: 'variable' | 'list' | 'message', ci, wrong, keptMissing?} | {clear: true}
//                (keptMissing: the window also stays until its "לזכור לפעם הבאה 📌" box is ticked, platform decision 58;
//                 the target ui 'variable-kept' rings that box)
//                                      the name the guide asks for in the name window (platform decision 52, 2026-11-02):
//                                      while it is set, OK in a window of that kind with any other name (spaces at the
//                                      start or end do not count; `ci`: any case) creates nothing - the window stays open,
//                                      what was typed stays, and `wrong` (the page's words) shows beside the box. Told apart
//                                      from `guide` on purpose: it holds at every guide level, whether or not a ring is drawn.
//                                      Other windows (a rename) and no 'names' at all: the window is as it was. A page
//                                      from before this never sends it; an editor from before ignores it
//                                      pointer: false - the red arrow is not drawn (nor told in 'guide-at' `arrow`): the ring
//                                      alone marks the target (Keren 2026-11-24, the page's bubble points at it). Absent or
//                                      anything else: drawn, as ever, so an older page is unchanged
//   guide-clear  {}
//   (session, platform SPEC-lesson-layers section 3, stage A1. The contract is session.js and its cases,
//   test/unit/kishufiya-guide/guide-contract.cases.json - the same two files in כישופונת, so read them, not a copy of
//   them here. In short: a page of the layered engine says {session} in every message, after this build said `caps` on
//   'editor-ready'. A session that begins - the first heard, or a higher number - starts from nothing: the mark, the
//   places asked, the freeze, the pick and the name asked of before are dropped. A message of a lower number than the
//   highest heard is dropped. Every answer about a message of a session says {session, request}, and its id is the
//   request (the guide's `request`, else its id); guide-at then also says `found`, and guide-missing says 'offscreen'
//   for no reason of its own. A page that says no session: all as it was)
//   engine-hello {}                    the opening of a page that loaded beside an editor already up (it heard no
//                                      'editor-ready'): answered with 'engine-welcome' {caps, session} - session: the
//                                      highest heard, 0 for none; the page starts at that + 1. Answered at any time, also
//                                      with no game open, and nothing changes by it. An older page never says it
//   (what the page says after a guide - guide-scroll, guide-frame, guide-typed - is gated by its session like any
//   message, and is for the guide of its request: its `request`, else its id)
//   locate       {session, request, want: {key, point, highlight}}
//                                      where is this target (point: a guide's target) - asked apart from the guide, only in
//                                      a session, several at once, and answered with
//                                      'located' {id: request, key, session, request, found, via, rect, drop, scroller, stage?, reason?, by?}:
//                                      found true when the target itself is there, and on every change; found false with
//                                      a reason at once when a found one is lost, else once it stays missing. Only the
//                                      way to it on screen (a closed category, its sprite's tile): found false, reason
//                                      'on-the-way', `via` the way. It never touches the mark: nothing is ringed, no
//                                      arrow, the code is not scrolled, a press on it is never guide-clicked; with
//                                      highlight, the soft mark at the target itself (never on the way; in a scrolling
//                                      box out of its view: told with its `scroller`, no mark, and the base's
//                                      'guide-scroll' {id: request} is done as for the guide's)
//   locate-clear {session, request}    that place is no longer asked for (no request: none of them is)
//   tidy         {}                    the base's decision (platform auto-tidy.ts, Keren 2026-11-17): the scripts of
//                                      the code shown are put in order, as the menu bar's "ארגן בלוקים" does
//                                      (kishufiya-tidy.js, 'wide'), once - never under a block being dragged (it
//                                      waits for the drop), and with no code area to tidy in (the costumes tab) it
//                                      waits for one. The guide then finds its target anew: the ring, the
//                                      arrow and 'guide-at' follow the blocks, and the code scrolls to the target
//                                      once more if the tidy left it out of view
//   focus-game   {}   blur what has the focus, so the keys reach the game (detect.js focusGame)
//   key-press    {key, code, keyCode, down}
//                                      a key the child pressed while the focus was in the lesson, not here:
//                                      given to the game, and told back as 'key' like one pressed here (K12)
//   freeze       {on, note?, stop?, spotlight?}
//                                      a light veil over the editor (below the menu bar): nothing in it
//                                      can be used, the code stays readable. note: a short line on the
//                                      veil. stop (default true): stop the game. spotlight: the code area
//                                      and the sprite list stay open, for a pick - the child opens the
//                                      right sprite by themselves; nothing is opened for them (Keren,
//                                      2026-10-23), the lesson may give a hint instead
//   pick         {on}                  clicks on blocks in the code pick them (reported) instead of
//                                      running or dragging them
//   find         {id, opcode, inside?} which sprites' code has such a block (inside: within one of that
//                                      kind) - answered with 'found'
// and to it:
//   block-added / block-removed {opcode, sprite}   the child's own change to the open sprite's code
//   code-changed {sprite}                           any change to it (a block moved too), at most every 150ms
//   category-opened {id}                            the palette's category now in view
//   multi-add {on}                                  several marked sprites are being added one after the other (the
//                                                   library's multi-pick): on at the start, off at the end, also when
//                                                   one failed; the lesson keeps its guide quiet meanwhile (platform decision 55)
//   block-drag {on}                                 a block is being dragged (a palette block or one of the code): on
//                                                   when the drag starts, off when it ends wherever it is let go (a
//                                                   drop, or an abandoned one) - the page keeps its bubble off a block
//                                                   that is being dragged (platform decision 38, 2026-11-01)
//   picked {opcode, blockId, sprite, inside: [opcode], top}
//   (guide-missing, guide-at and guide-clicked carry the guide's `id`, as it was sent with 'guide', so the
//   page tells them apart from what was said about the guide before)
//   guide-missing {id, target, reason, by}          the target is nowhere on the screen, or cannot be clicked
//                                                   (for half a second): why - targets.js
//   guide-frame {id, frame}             the frame to draw at the drop, as the base decided it (drop-frame.ts); null: nothing left to draw
//   guide-at, located {dialog?, next?, clip?: {left, top, width, height}, carried?: true} (the open dialog, the control pressed next, the visible box of the target's scroll container, a block being carried: rects.js)
//   guide-busy {on: boolean} (a busy phase starts or ends: a block in flight, a dialog opening or moving, a library not loaded yet)
//   guide-at {typing?: {text, fresh, pad: false}} (a box being typed in: its text now, and whether nothing was typed since it took the focus)
//   guide-at {stage?: {left, top, width, height}} (the stage's box, same pixels as rect, for a target inside it)
//   guide-at {rect: {left, top, width, height} | null, via, arrow: 'above' | 'below', value?, raw?, drop?, dropRect?, accept?, dropKind?, label?, keepOff?: [{left, top, width, height}, ...]}
//                                                   where the guided target is now, in this frame's pixels,
//                                                   and on which side of it the arrow is; a field's value as
//                                                   shown, and itself (raw: 'right arrow' for "חץ ימינה");
//                                                   a box's label {left, top, width, height}: the words that say what it is;
//                                                   a dragged block's drop point {x, y} - sent on change - with `dropRect`, the frame it
//                                                   would have (unclipped), `accept` (the code area) and `dropKind` 'dock'
//   ui {name: 'run' | 'flag' | 'stop'}              a run / the green flag itself / the stop sign
//   script-ran {hat, key?, sprites, from?, blocks, changed, done}
//                                                   scripts a hat started (the flag, a key - `key` its Scratch
//                                                   name -, a sprite clicked): their sprites, whether a block
//                                                   under the hat ran; changed/done for the record only (K17).
//                                                   A broadcast received (2026-11-01) is told only as a press: while the
//                                                   pointer (mouse or finger) is down on the sprite whose script sent it
//                                                   (once for each press-down); `from`: that sprite. Any other broadcast: nothing
//   key-read {key}                                  "מקש נלחץ?" of that key turned true in a running script (K17)
//   (editor-ready carries runs: true - this build says script-ran)
//   key {key}                                       a key pressed (KeyboardEvent.key) - not in a box being typed
//                                                   into, nor while frozen; always one the game got too (K12)
//   editing {sprite}                                the sprite open in the editor ('Stage' for the stage): on
//                                                   load and whenever another one is opened
//   sprite-clicked {sprite}                         a sprite (or the stage) clicked on the stage, as its
//                                                   "when this sprite clicked" scripts start
//   guide-clicked {via}                             the child clicked the guided target itself (a button, a
//                                                   sprite's tile, a library item) - for the lesson, a step done
//   found {id, sprites: [name]}                     the answer to 'find' ('Stage' is the stage)
//   window {open, naming, tag}                      a window of the editor is open over it (a library, a
//                                                   prompt); naming: the box to name a new message or variable
//                                                   is in it; tag: the label of the category the open
//                                                   library shows, null with none (platform decision 46,
//                                                   2026-11-02; an older editor sends none) - sent on change,
//                                                   and with every new guide
//   library-pick {kind, source, name, asset}        a sprite, backdrop, costume or sound added: kind 'sprite' |
//                                                   'backdrop' | 'costume' | 'sound'; source 'library' | 'paint'
//                                                   (the brush, nothing drawn yet) | 'upload' (a file, the camera,
//                                                   a copy dragged from another sprite); asset: its first
//                                                   picture's or its sound's md5, or null - once it is in
//                                                   (platform auto-root, 2026-10-28: a pick is an event). Several marked
//                                                   in a library at once (multi-pick, 2026-11-02; off while a guide waits
//                                                   at a library) arrive as one library-pick each, in marking order, each
//                                                   told as its sprite starts to load - the next only after the one before
//                                                   is in
import {readRects, carriedNow, dialogBox} from './rects-dom.js';
import {busyEdge, isBusy} from './rects.js';
import {resolve, scrollContainer, codeArea, blockAt, surrounding, uiElement, workspace, editorWindow, frameOf, codeScroller, softFound, stageFrame} from './targets.js';
import {drawnBoxes, TOLD_HATS, GHOST_ROW, attachOf, dropBox, focusGame, forwardedKey, gameHeard, gameKey, gameState, guideMarking, keyReadNow,
    missingStep, onTheWay, passingBy, tidyStep, pointerPlace, pressingBroadcast, quietReports, ranUnder, ringAlone, ringInScreen, scriptInView,
    scriptRan, scriptRing, softMarkColours, tellsClick, typing, typingOf, keptTyping, endEdit}
    from './detect.js';
import styles from './guide.css';
import {watchPicks} from './picks.js';
import {SNAP_RADIUS} from '../../lib/kishufiya-tidy-layout.js';
import tidyBlocks from '../../lib/kishufiya-tidy.js';
import {setNameAsk} from './name-ask.js';
import {answerId, asking, hearWith, inSession, opens, locateOf, looked, newContract, reasonSaid, toldAnew} from './session.js';
import {openMenuRects} from './open-menus.js';
import {scriptBoxes, topBlocksOf} from './script-boxes.js';
import {signTagOf, signShownAt, tagPlace, choiceOf, choiceIndex, openMenuItems} from './value-mark.js';

let vm = null;
let send = () => {};

// The library's multi-pick tells the lesson when it starts to add its marked sprites and when it is done (see multi-add above).
export const tellMultiAdd = on => send({type: 'multi-add', on});

const state = {
    guide: null, // {target, text}
    contract: newContract(), // the page's session and the places it asks for, apart from the guide (session.js)
    frozen: null, // the freeze message while on
    picking: false
};

// ---- the layer: a veil (with holes for a spotlight), a ring and a bubble ----

let layer = null;
let panels = [];
let ring = null;
let bubble = null;
let bubbleText = null;
let note = null;
let flash = null;
let pointer = null; // the bouncing arrow
let ghost = null; // a dragged block's way to where it goes
let valueTag = null; // the value to type, by the ringed field (value-mark.js)
let choiceRing = null; // the choice to pick, in the field's open menu

const div = className => {
    const el = document.createElement('div');
    el.className = className;
    return el;
};

const build = () => {
    layer = div(styles.layer);
    panels = [div(styles.veil)];
    layer.appendChild(panels[0]);
    note = div(styles.note);
    ring = div(styles.ring);
    flash = div(styles.flash);
    bubble = div(styles.bubble);
    bubble.setAttribute('dir', 'rtl');
    bubble.setAttribute('role', 'status');
    bubbleText = div(styles.text);
    bubble.appendChild(bubbleText);
    bubble.appendChild(div(styles.arrow));
    pointer = div(styles.pointer);
    ghost = div(styles.ghost);
    valueTag = div(styles.valueTag);
    choiceRing = div(styles.choice);
    for (const el of [note, ring, flash, ghost, pointer, valueTag, bubble]) layer.appendChild(el);
    document.body.appendChild(layer);
    // a field's menu is drawn over the guide's layer (the editor's own order), so the ring of its choice is its
    // own, over the menu
    document.body.appendChild(choiceRing);
};

const place = (el, r) => {
    if (!r) {
        el.style.display = 'none';
        return;
    }
    el.style.display = 'block';
    el.style.left = `${Math.round(r.left)}px`;
    el.style.top = `${Math.round(r.top)}px`;
    el.style.width = `${Math.max(0, Math.round(r.right - r.left))}px`;
    el.style.height = `${Math.max(0, Math.round(r.bottom - r.top))}px`;
};

const veilTop = () => {
    const bar = uiElement('menu-bar');
    return bar ? bar.getBoundingClientRect().bottom : 0;
};

// What a spotlight leaves open: the code area, and where the child picks a sprite (or the stage).
const SPOTLIGHT = ['[class*="sprite-selector_scroll-wrapper_"]', '[class*="stage-selector_stage-selector_"]'];
// ...but nothing there that changes the project: adding, deleting
const NOT_IN_SPOTLIGHT = '[class*="_add-button_"], [class*="delete-button"], [class*="action-menu_"]';

const holes = () => {
    const out = [];
    const code = codeArea();
    if (code) out.push(code);
    for (const selector of SPOTLIGHT) {
        const el = document.querySelector(selector);
        const r = el && el.getBoundingClientRect();
        if (r && r.width > 0) out.push(r);
    }
    return out;
};

let lastClip = '';
const drawVeil = () => {
    const veil = panels[0];
    if (!state.frozen) {
        place(veil, null);
        note.style.display = 'none';
        return;
    }
    const top = veilTop();
    const W = window.innerWidth;
    const H = window.innerHeight;
    place(veil, {left: 0, right: W, top, bottom: H});
    // holes cut with the even-odd rule: the veil neither shows nor catches the mouse there
    let clip = '';
    if (state.frozen.spotlight) {
        const box = r => {
            const x = Math.round(r.left);
            const y = Math.round(r.top - top);
            return `M${x} ${y}H${Math.round(r.right)}V${Math.round(r.bottom - top)}H${x}Z`;
        };
        const cut = holes().map(box)
            .join('');
        clip = `path(evenodd, "M0 0H${W}V${H - top}H0Z${cut}")`;
    }
    if (clip !== lastClip) {
        lastClip = clip;
        veil.style.clipPath = clip;
    }
    if (state.frozen.note) {
        note.textContent = state.frozen.note;
        note.style.display = 'block';
        note.style.top = `${Math.round(top + 8)}px`;
    } else {
        note.style.display = 'none';
    }
};

const GAP = 12;
const placeBubble = r => {
    bubble.style.display = 'block';
    const bw = bubble.offsetWidth;
    const bh = bubble.offsetHeight;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const room = {
        left: r.left - GAP,
        right: W - r.right - GAP,
        below: H - r.bottom - GAP,
        above: r.top - GAP
    };
    let side;
    if (room.left >= bw || room.right >= bw) side = room.left >= room.right ? 'left' : 'right';
    else side = room.below >= room.above ? 'below' : 'above';
    let x;
    let y;
    if (side === 'left' || side === 'right') {
        x = side === 'left' ? r.left - GAP - bw : r.right + GAP;
        y = ((r.top + r.bottom) / 2) - (bh / 2);
    } else {
        x = ((r.left + r.right) / 2) - (bw / 2);
        y = side === 'below' ? r.bottom + GAP : r.top - GAP - bh;
    }
    x = Math.max(4, Math.min(W - bw - 4, x));
    y = Math.max(4, Math.min(H - bh - 4, y));
    bubble.style.left = `${Math.round(x)}px`;
    bubble.style.top = `${Math.round(y)}px`;
    bubble.setAttribute('data-side', side);
    // the arrow points at the target's middle, along the bubble's edge
    const arrow = bubble.lastChild;
    if (side === 'left' || side === 'right') {
        const middle = ((r.top + r.bottom) / 2) - y;
        arrow.style.top = `${Math.round(Math.max(10, Math.min(bh - 10, middle)))}px`;
        arrow.style.left = '';
    } else {
        const middle = ((r.left + r.right) / 2) - x;
        arrow.style.left = `${Math.round(Math.max(10, Math.min(bw - 10, middle)))}px`;
        arrow.style.top = '';
    }
};

// A target may be missing for a moment (a sprite's code being drawn): reported only if it stays so.
const MISSING_AFTER_MS = 500;
let missingSince = 0;
let reported = null;
let lastCategory = null;
let scrolledTo = null; // the code block brought into view for this guide, once...
let scrolledScale = null; // ...at this zoom: a zoom moves every block, so the code is brought to it again (scroll-target)
const scrolledHere = id => scrolledTo === id && scrolledScale === workspace().scale;
const scrolled = id => {
    scrolledTo = id;
    scrolledScale = workspace().scale;
};
const DROP_MARGIN = 24; // px: a drop's outline is this far inside the code area (its scrollbar at the bottom)
const inView = (r, area) => area &&
    r.top >= area.top && r.bottom <= area.bottom && r.left >= area.left && r.right <= area.right;
// Seen as the code area can show it - else the code scrolls to it: a block, all of it in view; a whole script, all
// of it or, one longer than the view, half the view of it (detect.js scriptInView; review, 2026-11-08: a long
// script was never in view, and every guide message for it scrolled the code under the child)
const seenWell = (found, area) => (ringAlone(found.via) ? scriptInView(found.rect, area) : inView(found.rect, area));
// A whole script (targets.js `script`) is where it is seen: the part of it in the code area (detect.js scriptRing),
// in every marking - told so in guide-at, marked so (red or soft), and none of it there is as out of view. The cut
// was the red ring's alone: a soft mark went round all of it, over the tabs, and quiet told all of it seen, even
// under the palette (review, 2026-11-08). Any other target: as found.
const seenPart = (found, area) => {
    if (!ringAlone(found.via)) return found;
    const cut = scriptRing(found.rect, area, 4);
    return cut ? {...found, rect: cut.seen, cut} : {offscreen: true, block: found.block};
};

const uiRect = selector => {
    const el = document.querySelector(selector);
    return el ? el.getBoundingClientRect() : null;
};

// The block of the code the page's window keeps clear of while it points at a target that is no block
// (guide `clearOf`, decision 44).
const keepClearOf = () => {
    const named = state.guide && state.guide.clearOf;
    return named ? resolve(named, vm).block || null : null;
};

// The window's own box, for the part of a scroll container that shows (rects.js visibleOf)
const viewBox = () => ({left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight});

// 'guide-busy': told when a busy phase starts or ends (a block in flight, a dialog opening or moving, a library with nothing in it yet)
let busyTold = false;
let lastDialog = null;
const tellBusy = () => {
    const dialog = dialogBox(document);
    const grid = document.querySelector('[class*="library_library-scroll-grid_"]');
    const loading = Boolean(grid) && !grid.querySelector('[class*="library-item_library-item_"]');
    const now = isBusy({carried: carriedNow(), dialog, lastDialog, loading});
    lastDialog = dialog;
    const edge = busyEdge(busyTold, now);
    busyTold = now;
    if (edge) send(edge);
};

// Where the page is told the target is: sent only when it changes.
let lastAt = '';
let typedText = null; // the text the child's last key left in the focused box; kept only while the box still holds it (detect.js keptTyping)
const tellAt = (rect, via, arrow, extra) => {
    const at = frameOf(rect);
    const more = extra || {};
    const drop = more.drop ? {x: Math.round(more.drop.x), y: Math.round(more.drop.y)} : null;
    const value = typeof more.value === 'string' ? more.value : null;
    const raw = typeof more.raw === 'string' ? more.raw : null;
    // a block of the code, or one of its values: its whole script, for the page's bubble to keep clear of -
    // it covered the step's other value in the same script (donuts 8.11, 2026-10-26)
    const ofCode = state.guide && state.guide.target.in !== 'palette' && via !== 'category';
    // ...or, for a target that is no block of the code, the script of the block the guide names to keep
    // clear of (decision 44)
    const own = ofCode && more.block && !more.drop ? more.block : keepClearOf();
    const root = own && own.getRootBlock && own.getRootBlock();
    const box = root && root.getSvgRoot ? root.getSvgRoot().getBoundingClientRect() : null;
    const clear = box && box.width > 0 ? frameOf(box) : null;
    const lab = frameOf(more.label);
    const stage = stageFrame(more); // the stage's box, for a target inside it (the bubble stands beside the stage)
    const scroller = more.scroller || null; // the scrolling box the target is in: the base asks for its scroll
    // a dragged block's place: the frame it would have and where a release is accepted - reported, never decided here (platform
    // drop-frame.ts answers 'guide-frame', and only that is drawn)
    const whole = more.drop && rect ? dropBox(rect, more.drop, more.slot) : null;
    const dropRect = whole ? frameOf(whole) : null;
    const accept = whole ? frameOf(codeArea()) : null;
    // the code area's scroll, for a dock frame the base wants whole inside `accept` (it answers 'guide-scroll' {container: 'scripts'})
    const dropScroller = dropRect ? codeScroller() : null;
    // a free spot (a new script's hat) is no docking point: the frame is the box it would have, shifted or clipped by the base; a place
    // where a block joins attaches within Blockly's snap radius (zoomed), reported for the base's dock frame
    const free = Boolean(more.free);
    const ws = workspace();
    const snap = (typeof Blockly !== 'undefined' && Blockly.SNAP_RADIUS) || SNAP_RADIUS;
    const dropAttach = whole && !free && ws ? attachOf(whole, more.drop, snap, ws.scale || 1) : null;
    typedText = keptTyping(typedText, document.activeElement);
    const typed = typingOf(more, document.activeElement, typedText);
    // everything drawn beside the target, for the page's bubble to keep off (a tag, the outline as it is DRAWN - the frame the base
    // answered, not the one asked for -, a menu's choice, the label). Not the arrow: it grows for ten seconds and every step would
    // be a new report; the page keeps room for it already (`arrowRoom`)
    const shownBox = el => el && el.style.display !== 'none' && el.style.left !== '' ?
        {left: parseFloat(el.style.left), top: parseFloat(el.style.top), width: el.offsetWidth, height: el.offsetHeight} : null;
    // an open dropdown or field editor (Blockly's drop-down and widget divs): what the child picks from, so no window stands on it; it
    // opens and closes without the target moving, and the box is part of the key below, so each is told anew
    const openMenu = Array.from(document.querySelectorAll(OPEN_MENU_BOX)).map(el => el.getBoundingClientRect())
        .find(box => box.width > 0 && box.height > 0);
    const keepOff = drawnBoxes({
        menu: openMenu ? frameOf(openMenu) : null,
        tag: shownBox(valueTag),
        drop: dropRect && toldFrame ? toldFrame : null,
        choice: choiceRing && choiceRing.style.display !== 'none' ? frameOf(choiceRing.getBoundingClientRect()) : null,
        label: lab
    });
    const rects = readRects(document, scroller, viewBox()); // dialog, next, clip, carried (rects.js): reported, never decided here
    const key = JSON.stringify([at, via, arrow, value, raw, typed, drop, clear, lab, scroller, dropRect, accept, dropScroller, free, dropAttach, keepOff, stage, rects]);
    if (key === lastAt) return;
    lastAt = key;
    const id = state.guide ? state.guide.id : null;
    send(inSession({type: 'guide-at', id, rect: at, via: via || null, arrow: arrow || null, value, raw, ...(typed ? {typing: typed} : {}), drop, clear, label: lab, scroller, ...(stage ? {stage} : {}), ...(keepOff.length ? {keepOff} : {}), ...rects,
        ...(dropRect ? {dropRect, accept, dropKind: free ? 'free' : 'dock', dropScroller, ...(dropAttach ? {dropAttach} : {})} : {})}, state.guide && state.guide.ask, {found: Boolean(at)}));
};

// Where a dragged block goes: an outline of its first row, still, at its drop point, softly pulsing (Keren,
// 2026-10-25: a ghost sliding there over and over looked like a target in empty space, and faded just
// where the block goes).
// What is drawn is the frame the base told ('guide-frame', {left, top, width, height} | null): none until it comes, nothing on null
let toldFrame = null;
let lastGhost = '';
const placeGhost = (r, drop) => {
    const f = toldFrame;
    if (!r || !drop || !f || !(f.width > 0) || !(f.height > 0)) {
        ghost.style.display = 'none';
        lastGhost = '';
        return;
    }
    const key = [f.left, f.top, f.width, f.height].join();
    if (key === lastGhost) return;
    lastGhost = key;
    place(ghost, {left: f.left, right: f.left + f.width, top: f.top, bottom: f.top + f.height});
};

// The arrow bounces above the target, pointing down; below it, pointing up, when there is no room above -
// unless that covers something the child reads (2026-10-26), by `how`:
//   'beside'  a palette block or a button (the new-sprite one, whose menu opens above it): beside it, on the
//             code area's side - above it, it covered the block over it ("או" above "לא") or the menu's brush
//   'script'  a block of the code or its value: outside its script (`within`), at its height - in the script
//             it covered a neighbour's text ("0" in "=", "ניקוד")
//   'menu'    a category: above or below it inside the categories' column (`within`) - not on the "קוד" tab
//             above the column, nor on the palette's blocks beside it
const ARROW = 34;
// Not pressed for a while: the arrow grows slowly, from `afterMs` over `ms`, to `maxScale` times its size, and
// stays (K11, Keren 2026-10-28; a new guide starts it again at its own size). Its size is its real width and
// height, so the placing below - room above, beside the code, inside the screen - keeps it off the target and
// inside the frame as it grows. The numbers come with the guide (the platform's bubble-words.ts ARROW_*, message
// field `grow`); these are only for a platform that sends none.
const GROW_DEFAULT = {afterMs: 6000, ms: 10000, maxScale: 2};
const arrowScale = (waited, grow) => {
    // a field that is missing, not a number, or (for the time and the size) not positive falls back to its default
    const num = (value, fallback, min) => (Number.isFinite(value) && value >= min ? value : fallback);
    const g = {
        afterMs: num(grow && grow.afterMs, GROW_DEFAULT.afterMs, 0),
        ms: num(grow && grow.ms, GROW_DEFAULT.ms, 1),
        maxScale: num(grow && grow.maxScale, GROW_DEFAULT.maxScale, 1)
    };
    const t = Math.min(1, Math.max(0, (waited - g.afterMs) / g.ms));
    return 1 + ((g.maxScale - 1) * t);
};
let arrow = ARROW; // its size now, px
const sideways = (r, x, side) => {
    if (x < 0 || x + arrow > window.innerWidth) return null;
    pointer.style.display = 'block';
    pointer.style.left = `${Math.round(x)}px`;
    pointer.style.top = `${Math.round(((r.top + r.bottom) / 2) - (arrow / 2))}px`;
    pointer.setAttribute('data-side', side);
    return side;
};
// The buttons the arrow must not cover (the layer's own boxes are not among them)
// The open dropdown or field editor Blockly draws by a field (display none while closed: no box)
const OPEN_MENU_BOX = '.blocklyDropDownDiv, .blocklyWidgetDiv';
const NEIGHBOUR_BUTTONS = 'button, [role="button"], [class*="_add-button_"]';
// measured once per animation frame, however many times a draw places the arrow in it
let buttonBoxes = null;
const neighbourButtons = () => {
    if (!buttonBoxes) {
        buttonBoxes = Array.from(document.querySelectorAll(NEIGHBOUR_BUTTONS))
            .filter(el => !layer.contains(el))
            .map(el => el.getBoundingClientRect())
            .filter(box => box.width > 0 && box.height > 0);
        const forget = () => {
            buttonBoxes = null;
        };
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(forget);
        else setTimeout(forget, 0);
    }
    return buttonBoxes;
};
const placePointer = (r, how, within) => {
    const area = how && codeArea();
    if (how === 'beside' && area) {
        const side = (area.left + area.right) / 2 < (r.left + r.right) / 2 ? 'left' : 'right';
        const done = sideways(r, side === 'left' ? r.left - arrow - 6 : r.right + 6, side);
        if (done) return done;
    }
    if (how === 'script' && area && within) {
        const left = within.left - arrow - 6;
        const right = within.right + 6;
        const done = (left >= area.left && sideways(r, left, 'left')) ||
            (right + arrow <= area.right && sideways(r, right, 'right'));
        if (done) return done;
    }
    const menu = how === 'menu' && within;
    // above, below, or - at the screen's edge, where those cover the neighbouring button - the free side
    // (detect.js pointerPlace; kept inside the screen as it grows). A category is among its own column's rows:
    // no neighbours there.
    const put = pointerPlace({
        rect: r,
        neighbours: menu ? [] : neighbourButtons(),
        screen: {width: window.innerWidth, height: window.innerHeight},
        size: arrow,
        bounds: menu ? within : null
    });
    pointer.style.display = 'block';
    pointer.style.left = `${put.left}px`;
    pointer.style.top = `${put.top}px`;
    pointer.setAttribute('data-side', put.side);
    return put.side;
};

// What the ring is on now, for a click on it.
let shown = null;

// A target shown this long and not pressed gets a louder ring (Keren, 2026-10-25). Counted only while it
// is shown: one that was hidden (missing, under a library) starts again when it shows.
const LOUDER_AFTER_MS = 4000;
let louderKey = '';
let louderSince = 0;
const louder = on => {
    ring.classList.toggle(styles.louder, on);
};
const sizeArrow = (waited, grow) => {
    arrow = Math.round(ARROW * arrowScale(waited, grow));
    pointer.style.width = `${arrow}px`;
    pointer.style.height = `${arrow}px`;
};

// An open field editor (the direction dial, the number pad, a menu) belongs to the step that opened it:
// when the guide moves on it is closed, or it stays open over the code (Keren, 2026-10-25).
const closeFieldEditors = () => {
    const SB = window.ScratchBlocks;
    try {
        if (SB && SB.DropDownDiv) SB.DropDownDiv.hideWithoutAnimation();
        if (SB && SB.WidgetDiv) SB.WidgetDiv.hide();
    } catch (e) { /* the blocks are not loaded yet */ }
};

// The soft mark's colour from the guide message (`markColour`, softMarkColours in detect.js), as the variables
// guide.css reads; none (null): its own purple
let softColoured = false; // the variables are on the ring now
const setSoftColour = colours => {
    if (!colours && !softColoured) return;
    const vars = {
        '--mark-line': colours && colours.line,
        '--mark-glow': colours && colours.glow,
        '--mark-glow-point': colours && colours.glowPoint
    };
    for (const name of Object.keys(vars)) {
        if (vars[name]) ring.style.setProperty(name, vars[name]);
        else ring.style.removeProperty(name);
    }
    softColoured = Boolean(colours);
};

const hideGuide = () => {
    shown = null;
    louderKey = '';
    louder(false);
    sizeArrow(0);
    place(ring, null);
    ring.classList.remove(styles.soft);
    setSoftColour(null);
    ring.removeAttribute('data-open');
    ring.removeAttribute('data-edge');
    pointer.style.display = 'none';
    bubble.style.display = 'none';
    placeGhost(null, null);
    valueTag.style.display = 'none';
    place(choiceRing, null);
};

// What goes in the ringed field, as the base's signs say it (target.signs, value-mark.js): a value to type is drawn
// in a tag by the field or the box (never on the way to it: a sprite's tile, a category), and a value to pick is
// ringed in the menu the field opened, scrolled to once when the menu is long. → the tag's rectangle, for the page
// to keep its bubble off it (guide-at `label`)
let choiceShownFor = null;
const drawValue = found => {
    const signs = state.guide.target.signs;
    const onIt = found.via === 'field' || Boolean(found.input);
    // the sign of the target: a value by a field or a box, a choice by its field, a key by whatever is pressed (the stage)
    const sign = signTagOf(signs);
    const shown = signShownAt(sign, found);
    const text = shown ? shown.text : null;
    valueTag.setAttribute('data-kind', shown ? shown.kind : '');
    let at = null;
    valueTag.style.display = text === null ? 'none' : 'block';
    if (text !== null) {
        if (valueTag.textContent !== text) valueTag.textContent = text;
        at = tagPlace(found.rect, {width: valueTag.offsetWidth, height: valueTag.offsetHeight},
            {width: window.innerWidth, height: window.innerHeight}, Boolean(found.label));
        valueTag.style.left = `${at.left}px`;
        valueTag.style.top = `${at.top}px`;
    }
    const label = found.via === 'field' ? choiceOf(signs) : null;
    const items = label === null ? [] : openMenuItems(document);
    const item = items[choiceIndex(items.map(one => one.text), label)];
    if (item && choiceShownFor !== state.guide.id) {
        choiceShownFor = state.guide.id;
        if (item.el.scrollIntoView) item.el.scrollIntoView({block: 'nearest'});
    }
    if (!item) choiceShownFor = null; // the menu closed: opened again, its choice is scrolled to again
    place(choiceRing, item ? item.el.getBoundingClientRect() : null);
    return at;
};

// The ring (red or soft) at a target, 4px out on every side - a whole script's cut to the code area, the sides it
// goes on past open and every side cut at the area's edge said, for its pulse and glow to stay inside (seenPart,
// guide.css data-open and data-edge)
const placeRing = (found, el = ring) => {
    const r = found.rect;
    // a target on the screen's edge: the ring is kept inside it, its pulse and glow too (data-edge)
    const inside = ringInScreen(r, {width: window.innerWidth, height: window.innerHeight}, 4);
    place(el, found.cut ? found.cut.ring : inside.ring); // no ring: place hides it
    const sides = (name, list) => {
        if (list && list.length) el.setAttribute(name, list.join(' '));
        else el.removeAttribute(name);
    };
    sides('data-open', found.cut && found.cut.open);
    sides('data-edge', found.cut ? found.cut.edge : inside.edge);
};

// The target nowhere to be clicked: said once it stays so for a moment, again when the reason changes (with `by`,
// the sprite covering a sprite on the stage); the palette scrolling to it, never (detect.js missingStep). A quiet
// guide says it too: a step at guide level 2-3 was stuck (K12 review).
const tellMissing = found => {
    hideGuide();
    tellAt(null);
    const step = missingStep({
        reason: found.missing,
        by: found.by,
        since: missingSince,
        reported,
        now: performance.now(),
        after: MISSING_AFTER_MS
    });
    missingSince = step.since;
    reported = step.reported;
    if (step.tell) {
        const {id, target, ask} = state.guide;
        send(inSession({type: 'guide-missing', id, target, reason: reasonSaid(found.missing, ask), by: found.by || null}, ask));
    }
};

const drawGuide = () => {
    if (!state.guide) {
        hideGuide();
        tellAt(null);
        return;
    }
    // (a whole script: the part of it seen, from here on - its whole box decides the scroll)
    const whole = resolve(state.guide.target, vm);
    const area = codeArea();
    const found = seenPart(whole, area);
    if (state.guide.quiet) {
        // nothing drawn or scrolled: where it is (or that it is missing), and what is on it for a click
        if (found.offscreen) found.missing = 'offscreen';
        if (found.missing) {
            if (quietReports(found.missing)) tellMissing(found);
            else {
                hideGuide();
                tellAt(null);
            }
            return;
        }
        hideGuide();
        missingSince = 0;
        reported = null;
        shown = {rect: found.rect, via: found.via, input: Boolean(found.input)};
        tellAt(found.rect, found.via, null, found);
        return;
    }
    // a whole script seen well once - at the first look or after the one scroll - is the child's from then on: the
    // code is not scrolled to it again while this guide is on, though the child scrolls it away (it jumped back
    // while they searched; the manager, 2026-11-09)
    if (ringAlone(whole.via) && found.block && seenWell(whole, area)) scrolled(found.block.id);
    // a block of the code out of sight: the code area scrolls to it, once (the palette never does) - a whole script
    // when it is not seen as well as the area can show it (seenWell)
    if (found.block && !scrolledHere(found.block.id) && (found.offscreen || !seenWell(whole, area))) {
        scrolled(found.block.id);
        workspace().centerOnBlock(found.block.id);
        hideGuide();
        return;
    }
    // ...and where a block goes, when that place is out of sight (under a long script): to its anchor, once.
    // All of the outline, clear of the scrollbar at the bottom: half of it sat under it (donuts 8.9, 2026-10-26)
    const dropBottom = found.drop && (found.slot ? found.slot.bottom : found.drop.y + GHOST_ROW);
    const dropTop = found.drop && (found.slot ? found.slot.top : found.drop.y);
    const dropOut = found.drop && area && (dropTop < area.top + DROP_MARGIN || dropBottom + DROP_MARGIN > area.bottom);
    if (dropOut && found.anchor && !scrolledHere(found.anchor.id)) {
        scrolled(found.anchor.id);
        workspace().centerOnBlock(found.anchor.id);
        hideGuide();
        return;
    }
    // in a scrolling box (the palette, a list) out of its view: told where it is and the box, nothing drawn - the base asks
    // for the scroll ('guide-scroll') and the mark comes when the box has moved (scroll-target.ts scrollDecision)
    if (found.scrolling) {
        hideGuide();
        missingSince = 0;
        reported = null;
        tellAt(found.rect, found.via, null, found);
        return;
    }
    if (found.offscreen) found.missing = 'offscreen';
    if (found.missing) {
        tellMissing(found);
        return;
    }
    missingSince = 0;
    reported = null;
    const r = found.rect;
    shown = {rect: r, via: found.via, input: Boolean(found.input)};
    const marking = guideMarking({
        locate: state.guide.locate,
        highlight: state.guide.highlight,
        onTheWay: onTheWay(state.guide.target, found.via)
    });
    if (marking !== 'ring') {
        // located, not marked: where it is, and nothing drawn at it - or, for the thing a window talks about, the soft
        // mark alone (decision 32): no arrow, no bubble, no pulse
        hideGuide();
        shown = {rect: r, via: found.via, input: Boolean(found.input)};
        if (marking === 'soft') {
            placeRing(softFound(found)); // a pane's field with its name (targets.js softFound)
            ring.classList.add(styles.soft);
            setSoftColour(softMarkColours(state.guide.markColour));
            ring.classList.toggle(styles.point, found.via === 'stage-point');
        }
        tellAt(r, found.via, null, found);
        return;
    }
    placeRing(found);
    // an action's ring after a window's soft mark (the sprite's tile right after the flag's window): red again
    ring.classList.remove(styles.soft);
    setSoftColour(null);
    // a point on the stage: a round mark with a white halo, seen on a dark stage too (targets.js stagePoint)
    ring.classList.toggle(styles.point, found.via === 'stage-point');
    // a whole script (targets.js `script`): the ring alone - no arrow, no words, no louder ring (detect.js
    // ringAlone). Its count starts again when the guide goes on to a target to press (the script's sprite's tile).
    // Cut to the code area, the sides it goes on past open, and the part seen told, as in every marking (seenPart)
    if (ringAlone(found.via)) {
        louderKey = '';
        louder(false);
        pointer.style.display = 'none';
        bubble.style.display = 'none';
        placeGhost(null, null);
        valueTag.style.display = 'none';
        place(choiceRing, null);
        tellAt(r, found.via, null, found);
        return;
    }
    const now = performance.now();
    const key = `${state.guide.id}|${found.via}`;
    if (key !== louderKey) {
        louderKey = key;
        louderSince = now;
    }
    // held (a card, a question): the count starts again when it lets go, so the arrow does not jump at once to its
    // full size (K11 review)
    if (state.frozen) louderSince = now;
    louder(!state.frozen && now - louderSince >= LOUDER_AFTER_MS);
    sizeArrow(now - louderSince, state.guide.grow);
    placeGhost(r, found.drop);
    const tagAt = drawValue(found);
    if (tagAt && !found.label) found.label = tagAt;
    const target = state.guide.target;
    const ofCode = found.block && !found.drop && target.in !== 'palette' &&
        (found.via === 'block' || found.via === 'field');
    const root = ofCode && found.block.getRootBlock && found.block.getRootBlock();
    const beside = (found.via === 'block' && target.in === 'palette') ||
        target.ui === 'add-sprite' || target.ui === 'add-backdrop';
    let how = root ? 'script' : null;
    if (beside) how = 'beside';
    if (found.via === 'category') how = 'menu';
    const within = how === 'menu' ? uiRect('.blocklyToolboxDiv') : (root && root.getSvgRoot().getBoundingClientRect());
    // `pointer: false` (platform SPEC-editor-base section 3): the ring alone marks the target, no arrow - and none told
    const side = state.guide.pointer ? placePointer(r, how, within) : null;
    if (!state.guide.pointer) pointer.style.display = 'none';
    tellAt(r, found.via, side, found);
    const {text, textCategory, textSprite} = state.guide;
    const say = (found.via === 'category' && textCategory) || (found.via === 'sprite' && textSprite) || text;
    if (bubbleText.textContent !== say) bubbleText.textContent = say;
    if (say) placeBubble(r);
    else bubble.style.display = 'none';
};

// The places the page asks for ('locate', session.js): each told where it is when that changes, apart from the guide - none
// of its ring, arrow, bubble or scroll. With highlight, the soft mark of a why window at it, one of its own for each.
const softMarks = new Map(); // a place's request → its soft mark
const softMark = (request, found) => {
    let el = softMarks.get(request);
    if (!found) {
        if (el) el.remove();
        softMarks.delete(request);
        return;
    }
    if (!el) {
        el = div(`${styles.ring} ${styles.soft}`);
        layer.appendChild(el);
        softMarks.set(request, el);
    }
    placeRing(softFound(found), el); // a pane's field with its name (targets.js softFound)
    el.classList.toggle(styles.point, found.via === 'stage-point');
};
// What the contract is told of one look at a place's target (session.js looked): the target itself, the way to it, or why
// it is not here
const lookOf = (target, found) => {
    if (found.offscreen) return {missing: 'offscreen'};
    if (found.missing) return {missing: found.missing, by: found.by, passing: passingBy(found.missing)};
    if (!found.rect) return {};
    if (onTheWay(target, found.via)) return {missing: 'on-the-way', via: found.via};
    return {rect: frameOf(found.rect), via: found.via, drop: found.drop, scroller: found.scroller, scrolling: Boolean(found.scrolling), ...(stageFrame(found) ? {stage: stageFrame(found)} : {}), rects: readRects(document, found.scroller, viewBox())};
};
const drawLocates = () => {
    for (const request of [...softMarks.keys()]) if (!locateOf(state.contract, request)) softMark(request, null);
    if (!state.contract.locates.length) return;
    const area = codeArea();
    const now = performance.now();
    for (const {request, target} of state.contract.locates) {
        const found = seenPart(resolve(target, vm), area);
        const step = looked(state.contract, request, lookOf(target, found), now, MISSING_AFTER_MS);
        state.contract = step.state;
        for (const msg of step.say) send(msg);
        softMark(request, step.soft ? found : null);
    }
};

// One frame loop, only while something is on screen; nothing runs otherwise. It looks for its targets
// ten times a second, not every frame: class PCs are slow, and a ring 0.1s late is not noticed.
// The base's 'tidy': done at once, or when the block being dragged is let go, or when there is a code area again
// (detect.js tidyStep: asked for until done). What the guide remembers of where its target was goes with it: the code
// may scroll to the target once more, and the base is told its new place.
let tidyAsked = false;
const tidyIfAsked = () => {
    const ws = workspace();
    const step = tidyStep(tidyAsked, Boolean(ws && ws.isDragging && ws.isDragging()), () => tidyBlocks('wide'));
    tidyAsked = step.asked;
    if (!step.done) return;
    scrolledTo = null;
    state.contract = toldAnew(state.contract);
    lastAt = '';
    lastGhost = '';
};

const EVERY_MS = 100;
let frame = 0;
let drawn = 0;
let urgent = false;
const tick = now => {
    frame = 0;
    if (!layer) return;
    if (urgent || now - drawn >= EVERY_MS) {
        urgent = false;
        drawn = now;
        tidyIfAsked();
        drawVeil();
        drawGuide();
        drawLocates();
        if (state.guide || state.contract.locates.length) tellBusy();
    }
    if (state.guide || state.frozen || tidyAsked || state.contract.locates.length || softMarks.size) frame = requestAnimationFrame(tick);
};
const wake = () => {
    urgent = true;
    if (!frame) frame = requestAnimationFrame(tick);
};

// ---- input: the veil blocks the mouse by itself; the keyboard and picks are caught here ----

const swallow = e => {
    e.preventDefault();
    e.stopImmediatePropagation();
};

const onKey = e => {
    if (state.frozen) {
        swallow(e);
        return;
    }
    // a key the child pressed ("לחצו על חץ ימני"): the lesson may be waiting for it - with or without a guide
    // on show (a guide level that marks nothing sends none, 2026-10-26); not a letter typed into a name box.
    // `code`: the key's place - on a Hebrew layout the "a" key's `key` is "ש" (2026-10-26)
    if (e.type !== 'keydown' || e.repeat || typing(e.target)) return;
    // ...pressed with a button or a tab of the editor in focus (the green flag's, a tab just clicked): scratch-gui
    // gives it to the game only from the page itself, so the lesson passed a key step the game never saw (K12).
    // Given to the game here; its keyup is always (vm-listener-hoc handleKeyUp).
    if (vm && !gameHeard(e.target, document)) vm.postIOData('keyboard', {...gameKey(e), isDown: true});
    send({type: 'key', key: e.key, code: e.code});
};

// The value is when the lesson last spoke: a lesson that closed without a guide-clear leaves it, and library.jsx
// (multiAllowed) takes one older than a minute as gone.
const setLibraryStep = on => {
    if (on) document.body.setAttribute('data-kishufiya-library-step', String(Date.now()));
    else document.body.removeAttribute('data-kishufiya-library-step');
};

const PRESS = new Set(['pointerdown', 'mousedown', 'touchstart']);
let lastPick = 0;
const onPointer = e => {
    if (state.frozen && e.target.closest && e.target.closest(NOT_IN_SPOTLIGHT)) {
        swallow(e);
        return;
    }
    if (state.frozen && e.type === 'contextmenu') {
        swallow(e);
        return;
    }
    // a click on the target itself: a button, a sprite's tile, a library item (not a box to type in, a
    // category or a search box - those lead on to the target, they do not end the step)
    // pointerdown only: it covers mouse, touch and pen, and a tap is one of it (touchstart came as a second)
    // ...and never on a located target (the thing a why window talks about): a press on the flag during the window
    // passed the step (decision 32 fix)
    if (shown && !state.frozen && e.type === 'pointerdown' && !shown.input && tellsClick(state.guide) &&
        ['ui', 'sprite', 'library'].includes(shown.via)) {
        const point = e.touches ? e.touches[0] : e;
        const {rect} = shown;
        if (point.clientX >= rect.left - 4 && point.clientX <= rect.right + 4 &&
            point.clientY >= rect.top - 4 && point.clientY <= rect.bottom + 4) {
            send(inSession({type: 'guide-clicked', id: state.guide ? state.guide.id : null, via: shown.via}, state.guide && state.guide.ask));
        }
    }
    if (!state.picking) return;
    const block = blockAt(e.target);
    if (!block) return; // empty code area: scrolling still works
    swallow(e);
    if (!PRESS.has(e.type)) return;
    // one press arrives as pointerdown, then mousedown/touchstart: report it once
    if (e.timeStamp - lastPick < 400) return;
    lastPick = e.timeStamp;
    const path = block.svgPath_ ? block.svgPath_.getBoundingClientRect() : block.getSvgRoot().getBoundingClientRect();
    place(flash, {left: path.left - 4, right: path.right + 4, top: path.top - 4, bottom: path.bottom + 4});
    flash.classList.remove(styles.flashing);
    void flash.offsetWidth; // restart the animation
    flash.classList.add(styles.flashing);
    const target = vm && vm.editingTarget;
    send({
        type: 'picked',
        opcode: block.type,
        blockId: block.id,
        sprite: target ? target.getName() : null,
        inside: surrounding(block),
        top: block.getRootBlock().type
    });
};

// ---- what the child does: blocks added or removed, the category in view, run and stop ----

const counts = new Map(); // target id → {opcode: count} of its own blocks (no shadows)
const countBlocks = target => {
    const out = {};
    for (const b of Object.values(target.blocks._blocks)) {
        if (!b.shadow) out[b.opcode] = (out[b.opcode] || 0) + 1;
    }
    return out;
};

// The open sprite's scripts as boxes, told when they change (the same debounce as the code's diff, no polling): the page finds
// scripts lying on each other from them (script-boxes.js).
let lastBoxes = '';
let boxesTimer = 0;
// While a block is being dragged its place is not settled (and a block in the child's hand covers scripts it is only passing over):
// nothing is told, and the drop's own change tells it (a drag ends with a change event).
const tellScriptBoxes = target => {
    const ws = workspace();
    if (!ws || !ws.getTopBlocks) return;
    if (ws.isDragging && ws.isDragging()) {
        if (!boxesTimer) boxesTimer = setTimeout(() => { boxesTimer = 0; const now = vm && vm.editingTarget; if (now) tellScriptBoxes(now); }, 150);
        return;
    }
    const boxes = scriptBoxes(topBlocksOf(ws), Boolean(ws.RTL));
    const key = JSON.stringify([target.getName(), boxes]);
    if (key === lastBoxes) return;
    lastBoxes = key;
    send({type: 'script-boxes', sprite: target.getName(), boxes});
};

let changeTimer = 0;
const diffCode = () => {
    changeTimer = 0;
    const target = vm && vm.editingTarget;
    if (!target) return;
    tellScriptBoxes(target);
    const now = countBlocks(target);
    const before = counts.get(target.id);
    counts.set(target.id, now);
    if (!before) return; // first look at this sprite: nothing changed yet
    const sprite = target.getName();
    send({type: 'code-changed', sprite});
    for (const opcode of new Set([...Object.keys(before), ...Object.keys(now)])) {
        const d = (now[opcode] || 0) - (before[opcode] || 0);
        for (let i = 0; i < Math.abs(d); i++) send({type: d > 0 ? 'block-added' : 'block-removed', opcode, sprite});
    }
};

const onChange = () => {
    if (!changeTimer) changeTimer = setTimeout(diffCode, 150);
};

const watchCategory = () => {
    const ws = workspace();
    const toolbox = ws && ws.getToolbox && ws.getToolbox();
    if (!toolbox || toolbox.kishufiyaGuide) return Boolean(toolbox);
    const proto = Object.getPrototypeOf(toolbox);
    const setSelectedItem = proto.setSelectedItem;
    proto.setSelectedItem = function (item, scroll) {
        setSelectedItem.call(this, item, scroll);
        const id = item && item.id_;
        if (id && id !== lastCategory) {
            lastCategory = id;
            send({type: 'category-opened', id});
            wake();
        }
    };
    toolbox.kishufiyaGuide = true;
    return true;
};

// A block dragged: told when the drag starts (scratch-blocks fires only its end) and when it ends. The dragger's two
// methods, wrapped once for every drag - a palette block's and a code block's alike.
const watchDrags = () => {
    const SB = window.ScratchBlocks;
    const proto = SB && SB.BlockDragger && SB.BlockDragger.prototype;
    if (!proto || proto.kishufiyaGuide) return;
    const {startBlockDrag, endBlockDrag} = proto;
    proto.startBlockDrag = function (...args) {
        startBlockDrag.apply(this, args);
        send({type: 'block-drag', on: true});
    };
    proto.endBlockDrag = function (...args) {
        try {
            endBlockDrag.apply(this, args);
        } finally {
            send({type: 'block-drag', on: false}); // a drop that failed is still over
        }
    };
    proto.kishufiyaGuide = true;
};

// Is there a block of this kind in a sprite's code (anywhere, not only the open sprite's)? From the
// VM's blocks: a block's parent holds it in an input (it is inside the parent) unless the block is
// the parent's next one (it follows the parent).
const find = ({opcode, inside}) => {
    const sprites = [];
    for (const target of vm.runtime.targets) {
        if (!target.isOriginal) continue;
        const blocks = target.blocks._blocks;
        const match = Object.values(blocks).some(b => {
            if (b.opcode !== opcode || b.shadow) return false;
            if (!inside) return true;
            let child = b;
            let parent = blocks[b.parent];
            while (parent) {
                if (parent.next !== child.id && parent.opcode === inside) return true;
                child = parent;
                parent = blocks[parent.parent];
            }
            return false;
        });
        if (match) sprites.push(target.getName());
    }
    return sprites;
};

// ---- the editor's windows (a library, a prompt): told to the page, which draws nothing over them ----

let lastWindow = '';
const tellWindow = again => {
    const now = editorWindow();
    const key = `${now.open}|${now.naming}|${now.tag}`;
    if (key === lastWindow && !again) return;
    lastWindow = key;
    send({type: 'window', open: now.open, naming: now.naming, tag: now.tag});
};
// Each window is a react-modal portal of its own on the body, filled a moment after it is added: the
// body's children are watched for portals, and each portal's own content - never the editor's subtree,
// which changes all the time.
const watchWindows = () => {
    const inPortal = new MutationObserver(() => tellWindow());
    const watching = {childList: true, subtree: true, attributes: true, attributeFilter: ['class']}; // a category chosen changes a class
    const watched = new WeakSet();
    const onBody = () => {
        for (const el of document.body.children) {
            if (el.classList.contains('ReactModalPortal') && !watched.has(el)) {
                watched.add(el);
                inPortal.observe(el, watching);
            }
        }
        tellWindow();
    };
    new MutationObserver(onBody).observe(document.body, {childList: true});
    onBody();
};

// ---- the messages ----

const stopGame = () => {
    try {
        vm.stopAll();
    } catch (e) { /* no project yet */ }
};

// What a message of the page does here, once the contract let it through (handleGuide). → true when msg was the guide's
const handleSaid = msg => {
    switch (msg.type) {
    case 'guide': {
        const id = answerId(msg);
        if (!state.guide || state.guide.id !== id) closeFieldEditors();
        state.guide = {
            id,
            ask: asking(msg), // the {session, request} its answers say (session.js), null for a page that says no session
            target: msg.target,
            text: msg.text || '',
            textCategory: msg.textCategory,
            textSprite: msg.textSprite,
            grow: msg.grow,
            markColour: msg.markColour,
            quiet: Boolean(msg.quiet),
            locate: Boolean(msg.locate),
            highlight: Boolean(msg.highlight),
            clearOf: msg.clearOf || null,
            pointer: msg.pointer !== false
        };
        // a guide whose target is in a library waits for one pick: the library marks no several then (library.jsx multiAllowed) -
        // unless the step says `multi` (platform decision 55: a set of sprites added together); an older page never says it
        setLibraryStep(Boolean(msg.target && (msg.target.library || msg.target.libraryTag) && !msg.target.multi));
        missingSince = 0;
        reported = null;
        scrolledTo = null;
        toldFrame = null;
        lastAt = ''; // a new guide is told where its target is even when it is where the last one was
        tellWindow(true); // ...and whether a window is open: the page may have been loaded since
        break;
    }
    case 'names':
        setNameAsk(msg);
        break;
    case 'guide-scroll':
        // the base's decision, done: a box scrolled to a target (targets.js scrollContainer)
        if ((state.guide && answerId(msg) === state.guide.id) || locateOf(state.contract, answerId(msg))) scrollContainer(msg.container, msg.top, msg.left);
        break;
    case 'guide-frame':
        // the base's decision for the frame at the drop (platform drop-frame.ts): drawn exactly, nothing on null
        if (state.guide && answerId(msg) === state.guide.id) {
            toldFrame = msg.frame || null;
            lastGhost = '';
        }
        break;
    case 'guide-clear':
        toldFrame = null;
        setNameAsk({clear: true});
        state.guide = null;
        setLibraryStep(false);
        break;
    case 'freeze':
        if (msg.on) {
            closeFieldEditors();
            state.frozen = msg;
            if (msg.stop !== false) stopGame();
            document.body.classList.add(styles.frozen);
        } else {
            state.frozen = null;
            state.picking = false;
            document.body.classList.remove(styles.frozen);
        }
        // the veil catches the mouse, so it follows the freeze now, not on the next frame: a page the
        // browser does not draw (behind another window, a slow PC) gets no frame, and the veil left over a
        // question just answered ate the child's presses of the green flag (donuts 6.9/9.13, 2026-10-25)
        drawVeil();
        break;
    case 'pick':
        state.picking = Boolean(msg.on);
        break;
    case 'guide-typed':
        endEdit(document.activeElement, answerId(msg), state.guide && state.guide.id);
        return true;
    case 'tidy':
        tidyAsked = true;
        tidyIfAsked();
        break;
    case 'focus-game': {
        // the keyboard's focus to the stage, so a key pressed reaches the game (platform press-run.ts asksKeys)
        focusGame(document);
        return true;
    }
    case 'key-press': {
        const key = forwardedKey(msg, Boolean(state.frozen));
        if (key && vm) {
            vm.postIOData('keyboard', key.io);
            if (key.tell) send(key.tell);
        }
        return true;
    }
    case 'find':
        send(inSession({type: 'found', id: msg.id, sprites: vm ? find(msg) : []}, asking(msg)));
        return true;
    case 'snapshot':
        // the stage as it is, for the lesson's finish screen: the child's own game, not a gamepad
        try {
            vm.renderer.requestSnapshot(url => send(inSession({type: 'snapshot', id: msg.id, url}, asking(msg))));
        } catch (e) {
            send(inSession({type: 'snapshot', id: msg.id, url: null}, asking(msg)));
        }
        return true;
    default:
        return false;
    }
    document.body.classList.toggle(styles.picking, state.picking);
    wake();
    return true;
};

// → true when msg was the guide's. The contract hears it first (session.js hearWith): a message of a session that is over
// is dropped, a session that begins first drops what was told before (the orders, done as the page's own messages), and
// a place asked or cleared is kept there and drawn by the loop. The opening (session.js opens) is answered through `say`
// from the moment the page loads: before the editor is up there is no layer here and no sender of the guide's
// (kishufiya.jsx hears it then, and hands in its own way to answer).
export const handleGuide = (msg, say = send) => {
    if (!msg || (!layer && !opens(msg))) return false;
    if (document.body.hasAttribute('data-kishufiya-library-step')) {
        document.body.setAttribute('data-kishufiya-library-step', String(Date.now()));
    }
    const said = hearWith(state.contract, msg, next => {
        state.contract = next;
    }, handleSaid, say);
    if (msg.type === 'locate' || msg.type === 'locate-clear') wake(); // a place asked or gone: the loop draws it
    return said;
};

// The code area's place, told when it changes: the page keeps ניצוצי off the sprite tiles and the zoom
// buttons (2026-10-26).
let lastArea = '';
let areaTicks = 0;
// asked often, so a menu that opens is heard at once; sent only when it changed, and again every second
const AREA_EVERY_MS = 250;
const AREA_RESEND = 4;
const tellCodeArea = () => {
    // said again now and then: a lesson page loaded anew after the editor did not hear it
    if (++areaTicks % AREA_RESEND === 0) lastArea = '';
    const box = r => r && r.width > 0 && {
        left: Math.round(r.left),
        top: Math.round(r.top),
        width: Math.round(r.width),
        height: Math.round(r.height)
    };
    const rect = box(codeArea());
    // the controls ניצוצי must not cover: the zoom buttons, the sprite tiles' pane, the stage
    const avoid = ['.blocklyZoom', '[class*="target-pane_target-pane_"]', '[class*="stage-wrapper_stage-wrapper_"]']
        .map(selector => box(uiRect(selector)))
        .filter(Boolean)
        // ...and any menu open over the code: the bubble stands off it while it is open (open-menus.js)
        .concat(openMenuRects(document));
    const key = JSON.stringify([rect, avoid]);
    if (key === lastArea || !send) return;
    lastArea = key;
    send({type: 'code-area', rect, avoid});
};

// once, when the VM is up
// A script started by its hat (the flag, a key, a sprite clicked) - told once its threads ended, or RUN_LOOK_MS after
// they started for one that goes on (a forever loop), with whether the game changed meanwhile (detect.js scriptRan).
// The lesson counts a press by it (platform K17): a key the game never got starts nothing.
const RUN_LOOK_MS = 1200;
const watchRuns = () => {
    const runtime = vm.runtime;
    if (!runtime || runtime.kishufiyaRuns) return;
    runtime.kishufiyaRuns = true;
    // the pointer's press-downs so far, for each sprite the press it was last told for (a receiver ran a block), and the senders
    // whose broadcast is being looked at now (detect.js pressingBroadcast)
    const pressed = runtime.kishufiyaPressed = {count: 0, by: new Map(), looking: new Set()};
    const mouseIo = runtime.ioDevices && runtime.ioDevices.mouse;
    if (mouseIo && mouseIo.postData) {
        const postData = mouseIo.postData.bind(mouseIo);
        mouseIo.postData = data => {
            // every press-down post counts (a moves post carries no isDown): a cancelled touch leaves the VM down, and the
            // next press-down must still be a new press (stage.jsx listens to touchend, not touchcancel)
            if (data && data.isDown === true) pressed.count++;
            return postData(data);
        };
    }
    const startHats = runtime.startHats.bind(runtime);
    runtime.startHats = (hat, fields, target) => {
        const threads = startHats(hat, fields, target);
        if (!threads || !threads.length || !TOLD_HATS.includes(hat)) return threads;
        // a broadcast counts only as a press of the sprite whose script sent it, pointer down on it (detect.js
        // pressingBroadcast): any other is not watched at all - a game that broadcasts every frame costs nothing
        const sender = hat === 'event_whenbroadcastreceived' ? runtime.sequencer && runtime.sequencer.activeThread : null;
        let lookedFor = null;
        if (hat === 'event_whenbroadcastreceived') {
            const mouse = runtime.ioDevices && runtime.ioDevices.mouse;
            const from = sender && sender.target;
            if (!mouse || !from || pressed.looking.has(from.id)) return threads;
            const down = mouse.getIsDown();
            const held = pressingBroadcast({down, touching: down && from.isTouchingObject('_mouse_'),
                lastPress: pressed.by.get(from.id), press: pressed.count});
            if (!held.tell) return threads;
            lookedFor = {id: from.id, press: held.lastPress};
        }
        const before = gameState(runtime.targets);
        if (lookedFor) pressed.looking.add(lookedFor.id);
        const started = Date.now();
        let blocks = false;
        const lookOnce = () => {
            const done = threads.every(th => !runtime.isActiveThread(th));
            const late = Date.now() - started >= RUN_LOOK_MS;
            blocks = blocks || threads.some(th => ranUnder({
                hasNext: th.target && th.target.blocks.getNextBlock(th.topBlock),
                done: !runtime.isActiveThread(th),
                atTop: th.peekStack() === th.topBlock,
                late: late && runtime.isActiveThread(th)
            }));
            // told as soon as a block under the hat ran, or once they ended, or a moment after
            if (!blocks && !done && Date.now() - started < RUN_LOOK_MS) {
                setTimeout(look, 30);
                return;
            }
            if (lookedFor) {
                pressed.looking.delete(lookedFor.id);
                // the press is used up only when a receiver ran a block: another receiver in the same press may still
                if (blocks) pressed.by.set(lookedFor.id, lookedFor.press);
            }
            send(scriptRan({hat, fields, threads, before, after: gameState(runtime.targets), done, blocks, sender}));
        };
        // a look that throws must not leave this button's press "being looked at" for the rest of the session
        function look () {
            try {
                lookOnce();
            } catch (e) {
                if (lookedFor) pressed.looking.delete(lookedFor.id);
                throw e;
            }
        }
        setTimeout(look, 30);
        return threads;
    };
    // "מקש נלחץ?" in a running script: told as it turns true (keyReadNow). Read where both the interpreter and the
    // compiled scripts ask - the keyboard itself, which nothing else asks.
    const keyboard = runtime.ioDevices && runtime.ioDevices.keyboard;
    if (keyboard && keyboard.getKeyIsDown && !keyboard.kishufiyaReads) {
        keyboard.kishufiyaReads = true;
        const isDown = keyboard.getKeyIsDown.bind(keyboard);
        const last = new Map();
        keyboard.getKeyIsDown = keyArg => {
            const pressed = isDown(keyArg);
            const key = String(keyArg).toLowerCase();
            if (keyReadNow(last, key, pressed)) send({type: 'key-read', key});
            return pressed;
        };
    }
};

export const attachGuide = (theVm, sender) => {
    vm = theVm;
    send = sender;
    if (!layer) {
        build();
        watchWindows();
    }
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKey, true);
    window.addEventListener('input', e => { if (typing(e.target)) typedText = e.target.value; wake(); }, true);
    window.addEventListener('focusin', () => { typedText = null; }, true);
    const inputs = [
        'pointerdown', 'mousedown', 'touchstart', 'pointerup', 'mouseup', 'touchend', 'click', 'contextmenu', 'dblclick'
    ];
    for (const type of inputs) {
        window.addEventListener(type, onPointer, {capture: true, passive: false});
    }
    vm.on('PROJECT_CHANGED', onChange);
    vm.on('workspaceUpdate', () => setTimeout(() => {
        watchCategory();
        watchDrags();
        diffCode(); // a sprite opened: its blocks as they are now are the baseline
        // which one: a lesson step "עוברים לרקע" is done once it is open (platform 2026-10-26)
        const target = vm.editingTarget;
        if (target) send({type: 'editing', sprite: target.getName()});
    }, 0));
    // a sprite clicked on the stage: its "when this sprite clicked" scripts start here (scratch-vm io/mouse.js)
    const mouse = vm.runtime.ioDevices && vm.runtime.ioDevices.mouse;
    if (mouse && mouse._activateClickHats && !mouse.kishufiyaClicks) {
        const activate = mouse._activateClickHats.bind(mouse);
        mouse.kishufiyaClicks = true;
        mouse._activateClickHats = target => {
            if (target) send({type: 'sprite-clicked', sprite: target.getName()});
            return activate(target);
        };
    }
    watchPicks(vm, msg => send(msg));
    watchRuns();
    vm.runtime.on('PROJECT_RUN_START', () => send({type: 'ui', name: 'run'}));
    // the green flag while the game is already running restarts it without a new "run start" (the threads
    // never reach zero): every press of the flag is a run (Keren, 2026-10-25 - a guess waited for a run)
    // ...and said apart as the flag too: only the flag, not a click on a block (which runs too), passes a
    // step whose last action is pressing it (platform 2026-10-26)
    vm.runtime.on('PROJECT_START', () => {
        send({type: 'ui', name: 'run'});
        send({type: 'ui', name: 'flag'});
    });
    vm.runtime.on('PROJECT_RUN_STOP', () => send({type: 'ui', name: 'stop'}));
    window.addEventListener('resize', wake);
    // the code area, for the page to put ניצוצי where it covers no button (its middle, at the bottom)
    setInterval(tellCodeArea, AREA_EVERY_MS);
};
