/**
 * ☁ variables in כישופייה (2026-10-27, stage 1): every child may make one, no "Scratcher" status. Its value
 * is kept for that child's copy of that game - a high score that is still there the next time the game opens.
 * Nothing is shared between children yet.
 *
 * The VM's cloud provider is our own, not Scratch's or TurboWarp's server (cloudHost is empty, so
 * cloud-manager-hoc never connects): a moment after a ☁ variable changes it tells the page all of the
 * game's ☁ values ({kishufiya: 'cloud', values}); the page keeps them per child and game (the platform's
 * useKishufiya, at most every few seconds) and hands them back with the game the next time it opens, in the
 * game's response header X-Kishufiya-Cloud (base64 of their JSON).
 *
 * As on Scratch, only numbers are kept, up to 256 characters: any other value plays on during the run, and
 * the last number before it is the one kept. Multiplayer, later, would be another provider over the same
 * calls - the VM's side of it does not change.
 */

export const MAX_CLOUD_VALUE = 256;
export const MAX_CLOUD_NAME = 60; // the "☁ " included; the platform refuses longer names
export const CLOUD_HEADER = 'X-Kishufiya-Cloud';
const SEND_AFTER_MS = 1000; // a game changing its ☁ every frame tells the page once a second at most
const NUMBER = /^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

// The value as it is kept, or null when it is not a number Scratch would keep.
export const keepable = value => {
    const text = String(value);
    return text.length <= MAX_CLOUD_VALUE && NUMBER.test(text) ? text : null;
};

// The ☁ values the page sent with the game (none when the header is missing or unreadable).
export const readCloudHeader = response => {
    const header = response.headers.get(CLOUD_HEADER);
    if (!header) return {};
    try {
        const bytes = Uint8Array.from(atob(header), c => c.charCodeAt(0));
        const values = JSON.parse(new TextDecoder().decode(bytes));
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
        v.name.startsWith('☁ ') && v.name.length <= MAX_CLOUD_NAME);
};

/**
 * @param {VirtualMachine} vm the editor's VM
 * @param {function(object)} send tells the page the game's ☁ values, {name: number as text}
 * @returns {{start: function(object)}} start(values): a game was just loaded, with the values kept for it
 */
export const attachCloud = (vm, send) => {
    let kept = {}; // the values the page has: what a ☁ variable holding something else keeps
    let sent = '{}';
    let timer = null;

    const current = () => {
        const values = {};
        for (const variable of cloudVariables(vm)) {
            const value = keepable(variable.value);
            if (value !== null) values[variable.name] = value;
            else if (typeof kept[variable.name] === 'string') values[variable.name] = kept[variable.name];
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
                variable.value = String(Number(value)) === value ? Number(value) : value;
            }
            kept = {};
            kept = current();
            sent = JSON.stringify(kept); // what the game opened with is not news to the page
            vm.setCloudProvider(provider);
        }
    };
};
