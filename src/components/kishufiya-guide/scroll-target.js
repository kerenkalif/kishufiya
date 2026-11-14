// A step's target must be seen on the screen; when it is not, the scrolling box it sits in scrolls to it. The rule is the
// platform's (src/lib/lesson/scroll-target.ts, SPEC-editor-base §6), kept here with the same numbers and the same test table
// (test/unit/kishufiya-guide/scroll-target.test.js), as bubble-words.ts's numbers are. Pure: it gets rectangles, no DOM.
// `target`, `container`: {top, bottom} on the screen now; `scrollTop`: the box's scroll now in screen px; `maxScrollTop`: the
// most it can scroll to when known. Returns the scroll that shows the target, or null when it is seen (or no scroll shows it better).

// A target is seen when all of it is this far inside the container's edges (the ring is 4px out; the box's bar and the neighbour's title)
export const SCROLL_EDGE_PX = 12;
// A shift smaller than this is no scroll
export const SCROLL_STEP_MIN_PX = 2;

// All of it inside the edges; a target taller than the container (it never fits): when half of the container shows it
export const targetSeen = (target, container) => {
    const room = container.bottom - container.top;
    if (target.bottom - target.top > room - (2 * SCROLL_EDGE_PX)) {
        const shown = Math.min(target.bottom, container.bottom) - Math.max(target.top, container.top);
        return shown >= room / 2;
    }
    return target.top >= container.top + SCROLL_EDGE_PX && target.bottom <= container.bottom - SCROLL_EDGE_PX;
};

// The target goes to the middle of the container's height; one taller than the container goes with its top at the top
export const scrollTopToShow = (target, container, scrollTop, maxScrollTop) => {
    if (targetSeen(target, container)) return null;
    const room = container.bottom - container.top;
    const height = target.bottom - target.top;
    const shift = height > room - (2 * SCROLL_EDGE_PX) ?
        target.top - (container.top + SCROLL_EDGE_PX) :
        target.top + (height / 2) - (container.top + (room / 2));
    let to = Math.max(0, Math.round(scrollTop + shift));
    if (typeof maxScrollTop === 'number') to = Math.min(to, Math.max(0, maxScrollTop));
    return Math.abs(to - scrollTop) < SCROLL_STEP_MIN_PX ? null : to;
};
