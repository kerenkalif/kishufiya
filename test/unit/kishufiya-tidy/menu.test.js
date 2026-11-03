// The workspace menu's two tidy items (src/lib/kishufiya-tidy.js tidyItems), Keren 2026-11-03.
//   npx jest test/unit/kishufiya-tidy
import {MENU_LABELS, tidyItems} from '../../../src/lib/kishufiya-tidy.js';

const labels = MENU_LABELS.he;
const other = (text, extra) => ({text, enabled: true, callback: () => {}, ...extra});

describe('tidyItems', () => {
    test('the marked item becomes the two, wide first, in its place', () => {
        const before = other('undo');
        const after = other('collapse', {separator: true});
        const items = tidyItems([before, {text: 'x', enabled: true, kishufiyaTidy: true}, after], labels, () => {});
        expect(items.map(i => i.text)).toEqual(['undo', labels.wide, labels.long, 'collapse']);
        expect(items[0]).toBe(before);
        expect(items[3]).toBe(after);
    });
    test('the enabled state carries over to both', () => {
        for (const enabled of [true, false]) {
            const items = tidyItems([{text: 'x', enabled, kishufiyaTidy: true}], labels, () => {});
            expect(items.map(i => i.enabled)).toEqual([enabled, enabled]);
        }
    });
    test('each item runs its own direction', () => {
        const run = jest.fn();
        const items = tidyItems([{text: 'x', enabled: true, kishufiyaTidy: true}], labels, run);
        items[0].callback();
        items[1].callback();
        expect(run.mock.calls).toEqual([['wide'], ['long']]);
    });
    test('with no marked item nothing changes', () => {
        const options = [other('a'), other('b', {separator: true})];
        const items = tidyItems(options, labels, () => {});
        expect(items).toEqual(options);
        expect(items[1]).toBe(options[1]);
    });
});
