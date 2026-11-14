// The platform's scroll-target.test.ts table, for the copy of the rule (scroll-target.js)
//   npx jest test/unit/kishufiya-guide/scroll-target
import {SCROLL_EDGE_PX, scrollTopToShow, targetSeen} from '../../../src/components/kishufiya-guide/scroll-target.js';

const palette = height => ({top: 100, bottom: 100 + height});

describe('scrollTopToShow', () => {
    test('a block low in the palette scrolls to the middle of it, at 900 and at 700', () => {
        for (const h of [800, 600]) {
            const c = palette(h);
            const target = {top: c.bottom + 40, bottom: c.bottom + 80};
            const to = scrollTopToShow(target, c, 500);
            expect(to).toBe(Math.round(500 + (target.top + 20) - (c.top + (h / 2))));
            const after = {top: target.top - (to - 500), bottom: target.bottom - (to - 500)};
            expect((after.top + after.bottom) / 2).toBe(c.top + (h / 2));
            expect(targetSeen(after, c)).toBe(true);
        }
    });
    test('a block cut by the bottom edge still scrolls', () => {
        const c = palette(600);
        expect(scrollTopToShow({top: c.bottom - 20, bottom: c.bottom + 20}, c, 300)).not.toBeNull();
    });
    test('a block seen is not scrolled to', () => {
        const c = palette(600);
        expect(scrollTopToShow({top: 300, bottom: 340}, c, 300)).toBeNull();
        expect(scrollTopToShow({top: c.top + SCROLL_EDGE_PX, bottom: c.top + SCROLL_EDGE_PX + 40}, c, 300)).toBeNull();
    });
    test('a block above scrolls up, never above the top', () => {
        const c = palette(600);
        expect(scrollTopToShow({top: 20, bottom: 60}, c, 1000)).toBe(Math.round(1000 + 40 - 400));
        expect(scrollTopToShow({top: -900, bottom: -860}, c, 100)).toBe(0);
    });
    test('a target taller than the container: its top at the top; left alone while half shows it', () => {
        const c = palette(600);
        expect(scrollTopToShow({top: 700, bottom: 2000}, c, 0)).toBe(700 - (100 + SCROLL_EDGE_PX));
        expect(scrollTopToShow({top: -500, bottom: 1000}, c, 800)).toBeNull();
        expect(scrollTopToShow({top: 650, bottom: 2000}, c, 800)).not.toBeNull();
    });
    test('never past the most the box can scroll to; as low as it can is not scrolled again', () => {
        const c = palette(600);
        const target = {top: c.bottom + 100, bottom: c.bottom + 140};
        expect(scrollTopToShow(target, c, 400, 450)).toBe(450);
        expect(scrollTopToShow(target, c, 450, 450)).toBeNull();
    });
    test('a shift of a pixel is no scroll', () => {
        const c = palette(600);
        const middle = c.top + 300;
        expect(scrollTopToShow({top: middle + 21, bottom: middle + 61}, c, 300)).toBeNull();
    });
    test('a container too short for the margins still shows the target at its middle', () => {
        expect(scrollTopToShow({top: 200, bottom: 240}, {top: 0, bottom: 30}, 0)).toBe(200 - SCROLL_EDGE_PX);
    });
});
