// The lesson's 'tidy' message (guide.js, detect.js tidyStep), Keren 2026-11-17.
//   npx jest test/unit/kishufiya-guide/tidy-when
import {tidyStep} from '../../../src/components/kishufiya-guide/detect.js';

describe('tidyStep', () => {
    test('asked and nothing dragged: done now, and no longer asked', () => {
        const tidy = jest.fn(() => true);
        expect(tidyStep(true, false, tidy)).toEqual({asked: false, done: true});
        expect(tidy).toHaveBeenCalledTimes(1);
    });
    test('asked while a block is dragged: it waits for the drop, nothing moves', () => {
        const tidy = jest.fn(() => true);
        expect(tidyStep(true, true, tidy)).toEqual({asked: true, done: false});
        expect(tidy).not.toHaveBeenCalled();
    });
    test('it could not be done (no code area, the costumes tab): still asked, and done when it can', () => {
        let area = false;
        const tidy = jest.fn(() => area);
        let asked = true;
        for (let look = 0; look < 3; look++) {
            const step = tidyStep(asked, false, tidy);
            expect(step).toEqual({asked: true, done: false});
            asked = step.asked;
        }
        area = true;
        expect(tidyStep(asked, false, tidy)).toEqual({asked: false, done: true});
    });
    test('not asked: never, dragged or not', () => {
        const tidy = jest.fn(() => true);
        expect(tidyStep(false, false, tidy)).toEqual({asked: false, done: false});
        expect(tidyStep(false, true, tidy)).toEqual({asked: false, done: false});
        expect(tidy).not.toHaveBeenCalled();
    });
});
