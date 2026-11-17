import PropTypes from 'prop-types';
import React from 'react';
import bindAll from 'lodash.bindall';
import VM from 'scratch-vm';
import {STAGE_DISPLAY_SCALE_METADATA, STAGE_DISPLAY_SIZES, STAGE_SIZE_MODES} from '../lib/layout-constants';
import {setStageSize} from '../reducers/stage-size';
import {largeModeGivesWay} from '../lib/kishufiya-stage-auto';
import {setFullScreen} from '../reducers/mode';
import {openSettingsModal} from '../reducers/modals';

import {connect} from 'react-redux';

import StageHeaderComponent from '../components/stage-header/stage-header.jsx';

// eslint-disable-next-line react/prefer-stateless-function
class StageHeader extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleKeyPress'
        ]);
        this.checkInvalidStageSizeMode();
    }
    componentDidMount () {
        document.addEventListener('keydown', this.handleKeyPress);
    }
    componentDidUpdate () {
        this.checkInvalidStageSizeMode();
    }
    componentWillUnmount () {
        document.removeEventListener('keydown', this.handleKeyPress);
    }
    handleKeyPress (event) {
        if (event.key === 'Escape' && this.props.isFullScreen) {
            this.props.onSetStageUnFullScreen();
        }
    }
    checkInvalidStageSizeMode () {
        // Switch from "large" to "full" when the large option isn't even displayed in the interface
        // כישופייה: never a stage the editor fitted to the window, or the child dragged (stageWidth): the fit put
        // the large stage at 477 in a window 700 high, this switched it to "full" (480), the fit put it back, and
        // the two went round until React stopped the editor (kishufiya-stage-auto.js largeModeGivesWay)
        if (largeModeGivesWay({
            mode: this.props.stageSizeMode,
            stageWidth: this.props.stageWidth,
            largeShown: this.showFixedLargeSize()
        })) {
            this.props.onSetStageFull();
        }
    }
    showFixedLargeSize () {
        // Fixed width "large" mode should only be available when it would be smaller than the constrained
        // full stage, otherwise there are some sizes where switching to the smaller size would make it
        // larger instead of smaller.
        const constrainedScale = STAGE_DISPLAY_SCALE_METADATA[STAGE_DISPLAY_SIZES.constrained].scale;
        const constrainedWidth = this.props.customStageSize.width * constrainedScale;
        const largeWidth = STAGE_DISPLAY_SCALE_METADATA[STAGE_DISPLAY_SIZES.large].width;
        return constrainedWidth > largeWidth;
    }
    render () {
        const {
            ...props
        } = this.props;
        return (
            <StageHeaderComponent
                {...props}
                onKeyPress={this.handleKeyPress}
                showFixedLargeSize={this.showFixedLargeSize()}
            />
        );
    }
}

StageHeader.propTypes = {
    isFullScreen: PropTypes.bool.isRequired,
    // tw: update when dimensions or isWindowFullScreen changes
    isWindowFullScreen: PropTypes.bool.isRequired,
    customStageSize: PropTypes.shape({
        width: PropTypes.number.isRequired,
        height: PropTypes.number.isRequired
    }).isRequired,
    dimensions: PropTypes.arrayOf(PropTypes.number),
    isPlayerOnly: PropTypes.bool,
    onSetStageUnFullScreen: PropTypes.func.isRequired,
    onSetStageFull: PropTypes.func.isRequired,
    onOpenSettings: PropTypes.func.isRequired,
    // tw: replace showBranding
    isEmbedded: PropTypes.bool.isRequired,
    stageSizeMode: PropTypes.oneOf(Object.keys(STAGE_SIZE_MODES)).isRequired,
    stageWidth: PropTypes.number,
    vm: PropTypes.instanceOf(VM).isRequired
};

const mapStateToProps = state => ({
    customStageSize: state.scratchGui.customStageSize,
    stageSizeMode: state.scratchGui.stageSize.stageSize,
    stageWidth: state.scratchGui.stageSize.width,
    // tw: replace showBranding
    isEmbedded: state.scratchGui.mode.isEmbedded,
    isFullScreen: state.scratchGui.mode.isFullScreen,
    // tw: update when dimensions or isWindowFullScreen changes
    isWindowFullScreen: state.scratchGui.tw.isWindowFullScreen,
    dimensions: state.scratchGui.tw.dimensions,
    isPlayerOnly: state.scratchGui.mode.isPlayerOnly
});

const mapDispatchToProps = dispatch => ({
    onSetStageLarge: () => dispatch(setStageSize(STAGE_SIZE_MODES.large)),
    onSetStageSmall: () => dispatch(setStageSize(STAGE_SIZE_MODES.small)),
    onSetStageFull: () => dispatch(setStageSize(STAGE_SIZE_MODES.full)),
    onSetStageFullScreen: () => dispatch(setFullScreen(true)),
    onSetStageUnFullScreen: () => dispatch(setFullScreen(false)),
    onOpenSettings: () => dispatch(openSettingsModal())
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(StageHeader);
