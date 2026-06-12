import type { DeviceInfo } from '../types';

// Extend Navigator for User-Agent Client Hints API (Chrome 89+)
interface NavigatorUAData {
  platform: string;
  mobile: boolean;
  brands: Array<{ brand: string; version: string }>;
  getHighEntropyValues(hints: string[]): Promise<{
    architecture?: string;
    model?: string;
    platformVersion?: string;
  }>;
}

declare global {
  interface Navigator {
    userAgentData?: NavigatorUAData;
    deviceMemory?: number;
  }
}

/**
 * Gathers device information using Navigator APIs and User-Agent Client Hints.
 * Client Hints provide cleaner device info than parsing the UA string.
 */
export async function getDeviceInfo(): Promise<DeviceInfo> {
  const info: DeviceInfo = {
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    platform: navigator.platform || 'unknown',
  };

  // deviceMemory is Chrome-only and requires secure context
  if (navigator.deviceMemory) {
    info.deviceMemory = navigator.deviceMemory;
  }

  // User-Agent Client Hints API (Chrome 89+)
  if (navigator.userAgentData) {
    info.mobile = navigator.userAgentData.mobile;

    try {
      const highEntropy = await navigator.userAgentData.getHighEntropyValues([
        'architecture',
        'model',
        'platformVersion',
      ]);

      if (highEntropy.architecture) {
        info.architecture = highEntropy.architecture;
      }
      if (highEntropy.model) {
        info.model = highEntropy.model;
      }
      if (highEntropy.platformVersion) {
        info.platformVersion = highEntropy.platformVersion;
      }
    } catch {
      // getHighEntropyValues may fail in some contexts, ignore
    }
  }

  return info;
}
