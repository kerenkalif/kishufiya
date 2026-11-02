// כישופייה: picking several library items at once (multi-pick, Keren 2026-11-02). Pure logic only - no DOM, no timers:
// library.jsx feeds it what happened and does what it answers. State: {marks: [key], mode: null | 'ctrl' | 'touch'};
// marks are in the order they were marked, and that is the order they are added in.
//   click {key, ctrl}   Ctrl (or Cmd) held: toggle the mark (mode 'ctrl'). In touch marking a tap toggles it too;
//                       marking ends by itself when the last mark is taken off. Otherwise a plain click is one
//                       pick, as before.
//                       A plain click while Ctrl marks are up (the Ctrl release was missed) finishes those marks
//                       and ignores the click: nothing the child did not mean is added.
//   long {key}          a long press with a finger: marks the tile and enters touch marking; on a tile
//                       already marked in touch marking it FINISHES (adds all). The only touch way
//                       to finish - no button.
//   ctrl-up {}          Ctrl/Cmd released: finishes Ctrl marks; nothing marked, nothing happens.
//   cancel {}           Escape, the window closed, the window lost focus: marks are dropped, nothing is added.
// Answer: {state, add}, `add` the keys to add now (marking order) or null.
export const START = Object.freeze({marks: [], mode: null});

const toggled = (marks, key) => (marks.includes(key) ? marks.filter(k => k !== key) : [...marks, key]);
const finish = marks => ({state: START, add: marks.length ? marks : null});

export const multiPick = (state, event) => {
    const {marks, mode} = state;
    switch (event.type) {
    case 'click': {
        if (event.ctrl) {
            const next = toggled(marks, event.key);
            return {state: {marks: next, mode: next.length ? (mode || 'ctrl') : null}, add: null};
        }
        if (mode === 'touch') {
            const next = toggled(marks, event.key);
            return {state: {marks: next, mode: next.length ? 'touch' : null}, add: null};
        }
        if (mode === 'ctrl' && marks.length) return finish(marks);
        return {state: START, add: [event.key]};
    }
    case 'long': {
        if (mode === 'touch' && marks.includes(event.key)) return finish(marks);
        const next = marks.includes(event.key) ? marks : [...marks, event.key];
        return {state: {marks: next, mode: mode || 'touch'}, add: null};
    }
    case 'ctrl-up':
        return mode === 'ctrl' ? finish(marks) : {state, add: null};
    case 'cancel':
        return {state: START, add: null};
    default:
        return {state, add: null};
    }
};

// The items for the keys, in marking order; a key no longer in the data is skipped; a key asked twice is added once.
export const itemsFor = (keys, data, keyOf) => keys
    .filter((key, at) => keys.indexOf(key) === at)
    .map(key => data.find(item => item && item !== '---' && keyOf(item) === key))
    .filter(Boolean);
