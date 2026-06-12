import type { JsonData } from '../types';

interface CaptureFile {
  name: string;
  mimeType: string;
  data: string; // base64
}

/**
 * Convert a Blob to base64 string
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Fetch blob from a blob URL
 */
async function fetchBlobFromUrl(url: string): Promise<Blob | null> {
  try {
    const response = await fetch(url);
    return response.blob();
  } catch {
    return null;
  }
}

export interface CaptureUploadData {
  takePhotoBlob: Blob | null;
  frameGrabBlob: Blob | null;
  cropZoomUrl: string | null; // We'll fetch from URL since hook doesn't expose blob
  jsonData: JsonData;
  cameraLabel: string;
}

/**
 * Upload capture data to Google Drive via Netlify function.
 * Fire-and-forget — errors are logged but not surfaced to user.
 */
export async function uploadCapture(data: CaptureUploadData): Promise<void> {
  const { takePhotoBlob, frameGrabBlob, cropZoomUrl, jsonData, cameraLabel } = data;
  const now = new Date();
  const dateFolder = now.toISOString().slice(0, 10); // "2026-06-12"
  const timestamp = now.toISOString().slice(0, 19).replace(/[T:]/g, '-');
  const safeCameraLabel = (cameraLabel || 'unknown-camera').replace(/[^a-zA-Z0-9-_]/g, '-');
  const folderName = `${timestamp}_${safeCameraLabel}`;

  const files: CaptureFile[] = [];

  try {
    // Add takePhoto if available
    if (takePhotoBlob) {
      files.push({
        name: 'takePhoto.jpg',
        mimeType: 'image/jpeg',
        data: await blobToBase64(takePhotoBlob),
      });
    }

    // Add frameGrab if available
    if (frameGrabBlob) {
      files.push({
        name: 'frameGrab.jpg',
        mimeType: 'image/jpeg',
        data: await blobToBase64(frameGrabBlob),
      });
    }

    // Add cropZoom if available (fetch from URL)
    if (cropZoomUrl) {
      const cropZoomBlob = await fetchBlobFromUrl(cropZoomUrl);
      if (cropZoomBlob) {
        files.push({
          name: 'cropZoom.jpg',
          mimeType: 'image/jpeg',
          data: await blobToBase64(cropZoomBlob),
        });
      }
    }

    // Add JSON data
    const jsonString = JSON.stringify(jsonData, null, 2);
    files.push({
      name: 'capture-data.json',
      mimeType: 'application/json',
      data: btoa(jsonString),
    });

    if (files.length === 0) {
      console.log('[CaptureUpload] No files to upload');
      return;
    }

    const response = await fetch('/.netlify/functions/upload-capture-to-drive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folderName,
        dateFolder,
        files,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[CaptureUpload] Server error:', error);
    }
  } catch (e) {
    console.error('[CaptureUpload] Error:', e);
  }
}
