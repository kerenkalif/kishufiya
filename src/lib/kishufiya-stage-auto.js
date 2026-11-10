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
    autoStage, choiceWidth, encodeChoice, parseChoice, readChoice, saveChoice,
    SMALL_BELOW_HEIGHT, SMALL_BELOW_WIDTH, HYSTERESIS
};
