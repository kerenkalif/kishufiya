//   npx jest test/unit/kishufiya-menus
import {menuRules, menusMode, menusShown, setMenus, currentMenuRules, subscribeMenus, undoBarShown, UNDO_BAR_ENABLED} from '../../../src/lib/kishufiya-menus.js';
import {isOwn, showingMessage} from '../../../src/lib/kishufiya-showing.js';

describe('menusMode', () => {
    test.each([[undefined], [null], [''], ['full'], ['admin'], [1]])('%p is child', v => {
        expect(menusMode(v)).toBe('child');
    });
    test('staff only for exactly staff', () => {
        expect(menusMode('staff')).toBe('staff');
    });
});

describe('menuRules', () => {
    test('child sees none of the technical items', () => {
        const r = menuRules('child', true);
        for (const key of ['advancedButton', 'turbo', 'fps60', 'username', 'cloudVariables', 'advancedSettings',
            'restorePoints', 'packager', 'loadFromComputer']) expect(r[key]).toBe(false);
    });
    test('default (no mode) is child', () => {
        expect(menuRules(undefined, true).advancedButton).toBe(false);
    });
    test('new game: child only outside a lesson; staff always', () => {
        expect(menuRules('child', true).newGame).toBe(false);
        expect(menuRules('child', false).newGame).toBe(true);
        expect(menuRules('staff', true).newGame).toBe(true);
    });
    test('staff sees everything', () => {
        expect(Object.values(menuRules('staff', true, true)).every(Boolean)).toBe(true);
    });
});

describe('menu state', () => {
    test('starts as child, notifies on change only', () => {
        const fn = jest.fn();
        const off = subscribeMenus(fn);
        expect(currentMenuRules().loadFromComputer).toBe(false);
        setMenus('staff', true);
        setMenus('staff', true);
        expect(fn).toHaveBeenCalledTimes(1);
        expect(currentMenuRules().loadFromComputer).toBe(true);
        setMenus(undefined, true);
        expect(currentMenuRules().loadFromComputer).toBe(false);
        off();
    });
});

describe('showing', () => {
    test('own unless a foreign project or a replacing layer', () => {
        expect(isOwn({foreignProject: false, replacedByLayer: false})).toBe(true);
        expect(isOwn({foreignProject: true, replacedByLayer: false})).toBe(false);
        expect(isOwn({foreignProject: false, replacedByLayer: true})).toBe(false);
    });
    test('said on change only', () => {
        expect(showingMessage(true, true)).toBeNull();
        expect(showingMessage(true, false)).toEqual({type: 'showing', own: false});
        expect(showingMessage(false, true)).toEqual({type: 'showing', own: true});
    });
});

describe('menusShown: a menu with no usable item is not shown', () => {
    test('a child with the undo buttons has no edit menu (its only item was restore)', () => {
        expect(menusShown(menuRules('child', true, true)).edit).toBe(false);
        expect(menusShown(menuRules('child', false, true)).edit).toBe(false);
    });
    test('switch off: nothing changes, a child keeps restore in the edit menu', () => {
        expect(menuRules('child', true).restoreDeleted).toBe(true);
        expect(menusShown(menuRules('child', true)).edit).toBe(true);
    });
    test('staff see every menu, with or without the buttons', () => {
        for (const bar of [false, true]) {
            expect(menusShown(menuRules('staff', true, bar))).toEqual({file: true, edit: true});
        }
    });
    test('a child always has the file menu (download is hers)', () => {
        expect(menuRules('child', true, true).downloadToComputer).toBe(true);
        expect(menusShown(menuRules('child', true, true)).file).toBe(true);
    });
    test('the file menu goes when every item of it is off', () => {
        const rules = {...menuRules('child', true), downloadToComputer: false};
        expect(menusShown(rules, {saveItems: false}).file).toBe(false);
        expect(menusShown(rules, {saveItems: true}).file).toBe(true);
        expect(menusShown({...menuRules('staff', true), newGame: false, loadFromComputer: false,
            downloadToComputer: false, restorePoints: false}, {newWindowAvailable: false, packagerAvailable: false})
            .file).toBe(false);
    });
    test('every audience: the edit menu shows exactly when some item of it is on', () => {
        for (const mode of ['child', 'staff']) {
            for (const inLesson of [false, true]) {
                for (const bar of [false, true]) {
                    const r = menuRules(mode, inLesson, bar);
                    const edit = ['restoreDeleted', 'turbo', 'fps60', 'username', 'cloudVariables', 'advancedSettings']
                        .some(k => r[k]);
                    expect(menusShown(r).edit).toBe(edit);
                }
            }
        }
    });
});

describe('menusShown: player only', () => {
    test('a page that only plays has no editing menus', () => {
        expect(menusShown(menuRules('staff', true, true), {playerOnly: true})).toEqual({file: false, edit: false});
    });
});

describe('the undo bar switch', () => {
    test('off by default (new feature behind a switch), on only when the page says so', () => {
        expect(UNDO_BAR_ENABLED).toBe(false);
        expect(undoBarShown(undefined)).toBe(false);
        expect(undoBarShown(false)).toBe(false);
        expect(undoBarShown('1')).toBe(false);
        expect(undoBarShown(true)).toBe(true);
    });
    test('the buttons are for everyone once on', () => {
        expect(menuRules('child', true, true).undoBar).toBe(true);
        expect(menuRules('staff', true, true).undoBar).toBe(true);
        expect(menuRules('child', true).undoBar).toBe(false);
    });
    test('the load message turns it on and off', () => {
        setMenus('child', true, true);
        expect(currentMenuRules().undoBar).toBe(true);
        expect(currentMenuRules().restoreDeleted).toBe(false);
        setMenus('child', true);
        expect(currentMenuRules().undoBar).toBe(false);
    });
});
