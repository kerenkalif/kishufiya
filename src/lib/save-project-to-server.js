/**
 * Scratch independence (platform SPEC-scratch-independence 5): there is no project server to save
 * to. The platform saves the game itself (kishufiya.jsx, {kishufiya: 'save'}); this stays only as
 * the default for the saver HOC's onUpdateProjectData and always refuses.
 * @returns {Promise} a promise that rejects.
 */
export default function () {
    return Promise.reject(new Error('Saving to a project server is not available'));
}
