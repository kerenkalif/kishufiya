// The undo history of the editor (Keren, 28.11): "ביטול" takes back the newest thing the child did, "ביצוע חוזר" does it
// again. ONE HISTORY PER SPRITE, kept when the child switches sprites (coming back, its undo works again), plus a
// project-level list for deleted sprites.
// Pure: no React, no Blockly, no VM. The code area's own undo stack (the Blockly workspace) stays where it is and is
// reached through the `code` hook; this module keeps the ORDER and what belongs to which sprite.
//
// DEPTH: at most MAX_PER_SPRITE (20) entries per sprite (its code steps and the deletions of its own costumes and
// sounds), and at most MAX_SPRITE_DELETIONS (10) deleted sprites in the project list. Code steps never push a deleted
// sprite out, as the two lists have their own caps.
//
// Entries:
//   {kind: 'code', group, at}       a marker for one step of the workspace's undo stack (events of one Blockly group are
//                                   one step, as workspace.undo pops a whole group). In the list of its sprite.
//   {kind: 'deleted', item: 'Costume' | 'Sound', name, spriteName, ownerId, restore(entry), deleteAgain(entry), at}
//                                   in the list of the sprite it belonged to
//   {kind: 'deleted', item: 'Sprite', name, spriteKey, restore(entry), deleteAgain(entry), spriteState, at}
//                                   in the project list; spriteState is that sprite's own history, kept with the entry
//                                   while the sprite is deleted and handed back (adopted) when it is restored.
//   restore(entry) brings it back (a promise; a sprite resolves {targetId}); deleteAgain(entry) deletes it again (redo).
//   A restore that does nothing must THROW: a no-op is never counted as done.
//
// Rules (each has a test in test/unit/kishufiya-menus/*.test.js):
//   - undo takes the NEWER (by time) of the open sprite's top entry and the project list's top entry. Redo mirrors, by
//     the time the entry was undone.
//   - a new action in a sprite empties that sprite's redo list; a sprite deletion empties the project redo list; and
//     any change of a sprite (code, a costume or a sound deleted, or any change the restored sprite shows in its
//     stale() check) drops the redo of its own deletion.
//   - the Blockly undo stack is cleared by the workspace on every sprite switch (blocks.jsx). beforeReload() saves
//     the stacks of the sprite that is left, afterReload(key) puts the ones of the sprite entered back, but only when
//     the workspace shows the same blocks as when they were saved (code.signature()); else that sprite's code steps are
//     dropped (its deletions stay).
//   - a restore that fails stops there: the entry stays, in order, and the child is told (notice). A second failure of
//     the same entry drops it, so it cannot block the older ones for ever.
//   - a game load clears everything (clear()).
import log from './log.js';

export const MAX_PER_SPRITE = 20;
export const MAX_SPRITE_DELETIONS = 10;

// What a button says it will do: null for a code step (the bar uses its plain "ביטול" / "ביצוע חוזר"), and for a
// deletion what it is; menu-bar.jsx turns it into words (kishufiyaMessages).
export const describeEntry = (entry, redo) => {
    if (!entry || entry.kind !== 'deleted' || !entry.item) return null;
    return {redo: Boolean(redo), item: entry.item, name: entry.name || '', spriteName: entry.spriteName || ''};
};

const top = list => (list.length ? list[list.length - 1] : null);
const take = (list, entry) => {
    const at = list.lastIndexOf(entry);
    if (at >= 0) list.splice(at, 1);
};
const trimTo = (list, max) => {
    if (list.length > max) list.splice(0, list.length - max);
};
const freshState = () => ({undo: [], redo: [], saved: null});
const dropCodeOf = state => {
    const keep = e => e.kind !== 'code';
    state.undo = state.undo.filter(keep);
    state.redo = state.redo.filter(keep);
    state.saved = null;
};

// code: {undo(redo), canUndo(redo), snapshot(), signature(), restore(snapshot)} - the workspace, set by kishufiya-undo.js
export const createHistory = () => {
    let sprites = new Map();
    let project = {undo: [], redo: []};
    let current = '';
    let busy = false;
    let code = null;
    let clock = 0;
    let notice = null;
    const listeners = new Set();
    const notify = () => {
        for (const listener of listeners) listener();
    };
    const stateOf = key => {
        if (!sprites.has(key)) sprites.set(key, freshState());
        return sprites.get(key);
    };
    const stamp = () => {
        clock += 1;
        return clock;
    };
    // a restored sprite that was changed since cannot be deleted again by redo: that redo is dropped
    const pruneStale = () => {
        const fresh = project.redo.filter(e => !(e.stale && e.stale()));
        if (fresh.length !== project.redo.length) project.redo = fresh;
    };
    const dropSpriteRedo = key => {
        project.redo = project.redo.filter(e => !(e.item === 'Sprite' && e.spriteKey === key));
    };
    // the entry each button would act on, with the list it is in and the state that owns the list
    const choose = redo => {
        const name = redo ? 'redo' : 'undo';
        const own = stateOf(current);
        const a = top(own[name]);
        const b = top(project[name]);
        if (a && (!b || a.at > b.at)) return {entry: a, state: own};
        if (b) return {entry: b, state: project};
        return null;
    };
    const applySaved = state => {
        const saved = state.saved;
        state.saved = null;
        if (saved && code && code.signature() === saved.signature) code.restore(saved);
        else dropCodeOf(state);
    };

    const api = {
        setCode: hook => {
            code = hook;
        },
        subscribe: fn => {
            listeners.add(fn);
            return () => listeners.delete(fn);
        },
        // the newest entry each button would act on
        peek: () => {
            pruneStale();
            const undo = choose(false);
            const redo = choose(true);
            return {undo: undo && undo.entry, redo: redo && redo.entry};
        },
        // what the open sprite and the project list hold, for the tests and the bar
        size: () => {
            const own = stateOf(current);
            return {undo: own.undo.length + project.undo.length, redo: own.redo.length + project.redo.length};
        },
        sizeOf: key => {
            const s = stateOf(key);
            return {undo: s.undo.length, redo: s.redo.length};
        },
        projectSize: () => ({undo: project.undo.length, redo: project.redo.length}),
        isBusy: () => busy,
        notice: () => notice,
        currentSprite: () => current,

        // a workspace event that went on the workspace's undo stack, in the open sprite
        recordCode: group => {
            const own = stateOf(current);
            const last = top(own.undo);
            if (!(last && last.kind === 'code' && group && last.group === group)) {
                own.undo.push({kind: 'code', group: group || '', at: stamp()});
                trimTo(own.undo, MAX_PER_SPRITE);
            }
            own.redo = [];
            dropSpriteRedo(current);
            notice = null;
            notify();
        },
        // a sprite, costume or sound was deleted (entry.item says which)
        recordDeletion: entry => {
            const added = {kind: 'deleted', at: stamp(), ...entry};
            if (added.item === 'Sprite') {
                // the sprite's own history leaves with it, and comes back with it
                added.spriteState = sprites.get(added.spriteKey) || freshState();
                sprites.delete(added.spriteKey);
                project.undo.push(added);
                trimTo(project.undo, MAX_SPRITE_DELETIONS);
                project.redo = [];
            } else {
                const own = stateOf(added.ownerId);
                own.undo.push(added);
                trimTo(own.undo, MAX_PER_SPRITE);
                own.redo = [];
                dropSpriteRedo(added.ownerId);
            }
            notice = null;
            notify();
        },
        // The workspace is about to be reloaded (blocks.jsx onWorkspaceUpdate): the stacks it holds are the open
        // sprite's, and they are cleared right after the load.
        beforeReload: () => {
            const own = stateOf(current);
            own.saved = code ? code.snapshot() : null;
        },
        // The workspace was reloaded for the sprite `key` (it may be the same one).
        afterReload: key => {
            const next = key || '';
            current = next;
            applySaved(stateOf(next));
            notify();
        },
        // the workspace is gone (blocks.jsx took it back): no code step can run any more
        dropAllCode: () => {
            for (const state of sprites.values()) dropCodeOf(state);
            notify();
        },
        clear: () => {
            sprites = new Map();
            project = {undo: [], redo: []};
            notice = null;
            notify();
        },

        // Takes back (or, with redo, does again) the newest entry. Resolves true when something was done.
        // A code step runs BEFORE any await, so Ctrl+Z in the code area is as synchronous as Blockly's own.
        run: async redo => {
            if (busy) return false;
            notice = null;
            pruneStale();
            for (;;) {
                const picked = choose(redo);
                if (!picked) {
                    notify();
                    return false;
                }
                const {entry, state} = picked;
                const from = redo ? state.redo : state.undo;
                const to = redo ? state.undo : state.redo;
                if (entry.kind === 'code') {
                    // the workspace is the judge of whether it still has the step
                    if (!code || !code.canUndo(redo)) {
                        take(from, entry); // out of step with the workspace: nothing to run for it
                        continue;
                    }
                    code.undo(redo);
                    take(from, entry);
                    entry.at = stamp();
                    to.push(entry);
                    notify();
                    return true;
                }
                busy = true;
                notify();
                let result = null;
                try {
                    if (redo) await entry.deleteAgain(entry);
                    else result = await entry.restore(entry);
                } catch (error) {
                    log.warn(`undo of a deletion failed: ${error && error.message}`);
                    entry.failures = (entry.failures || 0) + 1;
                    if (entry.failures >= 2) {
                        take(from, entry); // twice: it must not block the older ones for ever
                        notice = {kind: 'skipped', item: entry.item, name: entry.name};
                    } else {
                        notice = {kind: 'failed', item: entry.item, name: entry.name};
                    }
                    busy = false; // eslint-disable-line require-atomic-updates
                    notify();
                    return false;
                }
                take(from, entry); // by identity: another list change may have happened during the restore
                entry.at = stamp();
                entry.failures = 0;
                if (entry.item === 'Sprite') {
                    if (redo) {
                        entry.spriteState = sprites.get(entry.spriteKey) || freshState();
                        sprites.delete(entry.spriteKey);
                    } else {
                        const key = (result && result.targetId) || entry.spriteKey;
                        const state2 = entry.spriteState || freshState();
                        entry.spriteState = null;
                        entry.spriteKey = key;
                        sprites.set(key, state2);
                        // the costumes and sounds it lost before are bound to the dead sprite: they now go to the new one
                        for (const e of state2.undo.concat(state2.redo)) {
                            if (e.kind === 'deleted') {
                                e.ownerId = key;
                                e.rebound = true;
                            }
                        }
                        if (key === current) applySaved(state2); // the workspace already shows it
                    }
                }
                to.push(entry);
                busy = false; // eslint-disable-line require-atomic-updates
                notify();
                return true;
            }
        }
    };
    return api;
};

export const history = createHistory();
