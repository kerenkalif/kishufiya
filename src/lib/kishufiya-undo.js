// The undo / redo buttons of the menu bar (Keren, 28.11): one history PER SPRITE (up to 20 steps each, kept when the
// child switches sprites) plus the deleted sprites of the project (lib/kishufiya-history.js keeps the order). The code
// area's own undo stays the Blockly workspace's (scratch-blocks workspace.undo(redo)); this file connects the two:
//   - every workspace event that goes on the workspace's undo stack is also recorded in the history;
//   - workspace.undo itself is routed through the history while the bar is on, so Ctrl+Z / Ctrl+Y in the code area
//     and the buttons are one path (Ctrl+Z after a deleted costume brings the costume back, as the button does). A code
//     step runs synchronously, before any await;
//   - the workspace clears its stacks on every reload (a sprite switch): workspaceWillReload() saves the stacks of the
//     sprite that is left and workspaceReloaded(key) puts back the ones of the sprite entered, when its blocks are the
//     same (see signatureOf).
// Addons that touch workspace.undoStack_ (editor-devtools/UndoGroup.js regroups the newest events after they were
// recorded; swap-local-global/userscript.js replaces the run of the two newest events) keep working: they act on the
// events themselves, and the saved stacks hold the same event objects. A regrouped step can leave one marker more than
// the workspace has steps; such a marker is skipped when the workspace has nothing to run for it (history.run).
import {currentMenuRules} from './kishufiya-menus.js';
import {history, describeEntry} from './kishufiya-history.js';
import log from './log.js';

// What the bar draws (pure, so it is tested without a screen). A button is lit while its next entry can run: a code
// step only on the code tab (the workspace is not on screen elsewhere), a deletion on any tab. In Hebrew the arrows
// are mirrored (undo points right, redo left, as in Word). label: null means the plain "ביטול" / "ביצוע חוזר".
export const barView = ({isRtl, isCodeTab, top}) => {
    const side = (entry, redo) => ({
        enabled: Boolean(entry && (entry.kind !== 'code' || isCodeTab)),
        mirrored: Boolean(isRtl),
        label: describeEntry(entry, redo)
    });
    return {undo: side(top.undo, false), redo: side(top.redo, true)};
};

// Enter and Space press a bar button, as on "המשחקים שלי".
export const isPressKey = key => key === 'Enter' || key === ' ';

const barOn = () => currentMenuRules().undoBar;

// What the workspace shows, as text: the same text before and after a reload means the saved events still fit it.
export const signatureOf = ws => {
    const blocks = typeof ws.getAllBlocks === 'function' ? ws.getAllBlocks(false) : [];
    const parts = blocks.map(b => {
        const fields = (b.inputList || []).map(input => (input.fieldRow || [])
            .map(f => (typeof f.getValue === 'function' ? f.getValue() : '')).join(','));
        return `${b.id}|${b.type}|${fields.join(';')}`;
    }).sort();
    const variables = typeof ws.getAllVariables === 'function' ?
        ws.getAllVariables()
            .map(v => `${v.getId ? v.getId() : v.id_}:${v.name}`)
            .sort() : [];
    return `${parts.join(';')}#${variables.join('|')}`;
};

let workspace = null;
let nativeUndo = null;
let stopListening = null;

export const currentTop = () => history.peek();
export const currentNotice = () => history.notice();
export const subscribeUndo = fn => history.subscribe(fn);

const codeHook = {
    canUndo: redo => {
        const stack = workspace && (redo ? workspace.redoStack_ : workspace.undoStack_);
        return Boolean(stack && stack.length > 0);
    },
    undo: redo => {
        if (typeof workspace.hideChaff === 'function') workspace.hideChaff();
        nativeUndo(Boolean(redo));
    },
    snapshot: () => ({
        undo: workspace.undoStack_.slice(),
        redo: workspace.redoStack_.slice(),
        signature: signatureOf(workspace)
    }),
    signature: () => signatureOf(workspace),
    restore: snapshot => {
        workspace.undoStack_.push(...snapshot.undo);
        workspace.redoStack_.push(...snapshot.redo);
    }
};

// A workspace event: one that went on its undo stack is one step of the history (Blockly fires the listeners right
// after pushing it on the stack, workspace.js fireChangeListener).
const onWorkspaceEvent = event => {
    if (event && event.recordUndo && barOn()) history.recordCode(event.group);
};

export const detachUndoWorkspace = () => {
    if (workspace) {
        if (stopListening) stopListening();
        if (nativeUndo) workspace.undo = nativeUndo;
    }
    workspace = null;
    nativeUndo = null;
    stopListening = null;
    history.setCode(null);
    history.dropAllCode();
};

// blocks.jsx hands over its workspace once it exists, and takes it back when it is disposed.
export const attachUndoWorkspace = ws => {
    detachUndoWorkspace();
    workspace = ws;
    nativeUndo = ws.undo.bind(ws);
    ws.undo = redo => {
        if (!barOn()) return nativeUndo(redo); // switch off: the workspace's own undo, unchanged
        // the code step (if it is the newest) runs before the first await; a failure is logged, never unhandled
        history.run(Boolean(redo)).catch(error => log.warn(`undo failed: ${error && error.message}`));
    };
    ws.addChangeListener(onWorkspaceEvent);
    stopListening = () => ws.removeChangeListener(onWorkspaceEvent);
    history.setCode(codeHook);
};

// The workspace is about to be reloaded (blocks.jsx, a sprite switch): its stacks are the open sprite's.
// Switch off: nothing at all (no signature, no saved stacks, Blockly's own undo untouched). A failure never breaks the reload.
export const workspaceWillReload = () => {
    if (!barOn()) return;
    try {
        history.beforeReload();
    } catch (error) {
        log.warn(`undo: saving the sprite's steps failed: ${error && error.message}`);
    }
};
// The workspace was reloaded and its stacks cleared: it now shows the sprite `key`.
export const workspaceReloaded = key => {
    if (!barOn()) return;
    try {
        history.afterReload(key);
    } catch (error) {
        log.warn(`undo: restoring the sprite's steps failed: ${error && error.message}`);
    }
};

// The buttons: the same path as the keyboard's. false when nothing ran.
export const runUndo = redo => history.run(Boolean(redo));
