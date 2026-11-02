// "Tidy up blocks": where the scripts go (src/lib/kishufiya-tidy-layout.js, platform decision 49).
//   npx jest test/unit/kishufiya-tidy
import {BOTTOM_BAND, COLUMN_GAP, RIGHT_MARGIN, SCRIPT_GAP, TOP_MARGIN, TYPICAL_COLUMN_WIDTH, layoutScripts, rightMargin}
    from '../../../src/lib/kishufiya-tidy-layout.js';

const view = {width: 1000, height: 600};
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
        const {positions, columns} = layoutScripts([script(200, 100), script(150, 100), script(180, 100)], view);
        expect(positions.map(p => p.right)).toEqual([RIGHT_MARGIN, RIGHT_MARGIN, RIGHT_MARGIN]);
        expect(positions.map(p => p.top)).toEqual([TOP_MARGIN, TOP_MARGIN + 100 + SCRIPT_GAP, TOP_MARGIN + 2 * (100 + SCRIPT_GAP)]);
        expect(columns).toBe(1);
    });
    test('the one that does not fit opens a column to the left, as far as the widest script of the column and a gap', () => {
        // 16 + 300 + 16 + 300 = 632 > 600
        const {positions, columns} = layoutScripts([script(200, 300), script(260, 300), script(100, 50)], view);
        expect(positions[0]).toEqual({right: RIGHT_MARGIN, top: TOP_MARGIN});
        expect(positions[1]).toEqual({right: RIGHT_MARGIN + 200 + COLUMN_GAP, top: TOP_MARGIN});
        // the third fits under the second (16 + 300 + 16 + 50 <= 600)
        expect(positions[2]).toEqual({right: RIGHT_MARGIN + 200 + COLUMN_GAP, top: TOP_MARGIN + 300 + SCRIPT_GAP});
        expect(columns).toBe(2);
    });
    test('a column is as wide as its widest script, whichever it holds', () => {
        const {positions} = layoutScripts([script(100, 100), script(240, 100), script(50, 100), script(10, 400)], view);
        // the fourth: 16 + 100 + 16 + 100 + 16 + 100 + 16 + 400 > 600, so a new column, 240 + gap from the first
        expect(positions[3].right).toBe(RIGHT_MARGIN + 240 + COLUMN_GAP);
    });
    test('a script exactly as tall as what is left still fits', () => {
        const height = TOP_MARGIN + 100 + SCRIPT_GAP + 100 + BOTTOM_BAND;
        const {positions} = layoutScripts([script(50, 100), script(50, 100)], {width: 1000, height});
        expect(positions[1].right).toBe(RIGHT_MARGIN);
        expect(positions[1].top).toBe(TOP_MARGIN + 100 + SCRIPT_GAP);
    });
    test('the scripts keep the order they come in: columns only move left', () => {
        const scripts = Array.from({length: 12}, () => script(120, 200));
        const {positions} = layoutScripts(scripts, view);
        for (let i = 1; i < positions.length; i++) {
            expect(positions[i].right).toBeGreaterThanOrEqual(positions[i - 1].right);
        }
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
