// What the guide draws at a target, by how the lesson marks it (platform decision 32, 2026-10-31: the red ring and arrow mean
// "do this here" and are kept for actions; the thing a why window talks about gets a soft mark in ניצוצי's colour), and which
// press tells the lesson (guide-clicked): detect.js guideMarking, tellsClick - pure, so tested here.
//   npx jest test/unit/kishufiya-guide/why-mark
import {guideMarking, tellsClick} from '../../../src/components/kishufiya-guide/detect.js';

describe('what is drawn at the target', () => {
    test('an action: the red ring and the arrow', () => {
        expect(guideMarking({locate: false, highlight: false, onTheWay: false})).toBe('ring');
        expect(guideMarking({locate: false, highlight: true, onTheWay: false})).toBe('ring');
    });
    test('a located target (the bubble beside a new block): nothing at it', () => {
        expect(guideMarking({locate: true, highlight: false, onTheWay: false})).toBe('none');
    });
    test('the thing a why window talks about: the soft mark alone - never red', () => {
        expect(guideMarking({locate: true, highlight: true, onTheWay: false})).toBe('soft');
    });
    test('the way to it (its category, its sprite\'s tile) is ringed whatever the mark', () => {
        expect(guideMarking({locate: true, highlight: true, onTheWay: true})).toBe('ring');
        expect(guideMarking({locate: true, highlight: false, onTheWay: true})).toBe('ring');
    });
});

describe('which press tells the lesson', () => {
    test('a press on an action\'s target', () => {
        expect(tellsClick({locate: false, highlight: false})).toBe(true);
    });
    test('never on a located target: a press on the flag during its window passed the step', () => {
        expect(tellsClick({locate: true, highlight: true})).toBe(false);
        expect(tellsClick({locate: true, highlight: false})).toBe(false);
        expect(tellsClick(null)).toBe(false);
    });
});
