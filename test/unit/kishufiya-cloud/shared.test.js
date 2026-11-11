// A locked copy against the class's board (shared cloud, unit 10): the board's values go into the game's ☁
// variables (apply) and are never said back; the page hears only what the game itself wrote, name and value.
// The game's writes go the VM's own way: its data blocks and its cloud device, to the provider.
//   npm run test:cloud
import Cloud from 'scratch-vm/src/io/cloud';
import DataBlocks from 'scratch-vm/src/blocks/scratch3_data';
import Variable from 'scratch-vm/src/engine/variable';
import {attachCloud, attachSharedCloud, MAX_CLOUD_VALUE} from '../../../src/lib/kishufiya-cloud.js';
import {ACTIVITY_NOTE_EVERY_MS, watchActivity, watchRunning} from '../../../src/lib/kishufiya-shared-player.js';

const RECORD = '☁ שיא';
const NAME = '☁ שם';

// A VM as far as the cloud goes: a stage with variables, the real cloud device, the real "set" and "change" blocks.
const makeVm = (cloudNames = [RECORD, NAME]) => {
    const listeners = {};
    const variables = {};
    const add = (name, isCloud, value = 0) => {
        variables[name] = new Variable(name, name, Variable.SCALAR_TYPE, isCloud);
        variables[name].value = value;
    };
    cloudNames.forEach(name => add(name, true));
    add('ניקוד', false);
    const stage = {variables, lookupOrCreateVariable: id => variables[id]};
    const runtime = {getTargetForStage: () => stage};
    const device = new Cloud(runtime);
    const blocks = new DataBlocks(runtime);
    const util = {target: stage, ioQuery: (_device, func, args) => device[func](...args)};
    return {
        runtime,
        variables,
        on: (name, fn) => (listeners[name] = listeners[name] || []).push(fn),
        emit: (name, ...args) => (listeners[name] || []).forEach(fn => fn(...args)),
        setCloudProvider: provider => device.setProvider(provider),
        // the blocks the game runs
        set: (name, value) => blocks.setVariableTo({VARIABLE: {id: name, name}, VALUE: value}, util),
        change: (name, by) => blocks.changeVariableBy({VARIABLE: {id: name, name}, VALUE: by}, util)
    };
};

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());
const later = () => jest.advanceTimersByTime(1000);

describe('attachSharedCloud', () => {
    test('a value applied from the board is in the variable and is never said to the page', () => {
        const vm = makeVm();
        const send = jest.fn();
        const cloud = attachSharedCloud(vm, send);
        cloud.apply({[RECORD]: '50'});
        expect(vm.variables[RECORD].value).toBe(50);
        later();
        cloud.flush();
        expect(send).not.toHaveBeenCalled();
    });

    test('the game beating the applied record says its own value, that variable only', () => {
        const vm = makeVm();
        const send = jest.fn();
        const cloud = attachSharedCloud(vm, send);
        cloud.apply({[RECORD]: '50', [NAME]: 'דנה'});
        vm.set('ניקוד', 60); // not a ☁ variable
        vm.set(RECORD, 60);
        later();
        expect(send.mock.calls).toEqual([[{[RECORD]: '60'}]]);
    });

    test('a friend\'s record applied after the game wrote, before it was said: the game\'s own value is said', () => {
        const vm = makeVm();
        const send = jest.fn();
        const cloud = attachSharedCloud(vm, send);
        vm.set(RECORD, 10);
        cloud.apply({[RECORD]: '50'}); // the friend's, inside the second of waiting
        expect(vm.variables[RECORD].value).toBe(50);
        later();
        expect(send.mock.calls).toEqual([[{[RECORD]: '10'}]]);
    });

    test('a game that never beats the friend\'s record says nothing, however long it runs', () => {
        const vm = makeVm();
        const send = jest.fn();
        const cloud = attachSharedCloud(vm, send);
        cloud.apply({[RECORD]: '50'});
        for (let score = 1; score <= 40; score++) {
            vm.set('ניקוד', score);
            if (score > vm.variables[RECORD].value) vm.set(RECORD, score); // the child's script
            later();
        }
        cloud.apply({[RECORD]: '55'});
        later();
        cloud.flush();
        expect(send).not.toHaveBeenCalled();
    });

    test('"change by" is the game\'s own write, said with the new value', () => {
        const vm = makeVm();
        const send = jest.fn();
        const cloud = attachSharedCloud(vm, send);
        cloud.apply({[RECORD]: '7'});
        vm.change(RECORD, 1);
        later();
        expect(send.mock.calls).toEqual([[{[RECORD]: '8'}]]);
    });

    test('several writes inside a second: the last value of each, once', () => {
        const vm = makeVm();
        const send = jest.fn();
        attachSharedCloud(vm, send);
        vm.set(RECORD, 1);
        vm.set(RECORD, 2);
        vm.set(NAME, 'דנה');
        later();
        expect(send.mock.calls).toEqual([[{[RECORD]: '2', [NAME]: 'דנה'}]]);
    });

    test('the same value set every frame is said once; again after the board moved', () => {
        const vm = makeVm();
        const send = jest.fn();
        const cloud = attachSharedCloud(vm, send);
        vm.set(RECORD, 30);
        later();
        vm.set(RECORD, 30);
        later();
        expect(send).toHaveBeenCalledTimes(1);
        cloud.apply({[RECORD]: '0'}); // "להתחיל מחדש": the board was cleared
        vm.set(RECORD, 30);
        later();
        expect(send.mock.calls).toEqual([[{[RECORD]: '30'}], [{[RECORD]: '30'}]]);
    });

    test('flush says at once what was not said yet, and nothing twice', () => {
        const vm = makeVm();
        const send = jest.fn();
        const cloud = attachSharedCloud(vm, send);
        vm.set(RECORD, 12);
        cloud.flush();
        expect(send.mock.calls).toEqual([[{[RECORD]: '12'}]]);
        later();
        cloud.flush();
        expect(send).toHaveBeenCalledTimes(1);
    });

    test('apply touches only ☁ variables of the stage that it was given, and only values that can be kept', () => {
        const vm = makeVm();
        const cloud = attachSharedCloud(vm, jest.fn());
        vm.variables[NAME].value = 'רון';
        cloud.apply({
            'ניקוד': '99', // not a ☁ variable
            '☁ אחר': '5', // not in the game
            [RECORD]: 'x'.repeat(MAX_CLOUD_VALUE + 1)
        });
        expect(vm.variables['ניקוד'].value).toBe(0);
        expect(vm.variables[RECORD].value).toBe(0);
        expect(vm.variables[NAME].value).toBe('רון');
        cloud.apply({[RECORD]: null, [NAME]: {a: 1}});
        expect(vm.variables[RECORD].value).toBe(0);
        expect(vm.variables[NAME].value).toBe('רון');
        cloud.apply(null);
        cloud.apply({[RECORD]: 12, [NAME]: '007'});
        expect(vm.variables[RECORD].value).toBe(12);
        expect(vm.variables[NAME].value).toBe('007'); // text that is not the same number stays text
    });

    test('a value past the cap is not said; the last one that fitted is', () => {
        const vm = makeVm();
        const send = jest.fn();
        attachSharedCloud(vm, send);
        vm.set(NAME, 'דנה');
        vm.set(NAME, 'x'.repeat(MAX_CLOUD_VALUE + 1));
        later();
        expect(send.mock.calls).toEqual([[{[NAME]: 'דנה'}]]);
    });

    test('a project loaded later keeps the provider', () => {
        const vm = makeVm();
        const send = jest.fn();
        attachSharedCloud(vm, send);
        vm.setCloudProvider(null); // as loading a project does
        vm.emit('HAS_CLOUD_DATA_UPDATE', true);
        vm.set(RECORD, 3);
        later();
        expect(send.mock.calls).toEqual([[{[RECORD]: '3'}]]);
    });
});

// The game that is not locked: as it was - all of the values, a second after any change.
describe('attachCloud (unchanged)', () => {
    test('says all of the ☁ values after a write', () => {
        const vm = makeVm();
        const send = jest.fn();
        const cloud = attachCloud(vm, send);
        cloud.start({[RECORD]: '50', [NAME]: 'דנה'});
        expect(vm.variables[RECORD].value).toBe(50);
        later();
        expect(send).not.toHaveBeenCalled(); // what the game opened with is not news
        vm.set(RECORD, 60);
        later();
        expect(send.mock.calls).toEqual([[{[RECORD]: '60', [NAME]: 'דנה'}]]);
    });
});

describe('watchRunning', () => {
    const makeRuntime = () => {
        const listeners = {};
        return {
            on: (name, fn) => (listeners[name] = listeners[name] || []).push(fn),
            emit: name => (listeners[name] || []).forEach(fn => fn())
        };
    };
    test('true when scripts start, false when the last ends, on a change only', () => {
        const runtime = makeRuntime();
        const send = jest.fn();
        watchRunning(runtime, send);
        runtime.emit('PROJECT_RUN_STOP'); // loading: it was not running
        expect(send).not.toHaveBeenCalled();
        runtime.emit('PROJECT_RUN_START');
        runtime.emit('PROJECT_RUN_START');
        runtime.emit('PROJECT_RUN_STOP');
        runtime.emit('PROJECT_RUN_STOP');
        runtime.emit('PROJECT_RUN_START');
        expect(send.mock.calls).toEqual([[true], [false], [true]]);
    });
});

describe('watchActivity', () => {
    const makeTarget = () => {
        const listeners = {};
        return {
            addEventListener: (type, fn) => (listeners[type] = listeners[type] || []).push(fn),
            fire: (type, isTrusted = true) => (listeners[type] || []).forEach(fn => fn({type, isTrusted}))
        };
    };
    test('the first at once, then one in five seconds at most', () => {
        const target = makeTarget();
        const send = jest.fn();
        let at = 1000;
        watchActivity(target, send, () => at);
        target.fire('pointerdown');
        target.fire('keydown');
        expect(send).toHaveBeenCalledTimes(1);
        at += ACTIVITY_NOTE_EVERY_MS - 1;
        target.fire('pointermove');
        expect(send).toHaveBeenCalledTimes(1);
        at += 1;
        target.fire('touchstart');
        expect(send).toHaveBeenCalledTimes(2);
    });
    test('an event a script made up, or of another kind, is not activity', () => {
        const target = makeTarget();
        const send = jest.fn();
        watchActivity(target, send, () => 0);
        target.fire('keydown', false);
        target.fire('scroll');
        target.fire('mousemove');
        expect(send).not.toHaveBeenCalled();
    });
});
