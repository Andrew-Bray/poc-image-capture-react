import { useMemo } from 'react';
import type { ZoomCapabilities } from '../types';

export type MockZoomProfile = 'brio' | 'standard' | null;

const ZOOM_PROFILES: Record<Exclude<MockZoomProfile, null>, ZoomCapabilities> = {
  // Logitech BRIO style - percentage scale (100 = 1x, 500 = 5x)
  brio: { min: 100, max: 500, step: 1 },
  // Standard spec - decimal scale (1.0 = 1x, 5.0 = 5x)
  standard: { min: 1, max: 5, step: 0.1 },
};

/**
 * Parse URL params to determine if we're in mock zoom mode.
 * Usage:
 *   ?mockZoom=brio     → BRIO-style 100-500 scale
 *   ?mockZoom=standard → Standard 1.0-5.0 scale
 *   ?mockZoom          → Defaults to 'brio'
 */
export function useMockZoom(): {
  mockProfile: MockZoomProfile;
  mockCapabilities: ZoomCapabilities | null;
  isMockMode: boolean;
} {
  return useMemo(() => {
    if (typeof window === 'undefined') {
      return { mockProfile: null, mockCapabilities: null, isMockMode: false };
    }

    const params = new URLSearchParams(window.location.search);
    const mockParam = params.get('mockZoom');

    if (mockParam === null) {
      return { mockProfile: null, mockCapabilities: null, isMockMode: false };
    }

    // ?mockZoom with no value defaults to 'brio'
    const profile: MockZoomProfile =
      mockParam === '' || mockParam === 'true' ? 'brio' : (mockParam as MockZoomProfile);

    if (!(profile in ZOOM_PROFILES)) {
      console.warn(`Unknown mockZoom profile: "${mockParam}". Using 'brio'.`);
      return {
        mockProfile: 'brio',
        mockCapabilities: ZOOM_PROFILES.brio,
        isMockMode: true,
      };
    }

    return {
      mockProfile: profile,
      mockCapabilities: ZOOM_PROFILES[profile],
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
