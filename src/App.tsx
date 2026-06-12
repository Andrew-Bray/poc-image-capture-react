/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Webcam from 'react-webcam';
import { useImageCapture } from './hooks/useImageCapture';
import { useZoomControl } from './hooks/useZoomControl';
import { useDigitalCropZoom } from './hooks/useDigitalCropZoom';
import { useMockZoom, getVisualZoomScale } from './hooks/useMockZoom';
import { useVideoRecording } from './hooks/useVideoRecording';
import { uploadRecording } from './utils/uploadRecording';
import { StepBadge } from './components/StepBadge';
import { StatusBar } from './components/StatusBar';
import { ZoomControls, ZoomNotSupported } from './components/ZoomControls';
import { DigitalCropControls } from './components/DigitalCropControls';
import { CaptureComparison } from './components/CaptureComparison';
import { JsonResultsPanel } from './components/JsonResultsPanel';
import { panel, panelTitle, buttonPrimary, buttonSecondary, buttonSuccess, buttonDanger, colors } from './styles/theme';
import type { JsonData, StatusType, ZoomCapabilities, CaptureStats, CameraInfo } from './types';

const appContainer = css`
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  background: ${colors.gray[100]};
  min-height: 100vh;
`;

const title = css`
  color: ${colors.gray[700]};
  margin-bottom: 8px;
`;

const subtitle = css`
  color: ${colors.gray[500]};
  margin-bottom: 24px;
`;

const container = css`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  align-items: start;
`;

const leftColumn = css`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const buttonRow = css`
  display: flex;
  gap: 12px;
  margin: 12px 0;
  align-items: center;
`;

const videoContainer = css`
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  max-width: 640px;
  max-height: 480px;
`;

const videoStyle = css`
  width: 100%;
  max-width: 640px;
  max-height: 480px;
  background: ${colors.black};
  border-radius: 8px;
  object-fit: cover;
  transition: transform 0.2s ease-out;
  transform-origin: center center;
`;

const mockBadge = css`
  position: absolute;
  top: 8px;
  left: 8px;
  background: #ff6b00;
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  z-index: 10;
`;

const recordingIndicator = css`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${colors.error};
  font-weight: 600;
  font-size: 14px;
`;

const recordingDot = css`
  width: 10px;
  height: 10px;
  background: ${colors.error};
  border-radius: 50%;
  animation: pulse 1s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
`;

const captureDescription = css`
  color: ${colors.gray[500]};
  font-size: 14px;
  margin-top: 0;
`;

const videoConstraints: MediaTrackConstraints = {
  width: { ideal: 4096 },
  height: { ideal: 2160 },
  aspectRatio: { min: 1.0, ideal: 1.7777777778 }
  // facingMode: 'environment',
};

export default function App() {
  const webcamRef = useRef<Webcam>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<{ message: string; type: StatusType }>({
    message: 'Click "Start Camera" to begin',
    type: 'info',
  });
  const [jsonData, setJsonData] = useState<JsonData>({});
  const [zoomCapabilities, setZoomCapabilities] = useState<ZoomCapabilities | null>(null);
  const [streamRef, setStreamRef] = useState<MediaStream | null>(null);

  // Capture results
  const [takePhotoUrl, setTakePhotoUrl] = useState<string | null>(null);
  const [takePhotoStats, setTakePhotoStats] = useState<CaptureStats | null>(null);
  const [takePhotoBlob, setTakePhotoBlob] = useState<Blob | null>(null);
  const [frameGrabUrl, setFrameGrabUrl] = useState<string | null>(null);
  const [frameGrabStats, setFrameGrabStats] = useState<CaptureStats | null>(null);

  // Mock zoom mode
  const { mockProfile, mockCapabilities, isMockMode } = useMockZoom();

  // Hooks with mock support
  const { initImageCapture, takePhoto, cleanup: cleanupImageCapture } = useImageCapture({
    mockZoomCapabilities: mockCapabilities,
  });
  const { zoomValue, zoomDisplay, applyZoom, setTrack } = useZoomControl(zoomCapabilities, {
    isMockMode,
  });
  const { cropFactor, cropDisplay, setCropFactor, applyCropZoom, croppedImageUrl } = useDigitalCropZoom();
  const {
    isRecording,
    startRecording,
    stopRecording,
    recordingDuration,
    recordedBlob,
    downloadRecording,
    clearRecording,
  } = useVideoRecording();

  const hasHardwareZoom = zoomCapabilities !== null;
  const hasCaptureData = takePhotoStats !== null || frameGrabStats !== null;

  // Calculate visual zoom scale for CSS transform (only in mock mode)
  const visualZoomScale = useMemo(() => {
    if (!isMockMode || !zoomCapabilities) return 1;
    return getVisualZoomScale(zoomValue, zoomCapabilities);
  }, [isMockMode, zoomCapabilities, zoomValue]);

  // Handle stream from react-webcam
  const handleUserMedia = useCallback(
    async (stream: MediaStream) => {
      setStreamRef(stream);
      setStatus({ message: 'Initializing camera...', type: 'info' });

      try {
        const { capabilities, settings, photoCapabilities, zoomCapabilities: zoomCaps } =
          await initImageCapture(stream);

        setZoomCapabilities(zoomCaps);

        if (zoomCaps) {
          const track = stream.getVideoTracks()[0];
          setTrack(track);
        }

        // Determine camera label
        const cameraLabel = isMockMode
          ? `Mock ${mockProfile === 'brio' ? 'BRIO' : 'Standard'}`
          : settings.label || 'Unknown Camera';

        // Get all available video input devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const availableDevices = devices
          .filter((d) => d.kind === 'videoinput')
          .map((d) => ({
            label: d.label || 'Unknown Device',
            deviceId: d.deviceId,
          }));

        const cameraInfo: CameraInfo = {
          label: cameraLabel,
          browser: navigator.userAgent,
          imageCapturAvailable: typeof ImageCapture !== 'undefined',
          zoomCapability: zoomCaps,
          jpegQuality: 0.85,
          requestedConstraints: videoConstraints,
          negotiatedResolution: `${settings.width} x ${settings.height}`,
          availableDevices,
          capabilities,
          currentSettings: settings,
          photoCapabilities,
          supportedConstraints: navigator.mediaDevices.getSupportedConstraints(),
        };

        // Only include isMockCamera when true
        if (isMockMode) {
          cameraInfo.isMockCamera = true;
        }

        setJsonData({ cameraInfo });

        setIsRunning(true);
        const mockLabel = isMockMode ? ` [MOCK: ${mockProfile}]` : '';
        setStatus({
          message: `Camera started: ${settings.deviceId?.slice(0, 8)}... (${settings.width}x${settings.height})${mockLabel}`,
          type: 'success',
        });
      } catch (error) {
        setStatus({ message: `Error: ${(error as Error).message}`, type: 'error' });
      }
    },
    [initImageCapture, setTrack, isMockMode, mockProfile]
  );

  const handleUserMediaError = useCallback((error: string | DOMException) => {
    const message = typeof error === 'string' ? error : error.message;
    setStatus({ message: `Camera error: ${message}`, type: 'error' });
  }, []);

  const handleZoomChange = useCallback(
    async (value: number) => {
      try {
        await applyZoom(value);
      } catch (error) {
        setStatus({ message: `Zoom error: ${(error as Error).message}`, type: 'error' });
      }
    },
    [applyZoom]
  );

  const handleCapture = useCallback(async () => {
    if (!webcamRef.current) return;

    setStatus({ message: 'Capturing...', type: 'info' });
    const startTime = performance.now();

    try {
      // Method 1: ImageCapture.takePhoto()
      // Pass mock zoom value when in mock mode
      const { blob, stats } = await takePhoto(
        zoomCapabilities,
        isMockMode ? zoomValue : undefined
      );

      // Cleanup old URL
      if (takePhotoUrl) URL.revokeObjectURL(takePhotoUrl);
      const newUrl = URL.createObjectURL(blob);
      setTakePhotoUrl(newUrl);
      setTakePhotoStats(stats);
      setTakePhotoBlob(blob);

      // Method 2: Canvas frame grab via react-webcam
      const grabStart = performance.now();
      const screenshotBase64 = webcamRef.current.getScreenshot();
      const grabTime = performance.now() - grabStart;

      if (screenshotBase64) {
        // Convert base64 to blob for size measurement
        const res = await fetch(screenshotBase64);
        const grabBlob = await res.blob();

        // Get dimensions from video element
        const video = webcamRef.current.video;
        const width = video?.videoWidth ?? 0;
        const height = video?.videoHeight ?? 0;

        // Cleanup old URL
        if (frameGrabUrl) URL.revokeObjectURL(frameGrabUrl);
        const newFrameUrl = URL.createObjectURL(grabBlob);
        setFrameGrabUrl(newFrameUrl);

        const grabStats: CaptureStats = {
          resolution: `${width} x ${height}`,
          megapixels: ((width * height) / 1000000).toFixed(2) + ' MP',
          fileSizeKB: (grabBlob.size / 1024).toFixed(1) + ' KB',
          captureTimeMs: grabTime.toFixed(0) + ' ms',
        };
        setFrameGrabStats(grabStats);

        setJsonData((prev) => ({
          ...prev,
          takePhotoCapture: stats,
          frameGrabCapture: grabStats,
          digitalCropZoom: undefined, // Clear stale crop data
        }));
      }

      const totalTime = performance.now() - startTime;
      setStatus({ message: `Capture complete in ${totalTime.toFixed(0)}ms`, type: 'success' });
    } catch (error) {
      setStatus({ message: `Capture error: ${(error as Error).message}`, type: 'error' });
    }
  }, [takePhoto, zoomCapabilities, takePhotoUrl, frameGrabUrl, isMockMode, zoomValue]);

  const handleClear = useCallback(() => {
    if (takePhotoUrl) URL.revokeObjectURL(takePhotoUrl);
    if (frameGrabUrl) URL.revokeObjectURL(frameGrabUrl);
    setTakePhotoUrl(null);
    setTakePhotoStats(null);
    setTakePhotoBlob(null);
    setFrameGrabUrl(null);
    setFrameGrabStats(null);

    setJsonData((prev) => ({
      cameraInfo: prev.cameraInfo,
    }));
  }, [takePhotoUrl, frameGrabUrl]);

  // Handle crop zoom changes with debounce
  useEffect(() => {
    if (hasHardwareZoom || !takePhotoBlob) return;

    const timeout = setTimeout(async () => {
      const cropStats = await applyCropZoom(takePhotoBlob);
      setJsonData((prev) => ({
        ...prev,
        digitalCropZoom: cropStats ?? undefined,
      }));
    }, 200);

    return () => clearTimeout(timeout);
  }, [cropFactor, takePhotoBlob, hasHardwareZoom, applyCropZoom]);

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      if (takePhotoUrl) URL.revokeObjectURL(takePhotoUrl);
      if (frameGrabUrl) URL.revokeObjectURL(frameGrabUrl);
    };
  }, []);

  // Step badge states
  const step1State = jsonData.cameraInfo ? 'complete' : 'active';
  const step2State = hasCaptureData ? 'complete' : jsonData.cameraInfo ? 'active' : 'inactive';

  return (
    <div css={appContainer}>
      <h1 css={title}>Image Capture & Zoom Proof of Concept</h1>
      <p css={subtitle}>ENG-30331 - Testing ImageCapture API and zoom capabilities for item inspection photography</p>

      <StatusBar message={status.message} type={status.type} />

      <div css={container}>
        {/* Left column */}
        <div css={leftColumn}>
          {/* Step 1: Camera Preview */}
          <div css={panel}>
            <h2 css={panelTitle}>
              <StepBadge step={1} state={step1State} />
              Start Camera
            </h2>

            <div css={videoContainer}>
              {isMockMode && <div css={mockBadge}>Mock: {mockProfile}</div>}
              <Webcam
                ref={webcamRef}
                audio={false}
                css={[videoStyle, { transform: `scale(${visualZoomScale})` }]}
                videoConstraints={videoConstraints}
                onUserMedia={handleUserMedia}
                onUserMediaError={handleUserMediaError}
                screenshotFormat="image/jpeg"
                screenshotQuality={0.85}
              />
            </div>

            <div css={buttonRow}>
              <button css={buttonPrimary} disabled={isRunning}>
                Start Camera
              </button>
              <button
                css={buttonSecondary}
                disabled={!isRunning}
                onClick={async () => {
                  if (isRecording) await stopRecording();
                  clearRecording();
                  streamRef?.getTracks().forEach((t) => t.stop());
                  cleanupImageCapture();
                  setIsRunning(false);
                  setZoomCapabilities(null);
                  setJsonData({});
                  setStatus({ message: 'Camera stopped', type: 'info' });
                }}
              >
                Stop Camera
              </button>
            </div>

            {isRunning && (
              <>
                {hasHardwareZoom ? (
                  <ZoomControls
                    zoomCapabilities={zoomCapabilities}
                    value={zoomValue}
                    display={zoomDisplay}
                    onChange={handleZoomChange}
                  />
                ) : (
                  <ZoomNotSupported />
                )}

                {/* Recording controls */}
                <div css={buttonRow}>
                  {!isRecording ? (
                    <button
                      css={buttonDanger}
                      onClick={() => streamRef && startRecording(streamRef)}
                      disabled={!streamRef}
                    >
                      Record Video
                    </button>
                  ) : (
                    <>
                      <button
                        css={buttonSecondary}
                        onClick={async () => {
                          const blob = await stopRecording();
                          if (blob.size > 0) {
                            uploadRecording(blob, jsonData.cameraInfo?.label || 'unknown');
                          }
                        }}
                      >
                        Stop Recording
                      </button>
                      <div css={recordingIndicator}>
                        <div css={recordingDot} />
                        {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                      </div>
                    </>
                  )}
                  {recordedBlob && !isRecording && (
                    <>
                      <button css={buttonPrimary} onClick={downloadRecording}>
                        Download Video
                      </button>
                      <button css={buttonSecondary} onClick={clearRecording}>
                        Discard
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Step 3: JSON Results */}
          <JsonResultsPanel data={jsonData} hasHardwareZoom={hasHardwareZoom} hasCaptureData={hasCaptureData} />
        </div>

        {/* Right column: Step 2 - Capture & Zoom */}
        <div css={panel}>
          <h2 css={panelTitle}>
            <StepBadge step={2} state={step2State} />
            Capture & Zoom
          </h2>
          <p css={captureDescription}>
            Capture a photo, then try the digital crop-zoom to see how resolution holds up.
          </p>

          <div css={buttonRow}>
            <button css={buttonSuccess} onClick={handleCapture} disabled={!isRunning}>
              Capture Both Methods
            </button>
            <button css={buttonSecondary} onClick={handleClear}>
              Clear
            </button>
          </div>

          {!hasHardwareZoom && (
            <DigitalCropControls value={cropFactor} display={cropDisplay} onChange={setCropFactor} />
          )}

          <CaptureComparison
            takePhotoUrl={takePhotoUrl}
            takePhotoStats={takePhotoStats}
            frameGrabUrl={frameGrabUrl}
            frameGrabStats={frameGrabStats}
            cropZoomUrl={croppedImageUrl}
            cropZoomStats={jsonData.digitalCropZoom ?? null}
            showCropZoom={!hasHardwareZoom}
          />
        </div>
      </div>
    </div>
  );
}
