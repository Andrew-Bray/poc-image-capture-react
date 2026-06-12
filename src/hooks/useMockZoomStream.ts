import { useRef, useCallback } from 'react';
import type { MutableRefObject } from 'react';

interface UseMockZoomStreamReturn {
  /**
   * Start capturing a zoomed stream from a video element.
   * Returns a MediaStream that can be passed to MediaRecorder.
   * @param video - The source video element
   * @param zoomScaleRef - A ref containing the current zoom scale (read each frame)
   */
  startZoomStream: (video: HTMLVideoElement, zoomScaleRef: MutableRefObject<number>) => MediaStream;
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

  const startZoomStream = useCallback((video: HTMLVideoElement, zoomScaleRef: MutableRefObject<number>): MediaStream => {
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

    // Animation loop to draw zoomed frames
    const drawFrame = () => {
      if (!ctx || !canvasRef.current) return;

      const currentZoom = zoomScaleRef.current;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Apply zoom transform (scale from center)
      ctx.save();
      ctx.translate(width / 2, height / 2);
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
