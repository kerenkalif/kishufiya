//   npx jest test/unit/kishufiya-menus
import {menuRules, menusMode, setMenus, currentMenuRules, subscribeMenus} from '../../../src/lib/kishufiya-menus.js';
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
        expect(Object.values(menuRules('staff', true)).every(Boolean)).toBe(true);
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
