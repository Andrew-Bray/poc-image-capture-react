import { useState, useCallback, useRef, useEffect } from 'react';
import type { CropZoomStats } from '../types';

interface UseDigitalCropZoomReturn {
  cropFactor: number;
  cropDisplay: string;
  setCropFactor: (value: number) => void;
  applyCropZoom: (sourceBlob: Blob) => Promise<CropZoomStats | null>;
  croppedImageUrl: string | null;
}

export function useDigitalCropZoom(): UseDigitalCropZoomReturn {
  const [cropFactor, setCropFactor] = useState(1);
  const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Create canvas once
  useEffect(() => {
    canvasRef.current = document.createElement('canvas');
    return () => {
      canvasRef.current = null;
    };
  }, []);

  // Cleanup URL on unmount or change
  useEffect(() => {
    return () => {
      if (croppedImageUrl) {
        URL.revokeObjectURL(croppedImageUrl);
      }
    };
  }, [croppedImageUrl]);

  const applyCropZoom = useCallback(
    async (sourceBlob: Blob): Promise<CropZoomStats | null> => {
      if (cropFactor <= 1) {
        if (croppedImageUrl) {
          URL.revokeObjectURL(croppedImageUrl);
          setCroppedImageUrl(null);
        }
        return null;
      }

      const canvas = canvasRef.current;
      if (!canvas) return null;

      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Load the source image
      const img = await createImageBitmap(sourceBlob);

      // Calculate crop dimensions
      const cropWidth = img.width / cropFactor;
      const cropHeight = img.height / cropFactor;
      const cropX = (img.width - cropWidth) / 2;
      const cropY = (img.height - cropHeight) / 2;

      // Output at cropped resolution
      canvas.width = cropWidth;
      canvas.height = cropHeight;

      ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

      img.close();

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error('Failed to create blob'));
          },
          'image/jpeg',
          0.85
        );
      });

      // Create URL for display
      if (croppedImageUrl) {
        URL.revokeObjectURL(croppedImageUrl);
      }
      const url = URL.createObjectURL(blob);
      setCroppedImageUrl(url);

      return {
        cropResolution: `${Math.round(cropWidth)} x ${Math.round(cropHeight)}`,
        megapixels: ((cropWidth * cropHeight) / 1000000).toFixed(2) + ' MP',
        effectiveZoom: cropFactor.toFixed(1) + 'x',
        fileSizeKB: (blob.size / 1024).toFixed(1) + ' KB',
      };
    },
    [cropFactor, croppedImageUrl]
  );

  const cropDisplay = `${cropFactor.toFixed(1)}x`;

  return {
    cropFactor,
    cropDisplay,
    setCropFactor,
    applyCropZoom,
    croppedImageUrl,
  };
}
