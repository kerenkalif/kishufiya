// The automatic stage size: small on a low or narrow window, with hysteresis.
//   npx jest test/unit/kishufiya-guide/stage-auto
import {
    autoStage, choiceWidth, encodeChoice, parseChoice,
    stageWidthFor, widestStageFor, leastHeight, ABOVE_STAGE, UNDER_STAGE, PANE_ROOM
} from '../../../src/lib/kishufiya-stage-auto.js';

describe('autoStage', () => {
    test('a roomy window gets the large stage', () => {
        expect(autoStage({width: 1440, height: 900, current: 'large'})).toBe('large');
    });
    test('a low window goes small', () => {
        expect(autoStage({width: 1280, height: 650, current: 'large'})).toBe('small');
    });
    test('a narrow window goes small', () => {
        expect(autoStage({width: 990, height: 900, current: 'large'})).toBe('small');
    });
    test('hysteresis: small stays small until 40px beyond the line', () => {
        expect(autoStage({width: 1280, height: 700, current: 'small'})).toBe('small');
        expect(autoStage({width: 1280, height: 720, current: 'small'})).toBe('large');
        expect(autoStage({width: 1030, height: 900, current: 'small'})).toBe('small');
        expect(autoStage({width: 1040, height: 900, current: 'small'})).toBe('large');
    });
    test('large does not flip at the line itself', () => {
        expect(autoStage({width: 1280, height: 680, current: 'large'})).toBe('large');
        expect(autoStage({width: 1280, height: 679, current: 'large'})).toBe('small');
    });
});

describe('the choice of the child, per kind of window', () => {
    test('holds in the kind of window it was made in, with the dragged width itself', () => {
        const choice = parseChoice(encodeChoice('small', 300));
        expect(choiceWidth(choice, 'small')).toBe(300);
    });
    test('is void in the other kind of window', () => {
        const choice = parseChoice(encodeChoice('large', 480));
        expect(choiceWidth(choice, 'small')).toBeNull();
    });
    test('nothing, or damaged text, is no choice', () => {
        expect(choiceWidth(null, 'large')).toBeNull();
        expect(parseChoice('large')).toBeNull();
        expect(parseChoice('{"bucket":"x","width":3}')).toBeNull();
        expect(parseChoice(null)).toBeNull();
    });
});

// The window's height holds the stage (Keren, 2026-11-17: the backdrop button was below a class laptop's window).
describe('the stage gives way to the height of the window', () => {
    // as playground/kishufiya.jsx hands them
    const nonStageFor = stage => (stage < 360 ? 624 : 544);
    const fit = (want, width, height) => stageWidthFor({
        want, width, height, least: 160, smallLayoutBelow: 360, nonStageFor
    });
    // what is left under the stage for the sprites and backdrops pane, whose bottom holds the two add buttons
    const paneRoom = (stage, height) => height - ABOVE_STAGE - Math.ceil(stage * 3 / 4) - UNDER_STAGE;
    // the editor's frame in the sizes Keren named (the window less the lesson's row above the editor, about 30)
    const FRAMES = [
        [1366, 738], [1280, 690], [1536, 834], [1280, 570], [1536, 670], [1366, 620], [1366, 650], [1280, 600]
    ];

    test('whatever stage is wanted, the pane keeps its room in every named window', () => {
        for (const [width, height] of FRAMES) {
            for (const want of [240, 300, 480, 720]) {
                const stage = fit(want, width, height);
                expect(stage).toBeLessThanOrEqual(want);
                expect(paneRoom(stage, height)).toBeGreaterThanOrEqual(PANE_ROOM);
            }
        }
    });
    test('the case from the class: a large stage chosen in a window 650 high was 360 tall, the pane had 188', () => {
        expect(paneRoom(480, 650)).toBeLessThan(PANE_ROOM);
        expect(fit(480, 1366, 650)).toBe(410);
        expect(paneRoom(410, 650)).toBeGreaterThanOrEqual(PANE_ROOM);
    });
    test('between the small line (680) and what the large stage needs (702) the stage is a little smaller', () => {
        expect(fit(480, 1366, 702)).toBe(480);
        expect(fit(480, 1366, 690)).toBe(464);
    });
    test('a roomy window changes nothing: the wanted stage, held by the width only', () => {
        expect(fit(480, 1920, 1000)).toBe(480);
        expect(fit(720, 1920, 1000)).toBe(720);
        expect(fit(480, 900, 1000)).toBe(276); // 900 - 624: the small layout's own room
        expect(fit(240, 1366, 650)).toBe(240);
    });
    test('never under the least stage; from leastHeight on, the least stage leaves the pane its room', () => {
        expect(fit(480, 1366, 300)).toBe(160);
        expect(paneRoom(160, leastHeight(160))).toBe(PANE_ROOM);
        expect(leastHeight(160)).toBe(462);
    });
    // "עמיד לשינוי": the pane's room is one number; the widest stage and the least height both follow it
    test('PANE_ROOM is the one number: widestStageFor and leastHeight are worked out from it', () => {
        const height = 700;
        expect(widestStageFor(height)).toBe(Math.floor((height - ABOVE_STAGE - UNDER_STAGE - PANE_ROOM) * 4 / 3));
        expect(leastHeight(160) - PANE_ROOM).toBe(ABOVE_STAGE + 120 + UNDER_STAGE);
    });
});
