// What the editor reports so the page's conductor can place a bubble (platform design conductor-audit section 4, "the editor reports,
// the conductor decides"). Every field is optional and absent when it does not apply; the editor decides nothing about them:
//   dialog   {left, top, width, height}  the open modal / menu / flyout (or the one open over the stage)
//   next     {left, top, width, height}  the control the child presses next (the OK of the dialog), when the editor knows it
//   clip     {left, top, width, height}  the visible box of the scroll container the target sits in
//   carried  true                        the child is carrying a block
// and the event 'guide-busy' {on: true|false} when a busy phase (a drag, a dialog opening or moving, a library not yet loaded) starts or ends.
// The same names and shapes as scratchjr-web's guide-rects.js. Pure: the DOM is read by the caller, which hands in the boxes.

// A box as the page says a place: {left, top, width, height}, whole pixels, or null for none / one with no size.
export const frame = box => {
    if (!box) return null;
    const left = box.left;
    const top = box.top;
    const width = box.width === undefined ? box.right - box.left : box.width;
    const height = box.height === undefined ? box.bottom - box.top : box.height;
    if (!(width > 0) || !(height > 0)) return null;
    return {left: Math.round(left), top: Math.round(top), width: Math.round(width), height: Math.round(height)};
};

// -> the optional fields to add to a guide-at / located answer: only what is there.
export const rectsOf = ({dialog, next, clip, carried} = {}) => {
    const out = {};
    const d = frame(dialog);
    const n = frame(next);
    const c = frame(clip);
    if (d) out.dialog = d;
    if (n) out.next = n;
    if (c) out.clip = c;
    if (carried) out.carried = true;
    return out;
};

// The part of `box` the window shows (a scroll container may be taller than the screen); null when none of it is.
export const visibleOf = (box, view) => {
    if (!box || !view) return null;
    const left = Math.max(box.left, view.left || 0);
    const top = Math.max(box.top, view.top || 0);
    const right = Math.min(box.right === undefined ? box.left + box.width : box.right, view.right);
    const bottom = Math.min(box.bottom === undefined ? box.top + box.height : box.bottom, view.bottom);
    return frame({left, top, right, bottom});
};

// Whether the editor is in a busy phase now: a block in flight, a dialog that moved since the last look (opening, animating), or a
// library that is open with nothing in it yet.
export const isBusy = ({carried, dialog, lastDialog, loading}) =>
    Boolean(carried) || Boolean(loading) || JSON.stringify(frame(dialog)) !== JSON.stringify(frame(lastDialog));

// One 'guide-busy' per change of busy-ness, never a repeat: `was` is what was last told (false at the start: nothing is said while idle).
export const busyEdge = (was, now) => (Boolean(was) === Boolean(now) ? null : {type: 'guide-busy', on: Boolean(now)});

// What was told of busy-ness and the last dialog seen, in one place, so that every way the guide stops lets go of both: a stop while
// busy was told sends on:false (the page would wait for it for ever), and the next guide starts without a dialog "moved" from the last one.
export const busyTracker = () => {
    let told = false;
    let lastDialog = null;
    return {
        // one look while a guide or a locate is alive -> the edge to send, or null
        look: ({carried, dialog, loading}) => {
            const now = isBusy({carried, dialog, lastDialog, loading});
            lastDialog = dialog;
            const edge = busyEdge(told, now);
            told = now;
            return edge;
        },
        // the guide stopped (ended, cleared, the loop ran out, a switch) -> the closing edge if busy was told, else null; forgets the dialog
        stop: () => {
            const edge = busyEdge(told, false);
            told = false;
            lastDialog = null;
            return edge;
        },
    };
};
