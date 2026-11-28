// What the editor's menus show, decided in ONE place (Keren, 28.11; SPEC-editor-base 16). The page says who
// is looking in the load message ({menus: 'child' | 'staff'}); anything missing or unknown is 'child', so a
// message that never arrives never shows a child the staff's menus. No menu checks the mode on its own:
// each asks menuRules(), and so does the keyboard (menu-bar.jsx handleKeyPress). Hiding is the interface,
// not a permission: the platform checks every save itself.

export const CHILD = 'child';
export const STAFF = 'staff';

export const menusMode = value => (value === STAFF ? STAFF : CHILD);

// THE one switch of the undo/redo buttons (Keren, 28.11: "new feature behind a switch"). Off, nothing changes:
// no buttons, and a child keeps "שחזר" in the edit menu. The platform turns it on for one lesson page through the
// load message ({undoBar: true}, from "?undobar=1" for staff), as it does for the key bar.
export const UNDO_BAR_ENABLED = false;

export const undoBarShown = previewed => UNDO_BAR_ENABLED || previewed === true;

// inLesson: the game is a lesson's (the load message names a lesson). "New" opens a game of the child's
// own and leaves the lesson, so it shows only outside one (a child has "המשחקים שלי" to leave).
export const menuRules = (mode, inLesson = false, undoBar = false) => {
    const staff = menusMode(mode) === STAFF;
    return {
        advancedButton: staff, // the "מתקדם" button, and the same window from the edit menu
        turbo: staff,
        fps60: staff,
        username: staff,
        cloudVariables: staff,
        advancedSettings: staff,
        restorePoints: staff,
        packager: staff,
        loadFromComputer: staff, // and its keyboard shortcut (Ctrl+O)
        newWindow: staff, // "New window" (desktop app item), not for a child
        newGame: staff || !inLesson,
        downloadToComputer: true, // "הורדה למחשב": a child's own copy, the platform checks nothing here
        // "שחזר" (the last deleted sprite, costume or sound). With the undo bar, "ביטול" brings deletions back,
        // in order, so nobody keeps this item.
        restoreDeleted: !undoBar,
        undoBar // the "ביטול" / "ביצוע חוזר" buttons, for everyone
    };
};

// Which top menus show, from the items this audience can use (Keren, 28.11): a menu with none is not shown.
// ctx: what the page's own props decide about file-menu items - saveItems (canSave, canCreateCopy, canRemix, default
// none), newWindowAvailable and packagerAvailable (the desktop app / the packager hook exist; default yes),
// playerOnly (the page only plays: no editing menus).
export const menusShown = (rules, ctx = {}) => {
    const {saveItems = false, newWindowAvailable = true, packagerAvailable = true, playerOnly = false} = ctx;
    if (playerOnly) return {file: false, edit: false};
    return {
        file: Boolean(saveItems || rules.newGame || rules.loadFromComputer || rules.downloadToComputer ||
            (newWindowAvailable && rules.newWindow) || (packagerAvailable && rules.packager) || rules.restorePoints),
        edit: Boolean(rules.restoreDeleted || rules.turbo || rules.fps60 || rules.username || rules.cloudVariables ||
            rules.advancedSettings)
    };
};

let state = {mode: CHILD, inLesson: false, undoBar: false};
const listeners = new Set();

export const setMenus = (mode, inLesson, undoBar) => {
    const next = {mode: menusMode(mode), inLesson: Boolean(inLesson), undoBar: undoBarShown(undoBar)};
    if (next.mode === state.mode && next.inLesson === state.inLesson && next.undoBar === state.undoBar) return;
    state = next;
    for (const listener of listeners) listener();
};

export const currentMenuRules = () => menuRules(state.mode, state.inLesson, state.undoBar);

export const subscribeMenus = fn => {
    listeners.add(fn);
    return () => listeners.delete(fn);
};
