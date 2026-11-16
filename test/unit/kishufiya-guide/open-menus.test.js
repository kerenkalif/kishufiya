// The menus open over the code are told in code-area `avoid`, so the page's bubble stands off them (donuts "בוחרים ניקוד":
// the bubble covered the variable menu's choices). A stand-in document, as in sprite-pane.
//   npx jest test/unit/kishufiya-guide/open-menus
import {openMenuRects, OPEN_MENU_SELECTORS} from '../../../src/components/kishufiya-guide/open-menus.js';

const box = (left, top, width, height) => ({left, top, width, height, right: left + width, bottom: top + height});
const doc = byClass => ({
    querySelectorAll: selector => (byClass[selector] || []).map(r => ({getBoundingClientRect: () => r}))
});

describe('openMenuRects', () => {
    test('a variable menu open under its block is told, as whole pixels', () => {
        const d = doc({'.blocklyDropDownDiv': [box(100.4, 200.6, 150, 90)]});
        expect(openMenuRects(d)).toEqual([{left: 100, top: 201, width: 150, height: 90}]);
    });

    test('a menu that is closed (no size) is not told: the bubble returns to its place', () => {
        const d = doc({'.blocklyDropDownDiv': [box(0, 0, 0, 0)], '.blocklyWidgetDiv': [box(10, 10, 0, 40)]});
        expect(openMenuRects(d)).toEqual([]);
    });

    test('every kind of menu counts: dropdown, field editor, context menu', () => {
        const d = doc({'.blocklyDropDownDiv': [box(1, 1, 10, 10)], '.blocklyWidgetDiv': [box(2, 2, 10, 10)], '.blocklyContextMenu': [box(3, 3, 10, 10)]});
        expect(openMenuRects(d)).toHaveLength(3);
        expect(OPEN_MENU_SELECTORS).toHaveLength(3);
    });

    test('nothing open, nothing told', () => {
        expect(openMenuRects(doc({}))).toEqual([]);
    });
});
