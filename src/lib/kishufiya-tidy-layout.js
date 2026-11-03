// כישופייה: where "Tidy up blocks" puts the scripts (Keren, 2026-11-02; platform SPEC-lesson-flow, decision 50).
// Pure: sizes in, places out, so the rules are tested without a workspace (test/unit/kishufiya-tidy).
// Two layouts (Keren, 2026-11-03), the two items of the workspace right-click menu: layoutScripts, "wide" (rules 1-7,
// and what the automatic tidy always uses), and layoutScriptsLong, "long" (rule 8).
//
// The rules, in the order the layout applies them:
//   1. the scripts keep the order they are given (the caller sorts them by position, top blocks first)
//   2. the layout starts at the top right corner of the visible code area; the top margin is TOP_MARGIN
//   3. the first column's right edge is RIGHT_MARGIN from the area's right edge, past the widest bubble the guide
//      draws beside a palette block (measured, see below); a narrow area keeps a column's room (rightMargin)
//   4. width first (Keren, 2026-11-03): as many columns as fit the visible width side by side, from right to left;
//      the scripts go to them in order, a row at a time (the first script rightmost); one that has a script above it
//      goes under it with scriptGap() between them. When fewer than two columns fit the width, or the stacks would
//      eat BOTTOM_BAND, rules 5-7 apply
//   5. (a single column fits) columns fill from right to left: a script goes under the one before it while it fits
//      the visible height less BOTTOM_BAND, else a new column opens to the left; a column is as wide as its widest
//      script; scriptGap() between scripts, COLUMN_GAP between columns
//   6. a script taller than the view stands alone in its column, from the top
//   7. columns that do not fit the visible width continue to the left - never a second row of columns
//   8. (long) rules 1-3 hold; every script is in ONE column, under the one before it with scriptGap() between them,
//      however tall the column gets: it never spills to the left, and the child scrolls down
// All numbers are screen pixels (the caller multiplies workspace sizes by the workspace scale and divides back).

export const TOP_MARGIN = 16;
// The least space between two scripts in a column (screen px). The real gap is scriptGap(), below.
export const SCRIPT_GAP = 16;
// What a child needs under a script to add a block at its end without touching the script below (Keren, 2026-11-03):
// the dragged block (a stack block is 48 workspace units tall, scratch-blocks constants.js) plus the snap radius
// (Blockly.SNAP_RADIUS = 48; CONNECTING_SNAP_RADIUS 68 applies only once it is already snapping to this script),
// so the dragged block's connection is never closer to the lower script than to the upper one. Workspace units.
export const STACK_BLOCK_HEIGHT = 48;
export const SNAP_RADIUS = 48;
export const GAP_ROOM = STACK_BLOCK_HEIGHT + SNAP_RADIUS; // 96 workspace units
// The workspace zoom when the caller does not pass one (the editor's default, 0.675).
export const DEFAULT_SCALE = 0.675;
export const scriptGap = (scale = DEFAULT_SCALE) => Math.max(SCRIPT_GAP, Math.ceil(GAP_ROOM * scale));
export const COLUMN_GAP = 24;

// The free band every column keeps at its bottom, so a next block and the guide's drop outline under the last script
// are inside the view with nothing to scroll: SCRIPT_GAP + the outline (the guide's GHOST_ROW, 44px, taller when the
// block is) + the guide's DROP_MARGIN (24px, guide.js) + slack = 96. kishufiya-scroll.js counts content within this
// band of the view's bottom as overflowing, so a bar and the room appear exactly when it is eaten.
export const BOTTOM_BAND = 96;

// Columns continue to the left, whatever the language direction; the scroll area's far side is the same one.
export const COLUMNS_GROW_TOWARD = 'left';

// Measured on the running ghost-train lesson page (2026-11-02, guide level 3, 1366x768): a bubble beside a palette
// block on the code side was 187px wide, its left edge 70px past the palette's (the block 131px inside it). The most
// the page can draw is .guide-bubble's max-width 280px + 14px gap (window-place.ts GAP), plus the editor's arrow room
// (34px x its growth up to 2, + 6) when the arrow is on that side: for the widest palette blocks (80px inside the
// palette) that reaches 286px past it. Keren chose 200 (2026-11-02, after the numbers: 167px for a typical block at
// 1366, 286px at most): a very wide block's bubble may cover part of the first column until the drag. Platform decision 50.
export const RIGHT_MARGIN = 200;

// A typical script column (a hat block with a few blocks under it, at the default zoom). When the area is so narrow
// that RIGHT_MARGIN would leave less room than this, the margin shrinks to leave it: the bubble then covers part of the
// first column, which is the lesser harm.
export const TYPICAL_COLUMN_WIDTH = 260;

// The first column's right edge, as a distance from the right edge of an area `viewWidth` wide.
export const rightMargin = viewWidth => Math.max(0, Math.min(RIGHT_MARGIN, viewWidth - TYPICAL_COLUMN_WIDTH));

// Each of `c` columns is as wide as the widest script dealt to it (script i to column i % c).
const columnWidths = (scripts, c) => {
    const widths = new Array(c).fill(0);
    scripts.forEach((script, i) => {
        widths[i % c] = Math.max(widths[i % c], script.width);
    });
    return widths;
};
const sum = list => list.reduce((a, b) => a + b, 0);
// How many columns side by side fit the visible width, given the scripts dealt to them in order.
export const columnsAcross = (scripts, view) => {
    const avail = view.width - rightMargin(view.width) - SCRIPT_GAP; // a margin is kept on the far side too
    for (let c = scripts.length; c >= 2; c--) {
        const widths = columnWidths(scripts, c);
        if (sum(widths) + ((c - 1) * COLUMN_GAP) <= avail) return c;
    }
    return 1;
};

// scripts: [{width, height}]; view: {width, height, scale?} of the visible code area (scale: the workspace zoom).
// Returns {positions: [{right, top}], columns}: for each script, the distance of its right edge from the area's right
// edge and of its top from the area's top (so a script is right-aligned in its column); `columns` counts the columns.
export const layoutScripts = (scripts, view) => {
    const gap = scriptGap(view.scale);
    const across = columnsAcross(scripts, view);
    if (across >= 2) {
        const widths = columnWidths(scripts, across);
        const rights = [];
        let right = rightMargin(view.width);
        widths.forEach(w => {
            rights.push(right);
            right += w + COLUMN_GAP;
        });
        const bottoms = new Array(across).fill(null);
        const positions = scripts.map((script, i) => {
            const col = i % across;
            const top = bottoms[col] === null ? TOP_MARGIN : bottoms[col] + gap;
            bottoms[col] = top + script.height;
            return {right: rights[col], top};
        });
        // the stacks must keep the free band at the bottom, else the old fill below spills to the left instead
        const fits = positions.every((p, i) => p.top + scripts[i].height + BOTTOM_BAND <= view.height);
        if (fits) return {positions, columns: Math.min(across, scripts.length)};
    }
    const positions = [];
    let columns = 0;
    let right = rightMargin(view.width); // the open column's right edge
    let width = 0; // ...its width so far
    let bottom = 0; // ...and where its last script ends
    let count = 0; // ...how many scripts it holds
    for (const script of scripts) {
        if (count > 0 && bottom + gap + script.height + BOTTOM_BAND > view.height) {
            // does not fit under the last one (a script taller than the view never does): the next column, to the left
            right += width + COLUMN_GAP;
            width = 0;
            count = 0;
        }
        if (count === 0) columns++;
        const top = count === 0 ? TOP_MARGIN : bottom + gap;
        positions.push({right, top});
        width = Math.max(width, script.width);
        bottom = top + script.height;
        count++;
    }
    return {positions, columns};
};

// The long layout: one column, as far down as the scripts take it (the child scrolls down). Same arguments as
// layoutScripts; the area's width and scale only set the right margin and the gap, the height is not used.
export const layoutScriptsLong = (scripts, view) => {
    const gap = scriptGap(view.scale);
    const right = rightMargin(view.width);
    let top = TOP_MARGIN;
    const positions = scripts.map(script => {
        const place = {right, top};
        top += script.height + gap;
        return place;
    });
    return {positions, columns: Math.min(1, scripts.length)};
};
