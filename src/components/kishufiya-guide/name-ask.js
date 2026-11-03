// כישופייה (2026-11-02, platform decision 52): the name the guide asks for in the name window of a new variable, list or message.
// The page says it ('names' message, guide.js header); the window (containers/prompt.jsx) holds the child to it: a different
// name creates nothing, the window stays, and `wrong` (the page's words) shows beside the box. No page, or no 'names' sent: the
// window is as Scratch has it. The page decides the words and the name; this only compares what was typed.
let ask = null;

export const setNameAsk = msg => {
    ask = msg && !msg.clear && typeof msg.name === 'string' && msg.name.trim() ? {
        name: msg.name,
        kind: msg.kind,
        ci: Boolean(msg.ci),
        wrong: String(msg.wrong || ''),
        // decision 56: a variable "לזכור לפעם הבאה 📌" is asked for - the window is held until its box is ticked too
        keptMissing: String(msg.keptMissing || '')
    } : null;
};

// The kind of window a prompt is: 'message', 'list', 'variable'; null for any other (a rename keeps its own name)
export const promptKind = ({varType, showVariableOptions}) => {
    if (varType === 'broadcast_msg') return 'message';
    if (!showVariableOptions) return null;
    return varType === 'list' ? 'list' : 'variable';
};

// A right name closing its window: the ask is done with at once, so a second window is not held to it for the moment
// before the page clears it (only a window of the asked kind). Also cleared by 'guide-clear' (guide.js).
export const nameAccepted = kind => {
    if (ask && kind && ask.kind === kind) ask = null;
};

// The words to show when `typed` is not what is asked in a window of this kind; null when the name is right or nothing is asked.
export const nameProblem = (kind, typed) => {
    if (!ask || !kind || ask.kind !== kind) return null;
    const a = String(typed).trim();
    const b = ask.name.trim();
    const same = ask.ci ? a.toLowerCase() === b.toLowerCase() : a === b;
    return same ? null : (ask.wrong || ask.name);
};

// The words to show when the right name is typed in a window that must make a kept variable and its box is not ticked; null otherwise.
export const keptProblem = (kind, typed, ticked) => {
    if (nameProblem(kind, typed) || !ask || !ask.keptMissing || ticked) return null;
    return ask.keptMissing;
};
