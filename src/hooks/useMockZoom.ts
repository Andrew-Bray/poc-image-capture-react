import { useMemo } from 'react';
import type { ZoomCapabilities, PanTiltCapabilities } from '../types';

export type MockZoomProfile = 'brio' | 'standard' | null;

interface PTZProfile {
  zoom: ZoomCapabilities;
  panTilt: PanTiltCapabilities;
}

const PTZ_PROFILES: Record<Exclude<MockZoomProfile, null>, PTZProfile> = {
  // Logitech BRIO style - percentage scale (100 = 1x, 500 = 5x)
  // Pan/Tilt in degrees: typical PTZ cameras have ~180° pan, ~90° tilt
  brio: {
    zoom: { min: 100, max: 500, step: 1 },
    panTilt: {
      pan: { min: -180, max: 180, step: 1 },
      tilt: { min: -90, max: 90, step: 1 },
    },
  },
  // Standard spec - decimal scale (1.0 = 1x, 5.0 = 5x)
  standard: {
    zoom: { min: 1, max: 5, step: 0.1 },
    panTilt: {
      pan: { min: -180, max: 180, step: 1 },
      tilt: { min: -90, max: 90, step: 1 },
    },
  },
};

/**
 * Parse URL params to determine if we're in mock PTZ mode.
 * Usage:
 *   ?mockZoom=brio     → BRIO-style 100-500 scale
 *   ?mockZoom=standard → Standard 1.0-5.0 scale
 *   ?mockZoom          → Defaults to 'brio'
 */
export function useMockZoom(): {
  mockProfile: MockZoomProfile;
  mockCapabilities: ZoomCapabilities | null;
  mockPanTiltCapabilities: PanTiltCapabilities | null;
  isMockMode: boolean;
} {
  return useMemo(() => {
    if (typeof window === 'undefined') {
      return { mockProfile: null, mockCapabilities: null, mockPanTiltCapabilities: null, isMockMode: false };
    }

    const params = new URLSearchParams(window.location.search);
    const mockParam = params.get('mockZoom');

    if (mockParam === null) {
      return { mockProfile: null, mockCapabilities: null, mockPanTiltCapabilities: null, isMockMode: false };
    }

    // ?mockZoom with no value defaults to 'brio'
    const profile: Exclude<MockZoomProfile, null> =
      mockParam === '' || mockParam === 'true' ? 'brio' : (mockParam as Exclude<MockZoomProfile, null>);

    if (!(profile in PTZ_PROFILES)) {
      console.warn(`Unknown mockZoom profile: "${mockParam}". Using 'brio'.`);
      return {
        mockProfile: 'brio',
        mockCapabilities: PTZ_PROFILES.brio.zoom,
        mockPanTiltCapabilities: PTZ_PROFILES.brio.panTilt,
        isMockMode: true,
      };
    }

    return {
      mockProfile: profile,
      mockCapabilities: PTZ_PROFILES[profile].zoom,
      mockPanTiltCapabilities: PTZ_PROFILES[profile].panTilt,
      isMockMode: true,
    };
  }, []);
}

/**
 * Calculate CSS scale transform for visual zoom simulation.
 * Maps the zoom value to a CSS scale (1.0 to ~2.5 for visual effect).
 */
export function getVisualZoomScale(
  zoomValue: number,
  zoomCapabilities: ZoomCapabilities
): number {
  const { min, max } = zoomCapabilities;
  // Normalize to 0-1 range
  const normalized = (zoomValue - min) / (max - min);
  // Map to 1.0 - 2.0 CSS scale (don't go too crazy)
  return 1 + normalized * 1.0;
}

/**
 * Calculate CSS translate for visual pan simulation.
 * Maps pan value to horizontal pixel offset (percentage of container).
 */
export function getVisualPanOffset(
  panValue: number,
  panCapabilities: { min: number; max: number }
): number {
  const { min, max } = panCapabilities;
  // Normalize to -1 to 1 range
  const normalized = (2 * (panValue - min)) / (max - min) - 1;
  // Map to -20% to +20% offset (percentage)
  return normalized * 20;
}

/**
 * Calculate CSS translate for visual tilt simulation.
 * Maps tilt value to vertical pixel offset (percentage of container).
 */
export function getVisualTiltOffset(
  tiltValue: number,
  tiltCapabilities: { min: number; max: number }
): number {
  const { min, max } = tiltCapabilities;
  // Normalize to -1 to 1 range
  const normalized = (2 * (tiltValue - min)) / (max - min) - 1;
  // Map to -15% to +15% offset (inverted for natural feel: tilt up = move up)
  return -normalized * 15;
}
