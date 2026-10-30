/**
 * "Speech to Text" without the service (Scratch independence, platform SPEC-scratch-independence 5).
 * Not in the extension library; here only so a project that has its blocks still opens. Same id and
 * opcodes as Scratch's, no network and no microphone: "listen and wait" ends at once, "speech" is an
 * empty text and "when I hear" never fires.
 */
import formatMessage from 'format-message';
import ArgumentType from 'scratch-vm/src/extension-support/argument-type';
import BlockType from 'scratch-vm/src/extension-support/block-type';

class Scratch3Speech2TextBlocks {
    constructor (runtime) {
        this.runtime = runtime;
    }

    getInfo () {
        return {
            id: 'speech2text',
            name: formatMessage({
                id: 'speech.extensionName',
                default: 'Speech to Text',
                description: 'Name of extension that adds speech recognition blocks.'
            }),
            blocks: [
                {
                    opcode: 'listenAndWait',
                    text: formatMessage({
                        id: 'speech.listenAndWait',
                        default: 'listen and wait',
                        description: 'Start listening to the microphone and wait for a result.'
                    }),
                    blockType: BlockType.COMMAND
                },
                {
                    opcode: 'whenIHearHat',
                    text: formatMessage({
                        id: 'speech.whenIHear',
                        default: 'when I hear [PHRASE]',
                        description: 'Event that triggers when the text entered on the block is recognized.'
                    }),
                    blockType: BlockType.HAT,
                    arguments: {
                        PHRASE: {
                            type: ArgumentType.STRING,
                            defaultValue: formatMessage({
                                id: 'speech.defaultWhenIHearValue',
                                default: 'let\'s go',
                                description: 'The default phrase/word that, when heard, triggers the event.'
                            })
                        }
                    }
                },
                {
                    opcode: 'getSpeech',
                    text: formatMessage({
                        id: 'speech.speechReporter',
                        default: 'speech',
                        description: 'Get the text of spoken words transcribed by the speech recognition system.'
                    }),
                    blockType: BlockType.REPORTER
                }
            ]
        };
    }

    listenAndWait () {
        return Promise.resolve();
    }

    whenIHearHat () {
        return false;
    }

    getSpeech () {
        return '';
    }
}

export default Scratch3Speech2TextBlocks;
