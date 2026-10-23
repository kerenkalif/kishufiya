// הכישופייה: a handle between the code area and the stage, dragged like the divider of a browser's
// split view, so the stage is as wide as the child wants while the code still fits.
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import {setStageWidth} from '../../reducers/stage-size';
import {MIN_DRAGGED_STAGE_WIDTH, MAX_DRAGGED_STAGE_WIDTH} from '../../lib/layout-constants';
import styles from './stage-splitter.css';

class StageSplitter extends React.Component {
    constructor (props) {
        super(props);
        this.handlePointerDown = this.handlePointerDown.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);
        this.drag = null;
        this.frame = null;
    }
    componentWillUnmount () {
        this.onPointerUp();
    }
    handlePointerDown (e) {
        if (e.button !== 0) return;
        e.preventDefault();
        this.drag = {x: e.clientX, width: this.props.width};
        document.addEventListener('pointermove', this.onPointerMove);
        document.addEventListener('pointerup', this.onPointerUp);
        document.body.style.cursor = 'col-resize';
    }
    onPointerMove (e) {
        if (!this.drag) return;
        // The stage is on the left in RTL and on the right in LTR: moving away from it widens it.
        const moved = this.props.isRtl ? e.clientX - this.drag.x : this.drag.x - e.clientX;
        // Never so wide that the code area gets narrower than at the editor's own minimum.
        const max = Math.min(MAX_DRAGGED_STAGE_WIDTH, window.innerWidth - this.props.reserved);
        const width = Math.round(Math.max(MIN_DRAGGED_STAGE_WIDTH, Math.min(max, this.drag.width + moved)));
        if (this.frame) cancelAnimationFrame(this.frame);
        this.frame = requestAnimationFrame(() => {
            this.frame = null;
            if (width === this.props.width) return;
            this.props.onWidth(width);
            // The code area and the stage size themselves on window resizes only (scratch-blocks'
            // svgResize, the stage's updateRect): tell them the space changed.
            requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
        });
    }
    onPointerUp () {
        this.drag = null;
        document.removeEventListener('pointermove', this.onPointerMove);
        document.removeEventListener('pointerup', this.onPointerUp);
        document.body.style.cursor = '';
    }
    render () {
        return (
            <div
                className={styles.splitter}
                role="separator"
                aria-orientation="vertical"
                title="גוררים כדי לשנות את רוחב הבמה"
                onPointerDown={this.handlePointerDown}
            >
                <div className={styles.grip} />
            </div>
        );
    }
}

StageSplitter.propTypes = {
    isRtl: PropTypes.bool,
    onWidth: PropTypes.func.isRequired,
    reserved: PropTypes.number.isRequired, // screen width the rest of the editor needs
    width: PropTypes.number.isRequired
};

export default connect(null, dispatch => ({
    onWidth: width => dispatch(setStageWidth(width))
}))(StageSplitter);
