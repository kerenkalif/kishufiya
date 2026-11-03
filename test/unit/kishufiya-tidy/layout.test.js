// "Tidy up blocks": where the scripts go (src/lib/kishufiya-tidy-layout.js, platform decision 49).
//   npx jest test/unit/kishufiya-tidy
import {BOTTOM_BAND, COLUMN_GAP, DEFAULT_SCALE, GAP_ROOM, RIGHT_MARGIN, SCRIPT_GAP, TOP_MARGIN, TYPICAL_COLUMN_WIDTH, columnsAcross,
    layoutScripts, layoutScriptsLong, rightMargin, scriptGap}
    from '../../../src/lib/kishufiya-tidy-layout.js';

const view = {width: 1000, height: 600};
// room for one column only (200 margin + 244): the scripts of these tests cannot sit side by side
const narrow = {width: 460, height: 600};
const GAP = scriptGap();
const script = (width, height) => ({width, height});

describe('rule 2-3: the start', () => {
    test('the first script is at the top margin, its right edge the right margin from the area\'s right edge', () => {
        const {positions, columns} = layoutScripts([script(200, 100)], view);
        expect(positions).toEqual([{right: RIGHT_MARGIN, top: TOP_MARGIN}]);
        expect(columns).toBe(1);
    });
    test('a narrow area keeps room for a typical column: the margin shrinks to leave it', () => {
        expect(rightMargin(1000)).toBe(RIGHT_MARGIN);
        expect(rightMargin(TYPICAL_COLUMN_WIDTH + RIGHT_MARGIN)).toBe(RIGHT_MARGIN);
        expect(rightMargin(TYPICAL_COLUMN_WIDTH + 100)).toBe(100);
        expect(rightMargin(TYPICAL_COLUMN_WIDTH - 50)).toBe(0);
    });
    test('nothing to place', () => {
        expect(layoutScripts([], view)).toEqual({positions: [], columns: 0});
    });
});

describe('rule 4: columns fill from right to left', () => {
    test('scripts go under each other while they fit the height, a script\'s right edge is its column\'s', () => {
        const {positions, columns} = layoutScripts([script(200, 100), script(150, 100), script(180, 100)], narrow);
        expect(positions.map(p => p.right)).toEqual([RIGHT_MARGIN, RIGHT_MARGIN, RIGHT_MARGIN]);
        expect(positions.map(p => p.top)).toEqual([TOP_MARGIN, TOP_MARGIN + 100 + GAP, TOP_MARGIN + 2 * (100 + GAP)]);
        expect(columns).toBe(1);
    });
    test('the one that does not fit opens a column to the left, as far as the widest script of the column and a gap', () => {
        // 16 + 300 + gap + 300 > 600
        const {positions, columns} = layoutScripts([script(200, 300), script(260, 300), script(100, 50)], narrow);
        expect(positions[0]).toEqual({right: RIGHT_MARGIN, top: TOP_MARGIN});
        expect(positions[1]).toEqual({right: RIGHT_MARGIN + 200 + COLUMN_GAP, top: TOP_MARGIN});
        // the third fits under the second (16 + 300 + gap + 50 + band <= 600)
        expect(positions[2]).toEqual({right: RIGHT_MARGIN + 200 + COLUMN_GAP, top: TOP_MARGIN + 300 + GAP});
        expect(columns).toBe(2);
    });
    test('a column is as wide as its widest script, whichever it holds', () => {
        const {positions} = layoutScripts([script(100, 100), script(240, 100), script(50, 100), script(10, 400)], narrow);
        // the fourth: 16 + 100 + 16 + 100 + 16 + 100 + 16 + 400 > 600, so a new column, 240 + gap from the first
        expect(positions[3].right).toBe(RIGHT_MARGIN + 240 + COLUMN_GAP);
    });
    test('a script exactly as tall as what is left still fits', () => {
        const height = TOP_MARGIN + 100 + GAP + 100 + BOTTOM_BAND;
        const {positions} = layoutScripts([script(200, 100), script(200, 100)], {width: 460, height});
        expect(positions[1].right).toBe(RIGHT_MARGIN);
        expect(positions[1].top).toBe(TOP_MARGIN + 100 + GAP);
    });
    test('the scripts keep the order they come in: columns only move left', () => {
        const scripts = Array.from({length: 12}, () => script(120, 200));
        const {positions} = layoutScripts(scripts, narrow);
        for (let i = 1; i < positions.length; i++) {
            expect(positions[i].right).toBeGreaterThanOrEqual(positions[i - 1].right);
        }
    });
});

describe('rule 4 (width first): side by side when the width allows', () => {
    test('three scripts fit across 1000px: one row, each its own column, all at the top', () => {
        const {positions, columns} = layoutScripts([script(200, 100), script(150, 100), script(180, 100)], view);
        expect(columns).toBe(3);
        expect(positions.map(p => p.top)).toEqual([TOP_MARGIN, TOP_MARGIN, TOP_MARGIN]);
        expect(positions.map(p => p.right)).toEqual([RIGHT_MARGIN, RIGHT_MARGIN + 200 + COLUMN_GAP, RIGHT_MARGIN + 200 + COLUMN_GAP + 150 + COLUMN_GAP]);
    });
    test('two identical scripts at laptop width sit next to each other, not one under the other', () => {
        const {positions} = layoutScripts([script(260, 120), script(260, 120)], {width: 800, height: 560, scale: 0.675});
        expect(positions[0].top).toBe(positions[1].top);
        expect(positions[1].right).toBeGreaterThan(positions[0].right);
    });
    test('more scripts than columns: dealt a row at a time, the one under another has the big gap', () => {
        const scripts = [script(200, 80), script(200, 80), script(200, 80), script(200, 80)];
        const v = {width: 700, height: 600};
        expect(columnsAcross(scripts, v)).toBe(2); // 700 - 200 - 16 = 484; 2 x 200 + 24 fits, 3 do not
        const {positions} = layoutScripts(scripts, v);
        expect(positions[2]).toEqual({right: positions[0].right, top: TOP_MARGIN + 80 + GAP});
        expect(positions[3]).toEqual({right: positions[1].right, top: TOP_MARGIN + 80 + GAP});
    });
    test('stacks that would eat the free band at the bottom fall back to the height-driven fill', () => {
        const scripts = Array.from({length: 6}, () => script(100, 150));
        const {positions} = layoutScripts(scripts, {width: 700, height: 400});
        positions.forEach((p, i) => { if (p.top > TOP_MARGIN) expect(p.top + scripts[i].height + BOTTOM_BAND).toBeLessThanOrEqual(400); });
    });
});

describe('a column is placed only if it is fully visible', () => {
    test('1180px laptop case: a 362px code area (margin 101) holds one 146px column, not two', () => {
        const scripts = Array.from({length: 4}, () => script(146, 150));
        const v = {width: 362, height: 640, scale: 0.675};
        expect(columnsAcross(scripts, v)).toBe(1);
        const {positions} = layoutScripts(scripts, v);
        // every script's left edge is inside the view, or the fill spills left on purpose (never side-by-side overflow)
        expect(new Set(positions.map(p => p.right)).size).toBeLessThanOrEqual(2);
    });
    test('whatever the sizes, side by side only when the columns plus both margins fit the width', () => {
        for (let w = 300; w <= 1400; w += 37) {
            const scripts = [146, 190, 120, 210, 160].map(width => script(width, 90));
            const v = {width: w, height: 800, scale: 0.675};
            const across = columnsAcross(scripts, v);
            if (across < 2) continue;
            const {positions} = layoutScripts(scripts, v);
            const farEdge = Math.max(...positions.map((p, i) => p.right + scripts[i].width));
            expect(farEdge + SCRIPT_GAP).toBeLessThanOrEqual(w);
        }
    });
});

describe('the gap between stacked scripts', () => {
    test('is a dragged block (48) plus the snap radius (48) in workspace units, at the zoom in use', () => {
        expect(GAP_ROOM).toBe(96);
        expect(scriptGap(1)).toBe(96);
        expect(scriptGap(DEFAULT_SCALE)).toBe(Math.ceil(96 * DEFAULT_SCALE)); // 65px
        expect(scriptGap(0.1)).toBe(SCRIPT_GAP); // never less than the old minimum
    });
});

describe('rule 5: a script taller than the view', () => {
    test('is alone in its column, from the top - the one before and the one after are not in it', () => {
        const {positions, columns} = layoutScripts([script(100, 100), script(150, 900), script(80, 80)], view);
        expect(positions[0]).toEqual({right: RIGHT_MARGIN, top: TOP_MARGIN});
        expect(positions[1]).toEqual({right: RIGHT_MARGIN + 100 + COLUMN_GAP, top: TOP_MARGIN});
        expect(positions[2]).toEqual({right: RIGHT_MARGIN + 100 + COLUMN_GAP + 150 + COLUMN_GAP, top: TOP_MARGIN});
        expect(columns).toBe(3);
    });
    test('first of all it still starts at the top, in the first column', () => {
        const {positions} = layoutScripts([script(150, 900)], view);
        expect(positions[0]).toEqual({right: RIGHT_MARGIN, top: TOP_MARGIN});
    });
});

describe('rule 6: more columns than the width', () => {
    test('they continue to the left, in one row of columns - no wrapping', () => {
        const scripts = Array.from({length: 10}, () => script(300, 500));
        const {positions, columns} = layoutScripts(scripts, view);
        expect(columns).toBe(10);
        expect(new Set(positions.map(p => p.top))).toEqual(new Set([TOP_MARGIN]));
        // the tenth column's left edge is past the view's left edge (1000 wide): scrolling is the caller's metrics
        const last = positions[9];
        expect(last.right + 300).toBeGreaterThan(view.width);
    });
});

describe('the free band at the bottom of a column', () => {
    test('a script that would use the band opens a new column instead', () => {
        const height = TOP_MARGIN + 100 + SCRIPT_GAP + 100 + BOTTOM_BAND - 1;
        const {positions} = layoutScripts([script(50, 100), script(50, 100)], {width: 1000, height});
        expect(positions[1].top).toBe(TOP_MARGIN);
        expect(positions[1].right).toBe(RIGHT_MARGIN + 50 + COLUMN_GAP);
    });
    test('the last script of every column ends at least BOTTOM_BAND above the view bottom', () => {
        const scripts = Array.from({length: 25}, (_, i) => script(100, 60 + (i * 37) % 120));
        const {positions} = layoutScripts(scripts, view);
        positions.forEach((p, i) => { if (scripts[i].height + TOP_MARGIN + BOTTOM_BAND <= view.height) expect(p.top + scripts[i].height + BOTTOM_BAND).toBeLessThanOrEqual(view.height); });
    });
});

describe('rule 8: the long layout, one column', () => {
    test('every script under the one before it, gap between, right edge at the right margin, from the top margin', () => {
        const {positions, columns} = layoutScriptsLong([script(200, 100), script(120, 80), script(300, 50)], view);
        expect(positions).toEqual([
            {right: RIGHT_MARGIN, top: TOP_MARGIN},
            {right: RIGHT_MARGIN, top: TOP_MARGIN + 100 + GAP},
            {right: RIGHT_MARGIN, top: TOP_MARGIN + 100 + GAP + 80 + GAP}
        ]);
        expect(columns).toBe(1);
    });
    test('it never spills to the left: scripts taller than the view in total, or each, stay in the one column', () => {
        const {positions, columns} = layoutScriptsLong([script(200, 500), script(200, 900), script(200, 700)], view);
        expect(new Set(positions.map(p => p.right))).toEqual(new Set([RIGHT_MARGIN]));
        expect(positions[2].top).toBe(TOP_MARGIN + 500 + GAP + 900 + GAP);
        expect(columns).toBe(1);
    });
    test('a wide area does not put scripts side by side', () => {
        const {positions} = layoutScriptsLong([script(100, 100), script(100, 100), script(100, 100)], {width: 3000, height: 600});
        expect(new Set(positions.map(p => p.right)).size).toBe(1);
    });
    test('a narrow area still gets one column, with the shrunk margin', () => {
        const {positions} = layoutScriptsLong([script(200, 100), script(200, 100)], {width: TYPICAL_COLUMN_WIDTH + 100, height: 600});
        expect(positions.map(p => p.right)).toEqual([100, 100]);
    });
    test('the gap follows the zoom, as in the wide layout', () => {
        const {positions} = layoutScriptsLong([script(200, 100), script(200, 100)], {...view, scale: 1});
        expect(positions[1].top - positions[0].top).toBe(100 + scriptGap(1));
    });
    test('nothing to place; the same answer as the wide layout for one script', () => {
        expect(layoutScriptsLong([], view)).toEqual({positions: [], columns: 0});
        expect(layoutScriptsLong([script(200, 100)], view)).toEqual(layoutScripts([script(200, 100)], view));
    });
    test('the wide layout is unchanged: it still goes side by side where it fits', () => {
        const {positions} = layoutScripts([script(100, 100), script(100, 100)], view);
        expect(new Set(positions.map(p => p.right)).size).toBe(2);
    });
});
