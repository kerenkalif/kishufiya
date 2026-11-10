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

// The child's own choice (the size buttons, the splitter) wins and is kept in this browser.
const CHOICE_KEY = 'kishufiya-stage-choice';
const readChoice = () => {
    try {
        const v = window.localStorage.getItem(CHOICE_KEY);
        return v === 'small' || v === 'large' ? v : null;
    } catch (e) {
        return null;
    }
};
const saveChoice = choice => {
    try {
        window.localStorage.setItem(CHOICE_KEY, choice);
    } catch (e) {
        // storage blocked: the choice lasts until the page closes
    }
};

export {autoStage, readChoice, saveChoice, SMALL_BELOW_HEIGHT, SMALL_BELOW_WIDTH, HYSTERESIS};
