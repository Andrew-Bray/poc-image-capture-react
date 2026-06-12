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

/**
 * Center-crop an image blob to match a target aspect ratio.
 * Used to normalize takePhoto() output to match the video stream's framing.
 */
async function centerCropToAspectRatio(
  blob: Blob,
  srcWidth: number,
  srcHeight: number,
  targetAspectRatio: number,
  quality = 0.95
): Promise<{ blob: Blob; width: number; height: number }> {
  const srcAspectRatio = srcWidth / srcHeight;

  let cropWidth: number;
  let cropHeight: number;
  let offsetX: number;
  let offsetY: number;

  if (srcAspectRatio > targetAspectRatio) {
    // Source is wider than target — crop sides
    cropHeight = srcHeight;
    cropWidth = Math.round(srcHeight * targetAspectRatio);
    offsetX = Math.round((srcWidth - cropWidth) / 2);
    offsetY = 0;
  } else {
    // Source is taller than target — crop top/bottom
    cropWidth = srcWidth;
    cropHeight = Math.round(srcWidth / targetAspectRatio);
    offsetX = 0;
    offsetY = Math.round((srcHeight - cropHeight) / 2);
  }

  // Create offscreen canvas and draw cropped region
  const canvas = new OffscreenCanvas(cropWidth, cropHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  const img = await createImageBitmap(blob);
  ctx.drawImage(img, offsetX, offsetY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
  img.close();

  const croppedBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
  return { blob: croppedBlob, width: cropWidth, height: cropHeight };
}

export function useImageCapture(options: UseImageCaptureOptions = {}): UseImageCaptureReturn {
  const { mockZoomCapabilities } = options;
  const [imageCapture, setImageCapture] = useState<ImageCapture | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const videoAspectRatioRef = useRef<number>(16 / 9);

  const initImageCapture = useCallback(async (stream: MediaStream) => {
    const videoTrack = stream.getVideoTracks()[0];
    trackRef.current = videoTrack;

    // Brief delay to let the device fully enumerate capabilities
    await new Promise((resolve) => setTimeout(resolve, 500));

    const ic = new ImageCapture(videoTrack);
    setImageCapture(ic);

    const capabilities = videoTrack.getCapabilities();
    const settings = videoTrack.getSettings();

    // Store video stream aspect ratio as ground truth for takePhoto cropping
    if (settings.width && settings.height) {
      videoAspectRatioRef.current = settings.width / settings.height;
    }

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
      let blob = await imageCapture.takePhoto();
      const captureTime = performance.now() - startTime;

      // Get dimensions by loading the image
      const img = await createImageBitmap(blob);
      let width = img.width;
      let height = img.height;
      img.close();

      // Center-crop to match video stream aspect ratio if they differ
      // This ensures takePhoto output matches what the user sees in the preview
      //
      // ALTERNATIVE APPROACH (not implemented):
      // Instead of cropping takePhoto to match video, we could adjust the video
      // preview to match takePhoto's native aspect ratio. This would mean:
      // 1. Do a silent takePhoto() at camera init to discover the photo aspect ratio
      // 2. Apply CSS cropping/letterboxing to the video preview to match
      // 3. Skip cropping here — takePhoto output IS the ground truth
      // This might be preferable if takePhoto's framing is the "true" sensor output
      // and we want the preview to accurately represent what will be captured.
      //
      const photoAspectRatio = width / height;
      const videoAspectRatio = videoAspectRatioRef.current;
      const aspectRatioDiff = Math.abs(photoAspectRatio - videoAspectRatio);

      if (aspectRatioDiff > 0.01) {
        console.log(
          `[takePhoto] Cropping to match video stream: photo=${photoAspectRatio.toFixed(3)}, video=${videoAspectRatio.toFixed(3)}`
        );
        const cropped = await centerCropToAspectRatio(blob, width, height, videoAspectRatio);
        blob = cropped.blob;
        width = cropped.width;
        height = cropped.height;
      }

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
