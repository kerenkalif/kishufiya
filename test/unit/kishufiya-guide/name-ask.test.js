// The name window holds the child to the name the guide asks for (platform decision 52).
import {nameProblem, promptKind, setNameAsk} from '../../../src/components/kishufiya-guide/name-ask.js';

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
});
