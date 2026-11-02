import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {injectIntl, intlShape, defineMessages} from 'react-intl';
import VM from 'scratch-vm';

import {getSpriteLibrary, getLibraryTags, getLibraryInitialTag} from '../lib/libraries/tw-async-libraries';
import randomizeSpritePosition from '../lib/randomize-sprite-position';
import spriteTags from '../lib/libraries/sprite-tags';

import LibraryComponent from '../components/library/library.jsx';

const messages = defineMessages({
    libraryTitle: {
        defaultMessage: 'Choose a Sprite',
        description: 'Heading for the sprite library',
        id: 'gui.spriteLibrary.chooseASprite'
    }
});

class SpriteLibrary extends React.PureComponent {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleItemSelect',
            'handleItemsSelect'
        ]);
        this.state = {
            data: getSpriteLibrary()
        };
    }
    componentDidMount () {
        if (this.state.data.then) {
            this.state.data.then(data => this.setState({
                data
            }));
        }
    }
    handleItemSelect (item) {
        // Randomize position of library sprite
        randomizeSpritePosition(item);
        this.props.vm.addSprite(JSON.stringify(item)).then(() => {
            this.props.onActivateBlocksTab();
        });
    }
    // kishufiya multi-pick: several marked sprites, added one after the other in marking order (each waits for the
    // one before, so the list is never half-loaded and the last added is the one selected). One that fails to
    // load is skipped. Each goes through vm.addSprite, so the lesson hears one library-pick per sprite (picks.js).
    async handleItemsSelect (items) {
        for (const item of items) {
            randomizeSpritePosition(item);
            try {
                await this.props.vm.addSprite(JSON.stringify(item));
            } catch (e) {
                // skip it and go on with the rest
            }
        }
        this.props.onActivateBlocksTab();
    }
    render () {
        return (
            <LibraryComponent
                data={this.state.data.then ? null : this.state.data}
                id="spriteLibrary"
                tags={getLibraryTags('sprite') || spriteTags}
                initialTag={getLibraryInitialTag('sprite')}
                title={this.props.intl.formatMessage(messages.libraryTitle)}
                onItemSelected={this.handleItemSelect}
                onItemsSelected={this.handleItemsSelect}
                onRequestClose={this.props.onRequestClose}
            />
        );
    }
}

SpriteLibrary.propTypes = {
    intl: intlShape.isRequired,
    onActivateBlocksTab: PropTypes.func.isRequired,
    onRequestClose: PropTypes.func,
    vm: PropTypes.instanceOf(VM).isRequired
};

export default injectIntl(SpriteLibrary);
