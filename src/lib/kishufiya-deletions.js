// Records a deleted sprite, costume or sound in the undo history (lib/kishufiya-history.js), with what is needed to
// bring it back and to delete it again (redo). Called by the three places that delete (target-pane, costume-tab,
// sound-tab) right after the VM deleted it; does nothing while the undo bar is off.
// Nothing here finds anything by NAME: a restore can rename (coin2), so a sprite is found by the id the restore gave,
// a costume or sound by the object itself. A restore that did nothing throws, it is never counted as done.
import {currentMenuRules} from './kishufiya-menus.js';
import {history} from './kishufiya-history.js';

export const TABS = {blocks: 'blocks', costumes: 'costumes', sounds: 'sounds'};

// Set once by the editor page (playground/kishufiya.jsx, which can reach the store): opens a tab, so the child SEES
// what came back.
let showTab = () => {};
export const setTabOpener = fn => {
    showTab = fn || (() => {});
};

const aliveTarget = (vm, id) => {
    const target = vm.runtime.getTargetById(id);
    if (!target || !target.sprite || target.sprite.clones.length === 0) throw new Error('its sprite is gone');
    return target;
};
const listOf = (target, item) => (item === 'Costume' ? target.sprite.costumes : target.sprite.sounds);

// what a restored sprite shows of its costumes and sounds: when it changed, redo of its deletion is dropped
const fingerprint = target => {
    const part = list => list.map(x => `${x.assetId || ''}:${x.name}`).join('|');
    return `${part(target.sprite.costumes)}#${part(target.sprite.sounds)}`;
};

// restoreSprite: the function the VM returned; activateBlocks: what the sprite restore does after (back to the code tab)
export const recordSpriteDeletion = (vm, id, name, restoreSprite, activateBlocks) => {
    if (!restoreSprite || !currentMenuRules().undoBar) return;
    const entry = {
        item: 'Sprite',
        name,
        spriteKey: id,
        vmRestore: restoreSprite,
        restore: async self => {
            const before = new Set(vm.runtime.targets.map(t => t.id));
            await self.vmRestore();
            const target = vm.runtime.targets.find(t => t.isOriginal && !before.has(t.id));
            if (!target) throw new Error(`sprite ${self.name} did not come back`);
            if (activateBlocks) activateBlocks();
            const shown = fingerprint(target);
            self.stale = () => {
                const now = vm.runtime.getTargetById(target.id);
                return !now || !now.sprite || fingerprint(now) !== shown;
            };
            return {targetId: target.id};
        },
        deleteAgain: self => {
            // the sprite is found by the id its restore gave
            const target = vm.runtime.getTargetById(self.spriteKey);
            if (!target || !target.isOriginal) throw new Error(`sprite ${self.name} is not there`);
            self.vmRestore = vm.deleteSprite(target.id);
            self.stale = null;
        }
    };
    history.recordDeletion(entry);
};

// target: the editing target the item belonged to; object: the costume or sound itself (the one that was in the list)
export const recordItemDeletion = (vm, item, object, target, restore) => {
    if (!restore || !object || !currentMenuRules().undoBar) return;
    const tab = item === 'Costume' ? TABS.costumes : TABS.sounds;
    const present = (self, owner) => listOf(owner, item).includes(self.object);
    history.recordDeletion({
        item,
        name: object.name,
        spriteName: target.sprite.name,
        ownerId: target.id,
        object,
        vmRestore: restore,
        rebound: false, // true once the sprite itself was deleted and restored: the VM's own restore is dead then
        restore: async self => {
            const owner = aliveTarget(vm, self.ownerId);
            if (!self.rebound) await self.vmRestore();
            else if (item === 'Costume') {
                await vm.addCostume(`${self.object.assetId}.${self.object.dataFormat}`, self.object, self.ownerId);
            } else await vm.addSound(self.object, self.ownerId);
            if (!present(self, owner)) throw new Error(`${item} ${self.name} did not come back`);
            if (vm.editingTarget !== owner) vm.setEditingTarget(owner.id);
            showTab(tab);
        },
        deleteAgain: self => {
            const owner = aliveTarget(vm, self.ownerId);
            const index = listOf(owner, item).indexOf(self.object);
            if (index < 0) throw new Error(`${item} ${self.name} is not there`);
            if (vm.editingTarget !== owner) vm.setEditingTarget(owner.id);
            const again = item === 'Costume' ? vm.deleteCostume(index) : vm.deleteSound(index);
            if (!again) throw new Error(`${item} ${self.name} could not be deleted again`);
            self.vmRestore = again;
            self.rebound = false;
            showTab(tab);
        }
    });
};
