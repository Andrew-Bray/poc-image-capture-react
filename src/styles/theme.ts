/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';

export const colors = {
  primary: '#1976d2',
  primaryHover: '#1565c0',
  success: '#2e7d32',
  successHover: '#1b5e20',
  warning: '#e65100',
  warningBg: '#fff3e0',
  error: '#c62828',
  errorBg: '#ffebee',
  infoBg: '#e3f2fd',
  infoText: '#1565c0',
  successBg: '#e8f5e9',
  gray: {
    50: '#f9f9f9',
    100: '#f5f5f5',
    200: '#e0e0e0',
    300: '#d0d0d0',
    400: '#888',
    500: '#666',
    600: '#555',
    700: '#333',
    800: '#1e1e1e',
  },
  white: '#fff',
  black: '#000',
};

export const panel = css`
  background: ${colors.white};
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

export const panelTitle = css`
  margin-top: 0;
  color: ${colors.gray[700]};
  font-size: 18px;
  border-bottom: 1px solid #eee;
  padding-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const buttonBase = css`
  padding: 12px 24px;
  font-size: 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const buttonPrimary = css`
  ${buttonBase}
  background: ${colors.primary};
  color: ${colors.white};

  &:hover:not(:disabled) {
    background: ${colors.primaryHover};
  }
`;

export const buttonSecondary = css`
  ${buttonBase}
  background: ${colors.gray[200]};
  color: ${colors.gray[700]};

  &:hover:not(:disabled) {
    background: ${colors.gray[300]};
  }
`;

export const buttonSuccess = css`
  ${buttonBase}
  background: ${colors.success};
  color: ${colors.white};

  &:hover:not(:disabled) {
    background: ${colors.successHover};
  }
`;

export const controlsBox = css`
  margin: 16px 0;
  padding: 16px;
  background: ${colors.gray[50]};
  border-radius: 8px;
`;

export const controlRow = css`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }

  label {
    min-width: 120px;
    font-weight: 500;
    color: ${colors.gray[600]};
  }

  input[type='range'] {
    flex: 1;
    height: 8px;
  }
`;

export const valueDisplay = css`
  min-width: 60px;
  text-align: right;
  font-family: monospace;
  color: ${colors.gray[700]};
`;

export const jsonDisplay = css`
  font-family: monospace;
  font-size: 12px;
  background: ${colors.gray[800]};
  color: #d4d4d4;
  padding: 16px;
  border-radius: 8px;
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
`;

export const statusStyles = {
  base: css`
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 14px;
    margin-bottom: 16px;
  `,
  info: css`
    background: ${colors.infoBg};
    color: ${colors.infoText};
  `,
  success: css`
    background: ${colors.successBg};
    color: ${colors.success};
  `,
  error: css`
    background: ${colors.errorBg};
    color: ${colors.error};
  `,
};
