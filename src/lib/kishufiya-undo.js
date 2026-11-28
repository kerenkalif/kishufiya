// The undo / redo buttons of the menu bar (Keren, 28.11): what Ctrl+Z and Ctrl+Y do in the code area, from the bar.
// The code area's own undo is the Blockly workspace's (scratch-blocks core/blockly.js keydown: workspace.undo(redo)),
// so a button calls the same method on the same workspace: one history, no second one kept here. The workspace
// clears it on every sprite switch (blocks.jsx onWorkspaceUpdate), and says so through notifyUndo().

// What the stacks hold: the buttons are lit while there is something to go back or forward to.
export const stackState = workspace => ({
    undo: Boolean(workspace && workspace.undoStack_ && workspace.undoStack_.length > 0),
    redo: Boolean(workspace && workspace.redoStack_ && workspace.redoStack_.length > 0)
});

// What the bar draws (pure, so it is tested without a screen). The undo and redo buttons are the code area's history
// only, lit while there is something to go back or forward to, and only on the code tab. The restore button is
// separate: it shows only while a deleted sprite, costume or sound can come back, and names which one. In Hebrew
// the arrows are mirrored (undo points right, redo left, as in Word).
export const RESTORE_WORDS = {
    Sprite: 'שחזר את הדמות',
    Costume: 'שחזר את התלבושת',
    Sound: 'שחזר את הצליל'
};

export const barView = ({isRtl, isCodeTab, history, restorable, deletedItem}) => ({
    undo: {enabled: Boolean(isCodeTab && history.undo), mirrored: Boolean(isRtl)},
    redo: {enabled: Boolean(isCodeTab && history.redo), mirrored: Boolean(isRtl)},
    restore: restorable && RESTORE_WORDS[deletedItem] ? {label: RESTORE_WORDS[deletedItem]} : null
});

// Enter and Space press a bar button, as on "המשחקים שלי".
export const isPressKey = key => key === 'Enter' || key === ' ';

let workspace = null;
let last = {undo: false, redo: false};
const listeners = new Set();

export const currentUndoState = () => last;

export const subscribeUndo = fn => {
    listeners.add(fn);
    return () => listeners.delete(fn);
};

// Tells the bar to look again, only when a button's state changed.
export const notifyUndo = () => {
    const next = stackState(workspace);
    if (next.undo === last.undo && next.redo === last.redo) return;
    last = next;
    for (const listener of listeners) listener();
};

export const detachUndoWorkspace = () => {
    if (workspace && typeof workspace.removeChangeListener === 'function') workspace.removeChangeListener(notifyUndo);
    workspace = null;
    notifyUndo();
};

// blocks.jsx hands over its workspace once it exists, and takes it back when it is disposed.
export const attachUndoWorkspace = ws => {
    detachUndoWorkspace();
    workspace = ws;
    workspace.addChangeListener(notifyUndo);
    notifyUndo();
};

// The same call as the keyboard's (Blockly.mainWorkspace.undo(redo)); false when there is no workspace.
export const runUndo = redo => {
    if (!workspace) return false;
    if (typeof workspace.hideChaff === 'function') workspace.hideChaff();
    workspace.undo(Boolean(redo));
    notifyUndo();
    return true;
};
