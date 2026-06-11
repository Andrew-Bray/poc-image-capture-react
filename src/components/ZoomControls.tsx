/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { controlsBox, controlRow, valueDisplay, colors } from '../styles/theme';
import type { ZoomCapabilities } from '../types';

interface ZoomControlsProps {
  zoomCapabilities: ZoomCapabilities;
  value: number;
  display: string;
  onChange: (value: number) => void;
}

const title = css`
  margin-top: 0;
  font-size: 14px;
  color: ${colors.gray[700]};
`;

export function ZoomControls({ zoomCapabilities, value, display, onChange }: ZoomControlsProps) {
  return (
    <div css={controlsBox}>
      <h3 css={title}>Hardware Zoom Control</h3>
      <div css={controlRow}>
        <label htmlFor="zoomSlider">Zoom Level:</label>
        <input
          type="range"
          id="zoomSlider"
          min={zoomCapabilities.min}
          max={zoomCapabilities.max}
          step={zoomCapabilities.step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
        <span css={valueDisplay}>{display}</span>
      </div>
    </div>
  );
}

const warningBox = css`
  padding: 16px;
  background: ${colors.warningBg};
  border-radius: 8px;
  color: ${colors.warning};
`;

export function ZoomNotSupported() {
  return (
    <div css={warningBox}>
      Hardware zoom not supported by this camera/browser. Digital crop-zoom will be used as
      fallback.
    </div>
  );
}
