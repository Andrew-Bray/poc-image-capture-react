/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { controlsBox, controlRow, valueDisplay, colors } from '../styles/theme';

interface DigitalCropControlsProps {
  value: number;
  display: string;
  onChange: (value: number) => void;
}

const title = css`
  margin-top: 0;
  font-size: 14px;
  color: ${colors.gray[700]};
`;

const hint = css`
  font-size: 12px;
  color: ${colors.gray[500]};
  margin: 8px 0 0;
`;

export function DigitalCropControls({ value, display, onChange }: DigitalCropControlsProps) {
  return (
    <div css={controlsBox}>
      <h3 css={title}>Digital Crop-Zoom (Simulated)</h3>
      <div css={controlRow}>
        <label htmlFor="cropZoomSlider">Crop Factor:</label>
        <input
          type="range"
          id="cropZoomSlider"
          min={1}
          max={4}
          step={0.1}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
        <span css={valueDisplay}>{display}</span>
      </div>
      <p css={hint}>
        This crops the center of the full-resolution capture to simulate zoom. Try 2x or 3x after
        capturing.
      </p>
    </div>
  );
}
