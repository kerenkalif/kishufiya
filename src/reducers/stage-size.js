import {STAGE_DISPLAY_SIZES, STAGE_SIZE_MODES, setDraggedStageWidth} from '../lib/layout-constants.js';

const SET_STAGE_SIZE = 'scratch-gui/StageSize/SET_STAGE_SIZE';
const SET_STAGE_WIDTH = 'scratch-gui/StageSize/SET_STAGE_WIDTH';

// width: the width the stage was dragged to (הכישופייה), or null for the mode's own width
const initialState = {
    stageSize: STAGE_DISPLAY_SIZES.full,
    width: null
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case SET_STAGE_SIZE:
        return {
            stageSize: action.stageSize,
            width: null
        };
    case SET_STAGE_WIDTH:
        return {
            stageSize: action.stageSize,
            width: action.width
        };
    default:
        return state;
    }
};

const setStageSize = function (stageSize) {
    setDraggedStageWidth(null);
    return {
        type: SET_STAGE_SIZE,
        stageSize: stageSize
    };
};

// Narrow dragged stages take the small layout of the sprite pane, wide ones the large layout.
const setStageWidth = function (width) {
    setDraggedStageWidth(width);
    return {
        type: SET_STAGE_WIDTH,
        stageSize: width < 360 ? STAGE_SIZE_MODES.small : STAGE_SIZE_MODES.large,
        width
    };
};

export {
    reducer as default,
    initialState as stageSizeInitialState,
    setStageSize,
    setStageWidth
};
