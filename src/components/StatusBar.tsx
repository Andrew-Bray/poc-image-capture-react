/** @jsxImportSource @emotion/react */
import { statusStyles } from '../styles/theme';
import type { StatusType } from '../types';

interface StatusBarProps {
  message: string;
  type: StatusType;
}

export function StatusBar({ message, type }: StatusBarProps) {
  return <div css={[statusStyles.base, statusStyles[type]]}>{message}</div>;
}
