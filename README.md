# Image Capture & Zoom PoC (React)

React/TypeScript port of the Image Capture API proof of concept for ENG-30331.

Evaluates `ImageCapture.takePhoto()` vs canvas frame grab for item inspection photography, with hardware zoom detection and digital crop-zoom fallback.

## Quick Start

```bash
npm install
npm run dev
```

Opens at `http://localhost:11000`

## Tech Stack

- **Build**: Rsbuild (Rspack-based)
- **UI**: React 19 + TypeScript
- **Styling**: Emotion (CSS-in-JS)
- **Camera**: react-webcam + native ImageCapture API

## Features

| Feature | Description |
|---------|-------------|
| **ImageCapture.takePhoto()** | Full sensor resolution capture (Chromium only) |
| **Canvas frame grab** | Universal fallback, video stream resolution |
| **Hardware zoom (PTZ)** | Auto-detected from `track.getCapabilities().zoom` |
| **Digital crop-zoom** | Fallback when no hardware zoom available |
| **Progressive JSON** | Builds report as user interacts (1-4 sections) |
| **Copy to clipboard** | One-click JSON export for testers |

## Mock Hardware Zoom

Test the hardware zoom code paths without a zoom-capable camera.

### Usage

Add `?mockZoom=<profile>` to the URL:

| URL | Profile | Zoom Range |
|-----|---------|------------|
| `?mockZoom=brio` | Logitech BRIO style | 100-500 (percentage) |
| `?mockZoom=standard` | Spec standard | 1.0-5.0 (decimal) |
| `?mockZoom` | Default (brio) | 100-500 |

### What it does

- Injects fake zoom capabilities at the hook level
- Shows "MOCK: BRIO" badge on video preview
- Hardware Zoom Control slider appears (instead of "not supported")
- CSS transform visually simulates zoom effect
- `hardwareZoom` field recorded in capture stats
- Console logs mock operations for debugging

### Example

```
http://localhost:11000/?mockZoom=brio
```

Status bar will show: `Camera started: ... [MOCK: brio]`

## Architecture

```
src/
├── App.tsx                      # Main layout, state orchestration
├── hooks/
│   ├── useImageCapture.ts       # ImageCapture API, takePhoto()
│   ├── useZoomControl.ts        # Hardware zoom slider
│   ├── useDigitalCropZoom.ts    # Canvas crop-zoom fallback
│   └── useMockZoom.ts           # Mock zoom URL param + profiles
├── components/
│   ├── CaptureComparison.tsx    # Side-by-side results
│   ├── ZoomControls.tsx         # Hardware zoom slider
│   ├── DigitalCropControls.tsx  # Crop-zoom slider
│   ├── JsonResultsPanel.tsx     # Progressive JSON + copy
│   ├── StatusBar.tsx            # Status messages
│   └── StepBadge.tsx            # Step indicators
├── styles/
│   └── theme.ts                 # Emotion styles, colors
└── types.ts                     # TypeScript interfaces
```

## Key Discoveries

### MacBook Built-in Camera
- No zoom capability
- Max resolution: 1920x1920 (square sensor)
- `takePhoto()` returns 1552x1552 (different from video stream)
- takePhoto capture time: ~3300ms (slow)
- Frame grab: <10ms

### Logitech BRIO (expected behavior)
- Zoom: `{ min: 100, max: 500, step: 1 }` (percentage scale)
- 100 = 1x, 500 = 5x (digital zoom via firmware)
- Max resolution: 4096x2160 (4K)

### Browser Constraints API
- Flat `{ zoom: val }` is silently ignored
- Must use `{ advanced: [{ zoom: val }] }` syntax

## Scripts

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run preview  # Preview production build
```

## Related

- **Vanilla JS version**: `../trove-spikes/poc-image-capture-zoom.html`
- **Jira ticket**: ENG-30331
- **Plan doc**: `~/.claude/plans/2026-06-10-image-capture-zoom-poc.md`
