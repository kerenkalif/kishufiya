// כישופייה guide (2026-10-23): the lesson points into the editor instead of showing screenshots.
// Generic on purpose - it knows nothing of lessons, children or answers; the platform decides what to
// show and what a pick means. Messages (msg.type), from the page around the editor:
//   guide        {target, text?, textCategory?, textSprite?}
//                                      ring the target (targets.js) and bounce an arrow at it; with a
//                                      text, also a speech bubble beside it (the page may draw its own
//                                      instead, where 'guide-at' says the target is). While the target is
//                                      reached through its category or its sprite's tile (the child has
//                                      to open it first), textCategory / textSprite replace text
//   guide-clear  {}
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
//   picked {opcode, blockId, sprite, inside: [opcode], top}
//   (guide-missing, guide-at and guide-clicked carry the guide's `id`, as it was sent with 'guide', so the
//   page tells them apart from what was said about the guide before)
//   guide-missing {id, target, reason}              the target is nowhere on the screen (for half a second)
//   guide-at {rect: {left, top, width, height} | null, via, arrow: 'above' | 'below', value?, drop?}
//                                                   where the guided target is now, in this frame's pixels,
//                                                   and on which side of it the arrow is; a field's value;
//                                                   a dragged block's drop point {x, y} - sent on change
//   ui {name: 'run' | 'stop'}                       the green flag / stop sign
//   key {key}                                       a key pressed while a step is guided (KeyboardEvent.key)
//   guide-clicked {via}                             the child clicked the guided target itself (a button, a
//                                                   sprite's tile, a library item) - for the lesson, a step done
//   found {id, sprites: [name]}                     the answer to 'find' ('Stage' is the stage)
import {resolve, codeArea, blockAt, surrounding, uiElement, workspace} from './targets.js';
import styles from './guide.css';

let vm = null;
let send = () => {};

const state = {
    guide: null, // {target, text}
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
    for (const el of [note, ring, flash, ghost, pointer, bubble]) layer.appendChild(el);
    document.body.appendChild(layer);
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
let scrolledTo = null; // the code block brought into view for this guide, once
const inView = (r, area) => area &&
    r.top >= area.top && r.bottom <= area.bottom && r.left >= area.left && r.right <= area.right;

// Where the page is told the target is: sent only when it changes.
let lastAt = '';
const tellAt = (rect, via, arrow, extra) => {
    const at = rect ? {
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        width: Math.round(rect.right - rect.left),
        height: Math.round(rect.bottom - rect.top)
    } : null;
    const more = extra || {};
    const drop = more.drop ? {x: Math.round(more.drop.x), y: Math.round(more.drop.y)} : null;
    const value = typeof more.value === 'string' ? more.value : null;
    const key = JSON.stringify([at, via, arrow, value, drop]);
    if (key === lastAt) return;
    lastAt = key;
    const id = state.guide ? state.guide.id : null;
    send({type: 'guide-at', id, rect: at, via: via || null, arrow: arrow || null, value, drop});
};

// A dragged block's way: a ghost of its size slides from it to its drop point, again and again. Only
// a transform moves; the distance is two CSS variables.
let lastGhost = '';
const placeGhost = (r, drop) => {
    if (!r || !drop) {
        ghost.style.display = 'none';
        lastGhost = '';
        return;
    }
    const key = [r.left, r.top, r.right, r.bottom, drop.x, drop.y].map(Math.round).join();
    if (key === lastGhost) return;
    lastGhost = key;
    // the corner a block joins by goes to the drop point: its top-right in a right-to-left editor
    place(ghost, r);
    ghost.style.setProperty('--dx', `${Math.round(drop.x - r.right)}px`);
    ghost.style.setProperty('--dy', `${Math.round(drop.y - r.top)}px`);
};

// The arrow bounces above the target, pointing down; below it, pointing up, when there is no room above.
const ARROW = 34;
const placePointer = r => {
    const above = r.top - ARROW - 8 > 0;
    pointer.style.display = 'block';
    pointer.style.left = `${Math.round(((r.left + r.right) / 2) - (ARROW / 2))}px`;
    pointer.style.top = `${Math.round(above ? r.top - ARROW - 6 : r.bottom + 6)}px`;
    pointer.setAttribute('data-side', above ? 'above' : 'below');
    return above ? 'above' : 'below';
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
    pointer.classList.toggle(styles.louder, on);
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

const hideGuide = () => {
    shown = null;
    louderKey = '';
    louder(false);
    place(ring, null);
    pointer.style.display = 'none';
    bubble.style.display = 'none';
    placeGhost(null, null);
};

const drawGuide = () => {
    if (!state.guide) {
        hideGuide();
        tellAt(null);
        return;
    }
    const found = resolve(state.guide.target, vm);
    // a block of the code out of sight: the code area scrolls to it, once (the palette never does)
    if (found.block && scrolledTo !== found.block.id && (found.offscreen || !inView(found.rect, codeArea()))) {
        scrolledTo = found.block.id;
        workspace().centerOnBlock(found.block.id);
        hideGuide();
        return;
    }
    if (found.offscreen) found.missing = 'offscreen';
    if (found.missing) {
        hideGuide();
        tellAt(null);
        const now = performance.now();
        if (!missingSince) missingSince = now;
        if (now - missingSince >= MISSING_AFTER_MS && reported !== found.missing) {
            reported = found.missing;
            send({type: 'guide-missing', id: state.guide.id, target: state.guide.target, reason: found.missing});
        }
        return;
    }
    missingSince = 0;
    reported = null;
    const r = found.rect;
    shown = {rect: r, via: found.via, input: Boolean(found.input)};
    place(ring, {left: r.left - 4, right: r.right + 4, top: r.top - 4, bottom: r.bottom + 4});
    const now = performance.now();
    const key = `${state.guide.id}|${found.via}`;
    if (key !== louderKey) {
        louderKey = key;
        louderSince = now;
    }
    louder(!state.frozen && now - louderSince >= LOUDER_AFTER_MS);
    placeGhost(r, found.drop);
    tellAt(r, found.via, placePointer(r), found);
    const {text, textCategory, textSprite} = state.guide;
    const say = (found.via === 'category' && textCategory) || (found.via === 'sprite' && textSprite) || text;
    if (bubbleText.textContent !== say) bubbleText.textContent = say;
    if (say) placeBubble(r);
    else bubble.style.display = 'none';
};

// One frame loop, only while something is on screen; nothing runs otherwise. It looks for its targets
// ten times a second, not every frame: class PCs are slow, and a ring 0.1s late is not noticed.
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
        drawVeil();
        drawGuide();
    }
    if (state.guide || state.frozen) frame = requestAnimationFrame(tick);
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
    if (state.frozen) swallow(e);
    // a key the child pressed while a step is guided ("לחצו על חץ ימני"): the lesson may be waiting for it
    else if (state.guide && e.type === 'keydown' && !e.repeat) send({type: 'key', key: e.key});
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
    if (shown && !state.frozen && e.type === 'pointerdown' && !shown.input &&
        ['ui', 'sprite', 'library'].includes(shown.via)) {
        const point = e.touches ? e.touches[0] : e;
        const {rect} = shown;
        if (point.clientX >= rect.left - 4 && point.clientX <= rect.right + 4 &&
            point.clientY >= rect.top - 4 && point.clientY <= rect.bottom + 4) {
            send({type: 'guide-clicked', id: state.guide ? state.guide.id : null, via: shown.via});
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

let changeTimer = 0;
const diffCode = () => {
    changeTimer = 0;
    const target = vm && vm.editingTarget;
    if (!target) return;
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

// ---- the messages ----

const stopGame = () => {
    try {
        vm.stopAll();
    } catch (e) { /* no project yet */ }
};

// → true when msg was the guide's
export const handleGuide = msg => {
    if (!msg || !layer) return false;
    switch (msg.type) {
    case 'guide':
        if (!state.guide || state.guide.id !== msg.id) closeFieldEditors();
        state.guide = {
            id: msg.id,
            target: msg.target,
            text: msg.text || '',
            textCategory: msg.textCategory,
            textSprite: msg.textSprite
        };
        missingSince = 0;
        reported = null;
        scrolledTo = null;
        lastAt = ''; // a new guide is told where its target is even when it is where the last one was
        break;
    case 'guide-clear':
        state.guide = null;
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
        break;
    case 'pick':
        state.picking = Boolean(msg.on);
        break;
    case 'find':
        send({type: 'found', id: msg.id, sprites: vm ? find(msg) : []});
        return true;
    default:
        return false;
    }
    document.body.classList.toggle(styles.picking, state.picking);
    wake();
    return true;
};

// once, when the VM is up
export const attachGuide = (theVm, sender) => {
    vm = theVm;
    send = sender;
    if (!layer) build();
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKey, true);
    const inputs = [
        'pointerdown', 'mousedown', 'touchstart', 'pointerup', 'mouseup', 'touchend', 'click', 'contextmenu', 'dblclick'
    ];
    for (const type of inputs) {
        window.addEventListener(type, onPointer, {capture: true, passive: false});
    }
    vm.on('PROJECT_CHANGED', onChange);
    vm.on('workspaceUpdate', () => setTimeout(() => {
        watchCategory();
        diffCode(); // a sprite opened: its blocks as they are now are the baseline
    }, 0));
    vm.runtime.on('PROJECT_RUN_START', () => send({type: 'ui', name: 'run'}));
    // the green flag while the game is already running restarts it without a new "run start" (the threads
    // never reach zero): every press of the flag is a run (Keren, 2026-10-25 - a guess waited for a run)
    vm.runtime.on('PROJECT_START', () => send({type: 'ui', name: 'run'}));
    vm.runtime.on('PROJECT_RUN_STOP', () => send({type: 'ui', name: 'stop'}));
    window.addEventListener('resize', wake);
};
