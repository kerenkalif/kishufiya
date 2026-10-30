/**
 * "Text to Speech" over the browser's own speechSynthesis (Scratch independence, platform
 * SPEC-scratch-independence section 5): free, no Scratch service. Replaces the VM's built-in
 * extension of the same id, so the block shapes, opcodes and the saved stage language
 * (textToSpeechLanguage) stay as they were and old projects keep working.
 * Hebrew by default. With no voice for the language on the device it stays silent and tells the
 * child once, in Hebrew.
 */
import formatMessage from 'format-message';
import ArgumentType from 'scratch-vm/src/extension-support/argument-type';
import BlockType from 'scratch-vm/src/extension-support/block-type';
import Cast from 'scratch-vm/src/util/cast';
import Clone from 'scratch-vm/src/util/clone';
import MathUtil from 'scratch-vm/src/util/math-util';

// eslint-disable-next-line max-len
const menuIconURI = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDIwIDIwIj48dGl0bGU+RXh0ZW5zaW9ucy9Tb2Z0d2FyZS9UZXh0LXRvLVNwZWVjaC1NZW51PC90aXRsZT48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iPjxwYXRoIGZpbGw9IiM0ZDRkNGQiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLW9wYWNpdHk9Ii4xNSIgc3Ryb2tlLXdpZHRoPSIuNSIgZD0iTTcuNzUgMTAuODM1YzAtLjUwOC0uNzQ3LS43OTMtMS4xOTQtLjM5bC0xLjM1IDEuMDhjLS41MS40MDgtMS4xNjkuNjQtMS44NTYuNjRoLS4yYy0uNTE3IDAtLjkuMzQ2LS45Ljc4N3YyLjExN2MwIC40NDIuMzgzLjc4Ny45Ljc4N2guMmMuNzI5IDAgMS4zNzcuMjEgMS45MS42NDNsMS4zIDEuMDhjLjQ1My4zNzYgMS4xOS4wOTUgMS4xOS0uNDM3eiIvPjxwYXRoIGZpbGw9IiMwZWJkOGMiIGQ9Ik0xMi43MDUgMTBjLS45MTQgMS4xMzEtMi4zOTggMS43MTQtMi44NzIgMS43MTQgMCAwLS4zMzMgMC0uMzMzLS4zMzMgMC0uMjk2LjU2Mi0uNDguNjktMS44MTNBNCA0IDAgMCAxIDEyIDJoMmE0IDQgMCAxIDEgMCA4eiIvPjwvZz48L3N2Zz4=';
// eslint-disable-next-line max-len
const blockIconURI = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48dGl0bGU+RXh0ZW5zaW9ucy9Tb2Z0d2FyZS9UZXh0LXRvLVNwZWVjaC1CbG9jazwvdGl0bGU+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJub256ZXJvIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1vcGFjaXR5PSIuMTUiPjxwYXRoIGZpbGw9IiM0ZDRkNGQiIGQ9Ik0xNS41IDIxLjY3YzAtMS4wMTYtMS40OTQtMS41ODYtMi4zODctLjc4MmwtMi43IDIuMTYzQTUuOTYgNS45NiAwIDAgMSA2LjcgMjQuMzNoLS40Yy0xLjAzNSAwLTEuOC42OS0xLjggMS41NzN2NC4yMzVjMCAuODgzLjc2NSAxLjU3MiAxLjggMS41NzJoLjRjMS40NTggMCAyLjc1NC40MjMgMy44MiAxLjI4N2wyLjU5OCAyLjE2MWMuOTA4Ljc1IDIuMzgyLjE4OCAyLjM4Mi0uODc2eiIvPjxwYXRoIGZpbGw9IiNmZmYiIGQ9Ik0yNS42NDQgMjAuNWMtMS42NjcgMS45MzctNC41MzkgMy40MjktNS45NzcgMy40MjlhMS4yNSAxLjI1IDAgMCAxLS41NTctLjEzN2MtLjM3Mi0uMTg2LS42MS0uNTQyLS42MS0xLjAzcTAtLjE1Ny4wNS0uMzA4Yy4wNzYtLjIzNi42MjQtLjk4Ni43MjctMS4xNzMuMjctLjQ4NC40NjItMS4wNzUuNTY2LTEuODY1QTguNSA4LjUgMCAwIDEgMjQgMy41aDRhOC41IDguNSAwIDEgMSAwIDE3eiIvPjwvZz48L3N2Zz4=';

const DEFAULT_LANGUAGE = 'he';
const MAX_WORDS_LENGTH = 128;
const VOICES_WAIT_MS = 1500;

// Voice menu ids are the old ones (saved in projects); the sound is a pitch and a rate now.
const VOICE_INFO = {
    ALTO: {id: 'text2speech.alto', default: 'alto', pitch: 1, rate: 1},
    TENOR: {id: 'text2speech.tenor', default: 'tenor', pitch: 0.7, rate: 1},
    SQUEAK: {id: 'text2speech.squeak', default: 'squeak', pitch: 1.8, rate: 1.1},
    GIANT: {id: 'text2speech.giant', default: 'giant', pitch: 0.2, rate: 0.85},
    KITTEN: {id: 'text2speech.kitten', default: 'kitten', pitch: 2, rate: 1.1}
};

// Menu value (the code stored in the project) -> [name in its own language, BCP 47 tag].
const LANGUAGES = {
    'he': ['עברית', 'he-IL'],
    'ar': ['العربية', 'ar'],
    'en': ['English', 'en-US'],
    'ru': ['Русский', 'ru-RU'],
    'fr': ['Français', 'fr-FR'],
    'es': ['Español', 'es-ES'],
    'de': ['Deutsch', 'de-DE'],
    'it': ['Italiano', 'it-IT'],
    'pt': ['Português', 'pt-PT'],
    'pt-br': ['Português (Brasil)', 'pt-BR'],
    'zh-cn': ['中文', 'zh-CN'],
    'ja': ['日本語', 'ja-JP'],
    'ko': ['한국어', 'ko-KR'],
    'tr': ['Türkçe', 'tr-TR'],
    'nl': ['Nederlands', 'nl-NL'],
    'pl': ['Polski', 'pl-PL'],
    'hi': ['हिन्दी', 'hi-IN'],
    'sv': ['Svenska', 'sv-SE'],
    'da': ['Dansk', 'da-DK'],
    'nb': ['Norsk', 'nb-NO'],
    'ro': ['Română', 'ro-RO'],
    'is': ['Íslenska', 'is-IS'],
    'cy': ['Cymraeg', 'cy-GB'],
    'es-419': ['Español (Latinoamérica)', 'es-MX']
};

const MSG_NO_HEBREW_VOICE = 'במכשיר הזה אין קול בעברית, אז הדמות לא תדבר. אפשר לנסות במחשב או בטאבלט אחר.';
const MSG_NO_VOICE = 'במכשיר הזה אין קול לשפה שנבחרה, אז הדמות לא תדבר.';

const speech = () => (typeof window !== 'undefined' && window.speechSynthesis) || null;

const baseOf = tag => String(tag).toLowerCase()
    .replace('_', '-')
    .split('-')[0];
// Old Android reports Hebrew as "iw".
const sameLanguage = (voiceLang, wanted) => {
    const a = baseOf(voiceLang);
    const b = baseOf(wanted);
    return a === b || (a === 'iw' && b === 'he') || (a === 'he' && b === 'iw');
};

const toastShown = {};
const toastOnce = (key, text) => {
    if (toastShown[key] || typeof document === 'undefined') return;
    toastShown[key] = true;
    const el = document.createElement('div');
    el.setAttribute('role', 'status');
    el.dir = 'rtl';
    el.textContent = text;
    el.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:100000;' +
        'max-width:90vw;padding:12px 18px;border-radius:10px;background:#4d4d4d;color:#fff;' +
        'font:16px/1.4 sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.4);text-align:center';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 8000);
};

// getVoices() is empty until the browser has loaded them; wait for voiceschanged (once, bounded).
const loadVoices = () => new Promise(resolve => {
    const synth = speech();
    if (!synth) {
        resolve([]);
        return;
    }
    const now = synth.getVoices();
    if (now && now.length) {
        resolve(now);
        return;
    }
    let done = false;
    const finish = () => {
        if (done) return;
        done = true;
        synth.removeEventListener('voiceschanged', finish);
        resolve(synth.getVoices() || []);
    };
    synth.addEventListener('voiceschanged', finish);
    setTimeout(finish, VOICES_WAIT_MS);
});

const pickVoice = (voices, tag) => {
    const matching = voices.filter(v => sameLanguage(v.lang, tag));
    if (!matching.length) return null;
    const exact = matching.find(v => String(v.lang).toLowerCase()
        .replace('_', '-') === tag.toLowerCase());
    return exact || matching.find(v => v.localService) || matching[0];
};

class Scratch3Text2SpeechBlocks {
    constructor (runtime) {
        this.runtime = runtime;
        this._pending = new Set();
        this._stopAllSpeech = this._stopAllSpeech.bind(this);
        this._onTargetCreated = this._onTargetCreated.bind(this);
        if (this.runtime) {
            this.runtime.on('PROJECT_STOP_ALL', this._stopAllSpeech);
            this.runtime.on('targetWasCreated', this._onTargetCreated);
        }
    }

    static get STATE_KEY () {
        return 'Scratch.text2speech';
    }

    static get DEFAULT_TEXT2SPEECH_STATE () {
        return {voiceId: 'ALTO'};
    }

    _getState (target) {
        let state = target.getCustomState(Scratch3Text2SpeechBlocks.STATE_KEY);
        if (!state) {
            state = Clone.simple(Scratch3Text2SpeechBlocks.DEFAULT_TEXT2SPEECH_STATE);
            target.setCustomState(Scratch3Text2SpeechBlocks.STATE_KEY, state);
        }
        return state;
    }

    _onTargetCreated (newTarget, sourceTarget) {
        if (sourceTarget) {
            const state = sourceTarget.getCustomState(Scratch3Text2SpeechBlocks.STATE_KEY);
            if (state) {
                newTarget.setCustomState(Scratch3Text2SpeechBlocks.STATE_KEY, Clone.simple(state));
            }
        }
    }

    getInfo () {
        return {
            id: 'text2speech',
            name: formatMessage({
                id: 'text2speech.categoryName',
                default: 'Text to Speech',
                description: 'Name of the Text to Speech extension.'
            }),
            blockIconURI: blockIconURI,
            menuIconURI: menuIconURI,
            blocks: [
                {
                    opcode: 'speakAndWait',
                    text: formatMessage({
                        id: 'text2speech.speakAndWaitBlock',
                        default: 'speak [WORDS]',
                        description: 'Speak some words.'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        WORDS: {
                            type: ArgumentType.STRING,
                            defaultValue: formatMessage({
                                id: 'text2speech.defaultTextToSpeak',
                                default: 'hello',
                                description: 'hello: the default text to speak'
                            })
                        }
                    }
                },
                {
                    opcode: 'setVoice',
                    text: formatMessage({
                        id: 'text2speech.setVoiceBlock',
                        default: 'set voice to [VOICE]',
                        description: 'Set the voice for speech synthesis.'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        VOICE: {
                            type: ArgumentType.STRING,
                            menu: 'voices',
                            defaultValue: 'ALTO'
                        }
                    }
                },
                {
                    opcode: 'setLanguage',
                    text: formatMessage({
                        id: 'text2speech.setLanguageBlock',
                        default: 'set language to [LANGUAGE]',
                        description: 'Set the language for speech synthesis.'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        LANGUAGE: {
                            type: ArgumentType.STRING,
                            menu: 'languages',
                            defaultValue: this.getCurrentLanguage()
                        }
                    }
                }
            ],
            menus: {
                voices: {
                    acceptReporters: true,
                    items: Object.keys(VOICE_INFO).map(value => ({
                        text: formatMessage({
                            id: VOICE_INFO[value].id,
                            default: VOICE_INFO[value].default,
                            description: 'Name of a voice.'
                        }),
                        value
                    }))
                },
                languages: {
                    acceptReporters: true,
                    items: Object.keys(LANGUAGES).map(value => ({text: LANGUAGES[value][0], value}))
                }
            }
        };
    }

    /**
     * The language kept on the stage so it is saved with the project (the same property the
     * Scratch extension used). Hebrew when the project never set one.
     * @returns {string} a key of LANGUAGES.
     */
    getCurrentLanguage () {
        const stage = this.runtime.getTargetForStage();
        if (!stage) return DEFAULT_LANGUAGE;
        if (!stage.textToSpeechLanguage) stage.textToSpeechLanguage = DEFAULT_LANGUAGE;
        return stage.textToSpeechLanguage;
    }

    setCurrentLanguage (locale) {
        const stage = this.runtime.getTargetForStage();
        if (!stage) return;
        const code = String(locale).toLowerCase();
        if (Object.prototype.hasOwnProperty.call(LANGUAGES, code)) {
            stage.textToSpeechLanguage = code;
            return;
        }
        // a dropped value such as "en-US" or "iw"
        const base = baseOf(code === 'iw' ? 'he' : code);
        if (Object.prototype.hasOwnProperty.call(LANGUAGES, base)) stage.textToSpeechLanguage = base;
    }

    _languageTag () {
        const code = this.getCurrentLanguage();
        return LANGUAGES[code] ? LANGUAGES[code][1] : code;
    }

    setVoice (args, util) {
        const state = this._getState(util.target);
        const ids = Object.keys(VOICE_INFO);
        let voice = args.VOICE;
        let voiceNum = parseInt(voice, 10);
        if (!isNaN(voiceNum)) {
            voiceNum = MathUtil.wrapClamp(voiceNum - 1, 0, ids.length - 1);
            voice = ids[voiceNum];
        }
        if (ids.includes(voice)) state.voiceId = voice;
    }

    setLanguage (args) {
        this.setCurrentLanguage(args.LANGUAGE);
    }

    _stopAllSpeech () {
        const synth = speech();
        if (synth) synth.cancel();
        this._pending.forEach(resolve => resolve());
        this._pending.clear();
    }

    speakAndWait (args, util) {
        const synth = speech();
        if (!synth || typeof SpeechSynthesisUtterance === 'undefined') {
            toastOnce('none', MSG_NO_VOICE);
            return Promise.resolve();
        }
        const state = this._getState(util.target);
        const voiceInfo = VOICE_INFO[state.voiceId] || VOICE_INFO.ALTO;
        let words = Cast.toString(args.WORDS).substring(0, MAX_WORDS_LENGTH);
        let tag = this._languageTag();
        if (state.voiceId === 'KITTEN') {
            words = words.replace(/\S+/g, 'meow');
            tag = 'en-US';
        }
        if (!words.trim()) return Promise.resolve();

        return loadVoices().then(voices => {
            const voice = pickVoice(voices, tag);
            if (!voice) {
                const hebrew = baseOf(tag) === 'he';
                toastOnce(hebrew ? 'he' : 'other', hebrew ? MSG_NO_HEBREW_VOICE : MSG_NO_VOICE);
                return null;
            }
            return new Promise(resolve => {
                const utterance = new SpeechSynthesisUtterance(words);
                utterance.voice = voice;
                utterance.lang = voice.lang;
                utterance.pitch = voiceInfo.pitch;
                utterance.rate = voiceInfo.rate;
                const finish = () => {
                    this._pending.delete(finish);
                    resolve();
                };
                this._pending.add(finish);
                utterance.onend = finish;
                utterance.onerror = finish;
                synth.speak(utterance);
            });
        });
    }
}

export default Scratch3Text2SpeechBlocks;
export {LANGUAGES, VOICE_INFO, pickVoice, sameLanguage};
