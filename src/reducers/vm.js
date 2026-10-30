import VM from 'scratch-vm';
import storage from '../lib/storage';
import {MAXIMUM_CLOUD_VARIABLES} from '../lib/tw-cloud-limits';
import Text2Speech from '../lib/kishufiya-text2speech';
import TranslateStub from '../lib/kishufiya-translate-stub';
import Speech2TextStub from '../lib/kishufiya-speech2text-stub';
import noLinkSocketFactory from '../lib/kishufiya-no-link-socket';

const SET_VM = 'scratch-gui/vm/SET_VM';
const defaultVM = new VM();
defaultVM.setCompatibilityMode(true);
defaultVM.runtime.cloudOptions.limit = MAXIMUM_CLOUD_VARIABLES;
defaultVM.attachStorage(storage);
// Scratch independence (platform SPEC-scratch-independence 5): text to speech speaks with the browser's
// voices, and "translate" and "speech2text" are stubs that make no request (a project with its blocks must still open:
// the VM throws "Unknown extension" for an id it cannot load).
defaultVM.extensionManager.addBuiltinExtension('text2speech', Text2Speech);
defaultVM.extensionManager.addBuiltinExtension('translate', TranslateStub);
defaultVM.extensionManager.addBuiltinExtension('speech2text', Speech2TextStub);
// Hardware extensions are hidden from the menu; if an old project still has one, "connect" must not reach Scratch Link.
defaultVM.runtime.configureScratchLinkSocketFactory(noLinkSocketFactory);
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
