import VM from 'scratch-vm';
import storage from '../lib/storage';
import {MAXIMUM_CLOUD_VARIABLES} from '../lib/tw-cloud-limits';
import Text2Speech from '../lib/kishufiya-text2speech';

const SET_VM = 'scratch-gui/vm/SET_VM';
const defaultVM = new VM();
defaultVM.setCompatibilityMode(true);
defaultVM.runtime.cloudOptions.limit = MAXIMUM_CLOUD_VARIABLES;
defaultVM.attachStorage(storage);
// Scratch independence (platform SPEC-scratch-independence 5): text to speech speaks with the
// browser's voices, and the built-ins that talk to Scratch's servers are gone. A project that
// uses one loads as it does for any unknown extension: its blocks do nothing.
defaultVM.extensionManager.addBuiltinExtension('text2speech', Text2Speech);
delete defaultVM.extensionManager.builtinExtensions.translate;
delete defaultVM.extensionManager.builtinExtensions.speech2text;
const initialState = defaultVM;

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case SET_VM:
        return action.vm;
    default:
        return state;
    }
};
const setVM = function (vm) {
    return {
        type: SET_VM,
        vm: vm
    };
};

export {
    reducer as default,
    initialState as vmInitialState,
    setVM
};
