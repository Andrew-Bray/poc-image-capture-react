/** @jsxImportSource @emotion/react */
import { css, keyframes } from '@emotion/react';
import { useState } from 'react';
import { panel, panelTitle, buttonBase, jsonDisplay, colors } from '../styles/theme';
import { StepBadge } from './StepBadge';
import type { JsonData } from '../types';

interface JsonResultsPanelProps {
  data: JsonData;
  hasHardwareZoom: boolean;
  hasCaptureData: boolean;
}

const pulseOnce = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const buttonRow = css`
  display: flex;
  gap: 12px;
  margin: 12px 0;
  align-items: center;
`;

const copyButton = css`
  ${buttonBase}
  background: ${colors.gray[200]};
  color: ${colors.gray[500]};
  transition: all 0.4s;

  &:hover:not(:disabled) {
    background: ${colors.gray[300]};
  }
`;

const copyButtonEnriched = css`
  ${copyButton}
  background: ${colors.primary};
  color: ${colors.white};
  animation: ${pulseOnce} 0.6s ease;

  &:hover:not(:disabled) {
    background: ${colors.primaryHover};
  }
`;

const copyFeedback = css`
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  background: ${colors.successBg};
  color: ${colors.success};
`;

const nudgeText = css`
  font-size: 13px;
  color: ${colors.gray[400]};
  font-style: italic;
  margin: 0;
  transition: opacity 0.3s;
`;

const dataBadge = css`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 12px;
  background: ${colors.gray[100]};
  color: ${colors.gray[400]};
  transition: all 0.3s;
  margin-left: auto;
`;

const dataBadgePartial = css`
  background: ${colors.warningBg};
  color: ${colors.warning};
`;

const dataBadgeComplete = css`
  background: ${colors.successBg};
  color: ${colors.success};
`;

const dot = css`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
`;

const chevron = css`
  transition: transform 0.2s;
  font-size: 12px;
  color: ${colors.gray[400]};
  cursor: pointer;
`;

const chevronOpen = css`
  transform: rotate(90deg);
`;

const titleToggle = css`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
`;

function getCompleteness(data: JsonData, hasHardwareZoom: boolean) {
  const sections: string[] = [];
  if (data.cameraInfo) sections.push('camera');
  if (data.takePhotoCapture) sections.push('capture');
  if (data.frameGrabCapture) sections.push('frame grab');
  if (!hasHardwareZoom && data.digitalCropZoom) sections.push('crop zoom');

  const totalSections = hasHardwareZoom ? 3 : 4;
  return { count: sections.length, total: totalSections };
}

function getNudgeText(data: JsonData, hasHardwareZoom: boolean): string {
  if (!data.cameraInfo) {
    return 'Start the camera, capture a photo to build a complete report.';
  }
  if (!data.takePhotoCapture) {
    return hasHardwareZoom
      ? 'Try the hardware zoom, then capture a photo.'
      : 'Capture a photo and try crop-zoom to include more data in the report.';
  }
  if (!hasHardwareZoom && !data.digitalCropZoom) {
    return 'Try adjusting the crop-zoom slider to add zoom data to the report.';
  }
  return '';
}

export function JsonResultsPanel({ data, hasHardwareZoom, hasCaptureData }: JsonResultsPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [showCopied, setShowCopied] = useState(false);

  const { count, total } = getCompleteness(data, hasHardwareZoom);
  const isComplete = count === total;
  const nudge = getNudgeText(data, hasHardwareZoom);

  const handleCopy = async () => {
    const json = JSON.stringify(data, null, 2);
    try {
      await navigator.clipboard.writeText(json);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = json;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  const stepState = hasCaptureData ? 'active' : 'inactive';

  return (
    <div css={panel}>
      <h2 css={panelTitle}>
        <StepBadge step={3} state={stepState} />
        <span css={titleToggle} onClick={() => setIsOpen(!isOpen)}>
          Results JSON
          <span css={[chevron, isOpen && chevronOpen]}>&#9654;</span>
        </span>
        <span
          css={[
            dataBadge,
            count > 0 && count < total && dataBadgePartial,
            isComplete && dataBadgeComplete,
          ]}
        >
          <span css={dot} />
          {count === 0 ? 'No data yet' : isComplete ? `All ${total} sections` : `${count} of ${total} sections`}
        </span>
      </h2>

      {isOpen && (
        <>
          <div css={buttonRow}>
            <button
              css={isComplete ? copyButtonEnriched : copyButton}
              onClick={handleCopy}
              disabled={count === 0}
            >
              Copy JSON to Clipboard
            </button>
            {showCopied && <span css={copyFeedback}>Copied!</span>}
          </div>
          {nudge && (
            <p css={nudgeText} style={{ opacity: count >= total - 1 ? 0.6 : 1 }}>
              {nudge}
            </p>
          )}
          <pre css={jsonDisplay}>
            {Object.keys(data).length > 0
              ? JSON.stringify(data, null, 2)
              : 'Camera not started yet...'}
          </pre>
        </>
      )}
    </div>
  );
}
