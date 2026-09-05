# Narration audio

Drop one file per record here, named by record id:

    rec-01.mp3   rec-02.mp3   rec-03.mp3
    rec-04.mp3   rec-05.mp3   rec-06.mp3   rec-07.mp3

The script each file should read is the `lines` array for that record in
`src/content/chapters.ts`. That array is also what the terminal prints, so
the on-screen transcript and the voice stay in sync.

When a file is present it is routed through the full transmission chain in
`src/lib/audio/transmission.ts`: 280-3200 Hz bandpass, light tanh drive, a
presence lift around 1.9 kHz, over a static bed and carrier hum. Record the
voice clean and dry. Do not pre-apply radio effects, the chain adds them.

When a file is absent the site falls back to the Web Speech API for that
record. Speech synthesis cannot be routed through Web Audio in any current
browser, so in fallback the voice is unfiltered while the static bed and
squelch still play underneath. No code change is needed to upgrade.
