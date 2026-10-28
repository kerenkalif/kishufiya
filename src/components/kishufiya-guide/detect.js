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

// A box being typed into: its letters are not the game's keys, nor the lesson's.
export const typing = el => Boolean(el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)));

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

// What a quiet guide (guide levels 2-3: nothing drawn) says is missing: only what the child can act on - a sprite
// covered or hidden, the stage hidden, the focus in a box, a library item. A block not built yet, out of view, a
// palette scrolling are the usual state at those levels, where nothing points at them: said, they brought a wrong
// "lost" (K12 review).
const QUIET_REPORTS = new Set(['covered', 'hidden', 'stage-hidden', 'typing', 'library', 'not-in-library']);
export const quietReports = reason => QUIET_REPORTS.has(reason);

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
export const TOLD_HATS = ['event_whenflagclicked', 'event_whenkeypressed', 'event_whenthisspriteclicked'];

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
export const scriptRan = ({hat, fields, threads, before, after, done, blocks}) => {
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
    return message;
};
