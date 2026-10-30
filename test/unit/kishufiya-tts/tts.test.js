// Browser text to speech (platform SPEC-scratch-independence 5): npx jest test/unit/kishufiya-tts
// Only the pure parts: choosing a voice, matching languages, the language kept after "set language".
jest.mock('format-message', () => Object.assign(opts => opts.default, {setup: () => ({})}));
jest.mock('scratch-vm/src/extension-support/argument-type', () => ({STRING: 'string'}), {virtual: true});
jest.mock('scratch-vm/src/extension-support/block-type', () => ({COMMAND: 'command'}), {virtual: true});
jest.mock('scratch-vm/src/util/cast', () => ({toString: x => String(x)}), {virtual: true});
jest.mock('scratch-vm/src/util/clone', () => ({simple: x => JSON.parse(JSON.stringify(x))}), {virtual: true});
jest.mock('scratch-vm/src/util/math-util', () => ({wrapClamp: x => x}), {virtual: true});

import {pickVoice, sameLanguage, languageAfterSet, speakingCeilingMs} from '../../../src/lib/kishufiya-text2speech';

const v = (lang, localService = false) => ({lang, localService, name: lang});

describe('sameLanguage', () => {
    test('base language decides', () => {
        expect(sameLanguage('he-IL', 'he-IL')).toBe(true);
        expect(sameLanguage('en-GB', 'en-US')).toBe(true);
        expect(sameLanguage('he_IL', 'he')).toBe(true);
        expect(sameLanguage('en-US', 'he-IL')).toBe(false);
    });
    test('old Android says iw for Hebrew', () => {
        expect(sameLanguage('iw-IL', 'he-IL')).toBe(true);
        expect(sameLanguage('he-IL', 'iw')).toBe(true);
    });
});

describe('pickVoice', () => {
    test('none for the language: null', () => {
        expect(pickVoice([v('en-US'), v('fr-FR')], 'he-IL')).toBeNull();
        expect(pickVoice([], 'he-IL')).toBeNull();
    });
    test('the exact locale first, then a local voice, then any', () => {
        const exact = v('he-IL');
        expect(pickVoice([v('iw', true), exact], 'he-IL')).toBe(exact);
        const local = v('he', true);
        expect(pickVoice([v('iw-IL'), local], 'he-IL')).toBe(local);
        const first = v('iw-IL');
        expect(pickVoice([first, v('iw-XX')], 'he-IL')).toBe(first);
    });
});

describe('languageAfterSet', () => {
    test('a menu value is kept', () => {
        expect(languageAfterSet('he', 'en')).toBe('en');
        expect(languageAfterSet('he', 'PT-BR')).toBe('pt-br');
    });
    test('a dropped value is reduced to its base', () => {
        expect(languageAfterSet('en', 'iw')).toBe('he');
        expect(languageAfterSet('he', 'fr-CA')).toBe('fr');
    });
    test('an unknown value changes nothing', () => {
        expect(languageAfterSet('he', 'xx')).toBe('he');
        expect(languageAfterSet('he', '')).toBe('he');
    });
});

describe('speakingCeilingMs', () => {
    test('400 ms a word plus 3 s', () => {
        expect(speakingCeilingMs('one two three', 1)).toBe(4200);
        expect(speakingCeilingMs('hi', 1.5)).toBe(3400);
    });
    test('a slow voice gets longer', () => {
        expect(speakingCeilingMs('one two', 0.85)).toBe(Math.round(3800 / 0.85));
    });
});
