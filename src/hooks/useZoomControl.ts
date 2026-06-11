import { useState, useCallback, useRef, useEffect } from 'react';
import type { ZoomCapabilities } from '../types';
import { formatZoom } from './useImageCapture';

interface UseZoomControlOptions {
  /** When true, skip actual track.applyConstraints calls (for mock testing) */
  isMockMode?: boolean;
}

interface UseZoomControlReturn {
  zoomValue: number;
  zoomDisplay: string;
  applyZoom: (value: number) => Promise<void>;
  setTrack: (track: MediaStreamTrack) => void;
}

export function useZoomControl(
  zoomCapabilities: ZoomCapabilities | null,
  options: UseZoomControlOptions = {}
): UseZoomControlReturn {
  const { isMockMode = false } = options;
  const [zoomValue, setZoomValue] = useState(zoomCapabilities?.min ?? 1);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  // Reset zoom value when capabilities change
  useEffect(() => {
    if (zoomCapabilities) {
      setZoomValue(zoomCapabilities.min);
    }
  }, [zoomCapabilities]);

  const setTrack = useCallback((track: MediaStreamTrack) => {
    trackRef.current = track;
  }, []);

  const applyZoom = useCallback(
    async (value: number) => {
      if (!zoomCapabilities) return;

      if (isMockMode) {
        // Mock mode: just update state, don't touch the real track
        console.log('[MockZoom] Simulating zoom:', value);
        setZoomValue(value);
        return;
      }

      // Real mode: apply constraints to the actual track
      if (!trackRef.current) return;

      try {
        // Must use advanced constraint syntax - flat { zoom: val } is silently ignored
        await trackRef.current.applyConstraints({ advanced: [{ zoom: value }] });
        setZoomValue(value);
      } catch (error) {
        console.error('Error applying zoom:', error);
        throw error;
      }
    },
    [zoomCapabilities, isMockMode]
  );

  const zoomDisplay = zoomCapabilities ? formatZoom(zoomValue, zoomCapabilities) : '1.0x';

  return {
    zoomValue,
    zoomDisplay,
    applyZoom,
    setTrack,
  };
}
