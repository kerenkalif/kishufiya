// כישופייה guide: the pure parts of telling the lesson what the child did (K12, 2026-10-28) - no DOM, no VM, so
// they are tested (test/unit/kishufiya-guide/detect.test.js).

// The key as the game gets it, here and in scratch-gui (lib/vm-listener-hoc.jsx): a letter or a digit by its place
// on the keyboard (KeyboardEvent.code) - on a Hebrew layout the "a" key's `key` is "ש", and a game listening to "a"
// never heard it (platform K17 review); an arrow by its `key` - NumLock off, Numpad8 is the up arrow -; anything else
// as scratch-gui gave it.
export const gameKey = e => {
    if (typeof e.key === 'string' && e.key.startsWith('Arrow')) return {key: e.key, keyCode: e.keyCode};
    const code = typeof e.code === 'string' ? e.code : '';
    const letter = /^Key([A-Z])$/.exec(code);
    const digit = /^(?:Digit|Numpad)([0-9])$/.exec(code);
    if (letter) return {key: letter[1].toLowerCase(), keyCode: e.keyCode};
    if (digit) return {key: digit[1], keyCode: e.keyCode};
    return {key: (!e.key || e.key === 'Dead') ? e.keyCode : e.key, keyCode: e.keyCode};
};

// Whether scratch-gui passed this keydown to the game itself: only one pressed on the page as such, not on a
// focused button or tab of the editor (vm-listener-hoc: "Don't capture keys intended for Blockly inputs").
export const gameHeard = (target, doc) => target === doc || Boolean(doc && target === doc.body);

// The keyboard's focus to the game ('focus-game'): blur what has it, so the next key's target is the page itself (gameHeard). The
// canvas is NOT focused: a key on it is not "the page as such", and the game would not hear it.
export const focusGame = doc => {
    const active = doc && doc.activeElement;
    if (active && active !== doc.body && typeof active.blur === 'function') active.blur();
    return Boolean(doc);
};

// A box being typed into: its letters are not the game's keys, nor the lesson's.
export const typing = el => Boolean(el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)));

// What the page is told of a box the child is typing in (guide-at `typing`, platform SPEC-editor-base section 3.3): the box's own text as it is
// now, and `fresh` - the text in the box is not what the child typed (nothing typed, or the app wrote a new value). The sprite's boxes keep what is typed to themselves until blur or Enter
// (BufferedInput), so the game does not hold it yet: the page says "the value is in" (guide-typed) and the guide ends the edit
// (endEdit). `pad` false: the real keyboard, no key to ring. null: the guided target is no box, or the focus is not in it.
export const typingOf = (found, active, typedText) => {
    if (!found || !found.input || typeof found.value !== 'string') return null;
    if (!active || active.tagName !== 'INPUT' || active.value !== found.value) return null;
    return {text: found.value, fresh: typedText !== found.value, pad: false};
};

// What the child typed in the focused box, derived from the box's own text (never a flag that stays on): the text the child's last
// key left there, kept only while the box still holds it. A different text is one the app wrote (the direction dial turns the value
// while the focus stays in the box), so it is not the child's typing and the next report calls it fresh.
export const keptTyping = (typedText, active) =>
    typeof typedText === 'string' && active && active.tagName === 'INPUT' && active.value === typedText ? typedText : null;

// The platform says the value asked for is in the box ('guide-typed'): the edit ends the way the child's own blur ends it, so the
// box submits (BufferedInput handleFlush) and the game holds the value. Only a box of the guided id and only while the focus is in one.
export const endEdit = (active, msgId, guideId) => {
    if (msgId !== guideId || !active || active.tagName !== 'INPUT' || typeof active.blur !== 'function') return false;
    active.blur();
    return true;
};

// A key the lesson heard while the child's focus was in it, not in the editor (msg 'key-press'): what the game is
// given, and what the lesson is told back. Nothing while frozen, a repeat, or without a key.
// A keyup is given even while frozen: a key let go of must never stay held down in the game (K12 review).
export const forwardedKey = (msg, frozen) => {
    if (!msg || typeof msg.key !== 'string' || !msg.key || msg.repeat) return null;
    const down = msg.down !== false;
    if (frozen && down) return null;
    return {
        io: {...gameKey(msg), isDown: down},
        tell: down ? {type: 'key', key: msg.key, code: msg.code} : null
    };
};

// A sprite on the stage, on the screen: its bounds (scratch-render getBounds, stage units, y up) on the stage's
// canvas (its client rect), clipped to the stage. → {rect} or {missing: 'hidden' | 'offstage'}: a hidden sprite or
// one wholly off the stage cannot be clicked (scratch-render picks only visible drawables), so the lesson says so
// instead of waiting for a click that cannot come. A ghost of 100 is not picked either (RenderWebGL.pick): hidden too.
// The stage itself hidden (no canvas on the screen) comes first: 'stage-hidden' - nothing on it can be clicked, and
// "the sprite is hidden" would be untrue (K12 review).
export const spriteOnStage = ({visible, ghost, bounds, stage, canvas}) => {
    if (!canvas || !(canvas.width > 0)) return {missing: 'stage-hidden'};
    if (!visible || ghost >= 100) return {missing: 'hidden'};
    if (!bounds || !stage) return {missing: 'offstage'};
    const halfW = stage.width / 2;
    const halfH = stage.height / 2;
    const left = Math.max(bounds.left, -halfW);
    const right = Math.min(bounds.right, halfW);
    const top = Math.min(bounds.top, halfH);
    const bottom = Math.max(bounds.bottom, -halfH);
    if (right <= left || top <= bottom) return {missing: 'offstage'};
    const sx = canvas.width / stage.width;
    const sy = canvas.height / stage.height;
    return {
        rect: {
            left: canvas.left + ((left + halfW) * sx),
            right: canvas.left + ((right + halfW) * sx),
            top: canvas.top + ((halfH - top) * sy),
            bottom: canvas.top + ((halfH - bottom) * sy)
        }
    };
};

// Where the first script of an empty sprite goes (platform editor-fixes-2, 2026-10-31: the very first hat had no dashed
// outline, every later one did): the code area's top corner on the side the workspace starts from - its right in a
// right-to-left editor, where a dropped hat's starting corner lands - FIRST_SCRIPT_PX in from both edges, in screen
// pixels, so the outline is in view and clear of the area's edge whatever the zoom. → {x, y}: the script's starting
// corner (a drop point as findFreeSpot gives one), or null without a code area.
export const FIRST_SCRIPT_PX = 40;
export const firstScriptSpot = ({area, rtl, margin = FIRST_SCRIPT_PX}) => {
    if (!area || !(area.width > 0) || !(area.height > 0)) return null;
    return {x: rtl ? area.right - margin : area.left + margin, y: area.top + margin};
};

// The box a dragged block going to `drop` would have, as the editor REPORTS it (guide-at `dropRect`, unclipped: platform drop-frame.ts
// decides what is drawn): a slot itself; else the block's first row (a C block's mouth is not drawn, its top row says where it joins,
// GHOST_ROW px) with the corner it joins by (its top-right in a right-to-left editor) at the drop point. `r`: the block's own box. Pure.
export const GHOST_ROW = 44;
export const dropBox = (r, drop, slot) => {
    const height = Math.min(r.bottom - r.top, GHOST_ROW);
    return slot || {left: drop.x - (r.right - r.left), right: drop.x, top: drop.y, bottom: drop.y + height};
};

// The code area's scroll as the base asks for it (guide-at `dropScroller`, SPEC-editor-base 3.3 item 2): id 'scripts', how far the view is
// from the content's top, and the most it can be. `m`: the workspace's getMetrics(). The base asks for a scroll ('guide-scroll') when a
// dock frame is not whole inside the accepted area; scriptsScrollY is the workspace's scrollY that puts the view at `top`. Pure.
export const SCRIPTS_ID = 'scripts';
export const scriptsScroller = m => ({
    id: SCRIPTS_ID,
    scrollTop: Math.round(m.viewTop - m.contentTop),
    maxScrollTop: Math.max(0, Math.round(m.contentHeight - m.viewHeight)),
    // sideways too (the view's distance from the content's left edge, whatever the writing direction)
    scrollLeft: Math.round(m.viewLeft - m.contentLeft),
    maxScrollLeft: Math.max(0, Math.round(m.contentWidth - m.viewWidth))
});
export const scriptsScrollY = (m, top) => -(m.contentTop + top);
export const scriptsScrollX = (m, left) => -(m.contentLeft + left);

// How a dock target attaches, as the editor REPORTS it (guide-at `dropAttach`; the base draws the dock frame from it, platform drop-frame.ts
// dockFrame): Blockly connects a dragged block's connection to the target's when they are within SNAP_RADIUS (48 workspace units,
// Blockly.SNAP_RADIUS; kishufiya-tidy-layout.js SNAP_RADIUS) - `scale` screen px to a unit - and a child holds the block by its middle, so the
// held point is the middle of the box the block has at the drop (`dropBox`), as an offset from the drop point. Pure.
export const attachOf = (whole, drop, snap, scale) => {
    const radius = snap * scale;
    if (!whole || !drop || !(radius > 0)) return null;
    return {radius: Math.round(radius * 10) / 10, held: {x: Math.round((whole.left + whole.right) / 2 - drop.x), y: Math.round((whole.top + whole.bottom) / 2 - drop.y)}};
};

// A point on the stage (Scratch's coordinates, y up) on the screen: a small round mark around it on the stage's canvas
// (its client rect), for a lesson's "why" that points at where a sprite will arrive (platform decision 28 stage 2,
// 2026-10-31). → {rect} - POINT_MARK px wide, following the stage's size and place - or {missing: 'stage-hidden'} (no
// canvas on the screen; first, as for a sprite) / 'offstage' (outside the stage, or no point at all).
export const POINT_MARK = 28;
export const stagePointOnScreen = ({x, y, stage, canvas, size = POINT_MARK}) => {
    if (!canvas || !(canvas.width > 0)) return {missing: 'stage-hidden'};
    if (!stage || !Number.isFinite(x) || !Number.isFinite(y)) return {missing: 'offstage'};
    const halfW = stage.width / 2;
    const halfH = stage.height / 2;
    if (x < -halfW || x > halfW || y < -halfH || y > halfH) return {missing: 'offstage'};
    const cx = canvas.left + ((x + halfW) * (canvas.width / stage.width));
    const cy = canvas.top + ((halfH - y) * (canvas.height / stage.height));
    return {rect: {left: cx - (size / 2), right: cx + (size / 2), top: cy - (size / 2), bottom: cy + (size / 2)}};
};

// The point itself: a coordinate the lesson left out is the sprite's own at that moment (its x for "set y to 0": where
// the sprite will arrive), so it needs the sprite - {missing: 'sprite'} without one. `sprite`: {x, y} or null.
export const stagePointOf = (point, sprite) => {
    const given = {x: point && point.x, y: point && point.y};
    const own = coordinate => {
        if (Number.isFinite(given[coordinate])) return given[coordinate];
        return sprite ? sprite[coordinate] : null;
    };
    const x = own('x');
    const y = own('y');
    if (!Number.isFinite(x) || !Number.isFinite(y)) return {missing: 'sprite'};
    return {x, y};
};

// A library item that is not to be ringed: why. The library closed → 'library' (the lesson points at its button);
// open, and the item not in it - no search box to find it with, or its whole name typed there and still nothing →
// 'not-in-library' (the lesson says so; pointing at the button behind the open library looped, K11 review).
export const libraryMissing = ({open, search, searched, name}) => {
    if (!open) return 'library';
    if (!search) return 'not-in-library';
    const typed = String(searched || '').trim()
        .toLowerCase();
    return typed && typed === String(name).trim()
        .toLowerCase() ? 'not-in-library' : null;
};

// The fields of the sprite info pane (targets.js PANE_FIELDS). The pane can be collapsed (the sprite-properties addon
// folds it to height 0 with overflow hidden, so its inputs keep a real rect while nothing of them is seen) or not on
// the screen at all: then a field is not "missing", the pane is hidden - the child opens it. -> true when `rect`
// (the field's) is really inside what `pane` (the pane's rect, or null) shows.
export const fieldInPane = (pane, rect) => {
    if (!pane || !rect || !(pane.width > 0) || !(pane.height > 0)) return false;
    const slack = 1;
    return rect.top >= pane.top - slack && rect.bottom <= pane.bottom + slack &&
        rect.left >= pane.left - slack && rect.right <= pane.right + slack;
};

// What a quiet guide (guide levels 2-3: nothing drawn) says is missing: only what the child can act on - a sprite
// covered or hidden, the stage hidden, the focus in a box, a library item. A block not built yet, out of view, a
// palette scrolling are the usual state at those levels, where nothing points at them: said, they brought a wrong
// "lost" (K12 review).
const QUIET_REPORTS = new Set(['covered', 'hidden', 'stage-hidden', 'pane-hidden', 'typing', 'library', 'not-in-library']);
export const quietReports = reason => QUIET_REPORTS.has(reason);

// A target missing for a moment is told (guide-missing) only once it stays so for `after` ms, and again when the
// reason changes. The palette scrolling to the block is no missing at all: it passes by itself, the page already
// waits on guide-at {rect: null}, and told it put the "why" on a card instead of on the block (donuts 2.1,
// 2026-10-29: a category click and two scrolls run past half a second). It is never told, and the count starts
// over after it. -> {since, reported, tell}: the new count and last told reason, and whether to tell it now.
const PASSING = new Set(['scrolling']);
export const passingBy = reason => PASSING.has(reason);
export const missingStep = ({reason, by, since, reported, now, after}) => {
    if (passingBy(reason)) return {since: 0, reported, tell: false};
    const from = since || now;
    const why = `${reason}|${by || ''}`;
    const tell = now - from >= after && reported !== why;
    return {since: from, reported: tell ? why : reported, tell};
};

// What the guide draws at a target it found (guide.js drawGuide): 'ring' - the red ring, the arrow and the bubble,
// "do this here" (an action); 'soft' - a soft mark in the buddy's colour and nothing else: the thing a window of the
// lesson talks about, not a press (msg.highlight with msg.locate; platform decision 32, 2026-10-31: the flag over the
// stage had a red ring and a red arrow while the why window said what it is, "confusing"); 'none' - nothing at all,
// only told where it is (msg.locate alone: the bubble beside a palette block, K24). The way to a target (its category,
// its sprite's tile) is always ringed.
export const guideMarking = ({locate, highlight, onTheWay}) => {
    if (onTheWay || !locate) return 'ring';
    return highlight ? 'soft' : 'none';
};

// What comes with the red ring (guide.js drawGuide, marking 'ring'): at a target to press - "do this here" - the
// arrow, the words and, not pressed for a while, a louder ring. A whole script (via 'script', targets.js) is where to
// look, not what to press: the ring alone. An arrow there pointed at the script's top block, and the child took that
// block for the answer (platform point-help, 2026-11-08); a louder ring, which grows, would spread over the scripts
// beside it.
export const ringAlone = via => via === 'script';

// A whole script's ring on the screen (guide.js drawGuide, ringAlone): its box `pad` px out on every side, cut
// to the code area - a ring over the tabs or off the screen looked broken, and the child only needs to see which
// script is meant (the manager for Keren, 2026-11-08). A script longer than the view is ringed where it is seen
// (the guide scrolls the code to it only while it is not seen as well as the view can show it, scriptInView
// below); a side it goes on past is open, drawn without its edge (guide.css data-open). A side where only the
// `pad` is cut stays closed: the script itself ends there. Past every side (taller and wider than the view), its
// sides are drawn at the area's edge and only the top and the bottom are open: open all round, the ring had no
// line at all while guide-at told it seen (review, 2026-11-08) - and a script is a stack, it goes on up and down.
// `rect`: the script's box; `area`: the code area's, null for no cut. → {ring, seen, open, edge} - the ring's
// box, the part of the script seen (what guide-at tells), the open sides and the sides cut at the area's edge,
// open or closed ('top', 'bottom', 'left', 'right'; guide.css data-edge keeps the ring's pulse and a soft mark's
// glow from spreading past them) - or null when nothing of the script is in the area.
export const scriptRing = (rect, area, pad) => {
    const ring = {left: rect.left - pad, right: rect.right + pad, top: rect.top - pad, bottom: rect.bottom + pad};
    if (!area) return {ring, seen: rect, open: [], edge: []};
    const cut = r => ({
        left: Math.max(r.left, area.left),
        right: Math.min(r.right, area.right),
        top: Math.max(r.top, area.top),
        bottom: Math.min(r.bottom, area.bottom)
    });
    const seen = cut(rect);
    if (seen.right <= seen.left || seen.bottom <= seen.top) return null;
    const past = {
        top: rect.top < area.top,
        bottom: rect.bottom > area.bottom,
        left: rect.left < area.left,
        right: rect.right > area.right
    };
    if (past.top && past.bottom && past.left && past.right) {
        past.left = false;
        past.right = false;
    }
    const atEdge = {
        top: ring.top < area.top,
        bottom: ring.bottom > area.bottom,
        left: ring.left < area.left,
        right: ring.right > area.right
    };
    const sides = ['top', 'bottom', 'left', 'right'];
    return {
        ring: cut(ring),
        seen,
        open: sides.filter(side => past[side]),
        edge: sides.filter(side => atEdge[side])
    };
};

// Is a whole script seen as well as the code area can show it (guide.js drawGuide: if not, the code scrolls to it,
// once for each guide message, as to a block - and not once it was seen so: from then on the child's own scrolling
// is left alone)? Along each of the area's sides: all of it, where it fits; where it
// is longer than the view, enough of it to fill half the view - from its middle, from its hat or to its end. A
// long script is never all in view, and every guide message for it scrolled the code away from where the child
// had it (review, 2026-11-08). `rect`: the script's box; `area`: the code area's, null for none (→ false, as for
// a block).
export const scriptInView = (rect, area) => {
    if (!area) return false;
    const along = (from, to, start, end) => {
        if (to - from <= end - start) return from >= start && to <= end;
        return Math.min(to, end) - Math.max(from, start) >= (end - start) / 2;
    };
    return along(rect.top, rect.bottom, area.top, area.bottom) && along(rect.left, rect.right, area.left, area.right);
};

// Does a press on the target tell the lesson (guide-clicked)? Only on an action's target: a located one - the thing a
// why window talks about, the block its bubble is beside - is not there to be pressed, and a press on the flag during
// the window passed the step (platform decision 32 fix, 2026-10-31).
export const tellsClick = guide => Boolean(guide) && !guide.locate;

// Is `via` (where resolve reached the target) only on the way to it, not the target itself? The tile of the sprite
// it belongs to, its category (a palette block in a closed one), the code tab, a library's search box. A guide that
// locates without marking (msg.locate, platform K24 2026-10-29: a new block's "why" is said beside it, with no ring
// and no arrow) still rings the way - the child has to open the category first - and draws nothing at the target.
export const onTheWay = (target, via) => {
    if (!target) return false;
    switch (via) {
    case 'sprite': return Boolean(target.block || target.blockId || target.category || target.ui);
    case 'category': return !target.category;
    case 'ui': return !target.ui;
    case 'search': return true;
    default: return false;
    }
};

// Where on a sprite's rect to ask the renderer what is on top: its middle and four points around it.
export const samplePoints = r => {
    const x = f => r.left + ((r.right - r.left) * f);
    const y = f => r.top + ((r.bottom - r.top) * f);
    const at = [[0.5, 0.5], [0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]];
    return at.map(([fx, fy]) => ({x: x(fx), y: y(fy)}));
};

// The sprite on top at those points (drawable ids, -1 for none): the sprite itself somewhere → null, it can be
// clicked; else the first other sprite on it → its id, it is covered (K12 review: a click on it started the other
// one). Nothing at all there (its bounds' transparent corners) → null.
export const coveredBy = (picks, own) => {
    if (picks.includes(own)) return null;
    const others = picks.filter(id => id >= 0);
    return others.length ? others[0] : null;
};

// ---- A script that really ran, and whether it changed the game (platform K17, 2026-10-28) ----
// The lesson counts a press (the flag, a key, a sprite clicked) only when the child's script under that hat started
// and did something: donuts 3.2 counted an up arrow the game never got, and 2.1 passed with nothing run.
// 'event_whenbroadcastreceived' too (platform 2026-11-01): a button built as flag -> forever -> if mouse down and touching ->
// broadcast has no click hat, so its press is the broadcast it sends - told with who sent it (scriptRan `from`), and only
// while the pointer (a mouse or a finger) is down on the sender (pressingBroadcast): a broadcast at the flag, or outside
// the button's `if`, is not a press.
export const TOLD_HATS = ['event_whenflagclicked', 'event_whenkeypressed', 'event_whenthisspriteclicked', 'event_whenbroadcastreceived'];

// What a run can change, as one string: each sprite's place, direction, size, look, shown or not, its variables,
// how many clones it has; the stage's backdrop and variables. `targets`: the runtime's targets.
export const gameState = targets => JSON.stringify((targets || []).map(t => {
    const vars = Object.values(t.variables || {}).map(v => [v.name, v.value]);
    if (t.isStage) return ['stage', t.currentCostume, vars];
    return [
        t.isOriginal ? 'o' : 'c', t.sprite && t.sprite.name, Math.round(t.x), Math.round(t.y), t.direction, t.size,
        t.visible, t.currentCostume, vars
    ];
}));

// Whether a thread ran a block under its hat: it has one (`hasNext`), and it ended, moved past the hat, or is still
// running when the look ends (`late` - a compiled forever shows no place in its stack).
export const ranUnder = ({hasNext, done, atTop, late}) =>
    Boolean(hasNext) && (Boolean(done) || !atTop || Boolean(late));

// "מקש נלחץ?" read in a running script (sensing_keypressed): told once each time it turns true for that key - the
// lesson counts it as the key pressed (a key read inside a forever, with no hat for it). `last`: a Map of the
// last answer by key. → whether to tell.
export const keyReadNow = (last, key, pressed) => {
    const was = last.get(key);
    last.set(key, Boolean(pressed));
    return Boolean(pressed) && !was;
};

// The message for threads a hat started: the sprites whose scripts they are (a clone's as its sprite's name), the
// key its hat waits for, whether a block under it ran (`blocks` - what the lesson counts), and for the record
// whether the game changed and they ended.
// `sender`: the thread that started them, for a broadcast that is a press (pressingBroadcast) - its sprite's name goes in `from`.
// A broadcast is a press of its sender's sprite only while the pointer is down on that sprite - the button's own
// condition (mouse down and touching the pointer). Told once for each press of the pointer: a held button broadcasts on
// every frame, so `press` (the number of the pointer's press-downs so far, counted by guide.js) is what tells a new press
// from the same hold, whatever the frame rate. `lastPress`: the press this sender was last told for. -> {tell, lastPress}.
export const pressingBroadcast = ({down, touching, lastPress, press}) => {
    const tell = Boolean(down && touching) && lastPress !== press;
    return {tell, lastPress: tell ? press : lastPress};
};

export const scriptRan = ({hat, fields, threads, before, after, done, blocks, sender}) => {
    const message = {
        type: 'script-ran',
        hat,
        blocks: Boolean(blocks),
        sprites: [...new Set(threads.map(th => (th.target && th.target.sprite ? th.target.sprite.name : null))
            .filter(Boolean))],
        changed: before !== after,
        done: Boolean(done)
    };
    if (fields && typeof fields.KEY_OPTION === 'string') message.key = fields.KEY_OPTION;
    if (hat === 'event_whenbroadcastreceived') {
        message.from = sender && sender.target && sender.target.sprite ? [sender.target.sprite.name] : [];
    }
    return message;
};

// ---- the arrow's side, the ring inside the screen, the soft mark's colour ----
// (pure; guide.js placePointer, placeRing)

const overlaps = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

// Where the bouncing arrow goes at a target to press: 'above' | 'below' | 'left' | 'right', and its box. Above or
// below the target by default (the one with room, as before); but never over a neighbouring button or off the screen
// - a button at the bottom or in a corner has its neighbour right over it ("בחרו דמות" over "בחרו רקע"), so the
// arrow goes to the free side. Tried in order: the default side, the other one, then left and right (the one with
// more room first).
// `rect`: the target; `neighbours`: boxes the arrow must stay off (the target itself and a frame around it, which
// contain it within 2px, are ignored; a button next to it, even touching it, is kept); `screen`: {width, height};
// `bounds`: {top, bottom} the vertical sides keep to (the categories' column), default the screen. Nothing free
// (a crowded corner): the default side, as before. → {side, left, top}
const SAME_BOX = 2;
const isTargetOrFrame = (n, rect) => n.left <= rect.left + SAME_BOX && n.top <= rect.top + SAME_BOX &&
    n.right >= rect.right - SAME_BOX && n.bottom >= rect.bottom - SAME_BOX;
export const pointerPlace = ({rect, neighbours = [], screen, size, gap = 6, bounds}) => {
    const top = bounds ? bounds.top : 0;
    const bottom = bounds ? bounds.bottom : screen.height;
    const middle = Math.round(((rect.left + rect.right) / 2) - (size / 2));
    const centredLeft = Math.max(0, Math.min(screen.width - size, middle));
    const centredTop = Math.round(((rect.top + rect.bottom) / 2) - (size / 2));
    const aboveFirst = rect.top - size - 8 > top || rect.bottom + size + 8 > bottom;
    const spot = {
        above: {side: 'above', left: centredLeft, top: Math.round(rect.top - size - gap)},
        below: {side: 'below', left: centredLeft, top: Math.round(rect.bottom + gap)},
        left: {side: 'left', left: Math.round(rect.left - size - gap), top: centredTop},
        right: {side: 'right', left: Math.round(rect.right + gap), top: centredTop}
    };
    const wider = rect.left > screen.width - rect.right ? ['left', 'right'] : ['right', 'left'];
    const order = (aboveFirst ? ['above', 'below'] : ['below', 'above']).concat(wider);
    const others = neighbours.filter(n => !isTargetOrFrame(n, rect));
    const free = s => s.left >= 0 && s.left + size <= screen.width && s.top >= 0 && s.top + size <= screen.height &&
        !others.some(n => overlaps(n, {left: s.left, right: s.left + size, top: s.top, bottom: s.top + size}));
    return order.map(name => spot[name]).find(free) || spot[order[0]];
};

// The ring at a target: `pad` px out on every side but kept inside the screen - a button on the screen's edge had
// its ring cut. A side it was moved in on is in `edge` (guide.css data-edge keeps the pulse and a soft mark's glow
// inside there too). A target wholly off the screen has no ring: {ring: null, edge: []}. → {ring, edge}
export const ringInScreen = (rect, screen, pad) => {
    const out = {left: rect.left - pad, right: rect.right + pad, top: rect.top - pad, bottom: rect.bottom + pad};
    const ring = {
        left: Math.max(0, out.left),
        right: Math.min(screen.width, out.right),
        top: Math.max(0, out.top),
        bottom: Math.min(screen.height, out.bottom)
    };
    if (ring.right <= ring.left || ring.bottom <= ring.top) return {ring: null, edge: []};
    const edge = [];
    if (ring.top !== out.top) edge.push('top');
    if (ring.bottom !== out.bottom) edge.push('bottom');
    if (ring.left !== out.left) edge.push('left');
    if (ring.right !== out.right) edge.push('right');
    return {ring, edge};
};

// The soft mark's colour as the page sends it (guide message `markColour`, platform bubble-colours.ts: a hex
// colour): the line and the two glows, or null when there is none or it is not a hex colour - then the mark keeps
// guide.css's purple, as for a page that does not send it.
export const softMarkColours = value => {
    const hex = typeof value === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value.slice(1) : null;
    if (!hex) return null;
    const full = hex.length === 3 ? hex.replace(/./g, '$&$&') : hex;
    const [r, g, b] = [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16));
    return {line: `#${full}`, glow: `rgba(${r}, ${g}, ${b}, 0.65)`, glowPoint: `rgba(${r}, ${g}, ${b}, 0.8)`, halo: `rgba(${r}, ${g}, ${b}, 0.35)`};
};

// The pixels at an edge of the code area the base asks to keep free (guide message `reserve` {top, bottom}, SPEC-editor-base 15.1): a
// whole number of pixels, 0 or more. null for anything else; the base decides the number, never measured here.
export const reservePx = value => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.round(value) : null);
export const reserveTopPx = reservePx;

// What a 'reserve' {top, bottom} or its alias 'reserve-top' {px} (= top px, bottom 0) asks for: {top, bottom} in whole pixels, or null
// when the message is not one of those (a field that is there but is not a number 0 or more spoils it; a missing one is 0).
export const reserveOf = msg => {
    if (!msg) return null;
    if (msg.type === 'reserve-top') {
        const px = reservePx(msg.px);
        return px === null ? null : {top: px, bottom: 0};
    }
    if (msg.type !== 'reserve') return null;
    const top = msg.top === undefined ? 0 : reservePx(msg.top);
    const bottom = msg.bottom === undefined ? 0 : reservePx(msg.bottom);
    return top === null || bottom === null ? null : {top, bottom};
};

// The workspace's metrics with the top `top` and the bottom `bottom` px of the code area kept free (SPEC-editor-base 15.1): the view is
// that much shorter and starts `top` lower (absoluteTop - the content is translated by it), so the scroll still reaches every block
// (nothing hides behind either strip), the zoom controls (placed from viewHeight) sit above the bottom strip, and only the code area
// moves, never the palette. `m`: the workspace's own getMetrics(); the same object back for 0 and 0.
export const reserveMetrics = (m, top, bottom = 0) => {
    const t = top > 0 ? top : 0;
    const b = bottom > 0 ? bottom : 0;
    if (!m || (!t && !b)) return m;
    return {...m, absoluteTop: (m.absoluteTop || 0) + t, viewHeight: Math.max(0, m.viewHeight - t - b)};
};
export const reservedMetrics = (m, px) => reserveMetrics(m, px, 0);

// What 'code-area' says (SPEC-editor-base 15.1): the box measured after both moves, what to avoid, `reserved` - the px really kept at
// the top (absent = 0) - and `reservedBottom` at the bottom (absent = 0). `key` - said only when it changed, so both are in it: a change
// of a strip alone is told again.
export const codeAreaMessage = (rect, avoid, reserved, reservedBottom) => {
    const kept = reserved > 0 ? reserved : 0;
    const keptBottom = reservedBottom > 0 ? reservedBottom : 0;
    return {
        key: JSON.stringify([rect, avoid, kept, keptBottom]),
        msg: {type: 'code-area', rect, avoid, ...(kept ? {reserved: kept} : {}), ...(keptBottom ? {reservedBottom: keptBottom} : {})}
    };
};

// 'stage-mode' {fullscreen} (SPEC-editor-base 15.1): said on change only. `told` - what the page was last told (false at the start:
// the page takes a stage that is not full-screen as given); `now` - the editor's stage is full-screen now (scratch-gui isFullScreen).
// -> the message, or null when there is nothing to tell.
export const stageModeMessage = (told, now) => (Boolean(told) === Boolean(now) ? null : {type: 'stage-mode', fullscreen: Boolean(now)});

// The lesson's 'tidy' (guide.js), one look at it: `asked` - whether it is still asked for after this look, `done` -
// whether the scripts were put in place now. Not while a block is being dragged - blocks never move under the child's
// hand, it is done at the drop -, and a tidy that could not be done (`tidy` → false: no code area to tidy in, as on
// the costumes tab) stays asked for until it can, never dropped. `tidy` is run at most once, and only when it may.
export const tidyStep = (asked, dragging, tidy) => {
    if (!asked) return {asked: false, done: false};
    if (dragging) return {asked: true, done: false};
    const done = Boolean(tidy());
    return {asked: !done, done};
};

// What the guide drew by the target, as the boxes the page's bubble keeps off (guide-at `keepOff`, platform SPEC-editor-base section 3.3):
// the value or key tag, an open menu or field editor, the outline of a place where a block goes as it is drawn (the arrow is not: it grows, and the page keeps room for it), the ring round a menu's choice, and the words that
// say what the target is (`label`). Each is a {left, top, width, height} box in the frame's pixels, or null/undefined when it is not
// drawn; one with no size is not a box. A list, not one box round them all: that box would cover the target and everything between.
// `menu`: what the child must act on that the editor draws by the target - a dropdown or a field editor that is open (OPEN_MENU_BOX): no
// window of the page may cover it (Keren 24.11: the bubble stood on "up arrow", the choice to pick)
export const drawnBoxes = ({tag, drop, choice, label, menu}) =>
    [tag, drop, choice, label, menu].filter(box => box && box.width > 0 && box.height > 0)
        .map(box => ({left: box.left, top: box.top, width: box.width, height: box.height}));
