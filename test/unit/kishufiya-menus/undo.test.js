//   npx jest test/unit/kishufiya-menus
import fs from 'fs';
import path from 'path';

// The class "an item of the menu bar that bypasses menuRules" (it hid the empty edit menu, 28.11): every
// restore / download item and every top menu label sits behind a rules flag.
describe('menu-bar.jsx keeps every item behind menuRules', () => {
    const source = fs.readFileSync(path.join(__dirname, '../../../src/components/menu-bar/menu-bar.jsx'), 'utf8');
    test('restore item, download item and edit label are guarded', () => {
        expect(source).toMatch(/!rules\.restoreDeleted \? null/);
        expect(source).toMatch(/rules\.downloadToComputer && \(\s*<SB3Downloader>/);
        expect(source).toMatch(/shown\.edit && <MenuLabel/);
        expect(source).toMatch(/tabIndex=\{0\}\s*aria-label=\{label\}\s*aria-disabled=\{!side\.enabled\}/);
        expect(source).toMatch(/canManageFiles && shown\.file/);
    });
});

describe('a loaded game has nothing to restore', () => {
    const reducer = require('../../../src/reducers/restore-deletion.js');
    test('clearRestore empties what a delete set', () => {
        const fun = () => {};
        let state = reducer.default(undefined, reducer.setRestore({restoreFun: fun, deletedItem: 'Sprite'}));
        expect(state.restoreFun).toBe(fun);
        state = reducer.default(state, reducer.clearRestore());
        expect(state).toEqual({restoreFun: null, deletedItem: ''});
    });
    test('the load path clears the restore state and the one history', () => {
        const page = fs.readFileSync(path.join(__dirname, '../../../src/playground/kishufiya.jsx'), 'utf8');
        expect(page).toMatch(/setMenus\(menus, Boolean\(lesson\), undoBar\);\s*clearRestoreState\(\);\s*history\.clear\(\);/);
    });
});

describe('the editor calls the history at the right places (wiring)', () => {
    const read = f => fs.readFileSync(path.join(__dirname, '../../../src', f), 'utf8');
    test('blocks.jsx saves the stacks before the reload and hands the sprite id after it', () => {
        const blocks = read('containers/blocks.jsx');
        expect(blocks).toMatch(/onWorkspaceUpdate \(data\) \{\s*workspaceWillReload\(\);/);
        expect(blocks).toMatch(/this\.workspace\.clearUndo\(\);[\s\S]*workspaceReloaded\(this\.props\.vm\.editingTarget/);
    });
    test('the three delete handlers record the object (never a name) and the sprite id', () => {
        expect(read('containers/costume-tab.jsx')).toMatch(/recordItemDeletion\(this\.props\.vm, 'Costume', costume, target,/);
        expect(read('containers/sound-tab.jsx')).toMatch(/recordItemDeletion\(this\.props\.vm, 'Sound', sound, target,/);
        expect(read('containers/target-pane.jsx')).toMatch(/recordSpriteDeletion\(this\.props\.vm, id, name,/);
    });
    test('no Hebrew string is hard-coded in the history modules (words come from kishufiyaMessages)', () => {
        for (const f of ['lib/kishufiya-history.js', 'lib/kishufiya-deletions.js', 'lib/kishufiya-undo.js']) {
            const code = read(f).split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
            expect(code).not.toMatch(/[֐-׿]/);
        }
    });
});
