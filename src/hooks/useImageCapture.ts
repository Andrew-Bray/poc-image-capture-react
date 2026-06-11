import { useState, useCallback, useRef } from 'react';
import type { CaptureStats, ZoomCapabilities } from '../types';

interface UseImageCaptureOptions {
  /** Mock zoom capabilities to inject (for testing without hardware zoom) */
  mockZoomCapabilities?: ZoomCapabilities | null;
}

interface UseImageCaptureReturn {
  imageCapture: ImageCapture | null;
  initImageCapture: (stream: MediaStream) => Promise<{
    capabilities: MediaTrackCapabilities;
    settings: MediaTrackSettings;
    photoCapabilities: PhotoCapabilities | { error: string };
    zoomCapabilities: ZoomCapabilities | null;
  }>;
  takePhoto: (zoomCapabilities: ZoomCapabilities | null, mockZoomValue?: number) => Promise<{
    blob: Blob;
    stats: CaptureStats;
  }>;
  cleanup: () => void;
  track: MediaStreamTrack | null;
}

export function useImageCapture(options: UseImageCaptureOptions = {}): UseImageCaptureReturn {
  const { mockZoomCapabilities } = options;
  const [imageCapture, setImageCapture] = useState<ImageCapture | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  const initImageCapture = useCallback(async (stream: MediaStream) => {
    const videoTrack = stream.getVideoTracks()[0];
    trackRef.current = videoTrack;

    // Brief delay to let the device fully enumerate capabilities
    await new Promise((resolve) => setTimeout(resolve, 500));

    const ic = new ImageCapture(videoTrack);
    setImageCapture(ic);

    const capabilities = videoTrack.getCapabilities();
    const settings = videoTrack.getSettings();

    let photoCapabilities: PhotoCapabilities | { error: string };
    try {
      photoCapabilities = await ic.getPhotoCapabilities();
    } catch (e) {
      photoCapabilities = { error: (e as Error).message };
    }

    // Check for hardware zoom support (or use mock capabilities)
    let zoomCapabilities: ZoomCapabilities | null = null;

    if (mockZoomCapabilities) {
      // Mock mode: inject fake zoom capabilities for testing
      zoomCapabilities = mockZoomCapabilities;
      console.log('[MockZoom] Injecting fake zoom capabilities:', mockZoomCapabilities);
    } else {
      // Real mode: detect actual hardware zoom
      const zoomCap = capabilities.zoom;
      if (
        zoomCap &&
        typeof zoomCap === 'object' &&
        'min' in zoomCap &&
        'max' in zoomCap &&
        zoomCap.min != null &&
        zoomCap.max != null
      ) {
        zoomCapabilities = {
          min: zoomCap.min,
          max: zoomCap.max,
          step: zoomCap.step || 1,
        };

        // Reset zoom to min on startup (zoom level persists across sessions in Chrome 112+)
        try {
          await videoTrack.applyConstraints({ advanced: [{ zoom: zoomCap.min }] });
        } catch {
          // Ignore zoom reset errors
        }
      }
    }

    return {
      capabilities,
      settings,
      photoCapabilities,
      zoomCapabilities,
    };
  }, [mockZoomCapabilities]);

  const takePhoto = useCallback(
    async (zoomCapabilities: ZoomCapabilities | null, mockZoomValue?: number) => {
      if (!imageCapture || !trackRef.current) {
        throw new Error('ImageCapture not initialized');
      }

      const startTime = performance.now();
      const blob = await imageCapture.takePhoto();
      const captureTime = performance.now() - startTime;

      // Get dimensions by loading the image
      const img = await createImageBitmap(blob);
      const width = img.width;
      const height = img.height;
      img.close();

      const stats: CaptureStats = {
        resolution: `${width} x ${height}`,
        megapixels: ((width * height) / 1000000).toFixed(2) + ' MP',
        fileSizeKB: (blob.size / 1024).toFixed(1) + ' KB',
        captureTimeMs: captureTime.toFixed(0) + ' ms',
      };

      // If hardware zoom is active, record the current zoom level
      if (zoomCapabilities) {
        let currentZoom: number;
        if (mockZoomValue !== undefined) {
          // Mock mode: use the provided simulated zoom value
          currentZoom = mockZoomValue;
        } else {
          // Real mode: get zoom from track settings
          const currentSettings = trackRef.current.getSettings();
          currentZoom = currentSettings.zoom ?? zoomCapabilities.min;
        }
        stats.hardwareZoom = formatZoom(currentZoom, zoomCapabilities);
      }

      return { blob, stats };
    },
    [imageCapture]
  );

  const cleanup = useCallback(() => {
    trackRef.current = null;
    setImageCapture(null);
  }, []);

  return {
    imageCapture,
    initImageCapture,
    takePhoto,
    cleanup,
    track: trackRef.current,
  };
}

// Normalize zoom values for display. Cameras report zoom in different scales:
// BRIO-style: 100-500 (100 = 1x), or spec-style: 1.0-5.0 (1.0 = 1x)
export function formatZoom(rawValue: number, zoomCapabilities: ZoomCapabilities): string {
  const min = zoomCapabilities.min;
  // If min >= 10, it's a percentage-based scale (e.g., 100 = 1x)
  const displayValue = min >= 10 ? rawValue / min : rawValue;
  return `${displayValue.toFixed(1)}x`;
}
