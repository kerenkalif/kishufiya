// What the editor's menus show, decided in ONE place (Keren, 28.11; SPEC-editor-base 16). The page says who
// is looking in the load message ({menus: 'child' | 'staff'}); anything missing or unknown is 'child', so a
// message that never arrives never shows a child the staff's menus. No menu checks the mode on its own:
// each asks menuRules(), and so does the keyboard (menu-bar.jsx handleKeyPress). Hiding is the interface,
// not a permission: the platform checks every save itself.

export const CHILD = 'child';
export const STAFF = 'staff';

export const menusMode = value => (value === STAFF ? STAFF : CHILD);

// inLesson: the game is a lesson's (the load message names a lesson). "New" opens a game of the child's
// own and leaves the lesson, so it shows only outside one (a child has "המשחקים שלי" to leave).
export const menuRules = (mode, inLesson = false) => {
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
        newGame: staff || !inLesson
    };
};

let state = {mode: CHILD, inLesson: false};
const listeners = new Set();

export const setMenus = (mode, inLesson) => {
    const next = {mode: menusMode(mode), inLesson: Boolean(inLesson)};
    if (next.mode === state.mode && next.inLesson === state.inLesson) return;
    state = next;
    for (const listener of listeners) listener();
};

export const currentMenuRules = () => menuRules(state.mode, state.inLesson);

export const subscribeMenus = fn => {
    listeners.add(fn);
    return () => listeners.delete(fn);
};
