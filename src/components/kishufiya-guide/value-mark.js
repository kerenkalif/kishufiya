// The value of a guide (platform decision 0055, marks/mark-signs.ts; SPEC-editor-base section 13): the lesson's base
// decides WHAT goes in the ringed field and sends it on the target (`signs`); the editor only draws it. A value to TYPE
// is drawn in a tag by the field; a value to PICK is ringed in the field's open menu. Pure, so jest tests it
// (test/unit/kishufiya-guide/value-mark).

// The value drawn by the ringed field: whatever `value` the base sent, whatever the act - the base decides once when
// there is a tag (it sends `value` only for a value to type). Words of the child's own come with no value (an
// example by the field would be copied as the answer), a choice of a menu is ringed in its menu, and a key to
// press comes as `key`.
export const valueTagOf = signs => {
    if (!signs || typeof signs.value !== 'string' || signs.value === '') return null;
    return signs.value;
};

// The key to press, as the base says it: `keyLabel` (the key's name as the editor's menu shows it, the way `choice.label` is) when
// the base sends one, else the `key` itself as sent. The editor holds no table of key names: the base is their one source.
export const keyLabelOf = signs => {
    const say = signs && (typeof signs.keyLabel === 'string' && signs.keyLabel !== '' ? signs.keyLabel : signs.key);
    return typeof say === 'string' && say.trim() !== '' ? say : null;
};

// The one tag of a ringed target, by the base's signs: a value to type, else a key to press, else a choice to pick (the
// closed field says it too; its open menu rings it besides). `kind` is the look of the tag: a key is drawn as a key cap.
// → {text, kind: 'value' | 'key' | 'pick'} or null
export const signTagOf = signs => {
    const value = valueTagOf(signs);
    if (value !== null) return {text: value, kind: 'value'};
    const key = signs && signs.act !== 'type' ? keyLabelOf(signs) : null;
    if (key !== null) return {text: key, kind: 'key'};
    const choice = choiceOf(signs);
    if (choice !== null) return {text: choice, kind: 'pick'};
    return null;
};

// Where each tag is drawn: a key by whatever is pressed (the stage has no field), a choice by its field, a value by a field or a
// box (`onIt`: the ringed thing is one), never on the way to it. `found`: {via, input}. → the tag, or null
export const signShownAt = (sign, found) => {
    if (!sign) return null;
    if (sign.kind === 'key') return sign;
    if (sign.kind === 'pick') return found && found.via === 'field' ? sign : null;
    return found && (found.via === 'field' || Boolean(found.input)) ? sign : null;
};

// Where the tag goes, by the field's rectangle ({left, top, right, bottom}): over the field, centred on it - a
// field's own editor (the number pad, a menu) opens under it, and the tag is never INSIDE the field, which shows what
// the child typed. No room over it: under it. `under`: a box with its own words over it (the "y" of a sprite's
// place) - the tag goes under the box, and over it only when there is no room under. Held inside the window.
// → {left, top, right, bottom}
export const TAG_GAP = 14;
export const tagPlace = (rect, size, view, under) => {
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, hi));
    const middle = (rect.left + rect.right) / 2;
    const left = Math.round(clamp(middle - (size.width / 2), 0, view.width - size.width));
    const over = rect.top - TAG_GAP - size.height;
    const below = rect.bottom + TAG_GAP;
    const fits = under ? below + size.height > view.height && over >= 0 : over >= 0;
    const top = Math.round(fits ? over : clamp(below, 0, view.height - size.height));
    return {left, top, right: left + size.width, bottom: top + size.height};
};

// The choice to ring in an open menu: the base's `choice.label` is the menu's own text for it, with its niqqud. Found
// by that text; then without niqqud (a menu drawn plain); -1 when the menu has no such item (another field's menu).
const NIQQUD = /[\u0591-\u05C7]/g;
const exact = text => String(text || '').replace(/\s+/g, ' ')
    .trim();
const plain = text => exact(String(text || '').replace(NIQQUD, ''));
export const choiceOf = signs => {
    const choice = signs && signs.act === 'pick' && signs.choice;
    return choice && typeof choice.label === 'string' && choice.label !== '' ? choice.label : null;
};
export const choiceIndex = (labels, label) => {
    if (plain(label) === '') return -1;
    const asIs = labels.findIndex(text => exact(text) === exact(label));
    return asIs > -1 ? asIs : labels.findIndex(text => plain(text) === plain(label));
};

// The items of the menu open now (a field's dropdown), as the document has them: each {el, text}.
export const MENU_ITEM = '.blocklyDropDownDiv .goog-menuitem';
export const openMenuItems = doc => Array.from(doc.querySelectorAll(MENU_ITEM))
    .map(el => {
        const content = el.querySelector && el.querySelector('.goog-menuitem-content');
        return {el, text: (content || el).textContent || ''};
    })
    .filter(item => {
        const r = item.el.getBoundingClientRect();
        return r && r.width > 0 && r.height > 0;
    });
