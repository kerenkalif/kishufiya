// Records a deleted sprite, costume or sound in the one undo history (lib/kishufiya-history.js), with what is needed to
// bring it back and to delete it again (redo). Called by the three places that delete (target-pane, costume-tab,
// sound-tab) right after the VM deleted it; does nothing while the undo bar is off.
import {currentMenuRules} from './kishufiya-menus.js';
import {history} from './kishufiya-history.js';

const afterRestore = (vm, target, item, name) => {
    if (!target || !target.sprite || target.sprite.clones.length === 0) throw new Error('its sprite is gone');
    if (vm.editingTarget !== target) vm.setEditingTarget(target.id);
    const list = item === 'Costume' ? target.sprite.costumes : target.sprite.sounds;
    const index = list.findIndex(x => x.name === name);
    if (index < 0) throw new Error(`${item} ${name} is not there`);
    return index;
};

// restore: the function the VM returned; activateBlocks: what the sprite restore does after (back to the code tab)
export const recordSpriteDeletion = (vm, name, restore, activateBlocks) => {
    if (!restore || !currentMenuRules().undoBar) return;
    const restoreAndShow = fn => () => fn().then(activateBlocks);
    history.recordDeletion({
        item: 'Sprite',
        name,
        restore: restoreAndShow(restore),
        deleteAgain: () => {
            // the restored sprite has a new id: find it by its name
            const target = vm.runtime.targets.find(t => t.isOriginal && t.sprite && t.sprite.name === name);
            if (!target) throw new Error(`sprite ${name} is not there`);
            return restoreAndShow(vm.deleteSprite(target.id));
        }
    });
};

// target: the sprite's editing target the item belonged to
export const recordItemDeletion = (vm, item, name, target, restore) => {
    if (!restore || !currentMenuRules().undoBar) return;
    history.recordDeletion({
        item,
        name,
        restore,
        deleteAgain: () => {
            const index = afterRestore(vm, target, item, name);
            const again = item === 'Costume' ? vm.deleteCostume(index) : vm.deleteSound(index);
            if (!again) throw new Error(`${item} ${name} could not be deleted again`);
            return again;
        }
    });
};
