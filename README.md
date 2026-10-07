# Better Chrome Mic JS

A lightweight userscript that tries to improve microphone quality in Chromium-based browsers by overriding common WebRTC capture constraints before websites receive your microphone stream.

It is primarily intended for **Violentmonkey** and Chromium browsers such as Chrome, Edge, Brave, Opera, and Vivaldi.

## What it does

Better Chrome Mic JS intercepts browser microphone requests made through `navigator.mediaDevices.getUserMedia()` and prefers a cleaner capture path by:

- disabling WebRTC echo cancellation;
- disabling browser noise suppression;
- disabling automatic gain control;
- preferring 48 kHz capture;
- preferring two channels when the microphone actually supports stereo;
- intercepting later `MediaStreamTrack.applyConstraints()` calls so sites cannot silently re-enable the three processing options above;
- logging the active microphone settings and capabilities to the browser console for troubleshooting.

This can help when a microphone sounds noticeably more muffled, gated, compressed, or unstable in Chromium than it does in the Windows microphone test or native applications.

## Installation

1. Install [Violentmonkey](https://violentmonkey.github.io/) in your Chromium-based browser.
2. Open `Better-Mic.js` from this repository.
3. Copy the script into a new Violentmonkey userscript, or install it from the raw file URL.
4. Make sure the userscript is enabled for the sites where you want it to run.
5. Reload the site before starting microphone capture.

The script uses `@run-at document-start` and `@inject-into page` because it needs to patch the page's microphone APIs before the site calls them.

## Verifying that it is active

Open DevTools with **F12**, select **Console**, then start microphone capture on the site.

Look for messages beginning with:

```text
[Raw Mic]
```

In particular, `[Raw Mic] ACTIVE SETTINGS:` shows the settings Chromium actually accepted.

A typical result may look similar to:

```text
echoCancellation: false
noiseSuppression: false
autoGainControl: false
sampleRate: 48000
channelCount: 1
```

A `channelCount` of 1 is normal for a mono microphone.

## Important limitations

This is **not a system-wide microphone driver or Windows audio enhancement**. It only affects compatible web pages in browsers where the userscript runs.

It also cannot guarantee the final quality heard by other users. A website can still apply additional processing after capture, and WebRTC services may encode the outgoing stream with Opus using their own bitrate, DTX, FEC, mono/stereo, and server-side settings.

Disabling echo cancellation can also cause feedback or speaker echo when using speakers instead of headphones.

Some sites may use capture methods or isolated execution contexts that cannot be overridden by a userscript.

## Privacy

The script does not upload, record, or store microphone audio itself. It only modifies browser media constraints and prints capture settings/capabilities to the local developer console.

## Troubleshooting

If the script appears inactive:

- confirm Violentmonkey is enabled on the site;
- reload the page after enabling the script;
- verify the script runs at `document-start`;
- verify `@inject-into page` is supported and active;
- check the DevTools console for `[Raw Mic]` messages;
- confirm the site is using `getUserMedia()` for microphone capture.

If the microphone still sounds poor after the capture settings show the processing options as disabled, the remaining degradation is likely happening later in the site's WebRTC/Opus pipeline rather than during microphone capture.

## License

Better Chrome Mic JS is released under the [MIT License](LICENSE).
