// The undo / redo buttons of the menu bar (Keren, 28.11): ONE history of code edits and of deleted sprites, costumes
// and sounds, in the order they happened (lib/kishufiya-history.js keeps the order). The code area's own undo stays the
// Blockly workspace's (scratch-blocks workspace.undo(redo)); this file connects the two:
//   - every workspace event that goes on the workspace's undo stack is also recorded in the history;
//   - workspace.undo itself is routed through the history while the bar is on, so Ctrl+Z / Ctrl+Y in the code area
//     and the buttons are one path (Ctrl+Z after a deleted costume brings the costume back, as the button does);
//   - the workspace clears its stacks on every sprite switch, and says so through workspaceCleared().
import {currentMenuRules} from './kishufiya-menus.js';
import {history, describeEntry} from './kishufiya-history.js';

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

let workspace = null;
let nativeUndo = null;
let stopListening = null;

export const currentTop = () => history.peek();
export const subscribeUndo = fn => history.subscribe(fn);

const codeHook = {
    canUndo: redo => {
        const stack = workspace && (redo ? workspace.redoStack_ : workspace.undoStack_);
        return Boolean(stack && stack.length > 0);
    },
    undo: redo => {
        if (typeof workspace.hideChaff === 'function') workspace.hideChaff();
        nativeUndo(Boolean(redo));
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
    history.dropCode();
};

// blocks.jsx hands over its workspace once it exists, and takes it back when it is disposed.
export const attachUndoWorkspace = ws => {
    detachUndoWorkspace();
    workspace = ws;
    nativeUndo = ws.undo.bind(ws);
    ws.undo = redo => {
        if (!barOn()) return nativeUndo(redo); // switch off: the workspace's own undo, unchanged
        return history.run(Boolean(redo));
    };
    ws.addChangeListener(onWorkspaceEvent);
    stopListening = () => ws.removeChangeListener(onWorkspaceEvent);
    history.setCode(codeHook);
};

// The workspace cleared its undo stacks (blocks.jsx, a sprite switch): its code steps are gone, deletions stay.
export const workspaceCleared = () => history.dropCode();

// The buttons: the same path as the keyboard's. false when nothing ran.
export const runUndo = redo => history.run(Boolean(redo));
