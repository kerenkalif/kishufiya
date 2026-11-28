//   npx jest test/unit/kishufiya-menus
import fs from 'fs';
import path from 'path';
import {
    stackState, undoAction, WORKSPACE, RESTORE, attachUndoWorkspace, detachUndoWorkspace, runUndo,
    currentUndoState, subscribeUndo, notifyUndo
} from '../../../src/lib/kishufiya-undo.js';

// the part of a Blockly workspace the buttons use
const fakeWorkspace = () => {
    const listeners = [];
    const ws = {
        undoStack_: [], redoStack_: [], listeners,
        addChangeListener: fn => listeners.push(fn),
        removeChangeListener: fn => listeners.splice(listeners.indexOf(fn), 1),
        hideChaff: jest.fn(),
        // the real one (scratch-blocks core/workspace.js undo): move the last event to the other stack
        undo: jest.fn(redo => {
            const from = redo ? ws.redoStack_ : ws.undoStack_;
            const to = redo ? ws.undoStack_ : ws.redoStack_;
            const event = from.pop();
            if (event) to.push(event);
        })
    };
    return ws;
};

describe('stackState', () => {
    test('lit only while the stack holds something', () => {
        expect(stackState(null)).toEqual({undo: false, redo: false});
        expect(stackState({undoStack_: [1], redoStack_: []})).toEqual({undo: true, redo: false});
        expect(stackState({undoStack_: [], redoStack_: [1]})).toEqual({undo: false, redo: true});
    });
});

describe('undoAction', () => {
    test('the code area first, then restore, else dim', () => {
        expect(undoAction(true, true)).toBe(WORKSPACE);
        expect(undoAction(true, false)).toBe(WORKSPACE);
        expect(undoAction(false, true)).toBe(RESTORE);
        expect(undoAction(false, false)).toBe(null);
    });
});

describe('the registered workspace', () => {
    afterEach(() => detachUndoWorkspace());
    test('the buttons follow the stacks, live, and tell only when a state changed', () => {
        const ws = fakeWorkspace();
        const fn = jest.fn();
        const off = subscribeUndo(fn);
        attachUndoWorkspace(ws);
        expect(currentUndoState()).toEqual({undo: false, redo: false});
        ws.undoStack_.push('move');
        ws.listeners.forEach(l => l());
        expect(currentUndoState()).toEqual({undo: true, redo: false});
        expect(fn).toHaveBeenCalledTimes(1);
        ws.undoStack_.push('add'); // still lit: no new call
        notifyUndo();
        expect(fn).toHaveBeenCalledTimes(1);
        off();
    });
    test('undo and redo walk the history as Ctrl+Z and Ctrl+Y do', () => {
        const ws = fakeWorkspace();
        attachUndoWorkspace(ws);
        ws.undoStack_.push('a', 'b');
        expect(runUndo(false)).toBe(true);
        expect(ws.undo).toHaveBeenLastCalledWith(false);
        expect(ws.hideChaff).toHaveBeenCalled();
        expect(currentUndoState()).toEqual({undo: true, redo: true});
        runUndo(false);
        expect(currentUndoState()).toEqual({undo: false, redo: true});
        runUndo(true);
        runUndo(true);
        expect(ws.undo).toHaveBeenLastCalledWith(true);
        expect(currentUndoState()).toEqual({undo: true, redo: false});
    });
    test('a sprite switch clears the stacks: the buttons dim', () => {
        const ws = fakeWorkspace();
        attachUndoWorkspace(ws);
        ws.undoStack_.push('a');
        notifyUndo();
        expect(currentUndoState().undo).toBe(true);
        ws.undoStack_.length = 0; // workspace.clearUndo()
        notifyUndo();
        expect(currentUndoState().undo).toBe(false);
    });
    test('no workspace: nothing to run, both dim', () => {
        expect(runUndo(false)).toBe(false);
        expect(currentUndoState()).toEqual({undo: false, redo: false});
    });
    test('taking the workspace back stops listening', () => {
        const ws = fakeWorkspace();
        attachUndoWorkspace(ws);
        detachUndoWorkspace();
        expect(ws.listeners).toHaveLength(0);
    });
});

// The class "an item of the menu bar that bypasses menuRules" (it hid the empty edit menu, 28.11): every
// restore / download item and every top menu label sits behind a rules flag.
describe('menu-bar.jsx keeps every item behind menuRules', () => {
    const source = fs.readFileSync(path.join(__dirname, '../../../src/components/menu-bar/menu-bar.jsx'), 'utf8');
    test('restore item, download item and edit label are guarded', () => {
        expect(source).toMatch(/!rules\.restoreDeleted \? null/);
        expect(source).toMatch(/rules\.downloadToComputer && \(\s*<SB3Downloader>/);
        expect(source).toMatch(/shown\.edit && <MenuLabel/);
        expect(source).toMatch(/canManageFiles && shown\.file/);
    });
});
