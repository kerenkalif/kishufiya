//   npx jest test/unit/kishufiya-menus
import {barView, attachUndoWorkspace, detachUndoWorkspace, runUndo, currentTop, workspaceCleared}
    from '../../../src/lib/kishufiya-undo.js';
import {history, MAX_ENTRIES} from '../../../src/lib/kishufiya-history.js';
import {recordSpriteDeletion, recordItemDeletion} from '../../../src/lib/kishufiya-deletions.js';
import {setMenus} from '../../../src/lib/kishufiya-menus.js';

// the part of a Blockly workspace the history uses (workspace.js: fireChangeListener pushes on the stack and
// clears redo, then calls the listeners; undo pops a whole group and moves it to the other stack)
const fakeWorkspace = () => {
    const listeners = [];
    const ws = {
        undoStack_: [], redoStack_: [], listeners, ran: [],
        addChangeListener: fn => listeners.push(fn),
        removeChangeListener: fn => listeners.splice(listeners.indexOf(fn), 1),
        hideChaff: jest.fn(),
        fire: event => {
            const e = {recordUndo: true, group: '', ...event};
            if (e.recordUndo) {
                ws.undoStack_.push(e);
                ws.redoStack_.length = 0;
            }
            listeners.slice().forEach(l => l(e));
        },
        clearUndo: () => {
            ws.undoStack_.length = 0;
            ws.redoStack_.length = 0;
            workspaceCleared();
        },
        undo (redo) {
            const from = redo ? ws.redoStack_ : ws.undoStack_;
            const to = redo ? ws.undoStack_ : ws.redoStack_;
            const first = from.pop();
            if (!first) return;
            to.push(first);
            while (from.length && first.group && from[from.length - 1].group === first.group) to.push(from.pop());
            ws.ran.push(`${redo ? 'redo' : 'undo'} ${first.name}`);
        }
    };
    return ws;
};

// a deletion the way the VM reports it: restore() puts it back, deleteSprite returns the restore
const fakeVm = () => {
    const log = [];
    const vm = {log, editingTarget: null, runtime: {targets: []}, setEditingTarget: jest.fn()};
    vm.spriteRestore = name => async () => {
        log.push(`restore ${name}`);
        vm.runtime.targets.push({isOriginal: true, id: `${name}-2`, sprite: {name}});
    };
    vm.deleteSprite = id => {
        const at = vm.runtime.targets.findIndex(t => t.id === id);
        const [t] = vm.runtime.targets.splice(at, 1);
        log.push(`delete ${t.sprite.name}`);
        return vm.spriteRestore(t.sprite.name);
    };
    return vm;
};

const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const aTarget = () => ({id: 't', sprite: {clones: [1], costumes: [], sounds: []}});

describe('barView', () => {
    const none = {undo: null, redo: null};
    test('a code step is lit on the code tab only; a deletion on every tab', () => {
        const code = {undo: {kind: 'code'}, redo: null};
        const del = {undo: {kind: 'deleted', item: 'Sound', name: 'pop'}, redo: null};
        expect(barView({isRtl: false, isCodeTab: true, top: code}).undo.enabled).toBe(true);
        expect(barView({isRtl: false, isCodeTab: false, top: code}).undo.enabled).toBe(false);
        expect(barView({isRtl: false, isCodeTab: false, top: del}).undo.enabled).toBe(true);
        expect(barView({isRtl: false, isCodeTab: true, top: none}).undo.enabled).toBe(false);
        expect(barView({isRtl: false, isCodeTab: true, top: none}).redo.enabled).toBe(false);
    });
    test('the arrows are mirrored in Hebrew only', () => {
        expect(barView({isRtl: false, isCodeTab: true, top: none}).undo.mirrored).toBe(false);
        expect(barView({isRtl: true, isCodeTab: true, top: none}).redo.mirrored).toBe(true);
    });
    test('tooltip: plain for code, the item and its name for a deletion', () => {
        const top = {
            undo: {kind: 'deleted', item: 'Sprite', name: 'מטבע'},
            redo: {kind: 'deleted', item: 'Costume', name: 'costume1'}
        };
        const view = barView({isRtl: true, isCodeTab: true, top});
        expect(view.undo.label).toBe('ביטול: מחיקת הדמות מטבע');
        expect(view.redo.label).toBe('ביצוע חוזר: מחיקת התלבושת costume1');
        expect(barView({isRtl: true, isCodeTab: true, top: {undo: {kind: 'code'}, redo: null}}).undo.label).toBe(null);
        const sound = {undo: {kind: 'deleted', item: 'Sound', name: 'a'}, redo: null};
        expect(barView({isRtl: true, isCodeTab: true, top: sound}).undo.label).toBe('ביטול: מחיקת הצליל a');
    });
});

describe('one history of code and deletions, in the order it happened', () => {
    let ws;
    let vm;
    beforeEach(() => {
        setMenus('child', true, true);
        history.clear();
        ws = fakeWorkspace();
        attachUndoWorkspace(ws);
        vm = fakeVm();
    });
    afterEach(() => {
        detachUndoWorkspace();
        history.clear();
        setMenus('child', true);
    });
    const deleteSprite = name => {
        vm.runtime.targets.push({isOriginal: true, id: name, sprite: {name}});
        const restore = vm.deleteSprite(name);
        recordSpriteDeletion(vm, name, restore, () => {});
        ws.clearUndo(); // deleting the open sprite switches to another: the workspace clears its stacks
    };
    const deleteSound = (name, restore) => recordItemDeletion(vm, 'Sound', name, aTarget(), restore);

    test('code, delete a costume, code: undo x3 goes back in reverse order', async () => {
        ws.fire({name: 'a'});
        recordItemDeletion(vm, 'Costume', 'c1', aTarget(), async () => vm.log.push('restore c1'));
        ws.fire({name: 'b'});
        expect(await runUndo(false)).toBe(true);
        expect(await runUndo(false)).toBe(true);
        expect(await runUndo(false)).toBe(true);
        expect(await runUndo(false)).toBe(false);
        expect([...ws.ran, ...vm.log]).toEqual(['undo b', 'undo a', 'restore c1']);
    });

    test('code, delete a sprite, code: the sprite switch dropped the first code step (rule), deletion stays', async () => {
        ws.fire({name: 'a'});
        deleteSprite('coin');
        ws.fire({name: 'b'});
        expect(history.size().undo).toBe(2);
        await runUndo(false);
        await runUndo(false);
        expect(await runUndo(false)).toBe(false);
        expect([...ws.ran, ...vm.log]).toEqual(['undo b', 'delete coin', 'restore coin']);
    });

    test('every deletion is kept, not only the last', async () => {
        deleteSound('s1', async () => vm.log.push('restore s1'));
        deleteSound('s2', async () => vm.log.push('restore s2'));
        deleteSound('s3', async () => vm.log.push('restore s3'));
        await runUndo(false);
        await runUndo(false);
        await runUndo(false);
        expect(vm.log).toEqual(['restore s3', 'restore s2', 'restore s1']);
    });

    test('redo does them again in order, and a deleted sprite is deleted again', async () => {
        deleteSprite('coin');
        await runUndo(false);
        expect(vm.runtime.targets.some(t => t.sprite.name === 'coin')).toBe(true);
        expect(currentTop().redo.kind).toBe('deleted');
        await runUndo(true);
        expect(vm.runtime.targets.some(t => t.sprite.name === 'coin')).toBe(false);
        expect(vm.log).toEqual(['delete coin', 'restore coin', 'delete coin']);
        await runUndo(false); // and back once more: the new restore works
        expect(vm.log[vm.log.length - 1]).toBe('restore coin');
    });

    test('redo of a costume deletes it again by name, on its own sprite', async () => {
        const target = {
            id: 't', sprite: {clones: [1], costumes: [{name: 'c0'}, {name: 'c1'}], sounds: []}
        };
        vm.deleteCostume = jest.fn(() => async () => {});
        recordItemDeletion(vm, 'Costume', 'c1', target, async () => {});
        await runUndo(false);
        await runUndo(true);
        expect(vm.deleteCostume).toHaveBeenCalledWith(1);
        expect(vm.setEditingTarget).toHaveBeenCalledWith('t');
    });

    test('redo of code mirrors undo; Ctrl+Z (workspace.undo) is the same path as the button', async () => {
        ws.fire({name: 'a'});
        ws.fire({name: 'b'});
        ws.undo(false);
        await tick();
        expect(ws.ran).toEqual(['undo b']);
        expect(currentTop().redo.kind).toBe('code');
        await runUndo(true);
        expect(ws.ran).toEqual(['undo b', 'redo b']);
        expect(history.size()).toEqual({undo: 2, redo: 0});
    });

    test('Ctrl+Z after a deleted sound brings the sound back, not an older code step', async () => {
        ws.fire({name: 'a'});
        deleteSound('pop', async () => vm.log.push('restore pop'));
        ws.undo(false);
        await tick();
        expect(vm.log).toEqual(['restore pop']);
        expect(ws.ran).toEqual([]);
    });

    test('a new action clears redo (code or deletion)', async () => {
        ws.fire({name: 'a'});
        await runUndo(false);
        expect(history.size().redo).toBe(1);
        ws.fire({name: 'b'});
        expect(history.size().redo).toBe(0);
        await runUndo(false);
        deleteSound('pop', async () => {});
        expect(history.size().redo).toBe(0);
    });

    test('events of one Blockly group are one step', async () => {
        ws.fire({name: 'a1', group: 'g'});
        ws.fire({name: 'a2', group: 'g'});
        ws.fire({name: 'b'});
        expect(history.size().undo).toBe(2);
        await runUndo(false);
        await runUndo(false);
        expect(ws.ran).toEqual(['undo b', 'undo a2']);
        expect(history.size()).toEqual({undo: 0, redo: 2});
    });

    test('events that are not recorded (UI events) are not history', () => {
        ws.fire({name: 'ui', recordUndo: false});
        expect(history.size().undo).toBe(0);
    });

    test('a game load clears everything', () => {
        ws.fire({name: 'a'});
        deleteSound('pop', async () => {});
        history.clear();
        expect(history.size()).toEqual({undo: 0, redo: 0});
        expect(currentTop()).toEqual({undo: null, redo: null});
    });

    test('sprite switch rule: code steps leave both lists, deletions stay', async () => {
        deleteSound('pop', async () => {});
        ws.fire({name: 'a'});
        ws.fire({name: 'b'});
        await runUndo(false);
        ws.clearUndo();
        expect(history.size()).toEqual({undo: 1, redo: 0});
        expect(currentTop().undo.kind).toBe('deleted');
    });

    test('a code step the workspace no longer has is skipped, not run', async () => {
        ws.fire({name: 'a'});
        ws.undoStack_.length = 0;
        expect(await runUndo(false)).toBe(false);
        expect(ws.ran).toEqual([]);
    });

    test('a restore that fails drops that entry, and the older ones still run', async () => {
        deleteSound('old', async () => vm.log.push('restore old'));
        deleteSound('bad', async () => { throw new Error('gone'); });
        expect(await runUndo(false)).toBe(true);
        expect(vm.log).toEqual(['restore old']);
    });

    test('while a restore runs, a second click does nothing', async () => {
        let release;
        deleteSound('slow', () => new Promise(resolve => { release = resolve; }));
        const first = runUndo(false);
        expect(await runUndo(false)).toBe(false);
        release();
        expect(await first).toBe(true);
    });

    test('the history is capped', () => {
        for (let i = 0; i < MAX_ENTRIES + 5; i++) deleteSound(`s${i}`, async () => {});
        expect(history.size().undo).toBe(MAX_ENTRIES);
    });

    test('names reach the tooltips, for undo and for redo', async () => {
        deleteSprite('coin');
        expect(barView({isRtl: true, isCodeTab: true, top: currentTop()}).undo.label).toBe('ביטול: מחיקת הדמות coin');
        await runUndo(false);
        expect(barView({isRtl: true, isCodeTab: true, top: currentTop()}).redo.label)
            .toBe('ביצוע חוזר: מחיקת הדמות coin');
    });
});

describe('the switch off: nothing changes', () => {
    test('workspace.undo is the workspace\'s own, and nothing is recorded', () => {
        setMenus('child', true);
        history.clear();
        const ws = fakeWorkspace();
        attachUndoWorkspace(ws);
        ws.fire({name: 'a'});
        ws.undo(false);
        expect(ws.ran).toEqual(['undo a']); // synchronous: the native path
        const vm = fakeVm();
        recordItemDeletion(vm, 'Sound', 'x', aTarget(), async () => {});
        recordSpriteDeletion(vm, 'x', async () => {}, () => {});
        expect(history.size()).toEqual({undo: 0, redo: 0});
        detachUndoWorkspace();
    });
    test('taking the workspace back gives its own undo back', () => {
        const ws = fakeWorkspace();
        const own = ws.undo;
        attachUndoWorkspace(ws);
        expect(ws.undo).not.toBe(own);
        detachUndoWorkspace();
        ws.undoStack_.push({name: 'z', group: ''});
        ws.undo(false);
        expect(ws.ran).toEqual(['undo z']);
    });
});
