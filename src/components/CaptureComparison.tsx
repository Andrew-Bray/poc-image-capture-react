/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { colors } from '../styles/theme';
import type { CaptureStats, CropZoomStats } from '../types';

interface CaptureComparisonProps {
  takePhotoUrl: string | null;
  takePhotoStats: CaptureStats | null;
  frameGrabUrl: string | null;
  frameGrabStats: CaptureStats | null;
  cropZoomUrl: string | null;
  cropZoomStats: CropZoomStats | null;
  showCropZoom: boolean;
}

const comparison = css`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 16px;
`;

const comparisonItem = css`
  text-align: center;
`;

const label = css`
  font-weight: 600;
  margin-bottom: 8px;
  color: ${colors.gray[700]};
`;

const stats = css`
  font-size: 12px;
  color: ${colors.gray[500]};
  margin-top: 8px;
  text-align: left;

  strong {
    color: ${colors.gray[700]};
  }
`;

const imageStyle = css`
  width: 100%;
  height: auto;
  background: ${colors.black};
  border-radius: 8px;
`;

const placeholder = css`
  width: 100%;
  height: 150px;
  background: ${colors.gray[100]};
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${colors.gray[400]};
  font-size: 14px;
`;

const cropSection = css`
  margin-top: 24px;
`;

const cropTitle = css`
  font-size: 16px;
  font-weight: 600;
  color: ${colors.gray[700]};
  margin-bottom: 12px;
`;

const cropImageContainer = css`
  max-width: 50%;
`;

const cropImage = css`
  ${imageStyle}
  border: 2px dashed ${colors.primary};
`;

function StatsDisplay({ data }: { data: CaptureStats | CropZoomStats | null }) {
  if (!data) {
    return <div css={stats}>Waiting for capture...</div>;
  }

  if ('resolution' in data) {
    // CaptureStats
    return (
      <div css={stats}>
        <strong>Resolution: {data.resolution}</strong>
        <br />
        Megapixels: {data.megapixels}
        <br />
        File size: {data.fileSizeKB}
        <br />
        Capture time: {data.captureTimeMs}
        {data.hardwareZoom && (
          <>
            <br />
            Hardware zoom: {data.hardwareZoom}
          </>
        )}
      </div>
    );
  }

  // CropZoomStats
  return (
    <div css={stats}>
      <strong>Cropped Resolution: {data.cropResolution}</strong>
      <br />
      Megapixels: {data.megapixels}
      <br />
      Effective zoom: {data.effectiveZoom}
      <br />
      File size: {data.fileSizeKB}
    </div>
  );
}

export function CaptureComparison({
  takePhotoUrl,
  takePhotoStats,
  frameGrabUrl,
  frameGrabStats,
  cropZoomUrl,
  cropZoomStats,
  showCropZoom,
}: CaptureComparisonProps) {
  return (
    <>
      <div css={comparison}>
        <div css={comparisonItem}>
          <div css={label}>takePhoto()</div>
          {takePhotoUrl ? (
            <img src={takePhotoUrl} alt="takePhoto result" css={imageStyle} />
          ) : (
            <div css={placeholder}>No capture yet</div>
          )}
          <StatsDisplay data={takePhotoStats} />
        </div>
        <div css={comparisonItem}>
          <div css={label}>Canvas Frame Grab</div>
          {frameGrabUrl ? (
            <img src={frameGrabUrl} alt="Frame grab result" css={imageStyle} />
          ) : (
            <div css={placeholder}>No capture yet</div>
          )}
          <StatsDisplay data={frameGrabStats} />
        </div>
      </div>

      {showCropZoom && cropZoomUrl && cropZoomStats && (
        <div css={cropSection}>
          <h3 css={cropTitle}>Digital Crop-Zoom Result</h3>
          <div css={cropImageContainer}>
            <img src={cropZoomUrl} alt="Crop zoom result" css={cropImage} />
            <StatsDisplay data={cropZoomStats} />
          </div>
        </div>
      )}
    </>
  );
}
