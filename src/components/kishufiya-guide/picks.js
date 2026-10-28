// What the child adds, told to the lesson as it happens (library-pick, guide.js; platform auto-root 2026-10-28):
// a sprite, a backdrop, a costume or a sound, and where it came from. The vm's own add methods, wrapped once:
// every way into the game passes one of them (the libraries, the brush, a file, "surprise"), and what is added
// tells where it came from - the brush's empty picture, a library item's tags, a file's own asset.
// - Told before the add, in the same tick: the lesson hears of the pick before any game that holds it (the game
//   reaches it later, on a change) - a known item's step passing on the game first took the pick for the step
//   after it (platform review, 2026-10-28).
// - Not a sprite brought back from the bin: deleteSprite's restore adds it again through addSprite.
const BLANK = ['cd21514d0531fdffb22204e0ec5ed84a', '3339a2953a3bf62bb80e54ff575dbced'];
const md5Of = value => (typeof value === 'string' && value ? value.split('.')[0] : null);

export const watchPicks = (vm, tell) => {
    if (!vm || vm.kishufiyaPicks) return;
    vm.kishufiyaPicks = true;
    let fromLibrary = false; // inside addCostumeFromLibrary, which adds through addCostume
    const restores = []; // restores of deleted sprites whose addSprite has not come yet
    const isStageTarget = targetId => {
        const target = targetId ? vm.runtime.getTargetById(targetId) : vm.editingTarget;
        return Boolean(target && target.isStage);
    };
    const wrap = (method, describe) => {
        const own = vm[method] && vm[method].bind(vm);
        if (!own) return;
        vm[method] = (...args) => {
            let pick = null;
            try {
                pick = describe(...args);
            } catch (e) {
                // a pick not told is a pick the lesson waits for again: never a reason to fail the add
            }
            if (pick) tell({type: 'library-pick', ...pick, name: pick.name || '', asset: pick.asset || null});
            return own(...args);
        };
    };
    const ownDelete = vm.deleteSprite && vm.deleteSprite.bind(vm);
    if (ownDelete) {
        vm.deleteSprite = (...args) => {
            const restore = ownDelete(...args);
            if (typeof restore !== 'function') return restore;
            return (...again) => {
                const token = {};
                restores.push(token);
                const result = restore(...again);
                // the sprite never came back (its zip failed): no restore waits any more
                const drop = () => {
                    const at = restores.indexOf(token);
                    if (at >= 0) restores.splice(at, 1);
                };
                if (result && typeof result.then === 'function') result.then(() => {}, drop);
                return result;
            };
        };
    }
    wrap('addSprite', input => {
        if (typeof input !== 'string') {
            if (restores.length) {
                restores.shift(); // a deleted sprite brought back: no pick
                return null;
            }
            return {kind: 'sprite', source: 'upload'}; // a sprite file
        }
        const item = JSON.parse(input);
        const costume = (item.costumes || [])[0] || {};
        const asset = md5Of(costume.md5ext || costume.md5 || costume.baseLayerMD5 || costume.assetId);
        const source = BLANK.includes(asset) ? 'paint' : Array.isArray(item.tags) ? 'library' : 'upload';
        return {kind: 'sprite', source, name: item.name || item.objName, asset};
    });
    const libraryCostume = vm.addCostumeFromLibrary && vm.addCostumeFromLibrary.bind(vm);
    if (libraryCostume) {
        vm.addCostumeFromLibrary = (...args) => {
            fromLibrary = true;
            try {
                return libraryCostume(...args);
            } finally {
                fromLibrary = false;
            }
        };
    }
    const costumeSource = (md5ext, costume) => {
        if (BLANK.includes(md5Of(md5ext))) return 'paint';
        return fromLibrary || !(costume && costume.asset) ? 'library' : 'upload';
    };
    wrap('addCostume', (md5ext, costume, targetId) => ({
        kind: isStageTarget(targetId) ? 'backdrop' : 'costume',
        source: costumeSource(md5ext, costume),
        name: costume && costume.name,
        asset: md5Of(md5ext)
    }));
    wrap('addBackdrop', (md5ext, backdrop) => ({
        kind: 'backdrop', source: costumeSource(md5ext, backdrop), name: backdrop && backdrop.name, asset: md5Of(md5ext)
    }));
    wrap('addSound', sound => ({
        kind: 'sound',
        source: sound && sound.asset ? 'upload' : 'library',
        name: sound && sound.name,
        asset: md5Of(sound && (sound.md5 || sound.md5ext))
    }));
};
