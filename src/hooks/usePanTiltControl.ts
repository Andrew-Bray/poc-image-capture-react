import { useState, useCallback, useRef, useEffect } from 'react';
import type { PanTiltCapabilities } from '../types';

interface UsePanTiltControlOptions {
  /** When true, skip actual track.applyConstraints calls (for mock testing) */
  isMockMode?: boolean;
}

interface UsePanTiltControlReturn {
  panValue: number;
  tiltValue: number;
  panDisplay: string;
  tiltDisplay: string;
  applyPan: (value: number) => Promise<void>;
  applyTilt: (value: number) => Promise<void>;
  setTrack: (track: MediaStreamTrack) => void;
}

function formatAngle(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(0)}°`;
}

export function usePanTiltControl(
  panTiltCapabilities: PanTiltCapabilities | null,
  options: UsePanTiltControlOptions = {}
): UsePanTiltControlReturn {
  const { isMockMode = false } = options;
  const [panValue, setPanValue] = useState(0);
  const [tiltValue, setTiltValue] = useState(0);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  // Reset values when capabilities change
  useEffect(() => {
    if (panTiltCapabilities) {
      // Start at center (0)
      setPanValue(0);
      setTiltValue(0);
    }
  }, [panTiltCapabilities]);

  const setTrack = useCallback((track: MediaStreamTrack) => {
    trackRef.current = track;
  }, []);

  const applyPan = useCallback(
    async (value: number) => {
      if (!panTiltCapabilities?.pan) return;

      if (isMockMode) {
        console.log('[MockPan] Simulating pan:', value);
        setPanValue(value);
        return;
      }

      // Real mode: apply constraints to the actual track
      if (!trackRef.current) return;

      try {
        await trackRef.current.applyConstraints({ advanced: [{ pan: value } as MediaTrackConstraintSet] });
        setPanValue(value);
      } catch (error) {
        console.error('Error applying pan:', error);
        throw error;
      }
    },
    [panTiltCapabilities, isMockMode]
  );

  const applyTilt = useCallback(
    async (value: number) => {
      if (!panTiltCapabilities?.tilt) return;

      if (isMockMode) {
        console.log('[MockTilt] Simulating tilt:', value);
        setTiltValue(value);
        return;
      }

      // Real mode: apply constraints to the actual track
      if (!trackRef.current) return;

      try {
        await trackRef.current.applyConstraints({ advanced: [{ tilt: value } as MediaTrackConstraintSet] });
        setTiltValue(value);
      } catch (error) {
        console.error('Error applying tilt:', error);
        throw error;
      }
    },
    [panTiltCapabilities, isMockMode]
  );

  const panDisplay = formatAngle(panValue);
  const tiltDisplay = formatAngle(tiltValue);

  return {
    panValue,
    tiltValue,
    panDisplay,
    tiltDisplay,
    applyPan,
    applyTilt,
    setTrack,
  };
}
