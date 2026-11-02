// The name window holds the child to the name the guide asks for (platform decision 52).
import {nameAccepted, nameProblem, promptKind, setNameAsk} from '../../../src/components/kishufiya-guide/name-ask.js';

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
});
