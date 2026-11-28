// ONE undo history of the editor (Keren, 28.11): "ביטול" takes back the newest thing the child did, in the order it
// happened - a code edit, or the deletion of a sprite, a costume or a sound - and "ביצוע חוזר" does it again.
// Pure: no React, no Blockly, no VM. The code area's own undo stack (the Blockly workspace) stays where it is and is
// reached through the `code` hook; this module only keeps the ORDER.
//
// Entries, oldest first in `undoList`:
//   {kind: 'code', group}   a marker for one step of the workspace's undo stack (events of one Blockly group are one
//                           step, as workspace.undo pops a whole group)
//   {kind: 'deleted', item: 'Sprite' | 'Costume' | 'Sound', name, restore(), deleteAgain()}
//                           restore() brings it back (a promise); deleteAgain() deletes it again and returns the new
//                           restore (a promise), used by redo. ALL deletions are kept, not only the last one.
//
// Rules (each has a test in test/unit/kishufiya-menus/history.test.js):
//   - undo pops the newest entry of undoList and pushes it on redoList; redo mirrors.
//   - a new action (a recorded code event or a deletion) empties redoList, as a workspace does.
//   - a sprite switch clears the workspace's undo stack (blocks.jsx onWorkspaceUpdate), so dropCode() removes every
//     code entry from both lists at that moment; deletions stay. So a code entry always belongs to the open sprite.
//   - a game load clears everything (clear()).
//   - at most MAX_ENTRIES entries are kept (a deleted sprite holds its exported bytes).
import log from './log.js';

export const MAX_ENTRIES = 50;

export const ITEM_WORDS = {
    Sprite: 'הדמות',
    Costume: 'התלבושת',
    Sound: 'הצליל'
};

// What a button says it will do: null for a code step (the bar uses its plain "ביטול" / "ביצוע חוזר"), and for a
// deletion
// the item and its name ("ביטול: מחיקת הדמות מטבע").
export const describeEntry = (entry, redo) => {
    if (!entry || entry.kind !== 'deleted' || !ITEM_WORDS[entry.item]) return null;
    const what = `מחיקת ${ITEM_WORDS[entry.item]}${entry.name ? ` ${entry.name}` : ''}`;
    return `${redo ? 'ביצוע חוזר' : 'ביטול'}: ${what}`;
};

// code: {undo(redo), canUndo(redo)} - the workspace's own undo, set by kishufiya-undo.js
export const createHistory = () => {
    let undoList = [];
    let redoList = [];
    let busy = false;
    let code = null;
    const listeners = new Set();
    const notify = () => {
        for (const listener of listeners) listener();
    };
    const top = list => (list.length ? list[list.length - 1] : null);
    const take = (list, entry) => {
        const at = list.lastIndexOf(entry);
        if (at >= 0) list.splice(at, 1);
    };
    const trim = () => {
        if (undoList.length > MAX_ENTRIES) undoList = undoList.slice(undoList.length - MAX_ENTRIES);
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
        peek: () => ({undo: top(undoList), redo: top(redoList)}),
        size: () => ({undo: undoList.length, redo: redoList.length}),
        isBusy: () => busy,

        // a workspace event that went on the workspace's undo stack
        recordCode: group => {
            const last = top(undoList);
            if (!(last && last.kind === 'code' && group && last.group === group)) {
                undoList.push({kind: 'code', group: group || ''});
                trim();
            }
            redoList = [];
            notify();
        },
        recordDeletion: entry => {
            undoList.push({kind: 'deleted', ...entry});
            redoList = [];
            trim();
            notify();
        },
        // the workspace cleared its stacks (a sprite switch)
        dropCode: () => {
            const keep = e => e.kind !== 'code';
            const before = undoList.length + redoList.length;
            undoList = undoList.filter(keep);
            redoList = redoList.filter(keep);
            if (undoList.length + redoList.length !== before) notify();
        },
        clear: () => {
            if (!undoList.length && !redoList.length) return;
            undoList = [];
            redoList = [];
            notify();
        },

        // Takes back (or, with redo, does again) the newest entry. Resolves true when something was done.
        run: async redo => {
            if (busy) return false;
            // the lists are re-read each time: a restore switches sprite, and dropCode() replaces them meanwhile
            const from = () => (redo ? redoList : undoList);
            const to = () => (redo ? undoList : redoList);
            busy = true;
            try {
                while (from().length) {
                    const entry = top(from());
                    if (entry.kind === 'code') {
                        // the workspace is the judge of whether it still has the step
                        if (!code || !code.canUndo(redo)) {
                            from().pop(); // out of step with the workspace: nothing to run for it
                            continue;
                        }
                        code.undo(redo);
                        from().pop();
                        to().push(entry);
                        return true;
                    }
                    try {
                        if (redo) entry.restore = await entry.deleteAgain();
                        else await entry.restore();
                    } catch (error) {
                        log.warn(`undo of a deletion failed: ${error && error.message}`);
                        take(from(), entry); // it cannot be run: drop it, the next one is not blocked by it
                        continue;
                    }
                    take(from(), entry); // by identity: dropCode() may have run during the restore
                    to().push(entry);
                    return true;
                }
                return false;
            } finally {
                busy = false; // eslint-disable-line require-atomic-updates
                notify();
            }
        }
    };
    return api;
};

export const history = createHistory();
