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
  gap: 16px;
  align-items: flex-start;
`;

const tiltContainer = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`;

const tiltSliderWrapper = css`
  position: relative;
  width: 40px;
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const tiltSlider = css`
  width: 150px;
  height: 8px;
  transform: rotate(-90deg);
  transform-origin: center center;
`;

const tiltLabel = css`
  font-size: 12px;
  color: ${colors.gray[500]};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const panContainer = css`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const panRow = css`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const panSlider = css`
  flex: 1;
  height: 8px;
`;

const panLabel = css`
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
        {/* Vertical Tilt slider */}
        {tiltCapabilities && (
          <div css={tiltContainer}>
            <span css={tiltLabel}>Tilt</span>
            <div css={tiltSliderWrapper}>
              <input
                type="range"
                css={tiltSlider}
                min={tiltMin}
                max={tiltMax}
                step={tiltStep}
                value={tilt}
                onChange={(e) => onTiltChange(parseFloat(e.target.value))}
              />
            </div>
            <span css={valueBox}>{tiltDisplay}</span>
          </div>
        )}

        {/* Horizontal Pan slider */}
        {panCapabilities && (
          <div css={panContainer}>
            <div css={panRow}>
              <span css={panLabel}>Pan</span>
              <input
                type="range"
                css={panSlider}
                min={panMin}
                max={panMax}
                step={panStep}
                value={pan}
                onChange={(e) => onPanChange(parseFloat(e.target.value))}
              />
              <span css={valueBox}>{panDisplay}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
