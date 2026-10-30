/**
 * "Translate" without the service (Scratch independence, platform SPEC-scratch-independence 5).
 * Not in the extension library; here only so a project that has its blocks still opens. Same id and
 * opcodes as Scratch's, no network: "translate" gives the text back as it was, "language" says Hebrew.
 */
import formatMessage from 'format-message';
import ArgumentType from 'scratch-vm/src/extension-support/argument-type';
import BlockType from 'scratch-vm/src/extension-support/block-type';
import Cast from 'scratch-vm/src/util/cast';

const VIEWER_LANGUAGE = 'he';

class Scratch3TranslateBlocks {
    constructor (runtime) {
        this.runtime = runtime;
    }

    getInfo () {
        return {
            id: 'translate',
            name: formatMessage({
                id: 'translate.categoryName',
                default: 'Translate',
                description: 'Name of extension that adds translate blocks'
            }),
            blocks: [
                {
                    opcode: 'getTranslate',
                    text: formatMessage({
                        id: 'translate.translateBlock',
                        default: 'translate [WORDS] to [LANGUAGE]',
                        description: 'translate some text to a different language'
                    }),
                    blockType: BlockType.REPORTER,
                    arguments: {
                        WORDS: {
                            type: ArgumentType.STRING,
                            defaultValue: formatMessage({
                                id: 'translate.defaultTextToTranslate',
                                default: 'hello',
                                description: 'hello: the default text to translate'
                            })
                        },
                        LANGUAGE: {
                            type: ArgumentType.STRING,
                            menu: 'languages',
                            defaultValue: 'en'
                        }
                    }
                },
                {
                    opcode: 'getViewerLanguage',
                    text: formatMessage({
                        id: 'translate.viewerLanguage',
                        default: 'language',
                        description: 'the languge of the project viewer'
                    }),
                    blockType: BlockType.REPORTER,
                    arguments: {}
                }
            ],
            menus: {
                languages: {
                    acceptReporters: true,
                    items: [{text: 'עברית', value: 'he'}, {text: 'English', value: 'en'}]
                }
            }
        };
    }

    getViewerLanguage () {
        return VIEWER_LANGUAGE;
    }

    getTranslate (args) {
        return Cast.toString(args.WORDS);
    }
}

export default Scratch3TranslateBlocks;
