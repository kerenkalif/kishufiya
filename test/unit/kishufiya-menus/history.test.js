//   npx jest test/unit/kishufiya-menus
import {barView, attachUndoWorkspace, detachUndoWorkspace, runUndo, currentTop, workspaceReloaded, workspaceWillReload}
    from '../../../src/lib/kishufiya-undo.js';
import {history, MAX_PER_SPRITE, MAX_SPRITE_DELETIONS} from '../../../src/lib/kishufiya-history.js';
import {recordSpriteDeletion, recordItemDeletion, setTabOpener} from '../../../src/lib/kishufiya-deletions.js';
import {setMenus} from '../../../src/lib/kishufiya-menus.js';

// the part of a Blockly workspace the history uses (workspace.js: fireChangeListener pushes on the stack and
// clears redo, then calls the listeners; undo pops a whole group and moves it to the other stack)
const fakeWorkspace = () => {
    const listeners = [];
    const ws = {
        undoStack_: [], redoStack_: [], listeners, ran: [], blocks: [],
        addChangeListener: fn => listeners.push(fn),
        removeChangeListener: fn => listeners.splice(listeners.indexOf(fn), 1),
        hideChaff: jest.fn(),
        getAllBlocks: () => ws.blocks,
        fire: event => {
            const e = {recordUndo: true, group: '', ...event};
            if (e.recordUndo) {
                ws.undoStack_.push(e);
                ws.redoStack_.length = 0;
            }
            listeners.slice().forEach(l => l(e));
        },
        // what blocks.jsx onWorkspaceUpdate does for a sprite switch (or any reload): save, load, clear, hand back
        reload: (key, blocks) => {
            workspaceWillReload();
            ws.blocks = blocks || [];
            ws.undoStack_.length = 0;
            ws.redoStack_.length = 0;
            workspaceReloaded(key);
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
const block = id => ({id, type: 'motion_movesteps', inputList: []});

// a VM the way the history's callers meet it: sprites with an id, costumes and sounds as objects, deleteSprite /
// deleteCostume / deleteSound returning the restore, a restore that renames on a clash (coin -> coin2)
const fakeVm = () => {
    const log = [];
    let nextId = 1;
    const vm = {log, editingTarget: null, runtime: {targets: []}};
    vm.runtime.getTargetById = id => vm.runtime.targets.find(t => t.id === id);
    vm.setEditingTarget = jest.fn(id => {
        vm.editingTarget = vm.runtime.getTargetById(id);
    });
    vm.makeSprite = (name, costumes = [], sounds = []) => {
        const sprite = {name, costumes: costumes.map(c => ({...c})), sounds: sounds.map(c => ({...c})), clones: []};
        const target = {id: `t${nextId++}`, isOriginal: true, sprite};
        sprite.clones.push(target);
        vm.runtime.targets.push(target);
        return target;
    };
    vm.deleteSprite = id => {
        const target = vm.runtime.getTargetById(id);
        vm.runtime.targets.splice(vm.runtime.targets.indexOf(target), 1);
        target.sprite.clones = [];
        log.push(`delete ${target.sprite.name}`);
        const {costumes, sounds} = target.sprite;
        return async () => {
            const taken = new Set(vm.runtime.targets.map(t => t.sprite.name));
            const name = taken.has(target.sprite.name) ? `${target.sprite.name}2` : target.sprite.name;
            log.push(`restore ${name}`);
            vm.makeSprite(name, costumes, sounds);
        };
    };
    vm.deleteCostume = index => {
        const target = vm.editingTarget;
        const [costume] = target.sprite.costumes.splice(index, 1);
        log.push(`delete costume ${costume.name}`);
        return async () => {
            if (!target.sprite.clones.length) return; // the VM's own no-op for a sprite that was deleted
            log.push(`restore costume ${costume.name}`);
            target.sprite.costumes.push(costume);
        };
    };
    vm.deleteSound = index => {
        const target = vm.editingTarget;
        const [sound] = target.sprite.sounds.splice(index, 1);
        log.push(`delete sound ${sound.name}`);
        return async () => {
            if (!target.sprite.clones.length) return;
            log.push(`restore sound ${sound.name}`);
            target.sprite.sounds.push(sound);
        };
    };
    vm.addCostume = jest.fn(async (md5ext, object, id) => {
        log.push(`add costume ${object.name}`);
        vm.runtime.getTargetById(id).sprite.costumes.push(object);
    });
    vm.addSound = jest.fn(async (object, id) => {
        log.push(`add sound ${object.name}`);
        vm.runtime.getTargetById(id).sprite.sounds.push(object);
    });
    return vm;
};

const tick = () => new Promise(resolve => setTimeout(resolve, 0));

describe('barView', () => {
    const none = {undo: null, redo: null};
    test('a code step is lit on the code tab only; a deletion on every tab', () => {
        const code = {undo: {kind: 'code'}, redo: null};
        const del = {undo: {kind: 'deleted', item: 'Sound', name: 'pop'}, redo: null};
        expect(barView({isRtl: false, isCodeTab: true, top: code}).undo.enabled).toBe(true);
        expect(barView({isRtl: false, isCodeTab: false, top: code}).undo.enabled).toBe(false);
        expect(barView({isRtl: false, isCodeTab: false, top: del}).undo.enabled).toBe(true);
        expect(barView({isRtl: false, isCodeTab: true, top: none}).undo.enabled).toBe(false);
    });
    test('the arrows are mirrored in Hebrew only', () => {
        expect(barView({isRtl: false, isCodeTab: true, top: none}).undo.mirrored).toBe(false);
        expect(barView({isRtl: true, isCodeTab: true, top: none}).redo.mirrored).toBe(true);
    });
    test('the label names the item, its name and its sprite (words come from kishufiyaMessages)', () => {
        const top = {
            undo: {kind: 'deleted', item: 'Sprite', name: 'coin'},
            redo: {kind: 'deleted', item: 'Costume', name: 'c1', spriteName: 'cat'}
        };
        const view = barView({isRtl: true, isCodeTab: true, top});
        expect(view.undo.label).toEqual({redo: false, item: 'Sprite', name: 'coin', spriteName: ''});
        expect(view.redo.label).toEqual({redo: true, item: 'Costume', name: 'c1', spriteName: 'cat'});
        expect(barView({isRtl: true, isCodeTab: true, top: {undo: {kind: 'code'}, redo: null}}).undo.label).toBe(null);
    });
});

describe('one history per sprite, and the project list of deleted sprites', () => {
    let ws;
    let vm;
    let shown;
    beforeEach(() => {
        setMenus('child', true, true);
        history.clear();
        ws = fakeWorkspace();
        attachUndoWorkspace(ws);
        ws.reload('', []);
        vm = fakeVm();
        shown = [];
        setTabOpener(tab => shown.push(tab));
    });
    afterEach(() => {
        detachUndoWorkspace();
        history.clear();
        setMenus('child', true);
    });
    // opens a sprite the way the editor does: the VM switches, the workspace reloads with its blocks
    const open = (target, blocks) => {
        vm.editingTarget = target;
        ws.reload(target.id, blocks || []);
    };
    const deleteSprite = target => {
        const restore = vm.deleteSprite(target.id);
        const other = vm.runtime.targets[0];
        if (other) open(other, [block('o1')]);
        recordSpriteDeletion(vm, target.id, target.sprite.name, restore, () => shown.push('blocks'));
    };
    const deleteCostume = (target, index) => {
        open(target, ws.blocks);
        const object = target.sprite.costumes[index];
        recordItemDeletion(vm, 'Costume', object, target, vm.deleteCostume(index));
        return object;
    };
    const restores = () => vm.log.filter(x => x.startsWith('restore'));

    test('code, delete a costume, code: undo x3 goes back in reverse order', async () => {
        const cat = vm.makeSprite('cat', [{name: 'c0'}, {name: 'c1'}]);
        open(cat, [block('b1')]);
        ws.fire({name: 'a'});
        deleteCostume(cat, 1);
        ws.fire({name: 'b'});
        expect(await runUndo(false)).toBe(true);
        expect(await runUndo(false)).toBe(true);
        expect(await runUndo(false)).toBe(true);
        expect(await runUndo(false)).toBe(false);
        expect([...ws.ran, ...restores()]).toEqual(['undo b', 'undo a', 'restore costume c1']);
    });

    test('each sprite has its own history, kept when switching and coming back', async () => {
        const cat = vm.makeSprite('cat');
        const dog = vm.makeSprite('dog');
        open(cat, [block('c1')]);
        ws.fire({name: 'cat-1'});
        ws.fire({name: 'cat-2'});
        open(dog, [block('d1')]);
        expect(history.size()).toEqual({undo: 0, redo: 0}); // the dog has nothing to undo
        ws.fire({name: 'dog-1'});
        open(cat, [block('c1')]);
        expect(history.size().undo).toBe(2);
        expect(ws.undoStack_.map(e => e.name)).toEqual(['cat-1', 'cat-2']);
        await runUndo(false);
        expect(ws.ran).toEqual(['undo cat-2']);
        open(dog, [block('d1')]);
        expect(ws.undoStack_.map(e => e.name)).toEqual(['dog-1']);
        open(cat, [block('c1')]);
        expect(history.size()).toEqual({undo: 1, redo: 1}); // the redo of the cat is kept too
        await runUndo(true);
        expect(ws.ran).toEqual(['undo cat-2', 'redo cat-2']);
    });

    test('FALLBACK: when the blocks changed meanwhile, that sprite drops its code steps and keeps its deletions', async () => {
        const cat = vm.makeSprite('cat', [{name: 'c0'}]);
        const dog = vm.makeSprite('dog');
        open(cat, [block('c1')]);
        ws.fire({name: 'cat-1'});
        deleteCostume(cat, 0);
        open(dog, [block('d1')]);
        open(cat, [block('c1'), block('c2')]); // the lesson / VM changed the cat's blocks while it was left
        expect(ws.undoStack_).toEqual([]);
        expect(history.sizeOf(cat.id).undo).toBe(1);
        await runUndo(false);
        expect(vm.log).toContain('restore costume c0');
    });

    test('a reload of the same sprite with the same blocks keeps its steps', () => {
        const cat = vm.makeSprite('cat');
        open(cat, [block('c1')]);
        ws.fire({name: 'a'});
        ws.reload(cat.id, [block('c1')]);
        expect(ws.undoStack_.length).toBe(1);
        expect(history.size().undo).toBe(1);
    });

    test('the depth is 20 per sprite, and one sprite does not use the room of another', () => {
        const cat = vm.makeSprite('cat');
        const dog = vm.makeSprite('dog');
        open(cat, [block('c1')]);
        for (let i = 0; i < MAX_PER_SPRITE + 5; i++) ws.fire({name: `a${i}`, group: ''});
        expect(history.sizeOf(cat.id).undo).toBe(MAX_PER_SPRITE);
        open(dog, [block('d1')]);
        ws.fire({name: 'd'});
        expect(history.sizeOf(dog.id).undo).toBe(1);
        expect(history.sizeOf(cat.id).undo).toBe(MAX_PER_SPRITE);
    });

    test('deleted sprites have their own cap, code steps never push one out', () => {
        const keeper = vm.makeSprite('keeper');
        open(keeper, [block('k')]);
        deleteSprite(vm.makeSprite('s0'));
        for (let i = 0; i < MAX_PER_SPRITE * 3; i++) ws.fire({name: `x${i}`});
        expect(history.projectSize().undo).toBe(1);
        for (let i = 1; i < MAX_SPRITE_DELETIONS + 4; i++) deleteSprite(vm.makeSprite(`s${i}`));
        expect(history.projectSize().undo).toBe(MAX_SPRITE_DELETIONS);
    });

    test('undo takes the newer of the sprite top and the project top (by time)', async () => {
        const cat = vm.makeSprite('cat');
        const dog = vm.makeSprite('dog');
        open(cat, [block('c1')]);
        ws.fire({name: 'a'}); // older
        deleteSprite(dog); // newer; the cat is open
        open(cat, [block('c1')]);
        expect(currentTop().undo.item).toBe('Sprite');
        ws.fire({name: 'b'}); // newest
        expect(currentTop().undo.kind).toBe('code');
        await runUndo(false);
        expect(currentTop().undo.item).toBe('Sprite');
        await runUndo(false);
        expect(vm.runtime.targets.some(t => t.sprite.name === 'dog')).toBe(true);
    });

    test('redo of a sprite deletion deletes the restored sprite by its new id, even when it was renamed', async () => {
        const cat = vm.makeSprite('cat');
        const coin = vm.makeSprite('coin');
        open(cat, [block('c1')]);
        deleteSprite(coin);
        vm.makeSprite('coin'); // the child made a new sprite named coin meanwhile: the restore renames to coin2
        await runUndo(false);
        expect(vm.runtime.targets.some(t => t.sprite.name === 'coin2')).toBe(true);
        await runUndo(true);
        // the restored one went, not the other "coin"
        expect(vm.runtime.targets.some(t => t.sprite.name === 'coin2')).toBe(false);
        expect(vm.runtime.targets.filter(t => t.sprite.name === 'coin')).toHaveLength(1);
    });

    test('redo of a costume deletes the very costume (object), also when another has the same name', async () => {
        const cat = vm.makeSprite('cat', [{name: 'x'}, {name: 'y'}]);
        open(cat, [block('c1')]);
        const gone = deleteCostume(cat, 0);
        await runUndo(false);
        cat.sprite.costumes.unshift({name: 'x'}); // another costume is named 'x' too
        await runUndo(true);
        expect(cat.sprite.costumes.includes(gone)).toBe(false);
        expect(cat.sprite.costumes).toHaveLength(2);
    });

    test('the history of a deleted sprite goes with it and comes back with it; its costume restore works on the new sprite', async () => {
        const cat = vm.makeSprite('cat');
        const coin = vm.makeSprite('coin', [{name: 'c0'}, {name: 'c1'}]);
        open(coin, [block('k1')]);
        ws.fire({name: 'coin-code'});
        const deleted = deleteCostume(coin, 1);
        deleteSprite(coin);
        expect(history.sizeOf(coin.id).undo).toBe(0); // moved out with the sprite
        open(cat, [block('c1')]);
        expect(history.size().undo).toBe(1); // only the sprite deletion is the cat's undo
        await runUndo(false);
        const back = vm.runtime.targets.find(t => t.sprite.name === 'coin');
        expect(back.id).not.toBe(coin.id);
        expect(shown).toContain('blocks');
        // the new sprite's workspace: the same blocks as when it was left
        open(back, [block('k1')]);
        expect(history.sizeOf(back.id).undo).toBe(2); // the code step and the costume deletion
        expect(await runUndo(false)).toBe(true); // the newest of those: the costume deletion
        expect(back.sprite.costumes.includes(deleted)).toBe(true); // on the NEW sprite, not a no-op
        expect(vm.addCostume).toHaveBeenCalled();
        expect(shown).toContain('costumes');
        expect(vm.editingTarget).toBe(back);
    });

    test('a restore that did nothing is not counted as done: the entry stays and the child is told', async () => {
        const cat = vm.makeSprite('cat', [{name: 'c0'}]);
        open(cat, [block('c1')]);
        const object = cat.sprite.costumes[0];
        cat.sprite.costumes.length = 0;
        recordItemDeletion(vm, 'Costume', object, cat, async () => {}); // a restore that adds nothing
        expect(await runUndo(false)).toBe(false);
        expect(history.notice()).toEqual({kind: 'failed', item: 'Costume', name: 'c0'});
        expect(history.sizeOf(cat.id).undo).toBe(1);
    });

    test('a failed restore stops there: older entries do not run past it; twice drops it', async () => {
        const cat = vm.makeSprite('cat', [{name: 'old'}, {name: 'bad'}]);
        open(cat, [block('c1')]);
        deleteCostume(cat, 0);
        const bad = cat.sprite.costumes[0];
        cat.sprite.costumes.length = 0;
        recordItemDeletion(vm, 'Costume', bad, cat, async () => { throw new Error('gone'); });
        expect(await runUndo(false)).toBe(false);
        expect(restores()).toEqual([]); // 'old' did not run past 'bad'
        expect(history.sizeOf(cat.id).undo).toBe(2);
        expect(await runUndo(false)).toBe(false);
        expect(history.notice().kind).toBe('skipped');
        expect(history.sizeOf(cat.id).undo).toBe(1);
        expect(await runUndo(false)).toBe(true); // now the older one
        expect(vm.log).toContain('restore costume old');
        expect(history.notice()).toBe(null);
    });

    test('redo of a sprite deletion is dropped once the restored sprite changed (costume, then code)', async () => {
        const cat = vm.makeSprite('cat');
        const coin = vm.makeSprite('coin', [{name: 'c0'}]);
        open(cat, [block('c1')]);
        deleteSprite(coin);
        await runUndo(false);
        expect(currentTop().redo.item).toBe('Sprite');
        const back = vm.runtime.targets.find(t => t.sprite.name === 'coin');
        back.sprite.costumes.push({name: 'painted'}); // a costume change
        expect(currentTop().redo).toBe(null);
        // a code change drops it as well
        deleteSprite(back);
        await runUndo(false);
        const again = vm.runtime.targets.find(t => t.sprite.name === 'coin');
        open(again, [block('k')]);
        expect(currentTop().redo.item).toBe('Sprite');
        ws.fire({name: 'edit'});
        expect(currentTop().redo).toBe(null);
    });

    test('redo of a sprite deletion works while the sprite is unchanged, and undo again brings it back', async () => {
        const cat = vm.makeSprite('cat');
        const coin = vm.makeSprite('coin');
        open(cat, [block('c1')]);
        deleteSprite(coin);
        await runUndo(false);
        expect(await runUndo(true)).toBe(true);
        expect(vm.runtime.targets.some(t => t.sprite.name === 'coin')).toBe(false);
        expect(await runUndo(false)).toBe(true);
        expect(vm.runtime.targets.some(t => t.sprite.name === 'coin')).toBe(true);
    });

    test('a new action in a sprite clears that sprite redo; a sprite deletion clears the project redo', async () => {
        const cat = vm.makeSprite('cat');
        const dog = vm.makeSprite('dog');
        open(cat, [block('c1')]);
        ws.fire({name: 'a'});
        await runUndo(false);
        expect(history.size().redo).toBe(1);
        ws.fire({name: 'b'});
        expect(history.size().redo).toBe(0);
        deleteSprite(dog);
        await runUndo(false);
        expect(history.projectSize().redo).toBe(1);
        deleteSprite(vm.makeSprite('bird'));
        expect(history.projectSize().redo).toBe(0);
    });

    test('Ctrl+Z (workspace.undo) is the same path: synchronous for a code step, and a failure is not unhandled', async () => {
        const cat = vm.makeSprite('cat', [{name: 'c0'}]);
        open(cat, [block('c1')]);
        ws.fire({name: 'a'});
        ws.undo(false);
        expect(ws.ran).toEqual(['undo a']); // no await needed: synchronous
        const object = cat.sprite.costumes[0];
        cat.sprite.costumes.length = 0;
        recordItemDeletion(vm, 'Costume', object, cat, async () => { throw new Error('x'); });
        ws.undo(false);
        await tick();
        expect(history.notice().kind).toBe('failed');
    });

    test('events of one Blockly group are one step', async () => {
        const cat = vm.makeSprite('cat');
        open(cat, [block('c1')]);
        ws.fire({name: 'a1', group: 'g'});
        ws.fire({name: 'a2', group: 'g'});
        ws.fire({name: 'b'});
        expect(history.size().undo).toBe(2);
        await runUndo(false);
        await runUndo(false);
        expect(ws.ran).toEqual(['undo b', 'undo a2']);
    });

    test('events that are not recorded (UI events) are not history', () => {
        ws.fire({name: 'ui', recordUndo: false});
        expect(history.size().undo).toBe(0);
    });

    test('a code step the workspace no longer has is skipped, not run', async () => {
        const cat = vm.makeSprite('cat');
        open(cat, [block('c1')]);
        ws.fire({name: 'a'});
        ws.undoStack_.length = 0;
        expect(await runUndo(false)).toBe(false);
        expect(ws.ran).toEqual([]);
    });

    test('while a restore runs, a second click does nothing', async () => {
        const cat = vm.makeSprite('cat', [{name: 'c0'}]);
        open(cat, [block('c1')]);
        const object = cat.sprite.costumes[0];
        cat.sprite.costumes.length = 0;
        let release;
        recordItemDeletion(vm, 'Costume', object, cat, () => new Promise(resolve => {
            release = () => {
                cat.sprite.costumes.push(object);
                resolve();
            };
        }));
        const first = runUndo(false);
        expect(await runUndo(false)).toBe(false);
        release();
        expect(await first).toBe(true);
    });

    test('a game load clears everything', () => {
        const cat = vm.makeSprite('cat');
        open(cat, [block('c1')]);
        ws.fire({name: 'a'});
        deleteSprite(vm.makeSprite('dog'));
        history.clear();
        expect(history.size()).toEqual({undo: 0, redo: 0});
        expect(history.projectSize()).toEqual({undo: 0, redo: 0});
        expect(currentTop()).toEqual({undo: null, redo: null});
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
        const cat = vm.makeSprite('cat', [{name: 'c0'}]);
        recordItemDeletion(vm, 'Costume', cat.sprite.costumes[0], cat, async () => {});
        recordSpriteDeletion(vm, cat.id, 'cat', async () => {}, () => {});
        expect(history.size()).toEqual({undo: 0, redo: 0});
        expect(history.projectSize()).toEqual({undo: 0, redo: 0});
        detachUndoWorkspace();
    });
    test('a sprite switch saves and restores nothing (Blockly clears its stacks as always)', () => {
        setMenus('child', true);
        history.clear();
        const before = jest.spyOn(history, 'beforeReload');
        const after = jest.spyOn(history, 'afterReload');
        const ws = fakeWorkspace();
        attachUndoWorkspace(ws);
        ws.reload('s1');
        ws.fire({name: 'a'});
        ws.reload('s2');
        ws.reload('s1');
        expect(ws.undoStack_).toEqual([]);
        expect(before).not.toHaveBeenCalled();
        expect(after).not.toHaveBeenCalled();
        before.mockRestore();
        after.mockRestore();
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
