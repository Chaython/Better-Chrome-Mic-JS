// ==UserScript==
// @name         Chromium Raw / High Quality Microphone
// @namespace    chaython
// @version      1.0.2
// @description  Disable Chromium/WebRTC mic processing and prefer raw 48 kHz audio.
// @author       Chaython
// @license      MIT
// @icon         https://raw.githubusercontent.com/Chaython/Better-Chrome-Mic-JS/main/assets/microphone.svg
// @homepageURL  https://github.com/Chaython/Better-Chrome-Mic-JS
// @supportURL   https://github.com/Chaython/Better-Chrome-Mic-JS/issues
// @downloadURL  https://raw.githubusercontent.com/Chaython/Better-Chrome-Mic-JS/main/Better-Mic.js
// @updateURL    https://raw.githubusercontent.com/Chaython/Better-Chrome-Mic-JS/main/Better-Mic.js
// @match        *://*/*
// @run-at       document-start
// @inject-into  page
// @grant        none
// ==/UserScript==

(() => {
    'use strict';

    const AUDIO_OVERRIDES = {
        // These are the big three that commonly damage microphone quality.
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,

        // Prefer the normal WebRTC high-quality rate.
        sampleRate: { ideal: 48000 },

        // Keep stereo if the hardware actually provides it.
        // Mono microphones will simply remain mono.
        channelCount: { ideal: 2 }
    };

    function makeRawAudioConstraints(original) {
        if (original === false)
            return false;

        let audio = {};

        if (original && typeof original === 'object')
            audio = { ...original };

        // Sites sometimes put additional constraints here.
        if (Array.isArray(audio.advanced)) {
            audio.advanced = audio.advanced.map(entry => ({
                ...entry,
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            }));
        }

        return {
            ...audio,
            ...AUDIO_OVERRIDES
        };
    }

    /*
     * Stop sites from later doing:
     *
     * track.applyConstraints({
     *     echoCancellation: true,
     *     noiseSuppression: true,
     *     autoGainControl: true
     * });
     */
    try {
        const trackProto = MediaStreamTrack.prototype;
        const originalApplyConstraints = trackProto.applyConstraints;

        if (typeof originalApplyConstraints === 'function') {
            Object.defineProperty(trackProto, 'applyConstraints', {
                configurable: true,
                writable: true,
                value: function (constraints = {}) {
                    if (this.kind !== 'audio') {
                        return originalApplyConstraints.call(this, constraints);
                    }

                    const rawConstraints = makeRawAudioConstraints(constraints);

                    console.debug(
                        '[Raw Mic] Blocking site audio processing:',
                        constraints,
                        '=>',
                        rawConstraints
                    );

                    return originalApplyConstraints.call(
                        this,
                        rawConstraints
                    );
                }
            });
        }
    } catch (error) {
        console.warn('[Raw Mic] Could not patch applyConstraints:', error);
    }

    /*
     * Intercept the site's initial microphone request.
     */
    try {
        const mediaDevices = navigator.mediaDevices;

        if (!mediaDevices?.getUserMedia)
            return;

        const originalGetUserMedia =
            mediaDevices.getUserMedia.bind(mediaDevices);

        const replacement = async function (constraints = {}) {
            if (!constraints?.audio) {
                return originalGetUserMedia(constraints);
            }

            const modified = {
                ...constraints,
                audio: makeRawAudioConstraints(constraints.audio)
            };

            console.debug(
                '[Raw Mic] Original getUserMedia:',
                constraints
            );

            console.debug(
                '[Raw Mic] Modified getUserMedia:',
                modified
            );

            const stream = await originalGetUserMedia(modified);

            for (const track of stream.getAudioTracks()) {
                try {
                    // Apply again after creation in case Chromium/site modified it.
                    await track.applyConstraints(AUDIO_OVERRIDES);
                } catch (error) {
                    console.debug(
                        '[Raw Mic] Post-capture constraints not fully accepted:',
                        error
                    );
                }

                console.info(
                    '[Raw Mic] ACTIVE SETTINGS:',
                    track.getSettings()
                );

                try {
                    console.info(
                        '[Raw Mic] CAPABILITIES:',
                        track.getCapabilities()
                    );
                } catch {
                    // Older implementations may not expose capabilities.
                }
            }

            return stream;
        };

        /*
         * Override the instance because that's what normal websites call.
         */
        Object.defineProperty(mediaDevices, 'getUserMedia', {
            configurable: true,
            writable: true,
            value: replacement
        });

        console.info('[Raw Mic] Chromium microphone override installed.');
    } catch (error) {
        console.error('[Raw Mic] Installation failed:', error);
    }
})();
