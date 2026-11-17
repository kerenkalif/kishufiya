// Which stage size a window deserves (Keren, 2026-11-10: a low-resolution laptop cut off the backdrop
// selector). Pure, so it is tested without a browser (test/unit/kishufiya-stage-auto).
// The small stage (240x180) is chosen below SMALL_BELOW and given back only above LARGE_FROM: the gap
// is the hysteresis, so a window resized around the line does not flip the stage on every pixel.
const SMALL_BELOW_HEIGHT = 680;
const SMALL_BELOW_WIDTH = 1000;
const HYSTERESIS = 40;

// current: 'small' | 'large' - what the automatic choice gave last time
const autoStage = ({width, height, current}) => {
    if (current === 'small') {
        const roomy = height >= SMALL_BELOW_HEIGHT + HYSTERESIS && width >= SMALL_BELOW_WIDTH + HYSTERESIS;
        return roomy ? 'large' : 'small';
    }
    return height < SMALL_BELOW_HEIGHT || width < SMALL_BELOW_WIDTH ? 'small' : 'large';
};

// The window's height holds the stage too (Keren, 2026-11-17: on a class laptop the backdrop button was below the
// window). Until then only the width did: a stage the child chose large, or a window between the small line and
// what the large stage really needs, pushed the sprites and backdrops pane under the window's bottom, where its
// two add buttons could only be reached by scrolling. The rule: whatever stage is wanted, it is no taller than
// what leaves the pane PANE_ROOM under it. Every number is measured from the laid-out editor:
// the menu bar (48) and the stage's header (44) above the stage, its border and the pane's padding (10) under it.
const ABOVE_STAGE = 92;
const UNDER_STAGE = 10;
const PANE_ROOM = 240; // the sprite info, a row of sprites and the two add buttons (target-pane.css)
const STAGE_RATIO = 4 / 3;
// the widest stage a window this high has room for
const widestStageFor = height => Math.floor((height - ABOVE_STAGE - UNDER_STAGE - PANE_ROOM) * STAGE_RATIO);
// The height below which even the least stage leaves the pane less than PANE_ROOM (gui.jsx's page min-height)
const leastHeight = leastStage => ABOVE_STAGE + Math.ceil(leastStage / STAGE_RATIO) + UNDER_STAGE + PANE_ROOM;

// The stage's width in this window: the wanted one (the child's choice, or the automatic size), held by the
// window's width (the rest of the editor keeps `nonStageFor(stage)`, more in the small layout) and by its height.
// Never under `least`: below that the pane gives way instead (it has no least height of its own, gui.css).
const stageWidthFor = ({want, width, height, least, smallLayoutBelow, nonStageFor}) => {
    let target = Math.min(want, width - nonStageFor(want), widestStageFor(height));
    if (target < smallLayoutBelow) target = Math.min(target, width - nonStageFor(target));
    return Math.max(least, Math.floor(target));
};

// The child's own choice (the size buttons, the splitter) wins for the kind of window it was made in
// ("bucket": small or large, as autoStage says), and is kept in this browser. In a window of the other kind
// it is void: a shared classroom computer, or a laptop docked to a big screen, does not carry one child's
// choice to another screen. The splitter's width is kept as the width itself.
const CHOICE_KEY = 'kishufiya-stage-choice-v2';

const encodeChoice = (bucket, width) => JSON.stringify({bucket, width});
const parseChoice = text => {
    try {
        const v = JSON.parse(text);
        const ok = v && (v.bucket === 'small' || v.bucket === 'large') && Number.isFinite(v.width) && v.width > 0;
        return ok ? {bucket: v.bucket, width: v.width} : null;
    } catch (e) {
        return null;
    }
};
// the stage width to hold to, or null when there is no choice for this kind of window
const choiceWidth = (choice, bucket) => (choice && choice.bucket === bucket ? choice.width : null);

const readChoice = () => {
    try {
        return parseChoice(window.localStorage.getItem(CHOICE_KEY));
    } catch (e) {
        return null;
    }
};
const saveChoice = (bucket, width) => {
    try {
        if (bucket === null) window.localStorage.removeItem(CHOICE_KEY);
        else window.localStorage.setItem(CHOICE_KEY, encodeChoice(bucket, width));
    } catch (e) {
        // storage blocked: the choice lasts until the page closes
    }
};

export {
    autoStage, stageWidthFor, widestStageFor, leastHeight, ABOVE_STAGE, UNDER_STAGE, PANE_ROOM,
    choiceWidth, encodeChoice, parseChoice, readChoice, saveChoice,
    SMALL_BELOW_HEIGHT, SMALL_BELOW_WIDTH, HYSTERESIS
};
