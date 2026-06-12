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

export interface AvailableDevice {
  label: string;
  deviceId: string;
}

export interface CameraInfo {
  label: string;
  browser: string;
  imageCapturAvailable: boolean;
  zoomCapability: ZoomCapabilities | null;
  jpegQuality: number;
  isMockCamera?: boolean;
  requestedConstraints: MediaTrackConstraints;
  negotiatedResolution: string;
  availableDevices: AvailableDevice[];
  capabilities: MediaTrackCapabilities;
  currentSettings: MediaTrackSettings;
  photoCapabilities?: PhotoCapabilities | { error: string };
  supportedConstraints: MediaTrackSupportedConstraints;
}

export interface JsonData {
  cameraInfo?: CameraInfo;
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
