import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import VM from 'scratch-vm';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import log from '../lib/log';

import extensionLibraryContent from '../lib/libraries/extensions/index.jsx';
import extensionTags from '../lib/libraries/tw-extension-tags';

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const toLibraryItem = extension => {
    if (typeof extension === 'object') {
        return ({
            rawURL: extension.iconURL || extensionIcon,
            ...extension
        });
    }
    return extension;
};

/**
 * Extensions that are NOT offered in the "Choose an Extension" menu (one list, one place).
 * Hiding only removes the menu entry. The code, the blocks and the loading of old projects stay as they are:
 * a project that already uses one of these opens and runs normally (the VM loads builtin extensions by id,
 * and extension info is still read from lib/libraries/extensions/index.jsx).
 *
 * Why each one is hidden (Keren, 30.10.2026: "for now disconnect, we'll connect what's needed later"):
 *  - microbit, ev3, boost, wedo2, gdxfor (Vernier): hardware that talks through Scratch Link, a service run by Scratch
 *    (its device-manager host). The platform has no interface to Scratch in any form. We may later
 *    connect them directly over Web Bluetooth, without Scratch Link, and then these come back.
 *  - faceSensing: loads its code from TurboWarp's extension site, an outside service.
 *  - custom_extension: loads extension code from a URL, a file or pasted source; only builtin extensions and
 *    files served from our own origin are allowed (see tw-security-manager.jsx).
 */
const HIDDEN_FROM_MENU = new Set([
    'microbit',
    'ev3',
    'boost',
    'wedo2',
    'gdxfor',
    'faceSensing',
    'custom_extension'
]);

class ExtensionLibrary extends React.PureComponent {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleItemSelect'
        ]);
    }
    handleItemSelect (item) {
        if (item.href) {
            return;
        }

        const extensionId = item.extensionId;

        if (extensionId === 'custom_extension') {
            this.props.onOpenCustomExtensionModal();
            return;
        }

        if (extensionId === 'procedures_enable_return') {
            this.props.onEnableProcedureReturns();
            this.props.onCategorySelected('myBlocks');
            return;
        }

        const url = item.extensionURL ? item.extensionURL : extensionId;
        if (!item.disabled) {
            if (this.props.vm.extensionManager.isExtensionLoaded(extensionId)) {
                this.props.onCategorySelected(extensionId);
            } else {
                this.props.vm.extensionManager.loadExtensionURL(url)
                    .then(() => {
                        this.props.onCategorySelected(extensionId);
                    })
                    .catch(err => {
                        log.error(err);
                        // eslint-disable-next-line no-alert
                        alert(err);
                    });
            }
        }
    }
    render () {
        const library = extensionLibraryContent
            .filter(extension => !HIDDEN_FROM_MENU.has(extension.extensionId))
            .map(toLibraryItem);

        return (
            <LibraryComponent
                data={library}
                filterable
                persistableKey="extensionId"
                id="extensionLibrary"
                tags={extensionTags}
                title={this.props.intl.formatMessage(messages.extensionTitle)}
                visible={this.props.visible}
                onItemSelected={this.handleItemSelect}
                onRequestClose={this.props.onRequestClose}
            />
        );
    }
}

ExtensionLibrary.propTypes = {
    intl: intlShape.isRequired,
    onCategorySelected: PropTypes.func,
    onEnableProcedureReturns: PropTypes.func,
    onOpenCustomExtensionModal: PropTypes.func,
    onRequestClose: PropTypes.func,
    visible: PropTypes.bool,
    vm: PropTypes.instanceOf(VM).isRequired // eslint-disable-line react/no-unused-prop-types
};

export default injectIntl(ExtensionLibrary);
