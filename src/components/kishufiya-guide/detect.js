// כישופייה guide: the pure parts of telling the lesson what the child did (K12, 2026-10-28) - no DOM, no VM, so
// they are tested (test/unit/kishufiya-guide/detect.test.js).

// The key as scratch-gui gives it to the game (lib/vm-listener-hoc.jsx handleKeyDown).
export const gameKey = e => ({key: (!e.key || e.key === 'Dead') ? e.keyCode : e.key, keyCode: e.keyCode});

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
