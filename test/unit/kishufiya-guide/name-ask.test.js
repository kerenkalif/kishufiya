// The name window holds the child to the name the guide asks for (platform decision 52).
import {keptProblem, nameAccepted, nameProblem, promptKind, setNameAsk} from '../../../src/components/kishufiya-guide/name-ask.js';

describe('name-ask', () => {
    afterEach(() => setNameAsk({clear: true}));

    test('nothing asked: the window is as it was', () => {
        expect(nameProblem('variable', 'whatever')).toBeNull();
    });

    test('a wrong name gives the words, the right one (spaces at the edges too) none', () => {
        setNameAsk({name: 'זמן', kind: 'variable', ci: false, wrong: 'עוד לא נוצר משתנה. השם שצריך: זמן'});
        expect(nameProblem('variable', 'זמנן')).toBe('עוד לא נוצר משתנה. השם שצריך: זמן');
        expect(nameProblem('variable', '')).toBe('עוד לא נוצר משתנה. השם שצריך: זמן');
        expect(nameProblem('variable', 'זמן')).toBeNull();
        expect(nameProblem('variable', '  זמן ')).toBeNull();
        expect(nameProblem('variable', 'Score')).not.toBeNull();
    });

    test('a message is compared in any case; a variable is not', () => {
        setNameAsk({name: 'Go', kind: 'message', ci: true, wrong: 'x'});
        expect(nameProblem('message', 'go')).toBeNull();
        setNameAsk({name: 'Go', kind: 'variable', ci: false, wrong: 'x'});
        expect(nameProblem('variable', 'go')).toBe('x');
    });

    test('only the window of its kind; a rename is left alone', () => {
        setNameAsk({name: 'זמן', kind: 'variable', ci: false, wrong: 'x'});
        expect(nameProblem('list', 'אחר')).toBeNull();
        expect(nameProblem('message', 'אחר')).toBeNull();
        expect(nameProblem(null, 'אחר')).toBeNull();
    });

    test('cleared', () => {
        setNameAsk({name: 'זמן', kind: 'variable', ci: false, wrong: 'x'});
        setNameAsk({clear: true});
        expect(nameProblem('variable', 'אחר')).toBeNull();
    });

    test('the kind of a prompt', () => {
        expect(promptKind({varType: 'broadcast_msg', showVariableOptions: false})).toBe('message');
        expect(promptKind({varType: 'list', showVariableOptions: true})).toBe('list');
        expect(promptKind({varType: '', showVariableOptions: true})).toBe('variable');
        expect(promptKind({varType: '', showVariableOptions: false})).toBeNull();
        expect(promptKind({varType: 'list', showVariableOptions: false})).toBeNull();
    });

    // the editor owns the comparison (the page sends `ci`): the cases the platform's name-rule.ts relies on
    test('spaces at the edges are no mistake, one inside is; a variable is exact, a message not', () => {
        setNameAsk({name: 'זמן', kind: 'variable', ci: false, wrong: 'x'});
        expect(nameProblem('variable', ' זמן  ')).toBeNull();
        expect(nameProblem('variable', 'ז מן')).toBe('x');
        setNameAsk({name: 'Score', kind: 'variable', ci: false, wrong: 'x'});
        expect(nameProblem('variable', 'score')).toBe('x');
        setNameAsk({name: 'Score', kind: 'message', ci: true, wrong: 'x'});
        expect(nameProblem('message', ' score ')).toBeNull();
    });

    test('a right name closing its window ends the ask of that kind only', () => {
        setNameAsk({name: 'זמן', kind: 'variable', ci: false, wrong: 'x'});
        nameAccepted('list');
        expect(nameProblem('variable', 'אחר')).toBe('x');
        nameAccepted('variable');
        expect(nameProblem('variable', 'אחר')).toBeNull();
    });

    // platform decision 58: a kept variable ("לזכור לפעם הבאה 📌") is asked for - the window waits for its box
    describe('a kept variable', () => {
        const ask = () => setNameAsk({name: 'שיא', kind: 'variable', ci: false, wrong: 'x', keptMissing: 'tick it'});

        test('the right name with the box not ticked is held; ticked, or another name, is not this problem', () => {
            ask();
            expect(keptProblem('variable', 'שיא', false, true)).toBe('tick it');
            expect(keptProblem('variable', 'שיא', true, true)).toBeNull();
            expect(keptProblem('variable', 'אחר', false, true)).toBeNull(); // nameProblem says that one
        });

        test('a list window, a message window and a rename are never held for the box', () => {
            ask();
            expect(keptProblem('list', 'שיא', false, true)).toBeNull();
            expect(keptProblem('message', 'שיא', false, true)).toBeNull();
            expect(keptProblem(null, 'שיא', false, true)).toBeNull();
        });

        test('no box to tick (not shown, or disabled by the limit): the window closes', () => {
            ask();
            expect(keptProblem('variable', 'שיא', false, false)).toBeNull();
            expect(keptProblem('variable', 'שיא', false, undefined)).toBeNull();
        });

        test('an ordinary variable asked for holds nothing about the box', () => {
            setNameAsk({name: 'ניקוד', kind: 'variable', ci: false, wrong: 'x'});
            expect(keptProblem('variable', 'ניקוד', false, true)).toBeNull();
        });
    });
});
