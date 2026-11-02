import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {injectIntl, intlShape} from 'react-intl';

import LibraryItemComponent from '../components/library-item/library-item.jsx';
import {libraryIconUrls} from '../lib/kishufiya-assets';

const LONG_PRESS_MS = 500;

class LibraryItem extends React.PureComponent {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleBlur',
            'handleClick',
            'handleContextMenu',
            'handlePointerDown',
            'handlePointerMove',
            'handlePointerEnd',
            'handleFavorite',
            'handleFocus',
            'handleKeyPress',
            'handleMouseEnter',
            'handleMouseLeave',
            'handlePlay',
            'handleStop',
            'rotateIcon',
            'startRotatingIcons',
            'stopRotatingIcons'
        ]);
        this.state = {
            iconIndex: 0,
            isRotatingIcon: false
        };
    }
    componentWillUnmount () {
        clearInterval(this.intervalId);
        clearTimeout(this.pressTimer);
    }
    // כישופייה multi-pick: a long press with a finger or pen marks the tile (library.jsx); the click that follows
    // the press is swallowed. Per tile, no shared timer. A scroll or a move of more than 10px cancels it.
    handlePointerDown (e) {
        this.pressed = false;
        clearTimeout(this.pressTimer);
        this.pressTimer = null;
        if (!this.props.onLongPress || e.pointerType === 'mouse' || this.props.disabled || this.props.href) return;
        if (e.target.closest('a, button')) return;
        this.pressFrom = {x: e.clientX, y: e.clientY};
        this.pressTimer = setTimeout(() => {
            this.pressTimer = null;
            this.pressed = true;
            this.props.onLongPress(this.props.id);
        }, LONG_PRESS_MS);
    }
    handlePointerMove (e) {
        if (!this.pressTimer || !this.pressFrom) return;
        if (Math.abs(e.clientX - this.pressFrom.x) > 10 || Math.abs(e.clientY - this.pressFrom.y) > 10) {
            this.handlePointerEnd();
        }
    }
    handlePointerEnd () {
        clearTimeout(this.pressTimer);
        this.pressTimer = null;
    }
    handleContextMenu (e) {
        // the long press of a finger would open the browser's menu over the tile
        if (this.pressTimer || this.pressed) e.preventDefault();
    }
    handleBlur (id) {
        this.handleMouseLeave(id);
    }
    handleClick (e) {
        if (e.target.closest('a')) {
            // Allow clicking on links inside the item
            return;
        }

        // כישופייה: no "incompatible with Scratch" confirm - children never upload there, and the editor
        // names no Scratch (rights, 2026-10-24).

        if (this.pressed) {
            // the click that ends a long press is not a pick
            this.pressed = false;
            e.preventDefault();
            return;
        }
        if (!this.props.disabled) {
            if (this.props.href) {
                window.open(this.props.href);
            } else {
                this.props.onSelect(this.props.id, {ctrl: Boolean(e.ctrlKey || e.metaKey)});
            }
        }
        e.preventDefault();
    }
    handleFavorite (e) {
        e.stopPropagation();
        this.props.onFavorite(this.props.id);
    }
    handleFocus (id) {
        if (!this.props.showPlayButton) {
            this.handleMouseEnter(id);
        }
    }
    handleKeyPress (e) {
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            this.props.onSelect(this.props.id);
        }
    }
    handleMouseEnter () {
        // only show hover effects on the item if not showing a play button
        if (!this.props.showPlayButton) {
            this.props.onMouseEnter(this.props.id);
            if (this.props.icons && this.props.icons.length) {
                this.stopRotatingIcons();
                this.setState({
                    isRotatingIcon: true
                }, this.startRotatingIcons);
            }
        }
    }
    handleMouseLeave () {
        // only show hover effects on the item if not showing a play button
        if (!this.props.showPlayButton) {
            this.props.onMouseLeave(this.props.id);
            if (this.props.icons && this.props.icons.length) {
                this.setState({
                    isRotatingIcon: false
                }, this.stopRotatingIcons);
            }
        }
    }
    handlePlay () {
        this.props.onMouseEnter(this.props.id);
    }
    handleStop () {
        this.props.onMouseLeave(this.props.id);
    }
    startRotatingIcons () {
        this.rotateIcon();
        this.intervalId = setInterval(this.rotateIcon, 300);
    }
    stopRotatingIcons () {
        if (this.intervalId) {
            this.intervalId = clearInterval(this.intervalId);
        }
    }
    rotateIcon () {
        const nextIconIndex = (this.state.iconIndex + 1) % this.props.icons.length;
        this.setState({iconIndex: nextIconIndex});
    }
    curIconMd5 () {
        const iconMd5Prop = this.props.iconMd5;
        if (this.props.icons &&
            this.state.isRotatingIcon &&
            this.state.iconIndex < this.props.icons.length) {
            const icon = this.props.icons[this.state.iconIndex] || {};
            return icon.md5ext || // 3.0 library format
                icon.baseLayerMD5 || // 2.0 library format, TODO GH-5084
                iconMd5Prop;
        }
        return iconMd5Prop;
    }
    render () {
        const iconMd5 = this.curIconMd5();
        // כישופייה: a lesson game's own character's files are on the platform (kishufiya-assets.js)
        const [iconURL] = iconMd5 ? libraryIconUrls(iconMd5) : [this.props.iconRawURL];
        return (
            <LibraryItemComponent
                intl={this.props.intl}
                badge={this.props.badge}
                bluetoothRequired={this.props.bluetoothRequired}
                collaborator={this.props.collaborator}
                description={this.props.description}
                disabled={this.props.disabled}
                extensionId={this.props.extensionId}
                featured={this.props.featured}
                hidden={this.props.hidden}
                iconURL={iconURL}
                icons={this.props.icons}
                id={this.props.id}
                insetIconURL={this.props.insetIconURL}
                internetConnectionRequired={this.props.internetConnectionRequired}
                isPlaying={this.props.isPlaying}
                name={this.props.name}
                credits={this.props.credits}
                docsURI={this.props.docsURI}
                samples={this.props.samples}
                favorite={this.props.favorite}
                onFavorite={this.handleFavorite}
                showPlayButton={this.props.showPlayButton}
                onBlur={this.handleBlur}
                onClick={this.handleClick}
                marked={this.props.marked}
                onContextMenu={this.handleContextMenu}
                onPointerDown={this.handlePointerDown}
                onPointerMove={this.handlePointerMove}
                onPointerUp={this.handlePointerEnd}
                onPointerCancel={this.handlePointerEnd}
                onFocus={this.handleFocus}
                onKeyPress={this.handleKeyPress}
                onMouseEnter={this.handleMouseEnter}
                onMouseLeave={this.handleMouseLeave}
                onPlay={this.handlePlay}
                onStop={this.handleStop}
            />
        );
    }
}

LibraryItem.propTypes = {
    intl: intlShape,
    badge: PropTypes.string,
    bluetoothRequired: PropTypes.bool,
    collaborator: PropTypes.string,
    description: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.node
    ]),
    disabled: PropTypes.bool,
    extensionId: PropTypes.string,
    href: PropTypes.string,
    featured: PropTypes.bool,
    hidden: PropTypes.bool,
    iconMd5: PropTypes.string,
    iconRawURL: PropTypes.string,
    icons: PropTypes.arrayOf(
        PropTypes.shape({
            baseLayerMD5: PropTypes.string, // 2.0 library format, TODO GH-5084
            md5ext: PropTypes.string // 3.0 library format
        })
    ),
    id: PropTypes.number.isRequired,
    insetIconURL: PropTypes.string,
    internetConnectionRequired: PropTypes.bool,
    isPlaying: PropTypes.bool,
    kishufiyaAsset: PropTypes.bool,
    name: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.node
    ]),
    credits: PropTypes.arrayOf(PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.node
    ])),
    docsURI: PropTypes.string,
    samples: PropTypes.arrayOf(PropTypes.shape({
        href: PropTypes.string,
        text: PropTypes.string
    })),
    favorite: PropTypes.bool,
    onFavorite: PropTypes.func,
    marked: PropTypes.bool,
    onLongPress: PropTypes.func,
    onMouseEnter: PropTypes.func.isRequired,
    onMouseLeave: PropTypes.func.isRequired,
    onSelect: PropTypes.func.isRequired,
    showPlayButton: PropTypes.bool
};

export default injectIntl(LibraryItem);
