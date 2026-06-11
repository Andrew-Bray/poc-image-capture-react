/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { colors } from '../styles/theme';

type BadgeState = 'inactive' | 'active' | 'complete';

interface StepBadgeProps {
  step: number;
  state: BadgeState;
}

const badgeBase = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
  transition: all 0.3s;
`;

const badgeStates: Record<BadgeState, ReturnType<typeof css>> = {
  inactive: css`
    background: ${colors.gray[200]};
    color: ${colors.gray[400]};
  `,
  active: css`
    background: ${colors.primary};
    color: ${colors.white};
  `,
  complete: css`
    background: ${colors.success};
    color: ${colors.white};
  `,
};

export function StepBadge({ step, state }: StepBadgeProps) {
  return <span css={[badgeBase, badgeStates[state]]}>{step}</span>;
}
