You are an expert React + Remotion motion designer and creative developer.

Build a polished **9–12 second cinematic deep-space telemetry animation** in Remotion based on the following concept.

## CORE CONCEPT

The video is an archival transmission from a fictional survey station monitoring an unexplained orbital resonance.

The visual language should resemble:

* real orbital telemetry
* spacecraft trajectory reconstruction
* astronomical survey stations
* analog tracking equipment
* scientific observation archives
* classified mission telemetry

It must feel **scientific, restrained, cinematic, mysterious, and authentic** rather than generic science fiction.

---

# VISUAL DIRECTION

Use a **pure black background**.

Fill the background with a sparse scattering of **very small, fine white stars**. Stars should be distributed naturally with significant negative space. Do not create dense clusters.

The primary visual element is a **single thin cyan-green orbital trajectory**.

The orbit should be:

* elongated
* elliptical
* slightly irregular
* subtly precessing
* mathematically coherent
* reminiscent of an actual orbital track

Do NOT make it a perfect circle.

The orbital line should have:

* a crisp, thin luminous core
* subtle cyan-green bloom
* restrained glow
* no excessive neon

Use SVG paths or another deterministic mathematical representation so the trajectory remains perfectly clean during rendering.

---

# ORBIT ANIMATION

The orbital line must **draw itself into existence**.

At the beginning, only a barely visible fragment exists.

### Timing

Assume 30 FPS.

Target approximately 10 seconds / 300 frames.

### Frames 0–75

Very slow beginning.

Only a faint portion of the orbital trajectory becomes visible.

The viewer should initially question whether there is anything there.

### Frames 75–210

The trajectory progressively accelerates.

The line rapidly sweeps through the remaining orbital path.

As the line travels, introduce a small number of tracking markers.

Use:

* tiny rings
* tiny star-shaped markers

They should appear precisely as the orbital line passes their position.

Markers should bloom briefly as they appear, then settle into a subtle glow.

### Frames 210–240

The orbital trajectory completes.

The final segment should connect naturally to the beginning.

The completed orbit should now be clearly visible.

### Frames 240–300

Hold the completed orbital system.

Almost no movement.

Introduce only a **very subtle luminosity pulse** or extremely slow opacity variation.

Do NOT rotate the entire scene rapidly.

The final hold should feel calm and unsettling.

---

# CAMERA

The camera must be completely static.

No:

* pan
* zoom
* dolly
* camera shake
* parallax
* perspective movement

The animation comes entirely from the telemetry elements.

---

# TELEMETRY TEXT

Add a minimal station readout somewhere unobtrusive, preferably toward the lower-left or left-center.

Use this exact text:

SURVEY STATION KX-19
SECTOR 44-VELA
POWER AUXILIARY
CREW 0
ARCHIVE 71% RECOVERABLE
TRACKED OBJECT 0417

Typography should feel like an old scientific/technical tracking display.

Use a restrained monospaced or technical typeface.

Do not turn the screen into a giant HUD.

The telemetry should be subtle and secondary to the orbital trajectory.

Spacing should feel deliberate and authentic.

---

# LORE TEXT

During the final hold, introduce this exact sentence:

**Bound by resonance. Untouched by time.**

This is the central lore statement.

Place it toward the lower-right.

It should be:

* small
* elegant
* highly legible
* understated
* slightly luminous or white
* visually separated from the telemetry block

It must feel like a statement extracted from an astronomical observation archive, NOT like a marketing slogan.

Do not add any other narrative text.

---

# COLOR PALETTE

Use ONLY:

* pure black
* white
* restrained cyan-green

No other colors.

Avoid saturated neon.

The cyan-green should feel like the glow of scientific instrumentation rather than cyberpunk lighting.

---

# AUDIO

Create or integrate a restrained audio design synchronized to the animation.

At the very beginning:

A **deep sonar-style ping**.

The first pulses should be slow, with long gaps between them.

As the orbital trace accelerates:

* increase the pulse frequency
* introduce a very low sub-bass tone
* slowly build the low tone beneath the sonar

The low frequency should feel almost like a heartbeat or distant station instrumentation.

When the orbit completes:

* stop increasing the intensity
* allow the low tone to settle
* maintain a subtle sustained presence during the final hold

Avoid:

* cinematic trailer impacts
* dramatic orchestral music
* excessive sound effects
* futuristic UI beeps
* loud transitions

The sound design should feel like **an isolated tracking station operating in deep space**.

---

# STAR FIELD

Generate the star field deterministically so every render is identical.

Stars should:

* remain mostly static
* be extremely small
* vary slightly in brightness
* be sparse
* avoid looking like particles

A handful may subtly pulse, but avoid obvious twinkling animation.

---

# GLOW

Use layered SVG elements, filters, or another Remotion-compatible technique.

The orbital line should have:

1. a thin sharp core
2. a slightly blurred secondary glow
3. a very faint outer bloom

The result should remain crisp at the final render resolution.

Do not overuse blur.

---

# IMPORTANT DESIGN PRINCIPLE

The entire piece should feel like **evidence of an anomaly**, not a conventional sci-fi animation.

The audience should feel:

> Something is being monitored.

> It has been monitored for a long time.

> The resonance should have changed.

> It hasn't.

Do not explicitly explain the anomaly.

The restraint is important.

---

# TECHNICAL REQUIREMENTS

Build this as a proper Remotion composition.

Use:

* React
* Remotion
* SVG where appropriate
* deterministic animation
* frame-based timing
* reusable components
* clean component structure
* no unnecessary dependencies

Recommended component structure:

```text
src/
  Root.tsx
  Composition.tsx
  components/
    StarField.tsx
    OrbitalPath.tsx
    TrackingMarkers.tsx
    Telemetry.tsx
    LoreText.tsx
    Audio.tsx
```

Keep the code maintainable.

Put all major timing values into clearly named constants so they can easily be adjusted later.

The orbital geometry should be generated programmatically rather than manually drawing hundreds of points.

Make sure the SVG path animation is smooth and does not visibly jump when it closes.

The final result should render cleanly at **1920×1080** and also remain visually strong when compressed into a smaller social-media video.

---

# DELIVERABLE

Implement the complete Remotion project.

Do not merely explain how to build it.

Create the actual components and composition, wire everything together, and make the animation ready to render.

Also provide the exact command needed to preview and render the final composition.
