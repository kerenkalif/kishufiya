// The contract of the session, request and 'locate' protocol (platform SPEC-lesson-layers section 3, stage A1), run against
// this editor's pure half of it (session.js). The cases are guide-contract.cases.json: the same file, byte for byte, in
// כישופייה, in כישופונת and in the platform, so the two editors cannot drift apart - a behaviour is changed in the cases.
//   npx jest test/unit/kishufiya-guide/guide-contract
import {readFileSync} from 'fs';
import {join} from 'path';
import {CAPS, CONTRACT_VERSION, opens, answerId, asking, heard, inSession, locateOf, looked, newContract, reasonSaid}
    from '../../../src/components/kishufiya-guide/session.js';

const contract = JSON.parse(readFileSync(join(__dirname, 'guide-contract.cases.json'), 'utf8'));

// One step of a case on the state so far -> [the state after it, what came out, what the case expects]
const run = (state, step) => {
    if (step.hear) {
        const out = heard(state, step.hear);
        const got = {heard: out.heard, orders: out.orders, pass: out.pass};
        if ('say' in step.expect) got.say = out.say;
        if ('session' in step.expect) got.session = out.state.session;
        if ('locates' in step.expect) got.locates = out.state.locates.map(one => one.request);
        return [out.state, got];
    }
    if (step.look) {
        const out = looked(state, step.look.request, step.look.see, step.look.at, contract.after);
        return [out.state, {say: out.say, soft: out.soft}];
    }
    if (step.stamp) return [state, inSession(step.stamp.answer, asking(step.stamp.to), step.stamp.more)];
    if ('id' in step) return [state, answerId(step.id)];
    if ('opens' in step) return [state, opens(step.opens)];
    if ('alive' in step) return [state, Boolean(locateOf(state, step.alive))];
    if (step.reason) return [state, reasonSaid(step.reason.word, asking(step.reason.to))];
    throw new Error(`a step this editor's test cannot read: ${JSON.stringify(step)}`);
};

describe('the guide contract, the same cases in both editors', () => {
    test('this build speaks the version of the cases, and says the caps they name', () => {
        expect(CONTRACT_VERSION).toBe(contract.version);
        expect([...CAPS]).toEqual(contract.caps);
    });
    for (const one of contract.cases) {
        test(one.name, () => {
            let state = newContract();
            one.steps.forEach((step, at) => {
                const before = JSON.stringify(state);
                const [next, got] = run(state, step);
                expect({step: at, got}).toEqual({step: at, got: step.expect});
                expect(JSON.stringify(state)).toBe(before); // pure: the state handed in is never changed
                state = next;
            });
        });
    }
});
