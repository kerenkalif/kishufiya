// Scratch independence / TurboWarp disconnect (platform SPEC-scratch-independence 7, Keren 30.10.2026):
// the anonymous usage counter of upstream TurboWarp ("windchimes") is removed. This component is kept as a
// no-op so that the places that mount it need no change, and nothing here ever makes a request.
const TWWindchimeSubmitter = () => null;

export default TWWindchimeSubmitter;
