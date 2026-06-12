/**
 * Upload a recording to Google Drive via Netlify function.
 * Fire-and-forget — errors are logged but not surfaced to user.
 */
export async function uploadRecording(blob: Blob, cameraLabel: string): Promise<void> {
  const now = new Date();
  const dateFolder = now.toISOString().slice(0, 10); // "2026-06-12"
  const timestamp = now.toISOString().slice(0, 19).replace(/[T:]/g, '-');
  const safeCameraLabel = (cameraLabel || 'unknown-camera').replace(/[^a-zA-Z0-9-_]/g, '-');
  const filename = `${timestamp}_${safeCameraLabel}.webm`;

  const formData = new FormData();
  formData.append('file', blob, filename);
  formData.append('filename', filename);
  formData.append('dateFolder', dateFolder);

  try {
    const response = await fetch('/.netlify/functions/upload-to-drive', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Upload] Server error:', error);
    }
  } catch (e) {
    console.error('[Upload] Network error:', e);
  }
}
