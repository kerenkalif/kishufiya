/**
 * A Scratch Link socket that never connects (Scratch independence / TurboWarp disconnect, platform
 * SPEC-scratch-independence 7). The hardware extensions (micro:bit, EV3, BOOST, WeDo 2.0) stay in the code and
 * old projects that use them still open, but they must not call device-manager.scratch.mit.edu (or any address):
 * "connect" simply reports a connection error, and no request is made.
 * Later, a direct Web Bluetooth socket can replace this factory; it has the same five-method shape as the VM's
 * ScratchLinkWebSocket.
 */
class NoLinkSocket {
    constructor () {
        this._onError = null;
    }
    open () {
        setTimeout(() => {
            if (this._onError) this._onError(new Event('error'));
        }, 0);
    }
    close () {}
    sendMessage () {}
    setOnOpen () {}
    setOnClose () {}
    setOnError (fn) {
        this._onError = fn;
    }
    setHandleMessage () {}
    isOpen () {
        return false;
    }
}

export default () => new NoLinkSocket();
