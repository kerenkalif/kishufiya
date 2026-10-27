/**
 * ☁ variables in כישופייה (2026-10-27, stage 1): every child may make one, no "Scratcher" status. Its value
 * is kept for that child's copy of that game - a high score, a name, a saved level, still there the next time
 * the game opens. Nothing is shared between children yet.
 *
 * The VM's cloud provider is our own, not Scratch's or TurboWarp's server (cloudHost is empty, so
 * cloud-manager-hoc never connects): a moment after a ☁ variable changes it tells the page all of the
 * game's ☁ values ({kishufiya: 'cloud', values}); the page keeps them per child and game (the platform's
 * useKishufiya, at most every few seconds) and hands them back when the game opens again: the game's
 * response says it has some (X-Kishufiya-Cloud), and the editor asks for them (the same address, part=cloud).
 *
 * Any value a variable holds is kept, text too (Keren, 2026-10-27 - Scratch keeps numbers only), as text:
 * up to MAX_CLOUD_VALUE characters each, and all of a game's together up to MAX_CLOUD_BYTES (the page sends
 * them with keepalive on the way out, and the browser carries at most 64KB that way). A value past a cap
 * plays on during the run, and the last one that fitted is the one kept. Multiplayer, later, would be another
 * provider over the same calls - the VM's side of it does not change.
 */

export const MAX_CLOUD_VALUE = 10000; // characters: a list of names or a saved level, not a book
export const MAX_CLOUD_BYTES = 60000; // the values as the page sends them (JSON, UTF-8): under keepalive's 64KB
export const MAX_CLOUD_NAME = 60; // the "☁ " included; the platform refuses longer names
export const CLOUD_HEADER = 'X-Kishufiya-Cloud';

/*
 * "לזכור לפעם הבאה" (Keren, 2026-10-27): these are not Scratch's cloud variables - nothing is shared, the value is
 * kept for this child's copy of this game - so the child never sees "ענן" or ☁. The variable's NAME still
 * starts with "☁ " (CLOUD_PREFIX, as scratch-blocks names it): that is what is saved in the project and the .sb3,
 * what the platform keeps the values under, and what Scratch reads as a cloud variable. Only what is shown
 * changes: palette, blocks, menus, monitors and dialogs show REMEMBER_MARK instead (showRemembered). The mark is
 * provisional, so it lives here only.
 */
export const CLOUD_PREFIX = '☁ ';
export const REMEMBER_MARK = '📌';
// The text as the child sees it: "☁ " (the start of a kept variable's name, also inside a sentence) shown as
// the mark. Anything else is as it was.
export const showRemembered = text => (typeof text === 'string' && text.includes(CLOUD_PREFIX) ?
    text.split(CLOUD_PREFIX).join(`${REMEMBER_MARK} `) : text);
const SEND_AFTER_MS = 1000; // a game changing its ☁ every frame tells the page once a second at most
// a NUL, or half of a surrogate pair: text the database cannot keep
const NUL = String.fromCharCode(0);
const HALF_PAIR = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

// The value as it is kept (as text), or null when it cannot be kept.
export const keepable = value => {
    const text = String(value);
    return text.length <= MAX_CLOUD_VALUE && !text.includes(NUL) && !HALF_PAIR.test(text) ? text : null;
};

const bytes = values => new TextEncoder().encode(JSON.stringify(values)).length;

// The ☁ values the page has for the game: none when the game's response says it has none, or they cannot
// be read.
export const readCloud = async (response, url) => {
    if (!response.headers.get(CLOUD_HEADER)) return {};
    try {
        const address = new URL(url, location.href);
        address.searchParams.set('part', 'cloud');
        const res = await fetch(address, {credentials: 'same-origin'});
        if (!res.ok) return {};
        const values = await res.json();
        return values && typeof values === 'object' && !Array.isArray(values) ? values : {};
    } catch (e) {
        return {};
    }
};

// ☁ variables live on the stage only, and only plain variables (not lists) can be ☁. The platform keeps
// those named as the editor names them, "☁ " first (a project edited by hand may have others).
const cloudVariables = vm => {
    const stage = vm.runtime.getTargetForStage();
    if (!stage) return [];
    return Object.values(stage.variables).filter(v => v.isCloud && v.type === '' &&
        v.name.startsWith(CLOUD_PREFIX) && v.name.length <= MAX_CLOUD_NAME);
};

/**
 * @param {VirtualMachine} vm the editor's VM
 * @param {function(object)} send tells the page the game's ☁ values, {name: value as text}
 * @returns {{start: function(object)}} start(values): a game was just loaded, with the values kept for it
 */
export const attachCloud = (vm, send) => {
    let kept = {}; // the values the page has: what a ☁ variable holding something else keeps
    let sent = '{}';
    let timer = null;

    const current = () => {
        const values = {};
        for (const variable of cloudVariables(vm)) {
            // its value now; past a cap, the last one kept; past the game's cap even so, none
            const last = typeof kept[variable.name] === 'string' ? kept[variable.name] : null;
            for (const value of [keepable(variable.value), last]) {
                if (value === null) continue;
                values[variable.name] = value;
                if (bytes(values) <= MAX_CLOUD_BYTES) break;
                delete values[variable.name];
            }
        }
        return values;
    };

    const flush = () => {
        timer = null;
        const values = current();
        const json = JSON.stringify(values);
        if (json === sent) return;
        sent = json;
        kept = values;
        send(values);
    };
    // Created, set, renamed or deleted: the whole set is read again a moment later.
    const changed = () => {
        if (!timer) timer = setTimeout(flush, SEND_AFTER_MS);
    };
    const provider = {
        createVariable: changed,
        updateVariable: changed,
        renameVariable: changed,
        deleteVariable: changed,
        requestCloseConnection: () => {}
    };

    // Loading a project clears the VM's provider; the first ☁ variable of a project (loaded, or just made)
    // says so here, before the VM asks the provider about it.
    vm.on('HAS_CLOUD_DATA_UPDATE', hasCloud => {
        if (hasCloud) vm.setCloudProvider(provider);
    });
    vm.setCloudProvider(provider);

    return {
        start (values) {
            clearTimeout(timer);
            timer = null;
            for (const variable of cloudVariables(vm)) {
                if (!Object.prototype.hasOwnProperty.call(values, variable.name)) continue;
                const value = keepable(values[variable.name]);
                if (value === null) continue;
                // kept as text: one that reads back as the same number was a number
                variable.value = value !== '' && String(Number(value)) === value ? Number(value) : value;
            }
            kept = {};
            kept = current();
            sent = JSON.stringify(kept); // what the game opened with is not news to the page
            vm.setCloudProvider(provider);
        }
    };
};
