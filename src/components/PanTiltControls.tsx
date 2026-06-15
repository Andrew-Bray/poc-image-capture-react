/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { controlsBox, valueDisplay, colors } from '../styles/theme';

interface AxisCapabilities {
  min: number;
  max: number;
  step: number;
}

interface PanTiltControlsProps {
  pan: number;
  tilt: number;
  panDisplay: string;
  tiltDisplay: string;
  onPanChange: (value: number) => Promise<void>;
  onTiltChange: (value: number) => Promise<void>;
  panCapabilities: AxisCapabilities | null;
  tiltCapabilities: AxisCapabilities | null;
  isMockMode?: boolean;
}

const title = css`
  margin-top: 0;
  font-size: 14px;
  color: ${colors.gray[700]};
`;

const controlLayout = css`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const sliderRow = css`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const slider = css`
  flex: 1;
  height: 8px;
`;

const sliderLabel = css`
  font-size: 12px;
  color: ${colors.gray[500]};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  min-width: 30px;
`;

const valueBox = css`
  ${valueDisplay}
  font-size: 11px;
  min-width: 50px;
`;

export function PanTiltControls({
  pan,
  tilt,
  panDisplay,
  tiltDisplay,
  onPanChange,
  onTiltChange,
  panCapabilities,
  tiltCapabilities,
  isMockMode = false,
}: PanTiltControlsProps) {
  const panMin = panCapabilities?.min ?? -180;
  const panMax = panCapabilities?.max ?? 180;
  const panStep = panCapabilities?.step ?? 1;
  const tiltMin = tiltCapabilities?.min ?? -90;
  const tiltMax = tiltCapabilities?.max ?? 90;
  const tiltStep = tiltCapabilities?.step ?? 1;

  const titleText = isMockMode ? 'Pan / Tilt Control (Mock)' : 'Hardware Pan / Tilt Control';

  return (
    <div css={controlsBox}>
      <h3 css={title}>{titleText}</h3>
      <div css={controlLayout}>
        {panCapabilities && (
          <div css={sliderRow}>
            <span css={sliderLabel}>Pan</span>
            <input
              type="range"
              css={slider}
              min={panMin}
              max={panMax}
              step={panStep}
              value={pan}
              onChange={(e) => onPanChange(parseFloat(e.target.value))}
            />
            <span css={valueBox}>{panDisplay}</span>
          </div>
        )}
        {tiltCapabilities && (
          <div css={sliderRow}>
            <span css={sliderLabel}>Tilt</span>
            <input
              type="range"
              css={slider}
              min={tiltMin}
              max={tiltMax}
              step={tiltStep}
              value={tilt}
              onChange={(e) => onTiltChange(parseFloat(e.target.value))}
            />
            <span css={valueBox}>{tiltDisplay}</span>
          </div>
        )}
      </div>
    </div>
  );
}
