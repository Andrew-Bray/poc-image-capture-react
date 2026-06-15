import { useCallback, useState, useRef } from 'react';
import { useGesture } from '@use-gesture/react';
import type { ZoomCapabilities, AxisCaps } from '../types';

interface UseGesturePTZOptions {
  zoomCapabilities: ZoomCapabilities | null;
  panCapabilities: AxisCaps | null;
  tiltCapabilities: AxisCaps | null;
  zoomValue: number;
  panValue: number;
  tiltValue: number;
  onZoomChange: (value: number) => void;
  onPanChange: (value: number) => void;
  onTiltChange: (value: number) => void;
  /** Pixels of movement before gesture activates */
  deadzone?: number;
  /** How much drag (px) equals full pan/tilt range */
  dragSensitivity?: number;
  /** How much scroll (delta) equals full zoom range */
  scrollSensitivity?: number;
  /** Zoom increment for double-click */
  doubleClickZoomStep?: number;
}

interface UseGesturePTZReturn {
  /** Bind props to attach to the gesture target element */
  bind: ReturnType<typeof useGesture>;
  /** Whether a gesture is currently active */
  isGesturing: boolean;
}

/**
 * Hook for touch/mouse gesture-based PTZ control.
 *
 * Gestures:
 * - Drag: pan (horizontal) / tilt (vertical)
 * - Ctrl+wheel: zoom
 * - Pinch: zoom (toward center)
 * - Double-click: center + zoom in
 */
export function useGesturePTZ(options: UseGesturePTZOptions): UseGesturePTZReturn {
  const {
    zoomCapabilities,
    panCapabilities,
    tiltCapabilities,
    zoomValue,
    panValue,
    tiltValue,
    onZoomChange,
    onPanChange,
    onTiltChange,
    deadzone = 5,
    dragSensitivity = 300, // 300px drag = full range
    scrollSensitivity = 500, // 500 scroll delta = full range
    doubleClickZoomStep = 0.2, // 20% of range per double-click
  } = options;

  const [isGesturing, setIsGesturing] = useState(false);

  // Track initial values at drag start for relative movement
  const dragStartRef = useRef({ pan: 0, tilt: 0 });

  // Helper to clamp value within range
  const clamp = useCallback((value: number, min: number, max: number) => {
    return Math.min(max, Math.max(min, value));
  }, []);

  // Map drag delta to pan value change
  const dragToPan = useCallback(
    (deltaX: number): number => {
      if (!panCapabilities) return panValue;
      const range = panCapabilities.max - panCapabilities.min;
      // Positive deltaX = drag right = pan right (positive)
      const panDelta = (deltaX / dragSensitivity) * range;
      return clamp(dragStartRef.current.pan + panDelta, panCapabilities.min, panCapabilities.max);
    },
    [panCapabilities, dragSensitivity, clamp, panValue]
  );

  // Map drag delta to tilt value change
  const dragToTilt = useCallback(
    (deltaY: number): number => {
      if (!tiltCapabilities) return tiltValue;
      const range = tiltCapabilities.max - tiltCapabilities.min;
      // Positive deltaY = drag down = tilt down (negative in camera terms)
      // Invert so dragging up tilts up
      const tiltDelta = (-deltaY / dragSensitivity) * range;
      return clamp(dragStartRef.current.tilt + tiltDelta, tiltCapabilities.min, tiltCapabilities.max);
    },
    [tiltCapabilities, dragSensitivity, clamp, tiltValue]
  );

  // Map scroll/pinch to zoom change
  const deltaToZoom = useCallback(
    (delta: number, currentZoom: number): number => {
      if (!zoomCapabilities) return currentZoom;
      const range = zoomCapabilities.max - zoomCapabilities.min;
      // Positive delta = zoom in
      const zoomDelta = (delta / scrollSensitivity) * range;
      return clamp(currentZoom + zoomDelta, zoomCapabilities.min, zoomCapabilities.max);
    },
    [zoomCapabilities, scrollSensitivity, clamp]
  );

  // Handle double-click zoom
  const handleDoubleClickZoom = useCallback(() => {
    if (!zoomCapabilities) return;

    const range = zoomCapabilities.max - zoomCapabilities.min;
    const step = range * doubleClickZoomStep;

    // If near max, reset to min; otherwise zoom in
    const threshold = zoomCapabilities.max - step * 0.5;
    if (zoomValue >= threshold) {
      onZoomChange(zoomCapabilities.min);
    } else {
      const newZoom = clamp(zoomValue + step, zoomCapabilities.min, zoomCapabilities.max);
      onZoomChange(newZoom);
    }

    // Also center pan/tilt
    if (panCapabilities) {
      onPanChange(0);
    }
    if (tiltCapabilities) {
      onTiltChange(0);
    }
  }, [
    zoomCapabilities,
    panCapabilities,
    tiltCapabilities,
    zoomValue,
    doubleClickZoomStep,
    onZoomChange,
    onPanChange,
    onTiltChange,
    clamp,
  ]);

  const bind = useGesture(
    {
      onDragStart: () => {
        // Capture starting values for relative movement
        dragStartRef.current = { pan: panValue, tilt: tiltValue };
        setIsGesturing(true);
      },
      onDrag: ({ offset: [ox, oy], movement: [mx, my], first, memo }) => {
        // Use movement (delta from start) for pan/tilt
        const absMx = Math.abs(mx);
        const absMy = Math.abs(my);

        // Apply deadzone - only start moving after threshold crossed
        if (absMx < deadzone && absMy < deadzone) return;

        // Apply pan if we have capabilities and meaningful horizontal movement
        if (panCapabilities && absMx >= deadzone) {
          const newPan = dragToPan(mx);
          onPanChange(newPan);
        }

        // Apply tilt if we have capabilities and meaningful vertical movement
        if (tiltCapabilities && absMy >= deadzone) {
          const newTilt = dragToTilt(my);
          onTiltChange(newTilt);
        }
      },
      onDragEnd: () => {
        setIsGesturing(false);
      },
      onPinch: ({ offset: [scale], movement: [d], first, memo }) => {
        if (!zoomCapabilities) return;

        if (first) {
          setIsGesturing(true);
          return zoomValue; // Return current zoom as memo
        }

        // scale is relative (1 = no change, >1 = zoom in, <1 = zoom out)
        const baseZoom = (memo as number) ?? zoomValue;
        const range = zoomCapabilities.max - zoomCapabilities.min;
        const newZoom = clamp(
          baseZoom + (scale - 1) * range * 0.5, // 0.5 = sensitivity factor
          zoomCapabilities.min,
          zoomCapabilities.max
        );
        onZoomChange(newZoom);

        return memo;
      },
      onPinchEnd: () => {
        setIsGesturing(false);
      },
      onWheel: ({ delta: [, dy], ctrlKey, event }) => {
        // Only handle ctrl+wheel for zoom
        if (!ctrlKey || !zoomCapabilities) return;

        // Prevent browser zoom
        event.preventDefault();

        setIsGesturing(true);

        // dy is positive when scrolling down, negative when scrolling up
        // We want scroll up = zoom in, so invert
        const newZoom = deltaToZoom(-dy, zoomValue);
        onZoomChange(newZoom);

        // Brief timeout to clear gesturing state after wheel stops
        setTimeout(() => setIsGesturing(false), 150);
      },
      onDoubleClick: () => {
        handleDoubleClickZoom();
      },
    },
    {
      drag: {
        // Prevent default to avoid text selection during drag
        filterTaps: true,
        threshold: deadzone,
      },
      pinch: {
        // Enable pinch scaling
        scaleBounds: { min: 0.5, max: 2 },
      },
      wheel: {
        // Capture wheel events to prevent default when ctrl is held
        eventOptions: { passive: false },
      },
    }
  );

  return {
    bind,
    isGesturing,
  };
}
