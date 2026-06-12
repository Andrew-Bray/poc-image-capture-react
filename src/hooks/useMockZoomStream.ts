import { useRef, useCallback } from 'react';
import type { MutableRefObject } from 'react';

interface PTZRefs {
  zoomScale: MutableRefObject<number>;
  panOffset: MutableRefObject<number>;
  tiltOffset: MutableRefObject<number>;
}

interface UseMockZoomStreamReturn {
  /**
   * Start capturing a PTZ-transformed stream from a video element.
   * Returns a MediaStream that can be passed to MediaRecorder.
   * @param video - The source video element
   * @param ptzRefs - Refs containing current zoom scale and pan/tilt offsets (read each frame)
   */
  startZoomStream: (video: HTMLVideoElement, ptzRefs: PTZRefs) => MediaStream;
  /**
   * Stop the zoom stream capture and clean up resources.
   */
  stopZoomStream: () => void;
}

/**
 * Creates a canvas-based stream that applies zoom transform to video frames.
 * Used for recording mock zoom since CSS transforms don't affect MediaRecorder.
 */
export function useMockZoomStream(): UseMockZoomStreamReturn {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startZoomStream = useCallback((video: HTMLVideoElement, ptzRefs: PTZRefs): MediaStream => {
    // Clean up any existing stream
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
    }

    // Create canvas matching video dimensions
    const width = video.videoWidth || 1920;
    const height = video.videoHeight || 1080;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvasRef.current = canvas;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas 2d context');
    }

    // Animation loop to draw PTZ-transformed frames
    const drawFrame = () => {
      if (!ctx || !canvasRef.current) return;

      const currentZoom = ptzRefs.zoomScale.current;
      const panOffsetPercent = ptzRefs.panOffset.current;
      const tiltOffsetPercent = ptzRefs.tiltOffset.current;

      // Convert percentage offsets to pixels
      const panOffsetPx = (panOffsetPercent / 100) * width;
      const tiltOffsetPx = (tiltOffsetPercent / 100) * height;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Apply PTZ transform: translate for pan/tilt, then scale from center
      ctx.save();
      ctx.translate(width / 2 + panOffsetPx, height / 2 + tiltOffsetPx);
      ctx.scale(currentZoom, currentZoom);
      ctx.translate(-width / 2, -height / 2);

      // Draw the video frame
      ctx.drawImage(video, 0, 0, width, height);
      ctx.restore();

      // Continue loop
      animationIdRef.current = requestAnimationFrame(drawFrame);
    };

    // Start drawing
    drawFrame();

    // Capture stream from canvas (30fps)
    const stream = canvas.captureStream(30);
    streamRef.current = stream;

    return stream;
  }, []);

  const stopZoomStream = useCallback(() => {
    // Stop animation loop
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Clear canvas reference
    canvasRef.current = null;
  }, []);

  return {
    startZoomStream,
    stopZoomStream,
  };
}
