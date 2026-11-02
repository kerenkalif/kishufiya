import {multiPick, itemsFor, START} from '../../../src/lib/kishufiya-multipick';

const run = (events, from = START) => events.reduce((acc, e) => {
    const r = multiPick(acc.state, e);
    return {state: r.state, adds: r.add ? [...acc.adds, r.add] : acc.adds};
}, {state: from, adds: []});

test('plain click is one pick', () => {
    expect(run([{type: 'click', key: 'a'}]).adds).toEqual([['a']]);
});
test('ctrl marks in order, release adds all in marking order', () => {
    const r = run([{type: 'click', key: 'b', ctrl: true}, {type: 'click', key: 'a', ctrl: true}, {type: 'click', key: 'c', ctrl: true}, {type: 'ctrl-up'}]);
    expect(r.adds).toEqual([['b', 'a', 'c']]);
    expect(r.state).toEqual(START);
});
test('ctrl click on a marked tile unmarks; release with nothing marked does nothing', () => {
    const r = run([{type: 'click', key: 'a', ctrl: true}, {type: 'click', key: 'a', ctrl: true}, {type: 'ctrl-up'}]);
    expect(r.adds).toEqual([]);
    expect(r.state.mode).toBe(null);
});
test('cancel (Escape, close, blur) drops marks and adds nothing', () => {
    const r = run([{type: 'click', key: 'a', ctrl: true}, {type: 'cancel'}, {type: 'ctrl-up'}]);
    expect(r.adds).toEqual([]);
    expect(r.state).toEqual(START);
});
test('ctrl-up alone does nothing', () => {
    expect(run([{type: 'ctrl-up'}]).adds).toEqual([]);
});
test('plain click with ctrl marks up finishes the marks and ignores the click', () => {
    const r = run([{type: 'click', key: 'a', ctrl: true}, {type: 'click', key: 'b'}]);
    expect(r.adds).toEqual([['a']]);
});
test('touch: long press marks, taps toggle, second long press on a marked tile adds', () => {
    const r = run([{type: 'long', key: 'a'}, {type: 'click', key: 'b'}, {type: 'click', key: 'c'}, {type: 'click', key: 'b'}, {type: 'long', key: 'c'}]);
    expect(r.adds).toEqual([['a', 'c']]);
    expect(r.state).toEqual(START);
});
test('touch: taking off the last mark ends marking, and a tap is a pick again', () => {
    const r = run([{type: 'long', key: 'a'}, {type: 'click', key: 'a'}, {type: 'click', key: 'z'}]);
    expect(r.adds).toEqual([['z']]);
});
test('ctrl-up does not finish touch marks', () => {
    const r = run([{type: 'long', key: 'a'}, {type: 'ctrl-up'}]);
    expect(r.adds).toEqual([]);
    expect(r.state.marks).toEqual(['a']);
});
test('long press on a marked tile in ctrl mode does not finish it, and marks stay ctrl marks', () => {
    const r = run([{type: 'click', key: 'a', ctrl: true}, {type: 'long', key: 'a'}]);
    expect(r.adds).toEqual([]);
    expect(r.state).toEqual({marks: ['a'], mode: 'ctrl'});
    expect(run([{type: 'ctrl-up'}], r.state).adds).toEqual([['a']]);
});
test('itemsFor with the same key twice (a favourite and its copy) gives it once per key asked, first found', () => {
    const fav = {name: 'x', key: 'favorite-x'};
    const plain = {name: 'x'};
    expect(itemsFor(['x'], [fav, '---', plain], i => i.name)).toEqual([fav]);
    expect(itemsFor(['x', 'x'], [fav, plain], i => i.name)).toEqual([fav]);
});
test('itemsFor keeps marking order and skips missing', () => {
    const data = [{name: 'x'}, '---', {name: 'y'}];
    expect(itemsFor(['y', 'q', 'x'], data, i => i.name)).toEqual([data[2], data[0]]);
});
