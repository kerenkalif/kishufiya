// כישופייה: where "Tidy up blocks" puts the scripts (Keren's decisions, 2026-11-02; platform SPEC-lesson-flow, decision 47).
// Pure: sizes in, places out, so the rules are tested without a workspace (test/unit/kishufiya-tidy).
//
// The rules, in the order the layout applies them:
//   1. the scripts keep the order they are given (the caller sorts them by position, top blocks first)
//   2. the layout starts at the top right corner of the visible code area; the top margin is TOP_MARGIN
//   3. the first column's right edge is RIGHT_MARGIN from the area's right edge, past the widest bubble the guide
//      draws beside a palette block (measured, see below); a narrow area keeps a column's room (rightMargin)
//   4. columns fill from right to left: a script goes under the one before it while it fits the visible height,
//      else a new column opens to the left of the column; a column is as wide as its widest script;
//      SCRIPT_GAP between scripts, COLUMN_GAP between columns
//   5. a script taller than the view stands alone in its column, from the top
//   6. columns that do not fit the visible width continue to the left - never a second row of columns
// All numbers are screen pixels (the caller multiplies workspace sizes by the workspace scale and divides back).

export const TOP_MARGIN = 16;
export const SCRIPT_GAP = 16;
export const COLUMN_GAP = 24;

// Measured on the running lesson page, 2026-11-02 (the platform's `.guide-bubble`, max-width 280px, placed by
// window-place.ts beside the palette block it points at, on the code side): see the platform decision 47.
export const RIGHT_MARGIN = 320;

// A typical script column (a hat block with a few blocks under it, at the default zoom). When the area is so narrow
// that RIGHT_MARGIN would leave less room than this, the margin shrinks to leave it: the bubble then covers part of the
// first column, which is the lesser harm.
export const TYPICAL_COLUMN_WIDTH = 260;

// The first column's right edge, as a distance from the right edge of an area `viewWidth` wide.
export const rightMargin = viewWidth => Math.max(0, Math.min(RIGHT_MARGIN, viewWidth - TYPICAL_COLUMN_WIDTH));

// scripts: [{width, height}]; view: {width, height} of the visible code area.
// Returns {positions: [{right, top}], columns}: for each script, the distance of its right edge from the area's right
// edge and of its top from the area's top (so a script is right-aligned in its column); `columns` counts the columns.
export const layoutScripts = (scripts, view) => {
    const positions = [];
    let columns = 0;
    let right = rightMargin(view.width); // the open column's right edge
    let width = 0; // ...its width so far
    let bottom = 0; // ...and where its last script ends
    let count = 0; // ...how many scripts it holds
    for (const script of scripts) {
        if (count > 0 && bottom + SCRIPT_GAP + script.height > view.height) {
            // does not fit under the last one (a script taller than the view never does): the next column, to the left
            right += width + COLUMN_GAP;
            width = 0;
            count = 0;
        }
        if (count === 0) columns++;
        const top = count === 0 ? TOP_MARGIN : bottom + SCRIPT_GAP;
        positions.push({right, top});
        width = Math.max(width, script.width);
        bottom = top + script.height;
        count++;
    }
    return {positions, columns};
};
