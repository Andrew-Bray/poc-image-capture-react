export interface CaptureStats {
  resolution: string;
  megapixels: string;
  fileSizeKB: string;
  captureTimeMs: string;
  hardwareZoom?: string;
}

export interface CropZoomStats {
  cropResolution: string;
  megapixels: string;
  effectiveZoom: string;
  fileSizeKB: string;
}

export interface JsonData {
  cameraInfo?: {
    capabilities: MediaTrackCapabilities;
    currentSettings: MediaTrackSettings;
    photoCapabilities?: PhotoCapabilities | { error: string };
    supportedConstraints: MediaTrackSupportedConstraints;
  };
  takePhotoCapture?: CaptureStats;
  frameGrabCapture?: CaptureStats;
  digitalCropZoom?: CropZoomStats;
}

export type StatusType = 'info' | 'success' | 'error';

export interface ZoomCapabilities {
  min: number;
  max: number;
  step: number;
}
